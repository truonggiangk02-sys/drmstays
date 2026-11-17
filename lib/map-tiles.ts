import type * as Leaflet from 'leaflet';

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
const OSM_FR_URL = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
const ESRI_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

/**
 * Adds the street map to a Leaflet map. Free tile servers sometimes refuse or slow requests, so the map moves down a list of
 * providers (OpenStreetMap, OpenStreetMap France, Esri) when most of the tiles of the current one fail, and calls onFail when the
 * last one fails too so the page can offer a Google Maps link. Providers that need an API key are not used.
 */
export function addResilientTiles(L: typeof Leaflet, map: Leaflet.Map, onFail?: () => void) {
  const layers = [
    L.tileLayer(OSM_URL, { maxZoom: 19, attribution: OSM_ATTRIBUTION }),
    L.tileLayer(OSM_FR_URL, { maxZoom: 19, subdomains: 'abc', attribution: `${OSM_ATTRIBUTION} &copy; OpenStreetMap France` }),
    L.tileLayer(ESRI_URL, { maxZoom: 19, attribution: 'Tiles &copy; Esri' }),
  ];
  let current = 0, loaded = 0, errors = 0, gaveUp = false;
  layers[0].addTo(map);
  layers.forEach((layer, index) => {
    layer.on('tileload', () => { if (index === current) loaded += 1; });
    layer.on('tileerror', () => {
      if (index !== current) return;
      errors += 1;
      if (errors < 4 || errors <= loaded * 2) return;
      map.removeLayer(layer);
      errors = 0; loaded = 0;
      if (current < layers.length - 1) { current += 1; layers[current].addTo(map); }
      else if (!gaveUp) { gaveUp = true; onFail?.(); }
    });
  });
}
