// Satu berkas konfigurasi untuk Analisis Pantau Bencana.
// Tab 0–3 jam memakai keparahan CAP. Tab hari memakai pemetaan teks cuaca.
// Bukan status resmi BMKG atau BNPB.

export const ANALISIS_NAMA = "Analisis Pantau Bencana (gabungan BMKG × IRBI BNPB)";
export const ANALISIS_BUKAN_RESMI =
  "Ini analisis dasbor, bukan status resmi BMKG atau BNPB. Pada tab 0–3 jam, warna mengikuti peringatan CAP yang tersimpan. Bila masa berlaku sudah lewat, warna itu data terakhir, bukan peringatan yang masih berlaku. Pada tab hari, Hujan Sedang, Hujan Lebat, Hujan Petir, dan hujan sangat lebat diwarnai lewat matriks bila kelas IRBI ada. Hujan ringan atau lokal hanya bisa menjadi Waspada, dan hanya bila IRBI Tinggi serta hujan ada pada ketiga hari prakiraan.";

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

const PERINGKAT_CUACA = { Moderate: 1, Severe: 2, Extreme: 3 };

export function keparahanCuaca(value) {
  const text = String(value ?? "").toLowerCase();
  if (/hujan sangat lebat|hujan ekstrem|\bekstrem\b/.test(text)) return "Extreme";
  if (/hujan lebat|petir|guntur/.test(text)) return "Severe";
  if (/hujan sedang/.test(text)) return "Moderate";
  return "";
}

export function keparahanTerburuk(texts) {
  let best = "";
  let rank = 0;
  for (const text of texts ?? []) {
    const next = PERINGKAT_CUACA[keparahanCuaca(text)] || 0;
    if (next > rank) {
      best = keparahanCuaca(text);
      rank = next;
    }
  }
  return best;
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
export const CATATAN_ABU = "Abu-abu pada tab 0–3 jam berarti tidak ada peringatan CAP yang masih berlaku.";
export const CATATAN_ABU_HARI =
  "Abu-abu pada tab hari berarti tidak ada status, atau kode cuaca belum dikenali. Bukan pernyataan aman.";
export const CATATAN_PRAKIRAAN =
  "Prakiraan pada titik sampel kabupaten/kota ini tidak ada untuk tanggal tab. Wilayah diarsir.";
export const CATATAN_IRBI =
  "Tanpa kelas banjir IRBI, wilayah diarsir dan tidak mendapat status matriks. Pada tab 0–3 jam, keparahan CAP yang tidak masuk matriks juga diarsir.";
export const CATATAN_CAP = "Peringatan CAP tidak dapat dimuat. Wilayah diarsir.";
export const CATATAN_TERTUNDA =
  "Cuplikan CAP lebih tua dari 90 menit. Warna yang tampil adalah data terakhir, bukan pernyataan bahwa peringatan itu masih berlaku.";
export const CATATAN_CAKUPAN =
  "Cuplikan CAP belum bertanda cakupan nasional. Kabupaten/kota yang tidak tercantum di cuplikan diarsir.";
export const CATATAN_ALASAN = Object.freeze({
  prakiraan: CATATAN_PRAKIRAAN,
  irbi: CATATAN_IRBI,
  cap: CATATAN_CAP,
  tertunda: CATATAN_TERTUNDA,
  cakupan: CATATAN_CAKUPAN,
});

function jejakCuaca(row) {
  return {
    kodeCuaca: row?.cuacaKode || "",
    cuacaDesc: row?.cuacaDesc || "",
    cuacaMentah: row?.cuacaMentah || [],
  };
}

export function catWilayah(row, { tab = "cap", cakupan = "", tertunda = false } = {}) {
  if (tab !== "cap") {
    if (!row?.prakiraanAda) return { kind: "nodata", fill: "", status: "", alasan: "prakiraan" };
    if (row.cuacaGolongan === "tak-dikenal") {
      return {
        kind: "tak-dikenal",
        fill: WARNA_TANPA_PERINGATAN,
        status: "",
        alasan: "",
        kosongLabel: row.cuacaLabel || "Tidak terklasifikasi (kode cuaca BMKG belum dikenali)",
        ...jejakCuaca(row),
      };
    }
    const tanpaMatriks = row.cuacaGolongan === "tidak-berpotensi" || (row.cuacaGolongan === "ringan" && !row.hariStatus);
    if (!tanpaMatriks && !kelasIrbi(row.banjirKelas)) return { kind: "nodata", fill: "", status: "", alasan: "irbi" };
    if (row.hariStatus && ANALISIS_WARNA[row.hariStatus]) {
      return {
        kind: "status",
        fill: ANALISIS_WARNA[row.hariStatus],
        status: row.hariStatus,
        alasan: "",
        ...jejakCuaca(row),
      };
    }
    return {
      kind: "kosong",
      fill: WARNA_TANPA_PERINGATAN,
      status: "",
      alasan: "",
      kosongLabel: row.cuacaLabel || "Tidak ada status (cuaca tidak berpotensi banjir)",
      ...jejakCuaca(row),
    };
  }
  if (row?.nowcastStatus !== "ok") return { kind: "nodata", fill: "", status: "", alasan: "cap" };
  if (row.analisisStatus && ANALISIS_WARNA[row.analisisStatus]) {
    return {
      kind: "status",
      fill: ANALISIS_WARNA[row.analisisStatus],
      status: row.analisisStatus,
      alasan: "",
      lampau: Boolean(row.analisisLampau),
    };
  }
  if (row.nowcastAda || row.nowcastExpired) return { kind: "nodata", fill: "", status: "", alasan: "irbi" };
  if (tertunda && cakupan !== "nasional") return { kind: "nodata", fill: "", status: "", alasan: "tertunda" };
  if (cakupan === "nasional" || row.nowcastExpired) {
    return {
      kind: "kosong",
      fill: WARNA_TANPA_PERINGATAN,
      status: "",
      alasan: "",
      kosongLabel: "Tidak ada peringatan",
    };
  }
  return { kind: "nodata", fill: "", status: "", alasan: "cakupan" };
}

const URUT_ALASAN = ["prakiraan", "cap", "tertunda", "irbi", "cakupan"];

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
    const aktif = row?.nowcastAlerts ?? [];
    const lampau = row?.nowcastLampau ?? [];
    const sumber = aktif.length ? aktif : lampau;
    if (!sumber.length) return { ...row, analisisStatus: null, analisisLampau: false };
    const status = analisisTertinggi(sumber.map((alert) => analisisStatus(alert.severity, row.banjirKelas)));
    return {
      ...row,
      analisisStatus: status,
      analisisLampau: !aktif.length && lampau.length > 0 && Boolean(status),
    };
  });
}
