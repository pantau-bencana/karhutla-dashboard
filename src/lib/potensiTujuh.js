// Analisis 7 hari. Bukan prakiraan resmi BMKG, BNPB, atau Kementerian Kehutanan.
import { CAKUPAN_PROVINSI, kodeKan, percentRanks } from "./aplus.js";
import { normalizePlaceName } from "./attentionPrototype.js";
import { addDays } from "./derive.js";
import { cariWilayahBatas } from "./kabProvinsi.js";
import { tanggalJakarta } from "./gwisFwi.js";

export const POTENSI_JUDUL = "Potensi karhutla 7 hari ke depan";
export const POTENSI_JENIS = "analisis model, bukan prakiraan resmi";
export const POTENSI_DISCLAIMER =
  "Analisis model Pantau Bencana, bukan prakiraan resmi BMKG, BNPB, atau Kementerian Kehutanan. Bukan FDRS SPARTAN, bukan status siaga, dan bukan perintah operasional.";
export const HORIZON_HARI = 7;
export const FWI_HARI_MIN = 5;
export const HUJAN_HARI_MIN = 5;
export const HUJAN_MM = 20;
export const AMBANG_SANGAT = 0.75;
export const AMBANG_TINGGI = 0.55;
export const AMBANG_SEDANG = 0.35;
export const MAKS_JAM_CUACA = 36;
export const MAKS_JAM_HOTSPOT = 18;
export const KELAS_BELUM = "Belum cukup data";

export const PARAMETER_POTENSI = Object.freeze([
  {
    id: "bahaya",
    nama: "Indeks risiko bahaya",
    resmi: "inaRISK BNPB",
    ketersediaan: "belum terintegrasi",
    catatan:
      "Layanan peta berupa raster ImageServer, bukan tabel kabupaten. Raster tidak digambar dan tidak diubah menjadi skor.",
    tautan: "https://inarisk2.bnpb.go.id/portal/",
    masukSkor: false,
  },
  {
    id: "hotspot",
    nama: "Jumlah hotspot",
    resmi: "SiPongi, Kementerian Kehutanan",
    ketersediaan: "pengganti",
    catatan:
      "SiPongi+ hanya tautan, bukan API. Pengganti: jumlah deteksi NASA FIRMS kelas nominal dan tinggi pada 7 hari terakhir. Rendah dan tidak diketahui tidak dihitung. Bukan jumlah SiPongi dan bukan kebakaran terkonfirmasi.",
    masukSkor: true,
  },
  {
    id: "fwi",
    nama: "Tren Fire Weather Index",
    resmi: "SPARTAN BMKG",
    ketersediaan: "pengganti",
    catatan:
      "Citra SPARTAN hingga H+7 sesuai produk BMKG tidak didigitasi. Pengganti: rata-rata FWI model ECMWF pada titik wakil, Copernicus GWIS, untuk 7 tanggal ke depan yang ada di cuplikan. Bukan kelas FDRS BMKG.",
    masukSkor: true,
  },
  {
    id: "ispu",
    nama: "Kategori ISPU",
    resmi: "Kementerian Lingkungan Hidup",
    ketersediaan: "belum terintegrasi",
    catatan:
      "Tidak ada API ISPU yang terdokumentasi. Kadar PM model tidak diubah menjadi kategori ISPU. Indeks Kualitas Udara 2024 tidak dipakai.",
    tautan: "https://ispu.kemenlh.go.id/app/#/",
    masukSkor: false,
  },
  {
    id: "hujan",
    nama: "Peluang hujan >20 mm",
    resmi: "Meteo publik BMKG",
    ketersediaan: "pengganti",
    catatan:
      "BMKG tidak menyediakan peluang persen hujan di atas 20 mm per kabupaten pada API 3 hari. Pengganti: jumlah hari pada 7 hari ke depan yang precipitation_sum model ECMWF (Open-Meteo) di titik wakil melebihi 20 mm. Bukan peluang persen dan bukan precipitation_probability di atas 0,1 mm.",
    masukSkor: true,
  },
  {
    id: "iklim",
    nama: "Indeks kesesuaian iklim",
    resmi: "Iklim BMKG (CEWS)",
    ketersediaan: "belum terintegrasi",
    catatan: "Kelas rendah, menengah, atau tinggi tidak dihitung dari FWI atau hujan.",
    tautan: "https://cews.bmkg.go.id/dashboard-custom/prediksi-karhutla/",
    masukSkor: false,
  },
  {
    id: "cakupan",
    nama: "Cakupan wilayah",
    resmi: "Enam provinsi prioritas",
    ketersediaan: "tersedia",
    catatan:
      "Riau, Jambi, Sumatera Selatan, Kalimantan Barat, Kalimantan Tengah, dan Kalimantan Selatan. Nama kabupaten memakai batas yang tersimpan bila kodenya cocok. Kabupaten di luar enam provinsi tidak masuk tabel.",
    masukSkor: false,
  },
]);

