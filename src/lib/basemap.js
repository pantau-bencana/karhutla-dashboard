// Peta dasar tanpa kunci. Kebijakan ubin OSM:
// https://operations.osmfoundation.org/policies/tiles/
// Peramban mengirim referer sendiri. Jangan set referrerpolicy no-referrer.
// Leaflet hanya meminta petak yang terlihat, ditambah penyangga kecil, saat geser selesai.

export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';
export const OSM_MAX_ZOOM = 19;

export function osmTileLayer(leaflet) {
  return leaflet.tileLayer(OSM_TILE_URL, {
    maxZoom: OSM_MAX_ZOOM,
    attribution: OSM_ATTRIBUTION,
    updateWhenIdle: true,
    keepBuffer: 1,
  });
}
