import type * as Leaflet from 'leaflet';

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
const CARTO_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

/**
 * Adds the street map to a Leaflet map. OpenStreetMap's free tile server sometimes refuses or slows requests; when most of the
 * first tiles fail, the map switches to a second provider, and calls onFail if that fails too so the page can offer a Google Maps link.
 */
export function addResilientTiles(L: typeof Leaflet, map: Leaflet.Map, onFail?: () => void) {
  const primary = L.tileLayer(OSM_URL, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
  const backup = L.tileLayer(CARTO_URL, { maxZoom: 19, subdomains: 'abcd', attribution: `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>` });
  let loaded = 0, errors = 0, switched = false, gaveUp = false;
  primary.on('tileload', () => { loaded += 1; });
  primary.on('tileerror', () => {
    errors += 1;
    if (!switched && errors >= 3 && errors > loaded) { switched = true; errors = 0; loaded = 0; map.removeLayer(primary); backup.addTo(map); }
  });
  backup.on('tileload', () => { loaded += 1; });
  backup.on('tileerror', () => {
    errors += 1;
    if (!gaveUp && errors >= 6 && errors > loaded) { gaveUp = true; onFail?.(); }
  });
}
