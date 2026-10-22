import { kodeKan } from "./aplus.js";
import { kelasIrbi } from "./analisisPantauBencana.js";
import { formatAngka, formatWib } from "./format.js";
import { IRBI_LONGSOR_TERVERIFIKASI, IRBI_TIDAK_TERSEDIA } from "./floodMatrix.js";
import { lembarIrbiGabung } from "./irbiGabung.js";
import { daftarKabkota } from "./kabProvinsi.js";
import {
  LABEL_TAK_DIKENAL,
  LABEL_TIDAK_BERPOTENSI,
  indeksPrakiraan,
  kelasCuacaSlot,
  ringkasCuacaHari,
  tambahHariIso,
  terapkanHari,
} from "./prakiraanHujan.js";
import { kelasKepercayaan } from "./warning.js";

export const REKAP_KOSONG = "tidak ada data";
export const REKAP_BELUM = "belum terintegrasi";
export const REKAP_TANPA_PERINGATAN = "Tidak ada peringatan";
export const REKAP_IDENTITAS =
  "Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.";
export const REKAP_UNDUH =
  "Unduhan dibuat di peramban dasbor. Berkas ini tidak dikirim ke Google Sheets.";
export const SIPONGI_URL = "https://sipongi.gakkum.kehutanan.go.id/";
export const SIPONGI_TEMUAN =
  "Pemeriksaan 22 Oktober 2026: GET https://opsroom.sipongidata.my.id/api/konfigurasi dan /api/sebaran tanpa header otorisasi mengembalikan HTTP 200 JSON. Tidak ada token yang disalin. Satelit mengikuti sumber_satelit pada konfigurasi. Host lama sipongi.menlhk.go.id tidak punya alamat DNS.";
export const HOTSPOT_CATATAN =
  "Kolom SiPongi menjumlahkan counter High, Medium, dan Low dari semua satelit yang dikembalikan endpoint publik, per kabupaten pada tanggal yang diminta. Kabupaten yang tidak muncul pada tanggal itu ditulis 0. Baris tanpa nama kabupaten tidak dibagikan. Hotspot adalah deteksi satelit, bukan kebakaran terkonfirmasi. Kolom FIRMS adalah pembanding: hanya kepercayaan nominal dan tinggi (huruf n atau h, atau angka ≥ 30).";
export const PARAM_FIRMS = Object.freeze({
  id: "firms",
  nama: "FIRMS pembanding",
  bidang: "h",
  cakupan: "hotspot",
  jenis: "angka",
});
export const FWI_KELAS_CATATAN =
  "Kelas mengikuti tabel FWI GWIS/EFFIS: Rendah < 11,2; Sedang 11,2–< 21,3; Tinggi 21,3–< 38; Sangat tinggi 38–< 50; Ekstrem 50–70; Sangat ekstrem > 70. Batas bawah inklusif. Diterapkan pada angka FWI model ECMWF (GetFeatureInfo GWIS). Bukan kelas FDRS BMKG. Angka di bawah 0, termasuk −9999, tidak dikelaskan.";
export const HUJAN_CATATAN =
  "Curah hujan harian model ECMWF via Open-Meteo, dalam milimeter (precipitation_sum). Bukan peluang dalam persen. Sel bertanda ya bila milimeter lebih dari 20.";
export const ANALISIS_CATATAN =
  "Awas, Siaga, dan Waspada adalah analisis dasbor (cuaca BMKG pada satu titik adm4 × kelas banjir IRBI), bukan status resmi BMKG atau BNPB.";
export const PEMBANDING_LENCANA = "Pembanding (data terbuka, bukan resmi)";

const GOLONGAN_MATRIKS = new Set(["sedang", "lebat", "petir", "extreme"]);
const PERINGKAT_CAP = { unknown: 0, minor: 1, moderate: 2, severe: 3, extreme: 4 };
const PERINGKAT_KELAS = {
  Rendah: 1,
  Sedang: 2,
  Tinggi: 3,
  "Sangat tinggi": 4,
  Ekstrem: 5,
  "Sangat ekstrem": 6,
};
const PERINGKAT_ANALISIS = { Waspada: 1, Siaga: 2, Awas: 3 };