const URUTAN_KELAS = Object.freeze({
  "Sangat tinggi": 0,
  Tinggi: 1,
  Sedang: 2,
  Rendah: 3,
  [KELAS_BELUM]: 4,
});

function umurJam(iso, now) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return Infinity;
  return (now.getTime() - then) / 3600000;
}

function tanggalDepan(hari0, jumlah = HORIZON_HARI) {
  return Array.from({ length: jumlah }, (_, index) => addDays(hari0, index));
}

function rata(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function kelasDariSkor(skor) {
  if (!Number.isFinite(skor)) return KELAS_BELUM;
  if (skor >= AMBANG_SANGAT) return "Sangat tinggi";
  if (skor >= AMBANG_TINGGI) return "Tinggi";
  if (skor >= AMBANG_SEDANG) return "Sedang";
  return "Rendah";
}

export function teksSaran(kelas, hotspot) {
  if (kelas === KELAS_BELUM) return "Belum cukup data.";
  if (kelas === "Sangat tinggi" || kelas === "Tinggi") {
    if (Number(hotspot) > 0) {
      return "Verifikasi lapangan. Ada deteksi satelit nominal atau tinggi pada 7 hari terakhir. Bukan perintah pemadaman dan bukan kebakaran terkonfirmasi.";
    }
    return "Antisipasi. Skor cuaca model tinggi pada 7 hari cuplikan. Belum ada deteksi nominal atau tinggi pada 7 hari terakhir. Bukan status siaga.";
  }
  if (kelas === "Sedang") return "Patroli. Skor di tengah sebaran analisis ini. Bukan status siaga.";
  return "Pantau. Skor di bawah ambang kelas sedang pada analisis ini.";
}

export function teksBobot(hotspotMasuk) {
  if (hotspotMasuk) {
    return "Bobot sama, masing-masing sepertiga: peringkat FWI rata-rata, peringkat hari tanpa hujan model di atas 20 mm, dan peringkat jumlah hotspot FIRMS.";
  }
  return "Hotspot tidak masuk skor karena cuplikannya tidak ada. Bobot sama, masing-masing setengah: peringkat FWI rata-rata dan peringkat hari tanpa hujan model di atas 20 mm.";
}

export function ringkasHujanModel(baris) {
  const lengkap = (baris ?? []).filter((row) => row?.skor != null && Number.isFinite(Number(row.hariBasah)) && Number(row.hujanHari) > 0);
  if (!lengkap.length) return null;
  const hitung = new Map();
  for (const row of lengkap) {
    const hari = Number(row.hariBasah);
    hitung.set(hari, (hitung.get(hari) ?? 0) + 1);
  }
  const kelompok = [...hitung.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hari, jumlah]) => ({ hari, jumlah }));
  const jendela = [...new Set(lengkap.map((row) => Number(row.hujanHari)))];
  return {
    membedakan: kelompok.length > 1,
    kelompok,
    hariJendela: jendela.length === 1 ? jendela[0] : null,
    jumlah: lengkap.length,
  };
}

