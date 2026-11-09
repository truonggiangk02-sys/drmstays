import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { formLines, formNumber, formText } from '@/lib/catalog-details';
import { getFreshStaydeskCatalog } from '@/lib/staydesk-catalog';

const MAX_TYPES_PER_BUILDING = 30;
const uuid = /^[0-9a-f-]{36}$/i;

/** Create, edit, delete room types and assign rooms to them. */
export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request))
    return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 40_000)
    return new NextResponse('Request too large', { status: 413 });
  const db = env.DB;
  const form = await request.formData();
  const action = String(form.get('action') || 'save');
  const buildingId = String(form.get('buildingId') || '');
  if (!uuid.test(buildingId)) return new NextResponse('Invalid building', { status: 400 });
  let source;
  try { source = await getFreshStaydeskCatalog(); }
  catch { return new NextResponse('Staydesk catalog unavailable', { status: 503 }); }
  const building = source.buildings.find((item) => item.id === buildingId);
  if (!building) return new NextResponse('Building not found in Staydesk', { status: 404 });
  const back = (typeId: string, query = '') => NextResponse.redirect(new URL(`/admin/catalog?b=${buildingId}${typeId ? `&t=${typeId}` : ''}${query}`, request.url), 303);

  if (action === 'save') {
    let typeId = String(form.get('typeId') || '');
    const existing = typeId ? await db.prepare('SELECT id, building_source_id FROM catalog_room_types WHERE id = ?').bind(typeId).first<{ id: string; building_source_id: string }>() : null;
    if (typeId && (!uuid.test(typeId) || existing?.building_source_id !== buildingId)) return new NextResponse('Room type not found', { status: 404 });
    const nameVi = formText(form, 'nameVi', 120), nameEn = formText(form, 'nameEn', 120);
    if (!nameVi && !nameEn) return new NextResponse('Cần ít nhất một tên (Việt hoặc Anh)', { status: 400 });
    let details: string, price: number;
    try {
      price = formNumber(form, 'monthlyPrice', 1_000_000_000);
      details = JSON.stringify({
        descriptionVi: formText(form, 'descriptionVi'), descriptionEn: formText(form, 'descriptionEn'),
        areaSqm: formNumber(form, 'areaSqm', 100_000), beds: formNumber(form, 'beds', 50), bathrooms: formNumber(form, 'bathrooms', 50),
        maxGuests: formNumber(form, 'maxGuests', 100), furnitureVi: formLines(form, 'furnitureVi'), furnitureEn: formLines(form, 'furnitureEn'),
        amenitiesVi: formLines(form, 'amenitiesVi'), amenitiesEn: formLines(form, 'amenitiesEn'), depositVnd: formNumber(form, 'depositVnd', 1_000_000_000),
        serviceFeesVi: formText(form, 'serviceFeesVi'), serviceFeesEn: formText(form, 'serviceFeesEn'),
        rulesVi: formText(form, 'rulesVi'), rulesEn: formText(form, 'rulesEn'), minStayMonths: formNumber(form, 'minStayMonths', 120),
      });
    } catch { return new NextResponse('Invalid room type details', { status: 400 }); }
    const published = form.get('published') === 'on' ? 1 : 0;
    if (!typeId) {
      const count = await db.prepare('SELECT COUNT(*) AS total, COALESCE(MAX(position), -1) AS last FROM catalog_room_types WHERE building_source_id = ?').bind(buildingId).first<{ total: number; last: number }>();
      if ((count?.total || 0) >= MAX_TYPES_PER_BUILDING) return new NextResponse('Too many room types in this building', { status: 400 });
      typeId = crypto.randomUUID();
      await db.prepare('INSERT INTO catalog_room_types (id, building_source_id, name_vi, name_en, published, position, monthly_price, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(typeId, buildingId, nameVi, nameEn, published, (count?.last ?? -1) + 1, price, details).run();
    } else {
      await db.prepare('UPDATE catalog_room_types SET name_vi = ?, name_en = ?, published = ?, monthly_price = ?, details_json = ? WHERE id = ?')
        .bind(nameVi, nameEn, published, price, details, typeId).run();
    }
    return back(typeId, '&saved=1');
  }

  const typeId = String(form.get('typeId') || '');
  if (action === 'assign') {
    // A room that has no saved row yet is created as shown, since assigning it to a type means it should appear.
    // The form lists every room of the building (scope) and ticks the ones that belong to typeId.
    // Ticked rooms move to this type; unticked rooms that were in it are released.
    const type = await db.prepare('SELECT id FROM catalog_room_types WHERE id = ? AND building_source_id = ?').bind(typeId, buildingId).first();
    if (!type) return new NextResponse('Room type not found', { status: 404 });
    const ids = new Set(building.rooms.map((room) => room.id));
    const ticked = new Set(form.getAll('roomId').map(String).filter((id) => ids.has(id)));
    const scope = form.getAll('scope').map(String).filter((id) => ids.has(id));
    const statements = [
      ...[...ticked].map((id) => db.prepare('INSERT INTO catalog_rooms (source_id, building_source_id, published, type_id) VALUES (?, ?, 1, ?) ON CONFLICT(source_id) DO UPDATE SET building_source_id = excluded.building_source_id, type_id = excluded.type_id').bind(id, buildingId, typeId)),
      ...scope.filter((id) => !ticked.has(id)).map((id) => db.prepare('UPDATE catalog_rooms SET type_id = NULL WHERE source_id = ? AND type_id = ?').bind(id, typeId)),
    ];
    if (statements.length) await db.batch(statements);
    return back(typeId, '&tab=rooms&saved=1');
  }

  if (action === 'delete') {
    const type = await db.prepare('SELECT id FROM catalog_room_types WHERE id = ? AND building_source_id = ?').bind(typeId, buildingId).first();
    if (!type) return new NextResponse('Room type not found', { status: 404 });
    const images = await db.prepare("SELECT id, object_key FROM catalog_images WHERE owner_type = 'roomtype' AND owner_id = ?").bind(typeId).all<{ id: string; object_key: string }>();
    await db.batch([
      db.prepare('UPDATE catalog_rooms SET type_id = NULL WHERE type_id = ?').bind(typeId),
      db.prepare("DELETE FROM catalog_images WHERE owner_type = 'roomtype' AND owner_id = ?").bind(typeId),
      db.prepare('DELETE FROM catalog_room_types WHERE id = ?').bind(typeId),
    ]);
    if (env.BUCKET) for (const image of images.results || []) await env.BUCKET.delete(image.object_key);
    return back('', '&saved=deleted');
  }
  return new NextResponse('Invalid action', { status: 400 });
}
