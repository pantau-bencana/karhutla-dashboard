import L from "leaflet";
import { BATAS_KUNCI_PETA } from "./geo.js";

const PADDING_BAWAAN = [12, 12];

export function boundsKunciPeta() {
  return L.latLngBounds(
    [BATAS_KUNCI_PETA.south, BATAS_KUNCI_PETA.west],
    [BATAS_KUNCI_PETA.north, BATAS_KUNCI_PETA.east],
  );
}

export function petaSiap(map) {
  const size = map?.getSize?.();
  return Boolean(size && size.x >= 80 && size.y >= 80);
}

function padPixel(padding) {
  const pad = padding || PADDING_BAWAAN;
  return L.point(pad[0], pad[1]).multiplyBy(2);
}

// Zoom yang memuat seluruh kotak Indonesia pada ukuran wadah saat ini.
// minZoom disetel 0 dulu karena getBoundsZoom tidak mengembalikan nilai di bawah lantai.
export function zoomMuatIndonesia(map, padding = PADDING_BAWAAN) {
  const sebelumnya = map.getMinZoom();
  map.options.zoomSnap = 0;
  map.setMinZoom(0);
  const zoom = map.getBoundsZoom(boundsKunciPeta(), false, padPixel(padding));
  map.setMinZoom(Number.isFinite(sebelumnya) ? sebelumnya : 0);
  return Number.isFinite(zoom) ? zoom : 0;
}

// Kunci geser (maxBounds + viscosity 1) dan lantai zoom.
// muatUlang: tampilan menjadi seluruh Indonesia, lalu minZoom = zoom hasil fit.
// Tanpa muatUlang: lantai dihitung ulang, pusat yang ada (zoom provinsi / titik) dipertahankan.
export function kunciTampilanIndonesia(map, { muatUlang = true, padding = PADDING_BAWAAN, bounds = null } = {}) {
  if (!petaSiap(map)) return false;
  const kotak = bounds?.isValid?.() ? bounds : boundsKunciPeta();
  map.stop();
  map.options.zoomSnap = 0;
  map.options.worldCopyJump = false;
  map.options.maxBoundsViscosity = 1;
  if (muatUlang || !map._loaded) {
    map.setMaxBounds(null);
    map.setMinZoom(0);
    map.fitBounds(kotak, { padding, animate: false });
    const zoom = map.getZoom();
    map.setMinZoom(Number.isFinite(zoom) ? zoom : 0);
    map.setMaxBounds(kotak);
    return true;
  }
  const pusat = map.getCenter();
  const zoom = map.getZoom();
  const lantai = zoomMuatIndonesia(map, padding);
  map.setMinZoom(lantai);
  map.setMaxBounds(kotak);
  if (!Number.isFinite(zoom) || zoom < lantai) map.setView(pusat, lantai, { animate: false });
  return true;
}

export function tampilanMasihIndonesia(map) {
  if (!map?._loaded) return true;
  const zoom = map.getZoom();
  const lantai = map.getMinZoom();
  return !Number.isFinite(zoom) || !Number.isFinite(lantai) || zoom <= lantai + 0.05;
}
