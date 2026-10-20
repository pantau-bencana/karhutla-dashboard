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

export function applyAnalisis(rows) {
  return (rows ?? []).map((row) => {
    if (!row?.nowcastAda) return { ...row, analisisStatus: null };
    const status = analisisTertinggi(
      (row.nowcastAlerts ?? []).map((alert) => analisisStatus(alert.severity, row.banjirKelas)),
    );
    return { ...row, analisisStatus: status };
  });
}
