import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, validOrigin } from '@/lib/admin';
import { getFreshStaydeskCatalog } from '@/lib/staydesk-catalog';

/** Buildings and rooms with their photo counts. Used by scripts/upload-photos.mjs to match folders to items. */
export async function POST(request: NextRequest) {
  if (!(await isAdmin()) || !validOrigin(request))
    return new NextResponse('Forbidden', { status: 403 });
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  let source;
  try { source = await getFreshStaydeskCatalog(); }
  catch { return new NextResponse('Staydesk catalog unavailable', { status: 503 }); }
  const rows = await env.DB.prepare('SELECT owner_type, owner_id, category, COUNT(*) AS total FROM catalog_images WHERE owner_type IN (\'building\', \'room\') GROUP BY owner_type, owner_id, category')
    .all<{ owner_type: string; owner_id: string; category: string; total: number }>();
  const counts = (id: string, category: string) =>
    (rows.results || []).find((row) => row.owner_id === id && row.category === category)?.total || 0;
  return NextResponse.json({
    buildings: source.buildings.map((building) => ({
      id: building.id, name: building.name, photos: counts(building.id, 'photo'), floorplans: counts(building.id, 'floorplan'),
      rooms: building.rooms.map((room) => ({ id: room.id, name: room.name, photos: counts(room.id, 'photo'), floorplans: counts(room.id, 'floorplan') })),
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
