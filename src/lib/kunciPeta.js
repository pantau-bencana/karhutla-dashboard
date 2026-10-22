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
export function zoomMuatIndonesia(map, padding = PADDING_BAWAAN, bounds = null) {
  const kotak = bounds?.isValid?.() ? bounds : boundsKunciPeta();
  const sebelumnya = map.getMinZoom();
  map.options.zoomSnap = 0;
  map.setMinZoom(0);
  const zoom = map.getBoundsZoom(kotak, false, padPixel(padding));
  map.setMinZoom(Number.isFinite(sebelumnya) ? sebelumnya : 0);
  return Number.isFinite(zoom) ? zoom : 0;
}

// Jejak geser = tampilan nasional pada lantai zoom, dipusatkan di kotak Indonesia.
// Wadah yang lebih tinggi atau lebih lebar daripada kotak itu memperlihatkan
// sedikit laut. Batas geser mengikuti tampilan itu supaya pulau tidak terdorong
// keluar saat viscosity 1 (kotak yang lebih kecil daripada layar membuat
// Leaflet menempel ke satu tepi).
function jejakNasional(map, kotak, zoom) {
  const tengah = kotak.getCenter();
  const setengah = map.getSize().divideBy(2);
  const pusat = map.project(tengah, zoom);
  const nw = map.unproject(pusat.subtract(setengah), zoom);
  const se = map.unproject(pusat.add(setengah), zoom);
  const tampilan = L.latLngBounds(nw, se);
  tampilan.extend(kotak.getSouthWest());
  tampilan.extend(kotak.getNorthEast());
  return tampilan.pad(0.012);
}

function perluasJejak(jejak, bounds) {
  if (!bounds?.isValid?.()) return jejak;
  jejak.extend(bounds.getSouthWest());
  jejak.extend(bounds.getNorthEast());
  return jejak;
}

// Kunci geser (maxBounds + viscosity 1) dan lantai zoom.
// muatUlang: tampilan menjadi seluruh Indonesia, lalu minZoom = zoom hasil fit.
// Tanpa muatUlang: lantai dihitung ulang, pusat yang ada (zoom provinsi / titik) dipertahankan.
// ikut: kotak wilayah yang baru dimuat. Batas geser melebar supaya viscosity 1 tidak mendorongnya keluar.
export function kunciTampilanIndonesia(map, { muatUlang = true, padding = PADDING_BAWAAN, bounds = null, ikut = null } = {}) {
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
    const lantai = Number.isFinite(zoom) ? zoom : 0;
    map.setMinZoom(lantai);
    map.setMaxBounds(jejakNasional(map, kotak, lantai));
    return true;
  }
  const pusat = map.getCenter();
  const zoom = map.getZoom();
  const lantai = zoomMuatIndonesia(map, padding, kotak);
  map.setMinZoom(lantai);
  const jejak = perluasJejak(jejakNasional(map, kotak, lantai), ikut);
  map.setMaxBounds(jejak);
  if (!Number.isFinite(zoom) || zoom < lantai) map.setView(pusat, lantai, { animate: false });
  return true;
}

// Muat satu wilayah. Lantai zoom nasional tidak menimpa zoom yang lebih dekat,
// dan batas geser ikut melebar supaya fitBounds tidak terpantul kembali.
export function muatWilayah(map, bounds, padding = PADDING_BAWAAN) {
  if (!petaSiap(map) || !bounds?.isValid?.()) return false;
  map.invalidateSize({ animate: false, pan: false });
  if (!petaSiap(map)) return false;
  const kotak = boundsKunciPeta();
  const lantai = zoomMuatIndonesia(map, padding, kotak);
  map.stop();
  map.options.zoomSnap = 0;
  map.options.worldCopyJump = false;
  map.options.maxBoundsViscosity = 1;
  map.setMaxBounds(null);
  map.setMinZoom(0);
  map.fitBounds(bounds, { padding, maxZoom: 8, animate: false });
  const zoom = map.getZoom();
  const aman = Number.isFinite(lantai) ? lantai : 0;
  map.setMinZoom(aman);
  if (Number.isFinite(zoom) && zoom < aman) map.setView(bounds.getCenter(), aman, { animate: false });
  map.setMaxBounds(perluasJejak(jejakNasional(map, kotak, map.getMinZoom()), bounds));
  return map.getBounds().intersects(bounds);
}

export function tampilanMasihIndonesia(map) {
  if (!map?._loaded) return true;
  const zoom = map.getZoom();
  const lantai = map.getMinZoom();
  return !Number.isFinite(zoom) || !Number.isFinite(lantai) || zoom <= lantai + 0.05;
}
