export const DESA_UNIDENTIFIED = "Wilayah desa belum teridentifikasi";
export const WILAYAH_UNAVAILABLE = "Identifikasi wilayah BIG tidak tersedia";
export const FILTER_INCOMPLETE =
  "Penyaringan wilayah dan batas Indonesia pada pembaruan ini tidak lengkap karena layanan BIG tidak tersedia. Titik FIRMS tetap ditampilkan. Nama wilayah yang kosong tidak ditebak.";
export const BIG_SOURCE_LABEL = "BIG – Batas Administrasi Desa/Kelurahan";
export const BIG_SERVICE = "https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/BATAS_WILAYAH/MapServer";
export const BIG_DESA_LAYER = 4;
export const BIG_KECAMATAN_LAYER = 3;
export const BIG_EDITION_NOTE =
  "Layer desa (MapServer/4) berjudul Peta Batas Administrasi Desa, edisi Mei 2021, 1.419 wilayah, dan layanan ini tidak mengirim geometrinya. Layer kecamatan (MapServer/3) pada layanan yang sama memuat nama kecamatan, kabupaten/kota, dan provinsi; deskripsi layanannya menyebut revisi 27 Desember 2022. Padanan adalah pencocokan koordinat pada batas peta, bukan verifikasi lapangan. Cakupan dan batas edisi Mei 2021 tidak lengkap untuk seluruh desa di Indonesia.";
export const CONFIDENCE_NOTE =
  "Confidence deteksi satelit. Bukan tingkat bahaya dan bukan tingkat kebakaran. VIIRS memakai l/n/h. Nominal adalah kelas menengah; padanan katanya sedang, dan warna yang dipakai kuning. MODIS 0–100 dipetakan 0–29 rendah, 30–79 nominal, 80–100 tinggi. Nilai asli tidak diubah.";
export const DESA_LINE_ZOOM = 11;
export const MATCH_OFFSET_DEGREES = 0.001;

export const CONFIDENCE_COLORS = Object.freeze({
  rendah: "#15803d",
  nominal: "#ca8a04",
  tinggi: "#b42318",
});

export const CONFIDENCE_LABELS = Object.freeze([
  ["rendah", "Rendah (low / l)"],
  ["nominal", "Nominal (n, padanan: sedang)"],
  ["tinggi", "Tinggi (high / h)"],
]);

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function arcGisContains(geometry, longitude, latitude) {
  const rings = geometry?.rings;
  if (!Array.isArray(rings) || !rings.length) return false;
  let inside = false;
  for (const ring of rings) {
    if (pointInRing(longitude, latitude, ring)) inside = !inside;
  }
  return inside;
}

export function hotspotKey(point) {
  return [point?.tanggal, point?.waktu, point?.lintangTeks || point?.lintang, point?.bujurTeks || point?.bujur, point?.satelit].join("|");
}

export function desaLabel(point) {
  return point?.desa ? point.desa : DESA_UNIDENTIFIED;
}

export function desaGroupKey(point) {
  return [
    point?.kodeDesa || "",
    point?.kodeKecamatan || "",
    point?.kodeKabupaten || "",
    point?.kodeProvinsi || "",
    desaLabel(point),
    point?.kecamatan || "",
    point?.kabupaten || "",
    point?.provinsi || "",
  ].join("|");
}

export function summarizeByDesa(points) {
  const groups = new Map();
  for (const point of points ?? []) {
    const key = desaGroupKey(point);
    const current = groups.get(key) ?? {
      key,
      desa: desaLabel(point),
      kodeDesa: point?.kodeDesa || "",
      kecamatan: point?.kecamatan || "",
      kodeKecamatan: point?.kodeKecamatan || "",
      kabupaten: point?.kabupaten || "",
      kodeKabupaten: point?.kodeKabupaten || "",
      provinsi: point?.provinsi || "",
      kodeProvinsi: point?.kodeProvinsi || "",
      jumlah: 0,
      rendah: 0,
      nominal: 0,
      tinggi: 0,
      lain: 0,
      points: [],
    };
    current.jumlah += 1;
    const kelas = point?.kelasKepercayaan;
    if (kelas === "rendah" || kelas === "nominal" || kelas === "tinggi") current[kelas] += 1;
    else current.lain += 1;
    current.points.push(point);
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => b.jumlah - a.jumlah || a.desa.localeCompare(b.desa, "id") || a.kodeDesa.localeCompare(b.kodeDesa));
}

export function distinctSorted(points, field) {
  const values = new Set();
  for (const point of points ?? []) {
    const value = String(point?.[field] || "").trim();
    if (value) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b, "id"));
}

export function filterHotspotRows(points, filter) {
  const confidence = filter?.confidence;
  const allowConfidence = confidence instanceof Set ? confidence : null;
  return (points ?? []).filter((point) => {
    if (filter?.tanggal && point.tanggal !== filter.tanggal) return false;
    if (filter?.satelit && point.satelit !== filter.satelit) return false;
    if (allowConfidence && !allowConfidence.has(point.kelasKepercayaan)) return false;
    if (filter?.provinsi && point.provinsi !== filter.provinsi) return false;
    if (filter?.kabupaten && point.kabupaten !== filter.kabupaten) return false;
    if (filter?.kecamatan && point.kecamatan !== filter.kecamatan) return false;
    if (filter?.desa && desaLabel(point) !== filter.desa) return false;
    return true;
  });
}

export function kabCodeFromKecamatan(kodeKecamatan, explicit) {
  const given = String(explicit ?? "").trim();
  if (given) return given;
  const parts = String(kodeKecamatan ?? "").trim().split(".");
  if (parts.length >= 2 && parts.every((part) => /^\d+$/.test(part))) return `${parts[0]}.${parts[1]}`;
  return "";
}

export function provCodeFromKecamatan(kodeKecamatan, explicit) {
  const given = String(explicit ?? "").trim();
  if (given) return given;
  const part = String(kodeKecamatan ?? "").trim().split(".")[0];
  return /^\d+$/.test(part) ? part : "";
}
