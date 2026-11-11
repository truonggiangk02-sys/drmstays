'use client';

import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';

type Place = { id: string; name: string; latitude: number; longitude: number };

const words = {
  vi: { map: 'Bản đồ vị trí', open: 'Mở trong Google Maps', nearby: 'Địa điểm gần đây', route: 'Chỉ đường', approximate: 'Ghim chỉ mang tính tham khảo theo khu vực, chưa phải đúng cửa tòa.', loading: 'Đang tải bản đồ…' },
  en: { map: 'Location map', open: 'Open in Google Maps', nearby: 'Nearby places', route: 'Directions', approximate: 'The pin is an approximate area reference, not the confirmed entrance.', loading: 'Loading map…' },
} as const;

function routeUrl(from: { latitude: number; longitude: number } | null, place: Place) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  if (from) url.searchParams.set('origin', `${from.latitude},${from.longitude}`);
  url.searchParams.set('destination', `${place.latitude},${place.longitude}`);
  url.searchParams.set('travelmode', 'two-wheeler');
  return url.toString();
}

/** Map of one building with its nearby places, shown inside the building page itself. */
export function BuildingMap({ lang, name, address, latitude, longitude, approximate = false, places }: { lang: 'vi' | 'en'; name: string; address?: string; latitude: number | null; longitude: number | null; approximate?: boolean; places: Place[] }) {
  const w = words[lang];
  const element = useRef<HTMLDivElement>(null);
  const positioned = typeof latitude === 'number' && typeof longitude === 'number';
  const origin = positioned && !approximate ? { latitude: latitude as number, longitude: longitude as number } : null;
  const shown = places.slice(0, 6);
  const googleUrl = positioned
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || name)}`;

  useEffect(() => {
    if (!positioned || !element.current) return;
    let cancelled = false;
    let instance: Leaflet.Map | null = null;
    import('leaflet').then(L => {
      if (cancelled || !element.current) return;
      instance = L.map(element.current, { scrollWheelZoom: false, zoomControl: false }).setView([latitude as number, longitude as number], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      }).addTo(instance);
      L.control.zoom({ position: 'bottomright' }).addTo(instance);
      const points: Leaflet.LatLngExpression[] = [[latitude as number, longitude as number]];
      L.marker([latitude as number, longitude as number], {
        icon: L.divIcon({ className: `drm-map-pin${approximate ? ' is-approximate' : ''}`, html: '<span class="drm-map-pin-core"></span>', iconSize: [38, 44], iconAnchor: [19, 41] }),
        title: name,
      }).addTo(instance);
      for (const place of shown) {
        L.marker([place.latitude, place.longitude], {
          icon: L.divIcon({ className: 'drm-place-pin', html: '<span class="drm-place-pin-core"></span>', iconSize: [44, 44], iconAnchor: [22, 22] }),
          title: place.name,
        }).addTo(instance);
        points.push([place.latitude, place.longitude]);
      }
      if (points.length > 1) instance.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    });
    return () => { cancelled = true; instance?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, approximate, places.length]);

  return <div className="dv-map">
    {address && <p className="dv-map-address">{address}</p>}
    {positioned && <div className="dv-map-frame" ref={element} role="region" aria-label={`${w.map}: ${name}`} />}
    {positioned && approximate && <p className="dv-map-note">{w.approximate}</p>}
    <a className="dv-map-open" href={googleUrl} target="_blank" rel="noopener noreferrer">{w.open} ↗</a>
    {shown.length > 0 && <div className="dv-map-places"><h3>{w.nearby}</h3><ul>{shown.map(place => <li key={place.id}><span>{place.name}</span><a href={routeUrl(origin, place)} target="_blank" rel="noopener noreferrer" aria-label={`${w.route}: ${place.name}`}>{w.route} ↗</a></li>)}</ul></div>}
  </div>;
}