export const REKAP_BAGIAN = Object.freeze([
  {
    id: "karhutla",
    judul: "Karhutla",
    parameter: [
      { id: "hotspot", nama: "Hotspot SiPongi", bidang: "s", cakupan: "sipongi", jenis: "angka" },
      { id: "fwi", nama: "FWI", bidang: "f", cakupan: "fwi", jenis: "fwi" },
      { id: "kelas", nama: "Kelas FWI", bidang: "f", cakupan: "fwi", jenis: "kelas" },
      { id: "hujan", nama: "Hujan >20 mm", bidang: "m", cakupan: "hujan", jenis: "hujan" },
      { id: "iki", nama: "Indeks Kesesuaian Iklim", jenis: "tetap" },
      { id: "ispu", nama: "ISPU", jenis: "tetap" },
    ],
  },
  {
    id: "banjir",
    judul: "Banjir dan Longsor",
    parameter: [
      { id: "cuaca", nama: "Cuaca BMKG", bidang: "c", cakupan: "prakiraan", jenis: "teks" },
      { id: "analisis", nama: "Analisis", bidang: "a", cakupan: "prakiraan", jenis: "teks" },
      { id: "cap", nama: "CAP 0-3 jam", bidang: "p", cakupan: "cap", jenis: "teks" },
      { id: "irbi", nama: "IRBI banjir", jenis: "irbi", peta: "irbi" },
      { id: "longsor", nama: "IRBI longsor", jenis: "irbi", peta: "longsor" },
      { id: "pvmbg", nama: "Rawan longsor PVMBG", jenis: "tetap" },
    ],
  },
]);

export function kelasFwiGwis(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return "";
  if (number < 11.2) return "Rendah";
  if (number < 21.3) return "Sedang";
  if (number < 38) return "Tinggi";
  if (number < 50) return "Sangat tinggi";
  if (number <= 70) return "Ekstrem";
  return "Sangat ekstrem";
}

export function hujanLebih20(mm) {
  const number = Number(mm);
  if (!Number.isFinite(number)) return null;
  return number > 20;
}

export function tandaiHujan(row) {
  return hujanLebih20(row?.curah_hujan_mm ?? row?.curahHujan);
}

export function teksHujan(mm) {
  const flag = hujanLebih20(mm);
  if (flag == null) return REKAP_KOSONG;
  const number = Number(mm);
  const digits = Number.isInteger(number) ? 0 : 1;
  return `${formatAngka(number, digits)} mm · ${flag ? "ya" : "tidak"}`;
}

export function catatanParameter(param) {
  if (param?.id === "hotspot") return HOTSPOT_CATATAN;
  if (param?.id === "fwi" || param?.id === "kelas") return `${FWI_KELAS_CATATAN} ${PEMBANDING_LENCANA}.`;
  if (param?.id === "hujan") return `${HUJAN_CATATAN} ${PEMBANDING_LENCANA}.`;
  if (param?.id === "iki") return "Indeks Kesesuaian Iklim belum terintegrasi. Tabel IKU tahunan tidak dipakai sebagai pengganti.";
  if (param?.id === "ispu") return "ISPU belum terintegrasi sampai ada akses resmi KLH. Angka model tidak diubah menjadi kategori ISPU.";
  if (param?.id === "cuaca") return "Kategori cuaca BMKG pada satu titik adm4 per kabupaten/kota, horizon 3 hari. Sumber: BMKG. Bukan rata-rata wilayah.";
  if (param?.id === "analisis") return ANALISIS_CATATAN;
  if (param?.id === "cap") return "Nowcast BMKG 0–3 jam. Kabupaten tanpa peringatan pada cakupan nasional tertulis Tidak ada peringatan, bukan nol.";
  if (param?.id === "irbi") return "Skor dan kelas banjir Buku IRBI 2025. Tahunan, bukan prakiraan harian. Empat kabupaten/kota yang tidak ada di tabel: IRBI tidak tersedia.";
  if (param?.id === "longsor") return `${IRBI_LONGSOR_TERVERIFIKASI} Tahunan, bukan prakiraan harian. Kabupaten/kota yang tidak ada di tabel: IRBI tidak tersedia.`;
  if (param?.id === "pvmbg") return "Rawan longsor PVMBG belum terintegrasi. MAGMA tetap Tautan saja.";
  return "";
}