function kumpulkanHari(rows, tanggalSet, provinsiSet, angka) {
  const byKode = new Map();
  for (const row of rows ?? []) {
    const tanggal = String(row?.tanggal ?? "").slice(0, 10);
    if (!tanggalSet.has(tanggal)) continue;
    const kode = kodeKan(row?.kode);
    if (!kode) continue;
    const wilayah = cariWilayahBatas({ kode, kabupaten: row?.kabupaten });
    if (!wilayah || !provinsiSet.has(wilayah.provinsi)) continue;
    let bucket = byKode.get(wilayah.kode);
    if (!bucket) {
      bucket = { kode: wilayah.kode, kabupaten: wilayah.nama, provinsi: wilayah.provinsi, hari: new Map() };
      byKode.set(wilayah.kode, bucket);
    }
    const number = Number(angka(row));
    if (!Number.isFinite(number)) continue;
    const list = bucket.hari.get(tanggal) ?? [];
    list.push(number);
    bucket.hari.set(tanggal, list);
  }
  return byKode;
}

function hitungHotspot(rows, dari, sampai) {
  const counts = new Map();
  for (const point of rows ?? []) {
    if (point?.wilayahStatus === "gagal" || point?.contoh) continue;
    const tanggal = String(point?.tanggal ?? "").slice(0, 10);
    if (!tanggal || tanggal < dari || tanggal > sampai) continue;
    const kelas = point?.kelasKepercayaan;
    if (kelas !== "nominal" && kelas !== "tinggi") continue;
    const kode = kodeKan(point?.kodeKabupaten || point?.kode);
    if (!kode) continue;
    counts.set(kode, (counts.get(kode) ?? 0) + 1);
  }
  return counts;
}

function indeksIrbi(rows) {
  const map = new Map();
  for (const row of rows ?? []) {
    if (row?.contoh) continue;
    const kunci = `${normalizePlaceName(row?.provinsi)}|${normalizePlaceName(row?.kabupaten)}`;
    if (!map.has(kunci) && Number.isFinite(Number(row?.indeks))) map.set(kunci, row);
  }
  return map;
}

