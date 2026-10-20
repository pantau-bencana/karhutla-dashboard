import { analisisStatus } from "./analisisPantauBencana.js";
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

export const LABEL_TIDAK_BERPOTENSI = "Tidak ada status (cuaca tidak berpotensi banjir)";
export const LABEL_TANPA_STATUS = "Tidak ada status";
export const LABEL_TAK_DIKENAL = "Tidak terklasifikasi (kode cuaca BMKG belum dikenali)";
export const CUACA_DISCLAIMER =
  "BMKG tidak memiliki tabel resmi yang memetakan kode cuaca ke status banjir. Pemetaan mengikuti pola prakiraan cuaca berbasis dampak pada BMKG Signature dan pola matriks risiko WMO-No.1150, serta kategori intensitas hujan BMKG. Ambang IRBI tinggi dan 3 hari berturut-turut adalah usulan proyek ini, bukan ketentuan resmi.";
export const CUACA_RUJUKAN = Object.freeze([
  ["BMKG Signature — prakiraan cuaca berbasis dampak", "https://signature.bmkg.go.id/site/prakiraan-cuaca-berbasis-dampak/"],
  ["WMO-No.1150", "https://etrp.wmo.int/pluginfile.php/16270/mod_resource/content/0/wmo_1150_en.pdf"],
  ["BMKG GAW Bariri — monitoring hujan harian", "https://gaw-bariri.bmkg.go.id/monitoring-hujan-harian/"],
  ["Natural Hazards, 2026", "https://link.springer.com/article/10.1007/s11069-026-08365-6"],
  ["doi:10.36754/jam.v1i2.315", "https://doi.org/10.36754/jam.v1i2.315"],
]);
export const PEMETAAN_CUACA =
  "Pada tab hari, dasbor membaca weather_desc BMKG dan kode weather bila tersimpan. Cerah, Cerah Berawan, Berawan, Berawan Tebal, Udara Kabur, Asap, dan Kabut berlabel Tidak ada status (cuaca tidak berpotensi banjir). Hujan Ringan dan Hujan Lokal tidak berstatus, kecuali Waspada bila kelas IRBI Tinggi dan ketiga hari prakiraan memuat hujan ringan, lokal, atau lebih lebat; status itu tidak dinaikkan menjadi Siaga atau Awas dan tidak dipakai pada tab 0–3 jam. Hujan Sedang tetap Moderate dan Hujan Lebat tetap Severe. Hujan Petir sekurang-kurangnya setara Hujan Lebat. Hujan sangat lebat atau hujan ekstrem tetap Extreme. Kode atau teks yang belum dikenali berlabel Tidak terklasifikasi (kode cuaca BMKG belum dikenali), berwarna abu-abu, dan diurutkan bersama baris tanpa data. Yang dipakai pada satu tanggal adalah golongan terberat di antara slot local_datetime tanggal itu. Pada API yang dicek 20 Oktober 2026, weather 61 berteks Hujan Ringan dan weather 63 berteks Hujan Sedang; dasbor mengikuti teks itu.";

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

const KODE_TIDAK_BERPOTENSI = new Set([0, 1, 2, 3, 4, 5, 10, 45, 100, 101, 102, 103, 104]);
const GOLONGAN_MATRIKS = new Set(["sedang", "lebat", "petir", "extreme"]);
const HUJAN = new Set(["ringan", "sedang", "lebat", "petir", "extreme"]);

function kodeAngka(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return null;
  return number;
}

function golonganTeks(value) {
  const text = String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return "";
  if (/hujan sangat lebat|hujan ekstrem|\bekstrem\b/.test(text)) return "extreme";
  if (/hujan petir|\bpetir\b|\bguntur\b/.test(text)) return "petir";
  if (/hujan lebat|hujan deras/.test(text)) return "lebat";
  if (/hujan sedang/.test(text)) return "sedang";
  if (/hujan ringan|hujan lokal/.test(text)) return "ringan";
  if (/^(cerah berawan|cerah|berawan tebal|berawan|udara kabur|asap|kabut\/asap|kabut)$/.test(text)) return "tidak-berpotensi";
  return "";
}

function severityGolongan(golongan) {
  if (golongan === "extreme") return "Extreme";
  if (golongan === "lebat" || golongan === "petir") return "Severe";
  if (golongan === "sedang") return "Moderate";
  return "";
}

