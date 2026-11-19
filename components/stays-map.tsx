'use client';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { addResilientTiles } from '@/lib/map-tiles';

export type StaysPin = { id: string; name: string; latitude: number; longitude: number; label: string; approximate: boolean };
export type StaysPlace = { id: string; name: string; latitude: number; longitude: number };

/** Map beside the room results: one pin per building that still has a matching room, so it follows every filter. */
export function StaysMap({ pins, places, activeId, hoverId, onPick, lang, visible }: { pins: StaysPin[]; places: StaysPlace[]; activeId: string; hoverId: string; onPick: (id: string) => void; lang: 'vi' | 'en'; visible: boolean }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const leaflet = useRef<typeof Leaflet | null>(null);
  const pinLayer = useRef<Leaflet.LayerGroup | null>(null);
  const placeLayer = useRef<Leaflet.LayerGroup | null>(null);
  const markers = useRef<Map<string, Leaflet.Marker>>(new Map());
  const pick = useRef(onPick);
  const [ready, setReady] = useState(0);
  const [failed, setFailed] = useState(false);
  const [showPlaces, setShowPlaces] = useState(false);
  useEffect(() => { pick.current = onPick; }, [onPick]);

  useEffect(() => {
    if (!element.current || map.current) return;
    let cancelled = false;
    import('leaflet').then(L => {
      if (cancelled || !element.current) return;
      leaflet.current = L;
      const instance = L.map(element.current, { scrollWheelZoom: false, zoomControl: false }).setView([16.0544, 108.242], 12);
      addResilientTiles(L, instance, () => setFailed(true));
      L.control.zoom({ position: 'bottomleft' }).addTo(instance);
      pinLayer.current = L.layerGroup().addTo(instance);
      placeLayer.current = L.layerGroup().addTo(instance);
      map.current = instance;
      setReady(value => value + 1);
    });
    const markerMap = markers.current;
    return () => { cancelled = true; map.current?.remove(); map.current = null; pinLayer.current = null; placeLayer.current = null; markerMap.clear(); };
  }, []);

  useEffect(() => {
    const L = leaflet.current, instance = map.current;
    if (!L || !instance || !pinLayer.current) return;
    pinLayer.current.clearLayers();
    markers.current.clear();
    for (const pin of pins) {
      const icon = L.divIcon({ className: `drm-map-pin drm-price-pin${pin.approximate ? ' is-approximate' : ''}`, html: `<span class="drm-price-pin-core">${pin.label || '<i></i>'}</span>`, iconSize: [72, 40], iconAnchor: [36, 40] });
      const marker = L.marker([pin.latitude, pin.longitude], { icon, title: pin.name, keyboard: true }).addTo(pinLayer.current);
      marker.on('click', () => pick.current(pin.id));
      markers.current.set(pin.id, marker);
    }
    if (pins.length && element.current?.offsetWidth) {
      instance.invalidateSize();
      const bounds = L.latLngBounds(pins.map(pin => [pin.latitude, pin.longitude] as Leaflet.LatLngExpression));
      if (pins.length === 1) instance.setView(bounds.getCenter(), 14, { animate: false });
      else instance.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: false });
    }
  }, [pins, ready]);

  // The map lives in a panel that slides open: once it has its size, measure again and frame the pins.
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      const L = leaflet.current, instance = map.current;
      if (!L || !instance || !element.current?.offsetWidth) return;
      instance.invalidateSize();
      if (pins.length > 1) instance.fitBounds(L.latLngBounds(pins.map(pin => [pin.latitude, pin.longitude] as Leaflet.LatLngExpression)), { padding: [60, 60], maxZoom: 14, animate: false });
      else if (pins.length === 1) instance.setView([pins[0].latitude, pins[0].longitude], 14, { animate: false });
    }, 520);
    return () => window.clearTimeout(timer);
  }, [visible, pins, ready]);

  useEffect(() => {
    for (const [id, marker] of markers.current) marker.getElement()?.classList.toggle('is-selected', id === activeId || id === hoverId);
  }, [activeId, hoverId, pins, ready]);

  useEffect(() => {
    const L = leaflet.current;
    if (!L || !placeLayer.current) return;
    placeLayer.current.clearLayers();
    if (!showPlaces) return;
    for (const place of places) {
      const marker = L.marker([place.latitude, place.longitude], { icon: L.divIcon({ className: 'drm-place-pin', html: '<span class="drm-place-pin-core"></span>', iconSize: [44, 44], iconAnchor: [22, 22] }), title: place.name });
      marker.bindTooltip(place.name, { direction: 'top' });
      marker.addTo(placeLayer.current);
    }
  }, [places, showPlaces, ready]);

  return <div className="stays-map">
    <div ref={element} className="map-canvas" role="group" aria-label={lang === 'vi' ? 'Bản đồ các tòa có phòng phù hợp' : 'Map of buildings with matching rooms'} />
    {!ready && <div className="map-loading" role="status">{lang === 'vi' ? 'Đang tải bản đồ…' : 'Loading map…'}</div>}
    {places.length > 0 && <label className="stays-map-places"><input type="checkbox" checked={showPlaces} onChange={event => setShowPlaces(event.target.checked)} />{lang === 'vi' ? 'Hiện địa điểm quanh khu vực' : 'Show nearby places'}</label>}
    {failed && <p className="map-tiles-note" role="status">{lang === 'vi' ? 'Nền bản đồ đang tạm thời không tải được.' : 'The map background is temporarily unavailable.'}</p>}
    {ready > 0 && pins.length === 0 && <p className="stays-map-empty">{lang === 'vi' ? 'Chưa có tòa nào có vị trí cho bộ lọc này.' : 'No building with a known location matches.'}</p>}
  </div>;
}
