'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';

export type MapBuilding = {
  id: string;
  name: string;
  address: string;
  imageUrl: string;
  imageAlt?: string;
  imageIsIllustrative?: boolean;
  photos?: { url: string; alt: string }[];
  monthlyPrice: number | null;
  roomCount: number;
  latitude: number | null;
  longitude: number | null;
  coordinateApproximate?: boolean;
};

export type MapLandmark = {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  buildingIds: string[];
  routeMinutes?: number | null;
};

type Language = 'vi' | 'en';
const formatMoney = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount);
const text = {
  vi: {
    heading: 'Chọn nơi ở theo cách bạn khám phá Đà Nẵng', subtitle: 'Chọn tòa nhà, xem các điểm đến trên bản đồ và mở đường đi xe máy trong Google Maps.',
    buildings: 'Tòa nhà', map: 'Bản đồ', rooms: 'loại phòng', from: 'Từ', month: 'tháng', view: 'Xem phòng trong tòa',
    places: 'Địa điểm trên bản đồ', select: 'Chọn một tòa để xem các điểm đến.',
    morePlaces: 'Xem thêm địa điểm', fewerPlaces: 'Thu gọn địa điểm',
    directions: 'Xem tuyến xe máy trên Google Maps', time: 'Tuyến đường xe máy', timePending: 'Chưa có dữ liệu tuyến đường', timeAction: 'Xem thời gian đi xe máy', timeLoading: 'Đang lấy tuyến đường…', timeUnavailable: 'Chưa lấy được tuyến đường. Bạn vẫn có thể mở trong Google Maps.', timeApproximate: 'Chọn điểm xuất phát trong Google Maps để xem thời gian thực tế.', minutes: 'phút', distance: 'km',
    noPin: 'Vị trí ghim của tòa này đang chờ xác nhận.', noPlaces: 'Chưa có địa điểm công khai cho tòa này.',
    mapNote: 'Tòa này chưa có tọa độ. Hãy xem địa chỉ trong thẻ tòa nhà.',
    mapLoading: 'Đang tải bản đồ…',
    approximate: 'Ghim tòa chỉ là vị trí tham khảo theo khu vực, chưa phải đúng cửa tòa.',
    mapHelp: 'Ghim xanh là tòa nhà, ghim nâu là địa điểm. Chạm ghim để xem chi tiết.', selectedPlace: 'Địa điểm đã chọn', reference: 'Vị trí tham khảo', confirmed: 'Vị trí đã xác nhận', allPlaces: 'địa điểm', closePlace: 'Đóng chi tiết địa điểm', viewList: 'Xem danh sách địa điểm', fitAll: 'Xem tất cả ghim', illustrative: 'Ảnh minh họa', previousPhoto: 'Ảnh trước', nextPhoto: 'Ảnh tiếp', routeOnMap: 'Tuyến trên bản đồ chưa sẵn sàng; hãy xem tuyến xe máy trong Google Maps.',
  },
  en: {
    heading: 'Find a stay around your Da Nang plans', subtitle: 'Choose a building, explore places on the map and open motorcycle directions in Google Maps.',
    buildings: 'Buildings', map: 'Map', rooms: 'room types', from: 'From', month: 'month', view: 'Explore rooms',
    places: 'Places on the map', select: 'Choose a building to see places.',
    morePlaces: 'Show more places', fewerPlaces: 'Show fewer places',
    directions: 'View motorcycle route in Google Maps', time: 'Motorcycle route', timePending: 'No route data yet', timeAction: 'Check motorcycle route time', timeLoading: 'Checking route…', timeUnavailable: 'Route data is unavailable. You can still open directions in Google Maps.', timeApproximate: 'Choose your starting point in Google Maps to see the actual travel time.', minutes: 'min', distance: 'km',
    noPin: 'This building pin is waiting for its location to be confirmed.', noPlaces: 'No places have been published for this building yet.',
    mapNote: 'This building has no coordinates yet. See its address in the building card.',
    mapLoading: 'Loading map…',
    approximate: 'The building pin is an approximate area reference, not its confirmed entrance.',
    mapHelp: 'Green pins are buildings; brown pins are places. Select a pin for details.', selectedPlace: 'Selected place', reference: 'Approximate location', confirmed: 'Confirmed location', allPlaces: 'places', closePlace: 'Close place details', viewList: 'View place list', fitAll: 'Show all pins', illustrative: 'Illustrative photo', previousPhoto: 'Previous photo', nextPhoto: 'Next photo', routeOnMap: 'The route is not available on this map yet; view motorcycle directions in Google Maps.',
  },
} as const;