export function kelasCuacaSlot(slot) {
  const desc = String(slot?.cuaca ?? slot?.weather_desc ?? "").trim();
  const kode = kodeAngka(slot?.kode_cuaca ?? slot?.kodeCuaca ?? slot?.weather);
  const dariTeks = golonganTeks(desc);
  let golongan = "";
  if (dariTeks) golongan = dariTeks;
  else if (desc) golongan = "tak-dikenal";
  else if (kode != null && KODE_TIDAK_BERPOTENSI.has(kode)) golongan = "tidak-berpotensi";
  else if (kode === 60 || kode === 80) golongan = "ringan";
  else if (kode === 95 || kode === 97) golongan = "petir";
  else golongan = "tak-dikenal";
  if ((kode === 95 || kode === 97) && golongan !== "extreme") golongan = "petir";
  return {
    golongan,
    severity: severityGolongan(golongan),
    kode: kode == null ? "" : String(kode),
    desc,
  };
}

function mentahSlot(kelas) {
  if (kelas.kode && kelas.desc) return `${kelas.kode} ${kelas.desc}`;
  if (kelas.kode) return kelas.kode;
  return kelas.desc;
}

export function ringkasCuacaHari(slots) {
  const kelas = (slots ?? []).map((slot) => kelasCuacaSlot(slot));
  const adaMatriks = kelas.some((item) => GOLONGAN_MATRIKS.has(item.golongan));
  const adaTak = kelas.some((item) => item.golongan === "tak-dikenal");
  const adaRingan = kelas.some((item) => item.golongan === "ringan");
  let golongan = "tidak-berpotensi";
  let severity = "";
  if (adaMatriks) {
    const best = kelas
      .filter((item) => GOLONGAN_MATRIKS.has(item.golongan))
      .sort((left, right) => (severityRank(right.severity) || 0) - (severityRank(left.severity) || 0))[0];
    golongan = best.golongan;
    severity = best.severity;
  } else if (adaTak) golongan = "tak-dikenal";
  else if (adaRingan) golongan = "ringan";
  return {
    golongan,
    severity,
    adaHujan: kelas.some((item) => HUJAN.has(item.golongan)),
    mentah: kelas.map(mentahSlot).filter(Boolean),
    desc: [...new Set(kelas.map((item) => item.desc).filter(Boolean))],
    kode: [...new Set(kelas.map((item) => item.kode).filter((item) => item !== ""))],
  };
}

function severityRank(value) {
  if (value === "Extreme") return 3;
  if (value === "Severe") return 2;
  if (value === "Moderate") return 1;
  return 0;
}

export function hariPunyaHujan(slots) {
  return ringkasCuacaHari(slots).adaHujan;
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

export function terapkanHari(rows, indeks, iso, hari = []) {
  const tanggal = (hari ?? []).map((item) => String(item ?? "").slice(0, 10)).filter(Boolean);
  return (rows ?? []).map((row) => {
    const grup = indeks?.get(row.kode);
    const slots = grup?.perHari?.get(iso) ?? [];
    if (!slots.length) {
      return {
        ...row,
        prakiraanAda: false,
        prakiraanSeverity: "",
        hariStatus: null,
        cuacaHari: [],
        cuacaGolongan: "",
        cuacaLabel: "",
        cuacaKode: "",
        cuacaDesc: "",
        cuacaMentah: [],
      };
    }
    const ringkas = ringkasCuacaHari(slots);
    const hujanTiga =
      tanggal.length === 3 && tanggal.every((item) => hariPunyaHujan(grup?.perHari?.get(item) ?? []));
    let hariStatus = null;
    let cuacaLabel = "";
    if (GOLONGAN_MATRIKS.has(ringkas.golongan)) {
      hariStatus = analisisStatus(ringkas.severity, row.banjirKelas);
    } else if (ringkas.golongan === "ringan" && hujanTiga && kelasTinggi(row.banjirKelas)) {
      hariStatus = "Waspada";
    } else if (ringkas.golongan === "ringan") cuacaLabel = LABEL_TANPA_STATUS;
    else if (ringkas.golongan === "tak-dikenal") cuacaLabel = LABEL_TAK_DIKENAL;
    else cuacaLabel = LABEL_TIDAK_BERPOTENSI;
    return {
      ...row,
      prakiraanAda: true,
      prakiraanSeverity: ringkas.severity,
      hariStatus,
      cuacaHari: ringkas.desc,
      cuacaGolongan: hariStatus === "Waspada" && ringkas.golongan === "ringan" ? "ringan" : ringkas.golongan,
      cuacaLabel,
      cuacaKode: ringkas.kode.join(", "),
      cuacaDesc: ringkas.desc.join(", "),
      cuacaMentah: ringkas.mentah,
    };
  });
}

function kelasTinggi(value) {
  return String(value ?? "").trim().toLowerCase() === "tinggi";
}
