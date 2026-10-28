import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { getStaydeskCatalog } from '@/lib/staydesk-catalog';
import { formCoordinates, formLines, formNumber, formText, parseDetails, type BuildingDetails, type RoomDetails } from '@/lib/catalog-details';

export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request))
    return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 20_000)
    return new NextResponse('Request too large', { status: 413 });
  const form = await request.formData();
  const kind = String(form.get('kind') || '');
  const sourceId = String(form.get('sourceId') || '');
  if (!/^[0-9a-f-]{36}$/i.test(sourceId) || !['building', 'room'].includes(kind))
    return new NextResponse('Invalid source item', { status: 400 });
  let source;
  try {
    source = await getStaydeskCatalog();
  } catch {
    return new NextResponse('Staydesk catalog unavailable', { status: 503 });
  }
  const exists =
    kind === 'building'
      ? source.buildings.some((item) => item.id === sourceId)
      : source.buildings.some((item) => item.rooms.some((room) => room.id === sourceId));
  if (!exists) return new NextResponse('Item not found in Staydesk', { status: 404 });
  if (form.get('action') === 'remove') {
    if (kind === 'building') await env.DB.prepare('INSERT INTO catalog_buildings (source_id, published) VALUES (?, 0) ON CONFLICT(source_id) DO UPDATE SET published=0').bind(sourceId).run();
    else await env.DB.prepare('INSERT INTO catalog_rooms (source_id, published) VALUES (?, 0) ON CONFLICT(source_id) DO UPDATE SET published=0').bind(sourceId).run();
    return NextResponse.redirect(new URL(`/admin/catalog#item-${sourceId}`, request.url), 303);
  }
  const published = form.get('published') === 'on' ? 1 : 0;
  const description = formText(form, 'descriptionEn');
  const services = JSON.stringify(formLines(form, 'servicesEn'));
  if (kind === 'building') {
    const address = formText(form, 'address', 300);
    const previous = await env.DB.prepare('SELECT details_json FROM catalog_buildings WHERE source_id = ?').bind(sourceId).first<{ details_json: string }>();
    const previousDetails = parseDetails<BuildingDetails>(previous?.details_json);
    let details: BuildingDetails;
    try {
      details = {
        descriptionVi: formText(form, 'descriptionVi'), descriptionEn: description,
        propertyTypeVi: formText(form, 'propertyTypeVi', 120), propertyTypeEn: formText(form, 'propertyTypeEn', 120),
        areaSqm: formNumber(form, 'areaSqm', 1_000_000), floorCount: formNumber(form, 'floorCount', 500),
        ...(form.has('latitude') || form.has('longitude') ? formCoordinates(form) : { latitude: previousDetails.latitude ?? null, longitude: previousDetails.longitude ?? null }),
        coordinateApproximate: form.has('coordinateApproximate') ? form.get('coordinateApproximate') === 'on' : previousDetails.coordinateApproximate ?? false,
        amenitiesVi: formLines(form, 'amenitiesVi'), amenitiesEn: formLines(form, 'amenitiesEn'),
        servicesVi: formLines(form, 'servicesVi'), servicesEn: formLines(form, 'servicesEn'),
        rulesVi: formText(form, 'rulesVi'), rulesEn: formText(form, 'rulesEn'),
      };
    } catch { return new NextResponse('Invalid building details', { status: 400 }); }
    await env.DB.prepare(
      'INSERT INTO catalog_buildings (source_id, published, description, address, services, details_json) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET published=excluded.published, description=excluded.description, address=excluded.address, services=excluded.services, details_json=excluded.details_json',
    )
      .bind(sourceId, published, description, address, services, JSON.stringify(details))
      .run();
  } else {
    const parent = source.buildings.find((item) => item.rooms.some((room) => room.id === sourceId));
    if (!parent) return new NextResponse('Room not found in Staydesk', { status: 404 });
    let monthlyPrice: number;
    let details: RoomDetails;
    try {
      monthlyPrice = formNumber(form, 'monthlyPrice', 1_000_000_000);
      details = {
        descriptionVi: formText(form, 'descriptionVi'), descriptionEn: description,
        typeVi: formText(form, 'typeVi', 120), typeEn: formText(form, 'typeEn', 120),
        floor: formText(form, 'floor', 40), areaSqm: formNumber(form, 'areaSqm', 100_000),
        beds: formNumber(form, 'beds', 50), bathrooms: formNumber(form, 'bathrooms', 50),
        maxGuests: formNumber(form, 'maxGuests', 100), furnitureVi: formLines(form, 'furnitureVi'),
        furnitureEn: formLines(form, 'furnitureEn'), amenitiesVi: formLines(form, 'amenitiesVi'),
        amenitiesEn: formLines(form, 'amenitiesEn'), depositVnd: formNumber(form, 'depositVnd', 1_000_000_000),
        serviceFeesVi: formText(form, 'serviceFeesVi'), serviceFeesEn: formText(form, 'serviceFeesEn'),
        rulesVi: formText(form, 'rulesVi'), rulesEn: formText(form, 'rulesEn'),
        minStayMonths: formNumber(form, 'minStayMonths', 120),
      };
    } catch { return new NextResponse('Invalid room details', { status: 400 }); }
    await env.DB.prepare(
      'INSERT INTO catalog_rooms (source_id, building_source_id, published, description, nightly_price, monthly_price, services, details_json) VALUES (?, ?, ?, ?, 0, ?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET building_source_id=excluded.building_source_id, published=excluded.published, description=excluded.description, nightly_price=0, monthly_price=excluded.monthly_price, services=excluded.services, details_json=excluded.details_json',
    )
      .bind(sourceId, parent.id, published, description, monthlyPrice, services, JSON.stringify(details))
      .run();
  }
  return NextResponse.redirect(new URL(`/admin/catalog#item-${sourceId}`, request.url), 303);
}
