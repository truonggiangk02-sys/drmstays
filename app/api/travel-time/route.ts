import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { getPublicCatalog } from '@/lib/public-catalog';
import { getPublicLandmarks } from '@/lib/landmarks';

type Cached = { duration_seconds: number; distance_meters: number; expires_at: number };
type HereResponse = { routes?: { sections?: { summary?: { duration?: number; length?: number } }[] }[] };

export async function GET(request: NextRequest) {
  if (!env.DB) return new NextResponse('Database unavailable', { status: 503 });
  if (!env.HERE_API_KEY) return NextResponse.json({ error: 'Travel-time service is not configured' }, { status: 503 });
  const buildingId = request.nextUrl.searchParams.get('buildingId') || '';
  const landmarkId = request.nextUrl.searchParams.get('landmarkId') || '';
  if (!/^[0-9a-f-]{36}$/i.test(buildingId) || !/^[a-z0-9-]{3,80}$/i.test(landmarkId)) return new NextResponse('Invalid location', { status: 400 });
  let catalog, landmarks;
  try { [catalog, landmarks] = await Promise.all([getPublicCatalog(), getPublicLandmarks()]); }
  catch { return new NextResponse('Locations unavailable', { status: 503 }); }
  const building = catalog.buildings.find(item => item.id === buildingId);
  const landmark = landmarks.find(item => item.id === landmarkId && (!item.buildingIds.length || item.buildingIds.includes(buildingId)));
  if (!building || !landmark) return new NextResponse('Location not found', { status: 404 });
  if (building.latitude === null || building.longitude === null || building.coordinateApproximate)
    return NextResponse.json({ error: 'Building coordinates need confirmation' }, { status: 422 });

  const cached = await env.DB.prepare('SELECT duration_seconds, distance_meters, expires_at FROM travel_time_cache WHERE building_id = ? AND landmark_id = ?')
    .bind(buildingId, landmarkId).first<Cached>();
  if (cached && cached.expires_at > Date.now()) return NextResponse.json({ minutes: Math.max(1, Math.ceil(cached.duration_seconds / 60)), distanceMeters: cached.distance_meters, provider: 'HERE', cached: true });

  const url = new URL('https://router.hereapi.com/v8/routes');
  url.searchParams.set('transportMode', 'scooter');
  url.searchParams.set('routingMode', 'fast');
  url.searchParams.set('origin', `${building.latitude},${building.longitude}`);
  url.searchParams.set('destination', `${landmark.latitude},${landmark.longitude}`);
  url.searchParams.set('return', 'summary');
  url.searchParams.set('apikey', env.HERE_API_KEY);
  let response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(8000) }); }
  catch { return NextResponse.json({ error: 'Routing service unavailable' }, { status: 502 }); }
  if (!response.ok) return NextResponse.json({ error: 'Routing service unavailable' }, { status: 502 });
  const data = await response.json() as HereResponse;
  const sections = data.routes?.[0]?.sections || [];
  const seconds = sections.reduce((sum, section) => sum + (section.summary?.duration || 0), 0);
  const distance = sections.reduce((sum, section) => sum + (section.summary?.length || 0), 0);
  if (!sections.length || !Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(distance) || distance <= 0)
    return NextResponse.json({ error: 'No scooter route found' }, { status: 404 });
  await env.DB.prepare('INSERT INTO travel_time_cache (building_id, landmark_id, duration_seconds, distance_meters, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(building_id, landmark_id) DO UPDATE SET duration_seconds=excluded.duration_seconds, distance_meters=excluded.distance_meters, expires_at=excluded.expires_at')
    .bind(buildingId, landmarkId, Math.ceil(seconds), Math.ceil(distance), Date.now() + 86_400_000).run();
  return NextResponse.json({ minutes: Math.max(1, Math.ceil(seconds / 60)), distanceMeters: Math.ceil(distance), provider: 'HERE', cached: false });
}
