import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { getStaydeskCatalog } from '@/lib/staydesk-catalog';

function servicesFrom(value: FormDataEntryValue | null) {
  return [
    ...new Set(
      String(value || '')
        .split(/\r?\n/)
        .map((item) => item.trim().slice(0, 120))
        .filter(Boolean),
    ),
  ].slice(0, 30);
}

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
  const published = form.get('published') === 'on' ? 1 : 0;
  const description = String(form.get('description') || '')
    .trim()
    .slice(0, 3000);
  const services = JSON.stringify(servicesFrom(form.get('services')));
  if (kind === 'building') {
    const address = String(form.get('address') || '')
      .trim()
      .slice(0, 300);
    await env.DB.prepare(
      'INSERT INTO catalog_buildings (source_id, published, description, address, services) VALUES (?, ?, ?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET published=excluded.published, description=excluded.description, address=excluded.address, services=excluded.services',
    )
      .bind(sourceId, published, description, address, services)
      .run();
  } else {
    const parent = source.buildings.find((item) => item.rooms.some((room) => room.id === sourceId));
    if (!parent) return new NextResponse('Room not found in Staydesk', { status: 404 });
    const nightlyPrice = Number(form.get('nightlyPrice'));
    const monthlyPrice = Number(form.get('monthlyPrice'));
    if (
      ![nightlyPrice, monthlyPrice].every(
        (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000,
      )
    )
      return new NextResponse('Invalid price', { status: 400 });
    await env.DB.prepare(
      'INSERT INTO catalog_rooms (source_id, building_source_id, published, description, nightly_price, monthly_price, services) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET building_source_id=excluded.building_source_id, published=excluded.published, description=excluded.description, nightly_price=excluded.nightly_price, monthly_price=excluded.monthly_price, services=excluded.services',
    )
      .bind(sourceId, parent.id, published, description, nightlyPrice, monthlyPrice, services)
      .run();
  }
  return NextResponse.redirect(new URL(`/admin/catalog#item-${sourceId}`, request.url), 303);
}
