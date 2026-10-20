import { todayWib } from "./dasarianManual.js";

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const PRAKIRAAN_BATAS =
  "Cuplikan prakiraan 3 hari saat ini hanya satu kelurahan yang kodenya sudah dicek per provinsi prioritas (Riau, Jambi, Sumatera Selatan, Kalimantan Barat, Kalimantan Tengah, Kalimantan Selatan). Itu titik sampel, bukan rata-rata kabupaten/kota dan bukan seluruh Indonesia. Mengambil satu adm4 untuk setiap kabupaten/kota berarti ratusan permintaan; batas BMKG 60 permintaan per menit, dan kode yang tidak dicek ke API tidak dipakai.";

export function tambahHariIso(iso, days) {
  const [year, month, day] = String(iso ?? "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function formatPeriode(mulai, sampai) {
  const [y1, m1, d1] = mulai.split("-").map(Number);
  const [y2, m2, d2] = sampai.split("-").map(Number);
  if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${BULAN[m1 - 1]} ${y1}`;
  if (y1 === y2) return `${d1} ${BULAN[m1 - 1]}–${d2} ${BULAN[m2 - 1]} ${y1}`;
  return `${d1} ${BULAN[m1 - 1]} ${y1}–${d2} ${BULAN[m2 - 1]} ${y2}`;
}

export function periodeTigaHari(now = new Date()) {
  const mulai = todayWib(now);
  const tengah = tambahHariIso(mulai, 1);
  const sampai = tambahHariIso(mulai, 2);
  return {
    mulai,
    tengah,
    sampai,
    hari: [mulai, tengah, sampai],
    label: `Periode: ${formatPeriode(mulai, sampai)} (WIB)`,
  };
}

export function jenisHujan(cuaca) {
  const text = String(cuaca ?? "").toLowerCase();
  return {
    lebat: /hujan (sangat )?lebat|hujan ekstrem|hujan deras/.test(text),
    petir: /petir|guntur/.test(text),
  };
}

function ringkasHari(slots) {
  if (!slots.length) return { ada: false, lebat: false, petir: false, cuaca: [], tpMaks: null };
  let lebat = false;
  let petir = false;
  let tpMaks = null;
  const cuaca = new Set();
  for (const slot of slots) {
    const jenis = jenisHujan(slot.cuaca ?? slot.weather_desc);
    if (jenis.lebat) lebat = true;
    if (jenis.petir) petir = true;
    const nama = String(slot.cuaca ?? slot.weather_desc ?? "").trim();
    if (nama) cuaca.add(nama);
    const tp = Number(slot.curah_hujan_tp ?? slot.hujan);
    if (Number.isFinite(tp)) tpMaks = tpMaks == null ? tp : Math.max(tpMaks, tp);
  }
  return { ada: true, lebat, petir, cuaca: [...cuaca], tpMaks };
}

export function labelSlotHujan(ringkas) {
  if (!ringkas?.ada) return "Tidak ada slot pada cuplikan ini";
  if (ringkas.lebat && ringkas.petir) return "Hujan lebat dan petir";
  if (ringkas.petir) return "Hujan petir";
  if (ringkas.lebat) return "Hujan lebat";
  return "Tidak ada hujan lebat atau petir pada slot ini";
}

export function ringkasPrakiraan(rows, periode) {
  const hari = periode?.hari ?? [];
  const groups = new Map();
  for (const row of rows ?? []) {
    const adm4 = String(row.adm4 ?? "").trim();
    if (!adm4) continue;
    const current = groups.get(adm4) ?? {
      adm4,
      provinsi: String(row.provinsi ?? "").trim(),
      kotkab: String(row.kotkab ?? "").trim(),
      kecamatan: String(row.kecamatan ?? "").trim(),
      desa: String(row.desa ?? "").trim(),
      kodeKab: adm4.split(".").slice(0, 2).join("."),
      analysisUtc: "",
      perHari: new Map(),
    };
    const analysis = String(row.analysis_utc ?? row.analysisUtc ?? "").trim();
    if (analysis > current.analysisUtc) current.analysisUtc = analysis;
    const tanggal = String(row.tanggal ?? "").slice(0, 10);
    if (!hari.includes(tanggal)) continue;
    const list = current.perHari.get(tanggal) ?? [];
    list.push(row);
    current.perHari.set(tanggal, list);
    groups.set(adm4, current);
  }
  return [...groups.values()]
    .map((item) => ({
      adm4: item.adm4,
      provinsi: item.provinsi,
      kotkab: item.kotkab,
      kecamatan: item.kecamatan,
      desa: item.desa,
      kodeKab: item.kodeKab,
      analysisUtc: item.analysisUtc,
      hari: hari.map((tanggal) => ({ tanggal, ...ringkasHari(item.perHari.get(tanggal) ?? []) })),
    }))
    .sort((a, b) => a.provinsi.localeCompare(b.provinsi, "id") || a.kotkab.localeCompare(b.kotkab, "id"));
}