function angkaAda(value) {
  if (value == null || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function tanggalIso(value) {
  const text = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function dalamJendela(tanggal, hari, sampai) {
  return Boolean(tanggal) && tanggal >= hari && tanggal <= sampai;
}

function pastikan(baris, kode) {
  if (!baris[kode]) baris[kode] = {};
  return baris[kode];
}

function taruh(peta, tanggal, nilai) {
  const ada = peta[tanggal];
  if (typeof nilai === "number") peta[tanggal] = ada == null ? nilai : Math.max(ada, nilai);
  else if (nilai !== "" && nilai != null) peta[tanggal] = nilai;
}

function teksCuaca(slots) {
  const ringkas = ringkasCuacaHari(slots);
  const cocok = slots.map((slot) => kelasCuacaSlot(slot)).filter((item) => item.golongan === ringkas.golongan && item.desc);
  if (cocok.length) return [...new Set(cocok.map((item) => item.desc))].join(", ");
  if (ringkas.desc.length) return ringkas.desc.join(", ");
  if (ringkas.golongan === "tak-dikenal") return LABEL_TAK_DIKENAL;
  return LABEL_TIDAK_BERPOTENSI;
}

function teksAnalisis(terap) {
  if (!terap?.prakiraanAda) return "";
  if (terap.hariStatus) return `${terap.hariStatus} — analisis dasbor, bukan status resmi`;
  if (terap.cuacaLabel === LABEL_TAK_DIKENAL || terap.cuacaGolongan === "tak-dikenal") return LABEL_TAK_DIKENAL;
  if (GOLONGAN_MATRIKS.has(terap.cuacaGolongan) && !terap.hariStatus) return REKAP_KOSONG;
  return terap.cuacaLabel || LABEL_TIDAK_BERPOTENSI;
}

function peringkatCap(value) {
  return PERINGKAT_CAP[String(value ?? "").trim().toLowerCase()] ?? -1;
}

function teksCap(rows) {
  const events = [...new Set(rows.map((row) => String(row.event || row.kejadian || "").trim()).filter(Boolean))];
  const severity = rows
    .map((row) => String(row.severity || row.tingkat || "").trim())
    .filter(Boolean)
    .sort((a, b) => peringkatCap(b) - peringkatCap(a));
  const best = severity[0] || "";
  if (events.length && best) return `${events.join("; ")} · ${best}`;
  return events.join("; ") || best;
}

export function susunCuplikan({
  hariWib,
  kab = [],
  hotspot,
  fwi,
  hujan,
  prakiraan,
  cap,
  sipongi,
  capSiap = false,
  capNasional = false,
  irbi,
  longsor,
  sumber = {},
} = {}) {
  const hari = tanggalIso(hariWib);
  const sampai = tambahHariIso(hari, 2);
  const daftar = kab.length ? kab : daftarKabkota();
  const kodeKab = new Set(daftar.map((item) => item.kode));
  const baris = {};
  const cakupan = { hotspot: [], sipongi: [], fwi: [], hujan: [], prakiraan: [], cap: [] };
  const ada = {
    hotspot: Array.isArray(hotspot),
    sipongi: Array.isArray(sipongi),
    fwi: Array.isArray(fwi),
    hujan: Array.isArray(hujan),
    prakiraan: Array.isArray(prakiraan),
    cap: capSiap === true && Array.isArray(cap),
    irbi: Array.isArray(irbi),
    longsor: Array.isArray(longsor),
  };
  let hotspotTanpaKode = 0;

  if (ada.hotspot) {
    const tanggal = new Set();
    const jumlah = new Map();
    for (const row of hotspot) {
      const waktu = tanggalIso(row.tanggal);
      if (!waktu) continue;
      tanggal.add(waktu);
      const kelas = row.kelasKepercayaan || kelasKepercayaan(row.kepercayaan ?? row.confidence ?? "");
      if (kelas !== "nominal" && kelas !== "tinggi") continue;
      const kode = kodeKan(row.kode_kabupaten ?? row.kodeKabupaten ?? "");
      if (!kodeKab.has(kode)) {
        hotspotTanpaKode += 1;
        continue;
      }
      const kunci = `${kode}|${waktu}`;
      jumlah.set(kunci, (jumlah.get(kunci) || 0) + 1);
    }
    cakupan.hotspot = [...tanggal].sort();
    for (const item of daftar) {
      const sel = pastikan(baris, item.kode);
      sel.h = {};
      for (const waktu of cakupan.hotspot) sel.h[waktu] = jumlah.get(`${item.kode}|${waktu}`) || 0;
    }
  }

  if (ada.sipongi) {
    const tanggal = new Set();
    const jumlah = new Map();
    for (const row of sipongi) {
      const waktu = tanggalIso(row.tanggal);
      const kode = kodeKan(row.kode);
      const nilai = angkaAda(row.jumlah);
      if (!waktu || !kodeKab.has(kode) || nilai == null) continue;
      tanggal.add(waktu);
      jumlah.set(`${kode}|${waktu}`, nilai);
    }
    cakupan.sipongi = [...tanggal].sort();
    for (const item of daftar) {
      const sel = pastikan(baris, item.kode);
      sel.s = {};
      for (const waktu of cakupan.sipongi) sel.s[waktu] = jumlah.get(`${item.kode}|${waktu}`) || 0;
    }
  }

  if (ada.fwi) {
    const tanggal = new Set();
    for (const row of fwi) {
      const waktu = tanggalIso(row.tanggal);
      const kode = kodeKan(row.kode);
      const nilai = angkaAda(row.fwi);
      if (!dalamJendela(waktu, hari, sampai) || !kodeKab.has(kode) || nilai == null || nilai < 0) continue;
      tanggal.add(waktu);
      const sel = pastikan(baris, kode);
      sel.f = sel.f || {};
      taruh(sel.f, waktu, nilai);
    }
    cakupan.fwi = [...tanggal].sort();
  }

  if (ada.hujan) {
    const tanggal = new Set();
    for (const row of hujan) {
      const waktu = tanggalIso(row.tanggal);
      const kode = kodeKan(row.kode);
      const nilai = angkaAda(row.curah_hujan_mm ?? row.curahHujan);
      if (!dalamJendela(waktu, hari, sampai) || !kodeKab.has(kode) || nilai == null) continue;
      tanggal.add(waktu);
      const sel = pastikan(baris, kode);
      sel.m = sel.m || {};
      taruh(sel.m, waktu, nilai);
    }
    cakupan.hujan = [...tanggal].sort();
  }

  function petaKelas(rows) {
    const peta = {};
    for (const row of rows) {
      const kode = kodeKan(row.kode_wilayah ?? row.kode ?? "");
      if (!kodeKab.has(kode)) continue;
      const kelas = kelasIrbi(row.kelas);
      const skor = angkaAda(row.skor);
      if (!kelas) continue;
      peta[kode] = { kelas, skor };
    }
    return peta;
  }

  const irbiPeta = ada.irbi ? petaKelas(irbi) : {};
  const longsorPeta = ada.longsor ? petaKelas(longsor) : {};

  if (ada.prakiraan) {
    const indeks = indeksPrakiraan(prakiraan);
    const horizon = [hari, tambahHariIso(hari, 1), tambahHariIso(hari, 2)];
    const tanggal = new Set();
    for (const item of daftar) {
      const grup = indeks.get(item.kode);
      if (!grup) continue;
      const kelas = irbiPeta[item.kode]?.kelas || "";
      for (const waktu of horizon) {
        const slots = grup.perHari.get(waktu) ?? [];
        if (!slots.length) continue;
        const terap = terapkanHari([{ kode: item.kode, banjirKelas: kelas }], indeks, waktu, horizon)[0];
        const cuaca = teksCuaca(slots);
        const analisis = teksAnalisis(terap);
        if (!cuaca && !analisis) continue;
        tanggal.add(waktu);
        const sel = pastikan(baris, item.kode);
        sel.c = sel.c || {};
        sel.a = sel.a || {};
        if (cuaca) sel.c[waktu] = cuaca;
        if (analisis) sel.a[waktu] = analisis;
      }
    }
    cakupan.prakiraan = [...tanggal].sort();
  }

  if (ada.cap) {
    const perKode = new Map();
    for (const row of cap) {
      const kode = kodeKan(row.kode ?? "");
      if (!kodeKab.has(kode)) continue;
      const list = perKode.get(kode) ?? [];
      list.push(row);
      perKode.set(kode, list);
    }
    cakupan.cap = [hari];
    for (const item of daftar) {
      const list = perKode.get(item.kode) ?? [];
      const teks = list.length ? teksCap(list) : capNasional ? REKAP_TANPA_PERINGATAN : "";
      if (!teks) continue;
      const sel = pastikan(baris, item.kode);
      sel.p = { [hari]: teks };
    }
  }

  return {
    hariWib: hari,
    generated_at: "",
    sumber: {
      sipongi: { status: "Tautan saja", url: SIPONGI_URL, temuan: SIPONGI_TEMUAN },
      ...sumber,
    },
    statis: {
      iki: REKAP_BELUM,
      ispu: REKAP_BELUM,
      pvmbg: REKAP_BELUM,
    },
    cakupan,
    ada,
    irbi: irbiPeta,
    longsor: longsorPeta,
    baris,
    meta: { hotspotTanpaKode },
  };
}

function salinPeta(peta) {
  return peta ? { ...peta } : {};
}

function isiSel(lamaPeta, baruPeta, tanggal, mode, hari, sampai, sumberBaru) {
  if (!sumberBaru) return lamaPeta?.[tanggal];
  if (mode === "hotspot") {
    if (baruPeta && Object.prototype.hasOwnProperty.call(baruPeta, tanggal)) return baruPeta[tanggal];
    return lamaPeta?.[tanggal];
  }
  if (mode === "jendela") {
    if (tanggal < hari) return lamaPeta?.[tanggal];
    if (tanggal > sampai) return undefined;
    return baruPeta?.[tanggal];
  }
  if (tanggal < hari) return lamaPeta?.[tanggal];
  if (tanggal === hari) return baruPeta?.[tanggal];
  return undefined;
}

function gabungBidang(lama, baru, cakupan, mode, hari, sampai, sumberBaru) {
  const hasil = {};
  for (const tanggal of cakupan) {
    const nilai = isiSel(lama, baru, tanggal, mode, hari, sampai, sumberBaru);
    if (nilai !== undefined && nilai !== null && nilai !== "") hasil[tanggal] = nilai;
  }
  return hasil;
}

function urutTanggal(nilai) {
  return [...new Set(nilai ?? [])].filter(Boolean).sort();
}

export function gabungRekap(lama, baru) {
  if (!baru) return lama || null;
  if (!lama?.baris) return baru;
  const hari = baru.hariWib;
  const sampai = tambahHariIso(hari, 2);
  const cakupan = {};
  if (baru.ada?.hotspot) cakupan.hotspot = urutTanggal([...(lama.cakupan?.hotspot || []), ...(baru.cakupan?.hotspot || [])]);
  else cakupan.hotspot = urutTanggal(lama.cakupan?.hotspot);
  if (baru.ada?.sipongi) cakupan.sipongi = urutTanggal([...(lama.cakupan?.sipongi || []), ...(baru.cakupan?.sipongi || [])]);
  else cakupan.sipongi = urutTanggal(lama.cakupan?.sipongi);
  for (const kunci of ["fwi", "hujan", "prakiraan"]) {
    if (!baru.ada?.[kunci === "prakiraan" ? "prakiraan" : kunci]) {
      cakupan[kunci] = urutTanggal(lama.cakupan?.[kunci]);
      continue;
    }
    const beku = (lama.cakupan?.[kunci] || []).filter((tanggal) => tanggal < hari);
    const segar = (baru.cakupan?.[kunci] || []).filter((tanggal) => tanggal >= hari && tanggal <= sampai);
    cakupan[kunci] = urutTanggal([...beku, ...segar]);
  }
  if (!baru.ada?.cap) cakupan.cap = urutTanggal(lama.cakupan?.cap);
  else cakupan.cap = urutTanggal([...(lama.cakupan?.cap || []).filter((tanggal) => tanggal < hari), hari]);

  const kode = new Set([...Object.keys(lama.baris || {}), ...Object.keys(baru.baris || {})]);
  const baris = {};
  for (const id of [...kode].sort()) {
    const kiri = lama.baris?.[id] || {};
    const kanan = baru.baris?.[id] || {};
    const sel = {
      h: gabungBidang(kiri.h, kanan.h, cakupan.hotspot, "hotspot", hari, sampai, baru.ada?.hotspot),
      s: gabungBidang(kiri.s, kanan.s, cakupan.sipongi, "hotspot", hari, sampai, baru.ada?.sipongi),
      f: gabungBidang(kiri.f, kanan.f, cakupan.fwi, "jendela", hari, sampai, baru.ada?.fwi),
      m: gabungBidang(kiri.m, kanan.m, cakupan.hujan, "jendela", hari, sampai, baru.ada?.hujan),
      c: gabungBidang(kiri.c, kanan.c, cakupan.prakiraan, "jendela", hari, sampai, baru.ada?.prakiraan),
      a: gabungBidang(kiri.a, kanan.a, cakupan.prakiraan, "jendela", hari, sampai, baru.ada?.prakiraan),
      p: gabungBidang(kiri.p, kanan.p, cakupan.cap, "cap", hari, sampai, baru.ada?.cap),
    };
    const isi = {};
    for (const [bidang, peta] of Object.entries(sel)) {
      if (Object.keys(peta).length) isi[bidang] = peta;
    }
    if (Object.keys(isi).length) baris[id] = isi;
  }

  const sumber = { ...(lama.sumber || {}) };
  for (const kunci of ["hotspot", "fwi", "hujan", "bmkg", "cap", "irbi", "longsor"]) {
    const aktif = kunci === "bmkg" ? baru.ada?.prakiraan : baru.ada?.[kunci];
    if (aktif && baru.sumber?.[kunci]) sumber[kunci] = baru.sumber[kunci];
  }
  sumber.sipongi = baru.sumber?.sipongi || sumber.sipongi;

  return {
    hariWib: hari,
    generated_at: baru.generated_at || "",
    sumber,
    statis: {
      iki: REKAP_BELUM,
      ispu: REKAP_BELUM,
      pvmbg: REKAP_BELUM,
    },
    cakupan,
    ada: baru.ada,
    irbi: baru.ada?.irbi ? baru.irbi : salinPeta(lama.irbi),
    longsor: baru.ada?.longsor ? baru.longsor : salinPeta(lama.longsor),
    baris,
    meta: baru.ada?.hotspot ? baru.meta : lama.meta || baru.meta,
  };
}

export function barisRekap(_rekap, provinsi = "") {
  return daftarKabkota()
    .filter((item) => !provinsi || item.provinsi === provinsi)
    .sort((a, b) => a.provinsi.localeCompare(b.provinsi, "id") || a.nama.localeCompare(b.nama, "id") || a.kode.localeCompare(b.kode));
}

export function tanggalParameter(rekap, param) {
  if (!param || param.jenis === "tetap" || param.jenis === "irbi") return [];
  if (param.id === "hotspot") return urutTanggal([...(rekap?.cakupan?.sipongi || []), ...(rekap?.cakupan?.hotspot || [])]);
  return urutTanggal(rekap?.cakupan?.[param.cakupan]);
}

export function nilaiParameter(rekap, kode, param, tanggal) {
  if (!param) return REKAP_KOSONG;
  if (param.jenis === "tetap") return REKAP_BELUM;
  if (param.jenis === "irbi") {
    const item = rekap?.[param.peta || "irbi"]?.[kode];
    if (!item?.kelas) return IRBI_TIDAK_TERSEDIA;
    const skor = Number.isFinite(Number(item.skor)) ? formatAngka(item.skor, 2) : "";
    return skor ? `${item.kelas} (${skor})` : item.kelas;
  }
  if (!tanggal || !tanggalParameter(rekap, param).includes(tanggal)) return REKAP_KOSONG;
  const raw = rekap?.baris?.[kode]?.[param.bidang]?.[tanggal];
  if (param.jenis === "angka") return raw == null || raw === "" ? REKAP_KOSONG : String(raw);
  if (param.jenis === "fwi") return Number.isFinite(Number(raw)) && Number(raw) >= 0 ? formatAngka(raw, 2) : REKAP_KOSONG;
  if (param.jenis === "kelas") return kelasFwiGwis(raw) || REKAP_KOSONG;
  if (param.jenis === "hujan") return raw == null || raw === "" ? REKAP_KOSONG : teksHujan(raw);
  return raw == null || raw === "" ? REKAP_KOSONG : String(raw);
}

function urutanParameter(rekap, kode, param, tanggal) {
  const teks = nilaiParameter(rekap, kode, param, tanggal);
  if (!teks || teks === REKAP_KOSONG || teks === REKAP_BELUM || teks === IRBI_TIDAK_TERSEDIA || teks === REKAP_TANPA_PERINGATAN) return null;
  if (param.jenis === "angka" || param.jenis === "fwi" || param.jenis === "hujan") {
    const raw = Number(rekap?.baris?.[kode]?.[param.bidang]?.[tanggal]);
    return Number.isFinite(raw) ? raw : null;
  }
  if (param.jenis === "kelas") return PERINGKAT_KELAS[teks] ?? null;
  if (param.id === "analisis") {
    const nama = teks.split(" ")[0];
    return PERINGKAT_ANALISIS[nama] ?? null;
  }
  if (param.id === "cuaca") {
    const rendah = String(teks).toLowerCase();
    if (/sangat lebat|ekstrem/.test(rendah)) return 4;
    if (/lebat|petir|guntur/.test(rendah)) return 3;
    if (/sedang/.test(rendah)) return 2;
    if (/hujan/.test(rendah)) return 1;
    return null;
  }
  if (param.id === "cap") return 1;
  if (param.jenis === "irbi") {
    const kelas = rekap?.[param.peta || "irbi"]?.[kode]?.kelas;
    if (kelas === "Tinggi") return 3;
    if (kelas === "Sedang") return 2;
    if (kelas === "Rendah") return 1;
  }
  return null;
}

export function papanAtas(rekap, param, tanggal, provinsi = "", jumlah = 12) {
  return barisRekap(rekap, provinsi)
    .map((item) => ({
      ...item,
      teks: nilaiParameter(rekap, item.kode, param, tanggal),
      urut: urutanParameter(rekap, item.kode, param, tanggal),
    }))
    .filter((item) => item.urut != null)
    .sort((a, b) => b.urut - a.urut || a.nama.localeCompare(b.nama, "id"))
    .slice(0, jumlah);
}

export function warnaRekap(rekap, kode, param, tanggal) {
  const teks = nilaiParameter(rekap, kode, param, tanggal);
  if (teks === REKAP_KOSONG || teks === REKAP_BELUM || teks === IRBI_TIDAK_TERSEDIA) return "#e2e8f0";
  if (param?.id === "hotspot") {
    const jumlah = Number(teks);
    if (jumlah <= 0) return "#ecfccb";
    if (jumlah < 5) return "#fde68a";
    if (jumlah < 15) return "#fb923c";
    return "#b91c1c";
  }
  if (param?.jenis === "kelas" || param?.jenis === "fwi") {
    const kelas = param.jenis === "kelas" ? teks : kelasFwiGwis(rekap?.baris?.[kode]?.f?.[tanggal]);
    if (kelas === "Rendah") return "#3f6212";
    if (kelas === "Sedang") return "#ca8a04";
    if (kelas === "Tinggi") return "#c2410c";
    if (kelas === "Sangat tinggi") return "#9f1239";
    if (kelas === "Ekstrem") return "#7f1d1d";
    if (kelas === "Sangat ekstrem") return "#4c0519";
    return "#e2e8f0";
  }
  if (param?.id === "hujan") return teks.includes("· ya") ? "#1d4ed8" : "#fef3c7";
  if (param?.id === "analisis") {
    if (teks.startsWith("Awas")) return "#c5362b";
    if (teks.startsWith("Siaga")) return "#ef8f3a";
    if (teks.startsWith("Waspada")) return "#f5d76e";
    return "#d6d3d1";
  }
  if (param?.id === "cap") {
    if (teks === REKAP_TANPA_PERINGATAN) return "#d6d3d1";
    if (/extreme/i.test(teks)) return "#c5362b";
    if (/severe/i.test(teks)) return "#ef8f3a";
    if (/moderate/i.test(teks)) return "#f5d76e";
    return "#94a3b8";
  }
  if (param?.id === "irbi" || param?.id === "longsor") {
    if (teks.startsWith("Tinggi")) return "#9a3412";
    if (teks.startsWith("Sedang")) return "#a16207";
    if (teks.startsWith("Rendah")) return "#3f6212";
  }
  if (param?.id === "cuaca") {
    const rendah = teks.toLowerCase();
    if (/sangat lebat|ekstrem/.test(rendah)) return "#1e3a8a";
    if (/lebat|petir/.test(rendah)) return "#2563eb";
    if (/sedang/.test(rendah)) return "#93c5fd";
    if (/hujan/.test(rendah)) return "#bfdbfe";
    return "#e7e5e4";
  }
  return "#e2e8f0";
}

export function legendaRekap(param) {
  if (param?.id === "hotspot") {
    return [
      { warna: "#ecfccb", label: "0" },
      { warna: "#fde68a", label: "1–4" },
      { warna: "#fb923c", label: "5–14" },
      { warna: "#b91c1c", label: "15 atau lebih" },
      { warna: "#e2e8f0", label: REKAP_KOSONG },
    ];
  }
  if (param?.id === "kelas" || param?.id === "fwi") {
    return [
      { warna: "#3f6212", label: "Rendah < 11,2" },
      { warna: "#ca8a04", label: "Sedang 11,2–< 21,3" },
      { warna: "#c2410c", label: "Tinggi 21,3–< 38" },
      { warna: "#9f1239", label: "Sangat tinggi 38–< 50" },
      { warna: "#7f1d1d", label: "Ekstrem 50–70" },
      { warna: "#4c0519", label: "Sangat ekstrem > 70" },
      { warna: "#e2e8f0", label: REKAP_KOSONG },
    ];
  }
  if (param?.id === "hujan") {
    return [
      { warna: "#1d4ed8", label: "lebih dari 20 mm" },
      { warna: "#fef3c7", label: "20 mm atau kurang" },
      { warna: "#e2e8f0", label: REKAP_KOSONG },
    ];
  }
  if (param?.id === "irbi" || param?.id === "longsor") {
    return [
      { warna: "#9a3412", label: "Tinggi" },
      { warna: "#a16207", label: "Sedang" },
      { warna: "#3f6212", label: "Rendah" },
      { warna: "#e2e8f0", label: IRBI_TIDAK_TERSEDIA },
    ];
  }
  return [
    { warna: "#e2e8f0", label: REKAP_KOSONG },
    { warna: "#d6d3d1", label: "ada nilai, tanpa kelas bahaya" },
  ];
}

function namaLembar(nama) {
  return String(nama).replaceAll(">", "lebih").slice(0, 31);
}

export function lembarRekap(rekap) {
  const lembar = [];
  for (const bagian of REKAP_BAGIAN) {
    for (const param of bagian.parameter) {
      const tanggal = tanggalParameter(rekap, param);
      const kepala = tanggal.length ? ["Provinsi", "Kab/Kota", ...tanggal] : ["Provinsi", "Kab/Kota", "Nilai"];
      const isi = barisRekap(rekap, "").map((item) =>
        tanggal.length
          ? [item.provinsi, item.nama, ...tanggal.map((waktu) => nilaiParameter(rekap, item.kode, param, waktu))]
          : [item.provinsi, item.nama, nilaiParameter(rekap, item.kode, param, "")],
      );
      lembar.push({
        nama: namaLembar(param.nama),
        baris: [[`${bagian.judul} — ${param.nama}`], [catatanParameter(param)], [REKAP_IDENTITAS], [], kepala, ...isi],
      });
    }
  }
  const firmsTanggal = tanggalParameter(rekap, PARAM_FIRMS);
  lembar.splice(1, 0, {
    nama: "Hotspot FIRMS",
    baris: [
      ["Karhutla — FIRMS pembanding"],
      [`${HOTSPOT_CATATAN} ${PEMBANDING_LENCANA}.`],
      [REKAP_IDENTITAS],
      [],
      ["Provinsi", "Kab/Kota", ...(firmsTanggal.length ? firmsTanggal : ["Nilai"])],
      ...barisRekap(rekap, "").map((item) => [
        item.provinsi,
        item.nama,
        ...(firmsTanggal.length
          ? firmsTanggal.map((waktu) => nilaiParameter(rekap, item.kode, PARAM_FIRMS, waktu))
          : [nilaiParameter(rekap, item.kode, PARAM_FIRMS, "")]),
      ]),
    ],
  });
  const sumber = [
    ["Sumber dan waktu data"],
    [REKAP_UNDUH],
    [REKAP_IDENTITAS],
    [],
    ["Parameter", "Status atau sumber", "Diambil", "Waktu sumber", "Catatan"],
  ];
  const blok = [
    ["Hotspot SiPongi", rekap?.sumber?.sipongi],
    ["Hotspot FIRMS pembanding", rekap?.sumber?.hotspot],
    ["FWI", rekap?.sumber?.fwi],
    ["Hujan model", rekap?.sumber?.hujan],
    ["Cuaca BMKG", rekap?.sumber?.bmkg],
    ["CAP", rekap?.sumber?.cap],
    ["IRBI banjir", rekap?.sumber?.irbi],
    ["IRBI longsor", rekap?.sumber?.longsor],
    ["SiPongi+", rekap?.sumber?.sipongi],
  ];
  for (const [nama, item] of blok) {
    sumber.push([
      nama,
      item?.status || item?.nama || item?.instansi || "—",
      item?.diambil ? formatWib(item.diambil) : "—",
      item?.observasi ? formatWib(item.observasi) : item?.label || "—",
      item?.catatan || item?.temuan || "",
    ]);
  }
  sumber.push(["Indeks Kesesuaian Iklim", REKAP_BELUM, "—", "—", catatanParameter(REKAP_BAGIAN[0].parameter[4])]);
  sumber.push(["ISPU", REKAP_BELUM, "—", "—", catatanParameter(REKAP_BAGIAN[0].parameter[5])]);
  sumber.push(["Rawan longsor PVMBG", REKAP_BELUM, "—", "—", catatanParameter(REKAP_BAGIAN[1].parameter[5])]);
  if (rekap?.meta?.hotspotTanpaKode) {
    sumber.push(["Hotspot tanpa kode kabupaten", String(rekap.meta.hotspotTanpaKode), "—", "—", "Tidak dibagikan ke kabupaten/kota."]);
  }
  lembar.push(lembarIrbiGabung(rekap));
  lembar.push({ nama: "Sumber dan waktu", baris: sumber });
  return lembar;
}