export function susunPotensiTujuh({
  fwiRows = [],
  hujanRows = [],
  hotspotRows = null,
  irbiRows = [],
  provinsi = CAKUPAN_PROVINSI,
  fwiFetchedAt = "",
  hujanFetchedAt = "",
  hotspotFetchedAt = "",
  now = new Date(),
} = {}) {
  const saat = now instanceof Date ? now : new Date(now);
  const hari0 = tanggalJakarta(saat);
  const depan = tanggalDepan(hari0);
  const tanggalDepanSet = new Set(depan);
  const hotspotDari = addDays(hari0, -(HORIZON_HARI - 1));
  const provinsiSet = new Set(provinsi?.length ? provinsi : CAKUPAN_PROVINSI);
  const alasan = [];
  if (umurJam(fwiFetchedAt, saat) > MAKS_JAM_CUACA) {
    alasan.push("cuplikan FWI pembanding lebih dari 36 jam atau waktu ambilnya tidak ada");
  }
  if (umurJam(hujanFetchedAt, saat) > MAKS_JAM_CUACA) {
    alasan.push("cuplikan hujan model lebih dari 36 jam atau waktu ambilnya tidak ada");
  }
  const hotspotMasuk = Array.isArray(hotspotRows);
  const hotspotTertunda = hotspotMasuk && umurJam(hotspotFetchedAt, saat) > MAKS_JAM_HOTSPOT;
  const fwi = kumpulkanHari(fwiRows, tanggalDepanSet, provinsiSet, (row) => row.fwi);
  const hujan = kumpulkanHari(hujanRows, tanggalDepanSet, provinsiSet, (row) => row.curahHujan);
  const panas = hotspotMasuk ? hitungHotspot(hotspotRows, hotspotDari, hari0) : new Map();
  const irbi = indeksIrbi(irbiRows);
  const kode = new Set([...fwi.keys(), ...hujan.keys()]);
  const dasar = [...kode].map((id) => {
    const wilayah = fwi.get(id) || hujan.get(id);
    const fwiHarian = [...(wilayah && fwi.get(id) ? fwi.get(id).hari.values() : [])].map((list) => rata(list)).filter((value) => value != null);
    const hujanHari = hujan.get(id)?.hari ?? new Map();
    let hariBasah = 0;
    for (const list of hujanHari.values()) {
      if (Math.max(...list) > HUJAN_MM) hariBasah += 1;
    }
    const iklim = irbi.get(`${normalizePlaceName(wilayah.provinsi)}|${normalizePlaceName(wilayah.kabupaten)}`);
    return {
      kode: id,
      kabupaten: wilayah.kabupaten,
      provinsi: wilayah.provinsi,
      fwiRata: rata(fwiHarian),
      fwiHari: fwiHarian.length,
      hariBasah,
      hujanHari: hujanHari.size,
      kering: hujanHari.size ? (hujanHari.size - hariBasah) / hujanHari.size : null,
      hotspot: hotspotMasuk ? panas.get(id) ?? 0 : null,
      irbi: iklim ? Number(iklim.indeks) : null,
      irbiKelas: iklim?.kelas || "",
    };
  });
  const lengkap = alasan.length
    ? []
    : dasar.filter((row) => row.fwiHari >= FWI_HARI_MIN && row.hujanHari >= HUJAN_HARI_MIN && row.fwiRata != null && row.kering != null);
  const rFwi = percentRanks(lengkap.map((row) => row.fwiRata));
  const rKering = percentRanks(lengkap.map((row) => row.kering));
  const rPanas = hotspotMasuk ? percentRanks(lengkap.map((row) => row.hotspot)) : [];
  const skorLengkap = new Map();
  lengkap.forEach((row, index) => {
    const ranks = [rFwi[index], rKering[index]];
    if (hotspotMasuk) ranks.push(rPanas[index]);
    const ada = ranks.filter((value) => value != null);
    const skor = ada.length ? ada.reduce((sum, value) => sum + value, 0) / ada.length : null;
    skorLengkap.set(row.kode, skor);
  });
  const baris = dasar
    .map((row) => {
      const skor = skorLengkap.has(row.kode) ? skorLengkap.get(row.kode) : null;
      const kelas = alasan.length || skor == null ? KELAS_BELUM : kelasDariSkor(skor);
      return {
        ...row,
        skor,
        kelas,
        saran: teksSaran(kelas, row.hotspot),
      };
    })
    .sort((a, b) => {
      const kelas = (URUTAN_KELAS[a.kelas] ?? 9) - (URUTAN_KELAS[b.kelas] ?? 9);
      if (kelas) return kelas;
      const skor = (b.skor ?? -1) - (a.skor ?? -1);
      if (skor) return skor;
      return a.kabupaten.localeCompare(b.kabupaten, "id") || a.provinsi.localeCompare(b.provinsi, "id");
    });
  if (!alasan.length && !baris.length) alasan.push("tidak ada kabupaten pada enam provinsi untuk 7 tanggal ke depan");
  return {
    judul: POTENSI_JUDUL,
    jenis: POTENSI_JENIS,
    disclaimer: POTENSI_DISCLAIMER,
    bobot: teksBobot(hotspotMasuk),
    tersedia: alasan.length === 0,
    alasan,
    dari: depan[0],
    sampai: depan.at(-1),
    hotspotDari,
    hotspotSampai: hari0,
    hotspotMasuk,
    hotspotTertunda,
    parameter: PARAMETER_POTENSI,
    baris,
  };
}
