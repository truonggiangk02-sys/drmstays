import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { formCoordinates, formText, parseDetails, type BuildingDetails } from '@/lib/catalog-details';
import { getFreshStaydeskCatalog } from '@/lib/staydesk-catalog';

const destination = (request: NextRequest, hash = '') => NextResponse.redirect(new URL(`/admin/locations${hash}`, request.url), 303);

export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 25_000) return new NextResponse('Request too large', { status: 413 });
  const form = await request.formData();
  const kind = String(form.get('kind') || '');
  const action = String(form.get('action') || 'save');

  if (kind === 'building') {
    const sourceId = String(form.get('sourceId') || '');
    if (!/^[0-9a-f-]{36}$/i.test(sourceId)) return new NextResponse('Invalid building ID', { status: 400 });
    let source;
    try { source = await getFreshStaydeskCatalog(); }
    catch { return new NextResponse('Staydesk unavailable', { status: 503 }); }
    if (!source.buildings.some(building => building.id === sourceId)) return new NextResponse('Building not found', { status: 404 });
    let coordinates;
    try { coordinates = formCoordinates(form); }
    catch { return new NextResponse('Invalid coordinates', { status: 400 }); }
    const previous = await env.DB.prepare('SELECT details_json FROM catalog_buildings WHERE source_id = ?').bind(sourceId).first<{ details_json: string }>();
    const details = parseDetails<BuildingDetails>(previous?.details_json);
    const next = { ...details, ...coordinates, coordinateApproximate: form.get('coordinateApproximate') === 'on' };
    const address = formText(form, 'address', 300);
    await env.DB.prepare('INSERT INTO catalog_buildings (source_id, published, address, details_json) VALUES (?, ?, ?, ?) ON CONFLICT(source_id) DO UPDATE SET address=excluded.address, details_json=excluded.details_json')
      .bind(sourceId, env.PREVIEW_DEMO === '1' ? 1 : 0, address, JSON.stringify(next)).run();
    await env.DB.prepare('DELETE FROM travel_time_cache WHERE building_id = ?').bind(sourceId).run();
    return destination(request, `#building-${sourceId}`);
  }

  if (kind !== 'landmark') return new NextResponse('Invalid item type', { status: 400 });
  const id = action === 'create' ? crypto.randomUUID() : String(form.get('id') || '');
  if (!/^[a-z0-9-]{3,80}$/i.test(id)) return new NextResponse('Invalid landmark ID', { status: 400 });
  if (action === 'delete' || action === 'restore') {
    const result = await env.DB.prepare('UPDATE landmarks SET deleted = ? WHERE id = ?').bind(action === 'delete' ? 1 : 0, id).run();
    if (!result.meta.changes) return new NextResponse('Landmark not found', { status: 404 });
    return destination(request, `#landmark-${id}`);
  }
  if (action !== 'create' && action !== 'save') return new NextResponse('Invalid action', { status: 400 });
  const nameVi = formText(form, 'nameVi', 160);
  if (!nameVi) return new NextResponse('Vietnamese name is required', { status: 400 });
  let coordinates;
  try { coordinates = formCoordinates(form); }
  catch { return new NextResponse('Invalid coordinates', { status: 400 }); }
  const published = form.get('published') === 'on' ? 1 : 0;
  if (published && (coordinates.latitude === null || coordinates.longitude === null)) return new NextResponse('Published landmarks need coordinates', { status: 400 });
  const position = Number(form.get('position') || 0);
  if (!Number.isSafeInteger(position) || position < 0 || position > 1000) return new NextResponse('Invalid order', { status: 400 });
  const buildingIds = [...new Set(form.getAll('buildingId').map(String))];
  if (buildingIds.length) {
    let source;
    try { source = await getFreshStaydeskCatalog(); }
    catch { return new NextResponse('Staydesk unavailable', { status: 503 }); }
    if (buildingIds.some(id => !source.buildings.some(building => building.id === id))) return new NextResponse('Invalid building selection', { status: 400 });
  }
  await env.DB.prepare('INSERT INTO landmarks (id, name_vi, name_en, description_vi, description_en, latitude, longitude, building_ids_json, published, deleted, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?) ON CONFLICT(id) DO UPDATE SET name_vi=excluded.name_vi, name_en=excluded.name_en, description_vi=excluded.description_vi, description_en=excluded.description_en, latitude=excluded.latitude, longitude=excluded.longitude, building_ids_json=excluded.building_ids_json, published=excluded.published, deleted=0, position=excluded.position')
    .bind(id, nameVi, formText(form, 'nameEn', 160), formText(form, 'descriptionVi', 2000), formText(form, 'descriptionEn', 2000), coordinates.latitude, coordinates.longitude, JSON.stringify(buildingIds), published, position).run();
  await env.DB.prepare('DELETE FROM travel_time_cache WHERE landmark_id = ?').bind(id).run();
  return destination(request, `#landmark-${id}`);
}
