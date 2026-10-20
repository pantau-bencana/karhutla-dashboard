// Satu berkas konfigurasi untuk Analisis Pantau Bencana.
// Gabungan keparahan CAP BMKG (istilah asli) dan kelas banjir IRBI 2025.
// Bukan status resmi BMKG atau BNPB, dan bukan prakiraan 3 hari.

export const ANALISIS_NAMA = "Analisis Pantau Bencana (gabungan BMKG × IRBI BNPB)";
export const ANALISIS_BUKAN_RESMI =
  "Ini analisis dasbor, bukan status resmi BMKG atau BNPB. Tanpa peringatan CAP yang masih berlaku, sel tidak diwarnai.";

export const ANALISIS_WARNA = Object.freeze({
  Awas: "#c5362b",
  Siaga: "#ef8f3a",
  Waspada: "#f5d76e",
});

export const ANALISIS_MATRIKS = Object.freeze([
  { severity: "Extreme", kelas: "Tinggi", status: "Awas" },
  { severity: "Extreme", kelas: "Sedang", status: "Awas" },
  { severity: "Extreme", kelas: "Rendah", status: "Siaga" },
  { severity: "Severe", kelas: "Tinggi", status: "Awas" },
  { severity: "Severe", kelas: "Sedang", status: "Siaga" },
  { severity: "Severe", kelas: "Rendah", status: "Waspada" },
  { severity: "Moderate", kelas: "Tinggi", status: "Siaga" },
  { severity: "Moderate", kelas: "Sedang", status: "Waspada" },
  { severity: "Moderate", kelas: "Rendah", status: "Waspada" },
]);

const RANK = { Waspada: 1, Siaga: 2, Awas: 3 };

export function kelasIrbi(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "tinggi") return "Tinggi";
  if (text === "sedang") return "Sedang";
  if (text === "rendah") return "Rendah";
  return "";
}

export function severityCap(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "extreme") return "Extreme";
  if (text === "severe") return "Severe";
  if (text === "moderate") return "Moderate";
  if (text === "minor") return "Minor";
  if (text === "unknown") return "Unknown";
  return "";
}

export function analisisStatus(severity, kelas) {
  const sev = severityCap(severity);
  const irbi = kelasIrbi(kelas);
  if (!sev || !irbi) return null;
  const hit = ANALISIS_MATRIKS.find((row) => row.severity === sev && row.kelas === irbi);
  return hit?.status ?? null;
}

export function analisisTertinggi(statuses) {
  let best = null;
  for (const status of statuses ?? []) {
    if (!status) continue;
    if (!best || (RANK[status] || 0) > (RANK[best] || 0)) best = status;
  }
  return best;
}

export const WARNA_TANPA_PERINGATAN = "#c5c1b8";

export const CATATAN_ARSIR =
  "Arsir berarti tanpa data untuk tab yang dipilih. Bukan angka nol dan bukan status aman.";
export const CATATAN_ABU = "Abu-abu berarti tidak ada peringatan CAP yang masih berlaku.";
export const CATATAN_HARI =
  "Pada tab Hari ini, Besok, dan Lusa matriks Awas/Siaga/Waspada tidak dihitung. Matriks itu hanya memakai peringatan CAP 0–3 jam dan kelas IRBI. Prakiraan per kab/kota belum tersedia, jadi wilayah diarsir.";
export const CATATAN_IRBI =
  "Peringatan aktif tanpa kelas IRBI, atau keparahan di luar matriks, diarsir.";
export const CATATAN_CAP = "Peringatan CAP tidak dapat dimuat. Wilayah diarsir.";
export const CATATAN_TERTUNDA =
  "Cuplikan CAP lebih tua dari 90 menit. Wilayah tanpa peringatan yang masih berlaku diarsir, bukan dinyatakan aman.";
export const CATATAN_CAKUPAN =
  "Cuplikan CAP belum bertanda cakupan nasional. Kabupaten/kota yang tidak tercantum di cuplikan diarsir.";
export const CATATAN_ALASAN = Object.freeze({
  hari: CATATAN_HARI,
  irbi: CATATAN_IRBI,
  cap: CATATAN_CAP,
  tertunda: CATATAN_TERTUNDA,
  cakupan: CATATAN_CAKUPAN,
});

export function catWilayah(row, { tab = "cap", cakupan = "", tertunda = false } = {}) {
  if (tab !== "cap") return { kind: "nodata", fill: "", status: "", alasan: "hari" };
  if (row?.nowcastStatus !== "ok") return { kind: "nodata", fill: "", status: "", alasan: "cap" };
  if (row.analisisStatus && ANALISIS_WARNA[row.analisisStatus]) {
    return { kind: "status", fill: ANALISIS_WARNA[row.analisisStatus], status: row.analisisStatus, alasan: "" };
  }
  if (row.nowcastAda) return { kind: "nodata", fill: "", status: "", alasan: "irbi" };
  if (tertunda) return { kind: "nodata", fill: "", status: "", alasan: "tertunda" };
  if (cakupan === "nasional" || row.nowcastExpired) {
    return { kind: "kosong", fill: WARNA_TANPA_PERINGATAN, status: "", alasan: "" };
  }
  return { kind: "nodata", fill: "", status: "", alasan: "cakupan" };
}

const URUT_ALASAN = ["hari", "cap", "tertunda", "irbi", "cakupan"];

export function gabungCat(rows, konteks) {
  const cats = (rows ?? []).map((row) => catWilayah(row, konteks));
  const status = analisisTertinggi(cats.map((cat) => cat.status));
  if (status) return { kind: "status", fill: ANALISIS_WARNA[status], status, alasan: "" };
  const nodata = cats.filter((cat) => cat.kind === "nodata");
  if (nodata.length) {
    const alasan = URUT_ALASAN.find((key) => nodata.some((cat) => cat.alasan === key)) || "cakupan";
    return { kind: "nodata", fill: "", status: "", alasan };
  }
  if (cats.length) return { kind: "kosong", fill: WARNA_TANPA_PERINGATAN, status: "", alasan: "" };
  return { kind: "nodata", fill: "", status: "", alasan: "cakupan" };
}

export function applyAnalisis(rows) {
  return (rows ?? []).map((row) => {
    if (!row?.nowcastAda) return { ...row, analisisStatus: null };
    const status = analisisTertinggi(
      (row.nowcastAlerts ?? []).map((alert) => analisisStatus(alert.severity, row.banjirKelas)),
    );
    return { ...row, analisisStatus: status };
  });
}