function directionsUrl(building: MapBuilding, place: MapLandmark) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  if (!building.coordinateApproximate && building.latitude !== null && building.longitude !== null) url.searchParams.set('origin', `${building.latitude},${building.longitude}`);
  url.searchParams.set('destination', `${place.latitude},${place.longitude}`);
  url.searchParams.set('travelmode', 'two-wheeler');
  return url.toString();
}

function isPositioned(building: MapBuilding): building is MapBuilding & { latitude: number; longitude: number } {
  return typeof building.latitude === 'number' && Number.isFinite(building.latitude) && typeof building.longitude === 'number' && Number.isFinite(building.longitude);
}

function validRoutePath(value: unknown): [number, number][] | undefined {
  if (!Array.isArray(value) || value.length < 2 || value.length > 10_000) return undefined;
  const path: [number, number][] = [];
  for (const point of value) {
    if (!Array.isArray(point) || point.length !== 2 || typeof point[0] !== 'number' || typeof point[1] !== 'number' || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180) return undefined;
    path.push([point[0], point[1]]);
  }
  return path;
}

export function MapExplorer({ buildings, landmarks, lang, dateQuery = '' }: { buildings: MapBuilding[]; landmarks: MapLandmark[]; lang: Language; dateQuery?: string }) {
  const t = text[lang];
  const [selectedId, setSelectedId] = useState(buildings[0]?.id || '');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [showAllPlaces, setShowAllPlaces] = useState(false);
  const [mapReady, setMapReady] = useState(0);
  const [routeState, setRouteState] = useState<{ key: string; status: 'loading' | 'ready' | 'unavailable'; minutes?: number; distanceMeters?: number; path?: [number, number][] } | null>(null);
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const leaflet = useRef<typeof Leaflet | null>(null);
  const markers = useRef<Map<string, Leaflet.Marker>>(new Map());
  const placeMarkers = useRef<Map<string, Leaflet.Marker>>(new Map());
  const landmarkLayer = useRef<Leaflet.LayerGroup | null>(null);
  const routeLayer = useRef<Leaflet.Polyline | null>(null);
  const placeTitle = useRef<HTMLHeadingElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const placeTrigger = useRef<HTMLElement | null>(null);
  const routeRequestId = useRef(0);
  const selected = buildings.find(building => building.id === selectedId) || buildings[0];
  const nearby = useMemo(() => {
    if (!selected) return [];
    const relevant = landmarks.filter(place => !place.buildingIds.length || place.buildingIds.includes(selected.id));
    if (!isPositioned(selected)) return relevant;
    return relevant;
  }, [landmarks, selected]);
  const visiblePlaces = useMemo(() => showAllPlaces ? nearby : nearby.slice(0, 8), [nearby, showAllPlaces]);
  const selectedPlace = nearby.find(place => place.id === selectedPlaceId) || null;
  const selectedPhotos = selected?.photos?.length ? selected.photos : selected ? [{ url: selected.imageUrl, alt: selected.imageAlt || selected.name }] : [];
  const selectedPhoto = selectedPhotos[Math.min(selectedPhotoIndex, selectedPhotos.length - 1)];
  const routeKey = selected && selectedPlace ? `${selected.id}:${selectedPlace.id}` : '';
  const shownMinutes = selected && isPositioned(selected) && !selected.coordinateApproximate
    ? selectedPlace?.routeMinutes ?? (routeState?.key === routeKey && routeState.status === 'ready' ? routeState.minutes : null)
    : null;
  const shownDistance = routeState?.key === routeKey && routeState.status === 'ready' ? routeState.distanceMeters : null;
  const shownPath = routeState?.key === routeKey && routeState.status === 'ready' ? routeState.path : undefined;

  function chooseBuilding(id: string) {
    routeRequestId.current += 1;
    setSelectedId(id);
    setSelectedPlaceId(null);
    setShowAllPlaces(false);
    setRouteState(null);
    setSelectedPhotoIndex(0);
    setMobileView('map');
  }

  async function checkRouteTime(place: MapLandmark) {
    if (!selected || !isPositioned(selected) || selected.coordinateApproximate) return;
    const key = `${selected.id}:${place.id}`;
    const requestId = ++routeRequestId.current;
    setRouteState({ key, status: 'loading' });
    try {
      const url = new URL('/api/travel-time', window.location.origin);
      url.searchParams.set('buildingId', selected.id);
      url.searchParams.set('landmarkId', place.id);
      const response = await fetch(url);
      const result = await response.json() as { minutes?: unknown; distanceMeters?: unknown; path?: unknown };
      if (!response.ok || typeof result.minutes !== 'number' || !Number.isInteger(result.minutes) || result.minutes <= 0) throw new Error('Route unavailable');
      if (requestId === routeRequestId.current) setRouteState({ key, status: 'ready', minutes: result.minutes, distanceMeters: typeof result.distanceMeters === 'number' && Number.isFinite(result.distanceMeters) && result.distanceMeters > 0 ? result.distanceMeters : undefined, path: validRoutePath(result.path) });
    } catch {
      if (requestId === routeRequestId.current) setRouteState({ key, status: 'unavailable' });
    }
  }

  useEffect(() => {
    if (!mapElement.current || map.current) return;
    let cancelled = false;
    const buildingMarkers = markers.current;
    const landmarkMarkers = placeMarkers.current;
    import('leaflet').then(L => {
      if (cancelled || !mapElement.current) return;
      leaflet.current = L;
      const instance = L.map(mapElement.current, { scrollWheelZoom: false, zoomControl: false }).setView([16.0544, 108.242], 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      }).addTo(instance);
      L.control.zoom({ position: 'bottomleft' }).addTo(instance);
      map.current = instance;
      const points: Leaflet.LatLngExpression[] = [];
      for (const building of buildings.filter(isPositioned)) {
        const icon = L.divIcon({ className: `drm-map-pin${building.coordinateApproximate ? ' is-approximate' : ''}`, html: '<span class="drm-map-pin-core"></span>', iconSize: [38, 44], iconAnchor: [19, 41] });
        const marker = L.marker([building.latitude, building.longitude], { icon, title: building.name }).addTo(instance);
        marker.on('click', () => chooseBuilding(building.id));
        buildingMarkers.set(building.id, marker);
        points.push([building.latitude, building.longitude]);
      }
      if (points.length > 1 && mapElement.current.offsetWidth > 0 && mapElement.current.offsetHeight > 0) instance.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 14 });
      else if (points.length === 1) instance.setView(points[0], 14);
      landmarkLayer.current = L.layerGroup().addTo(instance);
      setMapReady(value => value + 1);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      buildingMarkers.clear();
      landmarkMarkers.clear();
      landmarkLayer.current = null;
      routeLayer.current = null;
    };
  }, [buildings]);

  useEffect(() => {
    const L = leaflet.current, instance = map.current;
    if (!L || !instance) return;
    for (const [id, marker] of markers.current) marker.getElement()?.classList.toggle('is-selected', id === selectedId);
    landmarkLayer.current?.clearLayers();
    placeMarkers.current.clear();
    for (const place of nearby) {
      const icon = L.divIcon({ className: 'drm-place-pin', html: '<span class="drm-place-pin-core"></span>', iconSize: [44, 44], iconAnchor: [22, 22] });
      const marker = L.marker([place.latitude, place.longitude], { icon, title: place.name, keyboard: true });
      const label = document.createElement('span');
      label.textContent = place.name;
      marker.bindTooltip(label, { direction: 'top' });
      marker.on('click', () => { placeTrigger.current = marker.getElement() || null; setSelectedPlaceId(place.id); });
      marker.addTo(landmarkLayer.current!);
      marker.getElement()?.setAttribute('aria-label', place.name);
      placeMarkers.current.set(place.id, marker);
    }
    if (selected && isPositioned(selected) && mapElement.current?.offsetWidth && mapElement.current?.offsetHeight) {
      const point: Leaflet.LatLngExpression = [selected.latitude, selected.longitude];
      const zoom = Number.isFinite(instance.getZoom()) ? Math.max(instance.getZoom(), 13) : 13;
      instance.setView(point, zoom, { animate: false });
    }
    requestAnimationFrame(() => { if (map.current === instance) instance.invalidateSize(); });
  }, [selectedId, nearby, selected, mapReady]);

  useEffect(() => {
    for (const [id, marker] of placeMarkers.current) marker.getElement()?.classList.toggle('is-selected', id === selectedPlaceId);
    if (!selectedPlaceId) return;
    const place = nearby.find(item => item.id === selectedPlaceId);
    if (!place || !map.current || !mapElement.current?.offsetWidth || !mapElement.current?.offsetHeight) return;
    const instance = map.current;
    requestAnimationFrame(() => {
      if (map.current !== instance || !mapElement.current?.offsetWidth || !mapElement.current?.offsetHeight) return;
      instance.invalidateSize();
      const zoom = Number.isFinite(instance.getZoom()) ? Math.max(instance.getZoom(), 13) : 13;
      instance.setView([place.latitude, place.longitude], zoom, { animate: false });
      placeMarkers.current.get(place.id)?.openTooltip();
    });
  }, [selectedPlaceId, nearby, mapReady]);

  useEffect(() => {
    if (!selectedPlaceId) return;
    const frame = requestAnimationFrame(() => placeTitle.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [selectedPlaceId, mobileView]);

  useEffect(() => {
    routeLayer.current?.remove();
    routeLayer.current = null;
    const L = leaflet.current, instance = map.current;
    if (!L || !instance || !shownPath || !selected || !isPositioned(selected) || selected.coordinateApproximate) return;
    routeLayer.current = L.polyline(shownPath, { color: '#a86e45', weight: 5, opacity: .95, lineJoin: 'round' }).addTo(instance);
  }, [shownPath, selected, mapReady]);

  useEffect(() => {
    if (mobileView !== 'map') return;
    requestAnimationFrame(() => {
      const instance = map.current;
      if (!instance) return;
      instance.invalidateSize();
      if (selected && isPositioned(selected) && !selectedPlaceId) instance.setView([selected.latitude, selected.longitude], 13);
    });
  }, [mobileView, selected, selectedPlaceId]);

  function showPlace(place: MapLandmark, trigger: HTMLElement) {
    placeTrigger.current = trigger;
    setSelectedPlaceId(place.id);
    setMobileView('map');
  }

  function closePlace() {
    const placeId = selectedPlaceId;
    setSelectedPlaceId(null);
    requestAnimationFrame(() => {
      const trigger = placeTrigger.current;
      if (trigger?.getClientRects().length) trigger.focus();
      else if (placeId) placeMarkers.current.get(placeId)?.getElement()?.focus();
    });
  }

  function returnToList() {
    setSelectedPlaceId(null);
    setMobileView('list');
    requestAnimationFrame(() => listHeading.current?.focus());
  }

  function showAllPins() {
    const L = leaflet.current, instance = map.current;
    if (!L || !instance) return;
    const points: Leaflet.LatLngExpression[] = [
      ...buildings.filter(isPositioned).map(building => [building.latitude, building.longitude] as Leaflet.LatLngExpression),
      ...nearby.map(place => [place.latitude, place.longitude] as Leaflet.LatLngExpression),
    ];
    if (points.length) instance.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14, animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  }

  return <section className="map-explorer" aria-label={t.heading}>
    <div className="map-explorer-intro"><div><h2>{t.heading}</h2><p>{t.subtitle}</p></div><span>{buildings.length} {t.buildings.toLowerCase()} <i aria-hidden="true">/</i> {landmarks.length} {t.allPlaces}</span></div>
    <div className="map-mobile-switch" role="group" aria-label={t.heading}><button type="button" aria-pressed={mobileView === 'list'} className={mobileView === 'list' ? 'active' : ''} onClick={() => setMobileView('list')}>{t.buildings} & {t.places}</button><button type="button" aria-pressed={mobileView === 'map'} className={mobileView === 'map' ? 'active' : ''} onClick={() => setMobileView('map')}>{t.map}</button></div>
    <div className="map-explorer-body">
      <div className={`map-explorer-list ${mobileView === 'map' ? 'mobile-hidden' : ''}`}>
        <div className="map-list-heading"><h3 ref={listHeading} tabIndex={-1}>{t.buildings}</h3><span>{buildings.length}</span></div>
        {buildings.map(building => <article key={building.id} className={`map-building ${selected?.id === building.id ? 'is-selected' : ''}`}>
          <button type="button" className="map-building-select" aria-pressed={selected?.id === building.id} onClick={() => chooseBuilding(building.id)}>
            <img src={building.imageUrl || '/drm-stay-logo.png'} alt="" loading="lazy" /><span className="map-building-copy"><strong>{building.name}</strong><small>{building.address}</small><span className="map-building-meta">{building.roomCount} {t.rooms}{building.monthlyPrice ? ` · ${t.from} ${formatMoney(building.monthlyPrice)} ₫ / ${t.month}` : ''}</span><em className={building.coordinateApproximate ? 'approximate' : ''}>{!isPositioned(building) ? t.noPin : building.coordinateApproximate ? t.reference : t.confirmed}</em></span>
          </button>
          <Link href={`/${lang}/buildings/${building.id}${dateQuery}`} className="map-building-link">{t.view} <span aria-hidden="true">↗</span></Link>
        </article>)}
        {selected && <div className="map-nearby"><div className="map-nearby-heading"><h3>{t.places}</h3><span>{nearby.length}</span></div>{!isPositioned(selected) && <p className="map-nearby-hint">{t.noPin}</p>}{nearby.length ? <><div className="map-nearby-list">{visiblePlaces.map(place => <button type="button" className={`map-place-row ${selectedPlaceId === place.id ? 'is-selected' : ''}`} key={place.id} aria-pressed={selectedPlaceId === place.id} onClick={(event) => showPlace(place, event.currentTarget)}><span><strong>{place.name}</strong>{place.description && <small>{place.description}</small>}</span><span aria-hidden="true">↗</span></button>)}</div>{nearby.length > 8 && <button className="map-more-places" type="button" aria-expanded={showAllPlaces} onClick={() => setShowAllPlaces(value => !value)}>{showAllPlaces ? t.fewerPlaces : `${t.morePlaces} (${nearby.length - 8})`}</button>}</> : <p>{t.noPlaces}</p>}</div>}
      </div>
      <div className={`map-explorer-map ${mobileView === 'list' ? 'mobile-hidden' : ''}`}>
        <div ref={mapElement} className="map-canvas" role="group" aria-label={`${t.map}. ${t.mapHelp}`} />
        {!mapReady && <div className="map-loading" role="status">{t.mapLoading}</div>}
        <div className="map-map-top"><span className="map-legend"><i className="map-legend-building" aria-hidden="true" />{t.buildings} <i className="map-legend-place" aria-hidden="true" />{t.places}</span><span className="map-map-help">{t.mapHelp}</span><button type="button" className="map-fit-all" onClick={showAllPins}>{t.fitAll}</button></div>
        {selected && <div className={`map-selected-building ${selectedPlace ? 'is-route-open' : ''}`} role="region" aria-label={selected.name}>
          <div className="map-selected-photo"><img src={selectedPhoto?.url || '/drm-stay-logo.png'} alt={selectedPhoto?.alt || selected.name} />{selected.imageIsIllustrative && <span className="map-photo-label">{t.illustrative}</span>}{selectedPhotos.length > 1 && <div className="map-photo-controls"><button type="button" aria-label={t.previousPhoto} onClick={() => setSelectedPhotoIndex(index => (index - 1 + selectedPhotos.length) % selectedPhotos.length)}>‹</button><span>{selectedPhotoIndex + 1} / {selectedPhotos.length}</span><button type="button" aria-label={t.nextPhoto} onClick={() => setSelectedPhotoIndex(index => (index + 1) % selectedPhotos.length)}>›</button></div>}</div>
          <div className="map-selected-content"><small className="map-selected-eyebrow">{t.buildings}</small><strong>{selected.name}</strong><p>{selected.address}</p><span className="map-selected-meta">{selected.roomCount} {t.rooms}{selected.monthlyPrice ? ` · ${t.from} ${formatMoney(selected.monthlyPrice)} ₫ / ${t.month}` : ''}</span><small className="map-selected-location">{!isPositioned(selected) ? t.noPin : selected.coordinateApproximate ? t.approximate : t.confirmed}</small><Link href={`/${lang}/buildings/${selected.id}${dateQuery}`}>{t.view} <span aria-hidden="true">↗</span></Link></div>
        </div>}
        {selected && selectedPlace && <div className="map-place-detail" role="region" aria-label={`${t.selectedPlace}: ${selectedPlace.name}`}><button className="map-place-close" type="button" aria-label={t.closePlace} onClick={closePlace}>×</button><small>{t.selectedPlace}</small><h3 ref={placeTitle} tabIndex={-1}>{selectedPlace.name}</h3>{selectedPlace.description && <p>{selectedPlace.description}</p>}<div className="map-route-time" role="status"><strong>{t.time}</strong>{shownMinutes ? <span>{shownMinutes} {t.minutes}{shownDistance ? ` · ${(shownDistance / 1000).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 })} ${t.distance}` : ''}</span> : !isPositioned(selected) || selected.coordinateApproximate ? <span>{t.timeApproximate}</span> : routeState?.key === routeKey && routeState.status === 'loading' ? <span>{t.timeLoading}</span> : routeState?.key === routeKey && routeState.status === 'unavailable' ? <span>{t.timeUnavailable}</span> : <span>{t.timePending}</span>}</div>{!shownMinutes && isPositioned(selected) && !selected.coordinateApproximate && (routeState?.key !== routeKey || routeState.status !== 'loading') && <button className="map-time-action" type="button" onClick={() => checkRouteTime(selectedPlace)}>{t.timeAction}</button>}{!shownPath && isPositioned(selected) && !selected.coordinateApproximate && <p className="map-route-hint">{t.routeOnMap}</p>}<a className="map-directions" href={directionsUrl(selected, selectedPlace)} target="_blank" rel="noopener noreferrer">{t.directions} <span aria-hidden="true">↗</span></a><button type="button" className="map-place-back-to-list" onClick={returnToList}>{t.viewList}</button></div>}
        <button type="button" className="map-back-to-list" onClick={returnToList}>{t.viewList}</button>
      </div>
    </div>
  </section>;
}
