import { analisisStatus, keparahanTerburuk } from "./analisisPantauBencana.js";
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
  "Prakiraan 3 hari memakai satu titik adm4 per kabupaten/kota, bukan beberapa kecamatan dan bukan rata-rata kabupaten. Enam kota prioritas memakai kelurahan yang sudah dicek ke API: Padang Bulan (Kota Pekanbaru), Simpang IV Sipin (Kota Jambi), Tiga-puluh-lima Ilir (Kota Palembang), Sungaibangkong (Kota Pontianak), Pahandut (Kota Palangkaraya), dan Mantuil (Kota Banjarmasin). Kabupaten/kota lain memakai satu kode kelurahan terkecil pada transkripsi kode Kemendagri, atau kode desa terkecil bila tidak ada kelurahan. Kode itu baru disimpan setelah API mengembalikan HTTP 200 beserta nama lokasi. Titik itu bukan ibu kota yang diverifikasi, kecuali enam kelurahan di atas. Kode yang gagal tidak diganti dan kabupaten/kota itu tidak punya prakiraan. Pada pengambilan 20 Oktober 2026, Sorong Selatan, Raja Ampat, Tambrauw, dan Maybrat mengembalikan HTTP 404. local_datetime adalah waktu setempat titik, tidak diubah menjadi WIB, jadi tanggal slot di zona WITA atau WIT bisa berbeda dari tanggal WIB pada tab. Batas permintaan BMKG 60 per menit; jeda antar permintaan 1,1 detik.";

export const PEMETAAN_CUACA =
  "Teks cuaca pada titik itu dipetakan di dasbor, bukan oleh BMKG: Extreme bila ada hujan sangat lebat, hujan ekstrem, atau kata ekstrem; Severe bila ada hujan lebat, petir, atau guntur; Moderate bila ada hujan sedang. Cerah, berawan, hujan ringan, kabut, dan udara kabur berada di luar matriks. Yang dipakai adalah keparahan terburuk pada tanggal local_datetime itu.";

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
      kodeKab: String(row.kode_kab ?? "").trim() || adm4.split(".").slice(0, 2).join("."),
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
    .sort((a, b) => a.provinsi.localeCompare(b.provinsi, "id") || a.kotkab.localeCompare(b.kotkab, "id") || a.kodeKab.localeCompare(b.kodeKab, "id"));
}

export function indeksPrakiraan(rows) {
  const groups = new Map();
  for (const row of rows ?? []) {
    const kode = String(row.kode_kab ?? "").trim() || String(row.adm4 ?? "").split(".").slice(0, 2).join(".");
    if (!kode) continue;
    const current = groups.get(kode) ?? { perHari: new Map(), analysisUtc: "" };
    const analysis = String(row.analysis_utc ?? row.analysisUtc ?? "").trim();
    if (analysis > current.analysisUtc) current.analysisUtc = analysis;
    const tanggal = String(row.tanggal ?? "").slice(0, 10);
    if (tanggal) {
      const list = current.perHari.get(tanggal) ?? [];
      list.push(row);
      current.perHari.set(tanggal, list);
    }
    groups.set(kode, current);
  }
  return groups;
}

export function terapkanHari(rows, indeks, iso) {
  return (rows ?? []).map((row) => {
    const slots = indeks?.get(row.kode)?.perHari?.get(iso) ?? [];
    if (!slots.length) {
      return { ...row, prakiraanAda: false, prakiraanSeverity: "", hariStatus: null, cuacaHari: [] };
    }
    const cuaca = [...new Set(slots.map((slot) => String(slot.cuaca ?? slot.weather_desc ?? "").trim()).filter(Boolean))];
    const severity = keparahanTerburuk(cuaca);
    return {
      ...row,
      prakiraanAda: true,
      prakiraanSeverity: severity,
      hariStatus: severity ? analisisStatus(severity, row.banjirKelas) : null,
      cuacaHari: cuaca,
    };
  });
}
