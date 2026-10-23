import { normalizePlaceName } from "./attentionPrototype.js";
import { daftarKabkota } from "./kabProvinsi.js";

export const WAKTU_CUPLIKAN_81 = "2026-10-23T09:14:20+07:00";
export const WAKTU_CUPLIKAN_81_TEKS = "23 Oktober 2026, 09.14 WIB";

const PRIORITAS = ["Riau", "Jambi", "Sumatera Selatan", "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan"];

const PROVINSI_LEMBAR = {
  RIAU: "Riau",
  JAMBI: "Jambi",
  "SUMATERA SELATAN": "Sumatera Selatan",
  "KALIMANTAN BARAT": "Kalimantan Barat",
  "KALIMANTAN TENGAH": "Kalimantan Tengah",
  "KALIMANTAN SELATAN": "Kalimantan Selatan",
};

export const METRIK_81 = Object.freeze([
  {
    id: "fwi",
    judul: "FWI — 81 kabupaten/kota prioritas",
    lembar: "FWI 81 kab/kota",
    label: "Unduh FWI (81 kab/kota)",
    kolom: "FWI",
    sumberKolom: "FWI",
    berkas: "data/static/karhutla-81/fwi-81-kab-kota.csv",
    kosong: "#N/A",
  },
  {
    id: "hujan",
    judul: "Peluang Hujan >20 mm — 81 kabupaten/kota prioritas",
    lembar: "Peluang Hujan 81",
    label: "Unduh Peluang Hujan",
    kolom: "Peluang Hujan >20 mm (rentang %)",
    sumberKolom: "Peluang Hujan >20mm (Rentang %)",
    berkas: "data/static/karhutla-81/peluang-hujan-81-kab-kota.csv",
    kosong: "",
  },
  {
    id: "iklim",
    judul: "Indeks Kesesuaian Iklim — 81 kabupaten/kota prioritas",
    lembar: "Indeks Iklim 81",
    label: "Unduh Indeks Kesesuaian Iklim",
    kolom: "Indeks Kesesuaian Iklim",
    sumberKolom: "Indeks Kesesuain Iklim (Rendah, Menengah, Tinggi)",
    berkas: "data/static/karhutla-81/indeks-kesesuaian-iklim-81-kab-kota.csv",
    kosong: "",
  },
]);

function metrikDari(id) {
  return METRIK_81.find((item) => item.id === id);
}

function kunci(provinsi, nama) {
  return `${provinsi}|${normalizePlaceName(nama)}`;
}

function indeksLembar(rows, metrik) {
  const peta = new Map();
  for (const row of rows ?? []) {
    const provinsi = PROVINSI_LEMBAR[row.PROVINSI] || row.PROVINSI;
    const nama = row["KAB/KOTA"];
    if (!provinsi || !nama) continue;
    const nilai = row[metrik.sumberKolom];
    peta.set(kunci(provinsi, nama), nilai == null ? "" : String(nilai));
  }
  return peta;
}

export function susunKarhutla81(berkas = {}) {
  const indeks = new Map(METRIK_81.map((metrik) => [metrik.id, indeksLembar(berkas[metrik.id], metrik)]));
  return daftarKabkota()
    .filter((item) => PRIORITAS.includes(item.provinsi))
    .map((item) => {
      const kunciBaris = kunci(item.provinsi, item.nama);
      const nilai = {};
      for (const metrik of METRIK_81) {
        const peta = indeks.get(metrik.id);
        nilai[metrik.id] = peta?.has(kunciBaris) ? peta.get(kunciBaris) : metrik.kosong;
      }
      return { kode: item.kode, provinsi: item.provinsi, nama: item.nama, nilai };
    });
}

export function catatanUnduh81(metrik) {
  return [
    metrik.judul,
    `Waktu cuplikan: ${WAKTU_CUPLIKAN_81_TEKS}. Cuplikan baca-saja lembar Analisis Karhutla 2026, disimpan ${WAKTU_CUPLIKAN_81}. Bukan sinkron langsung.`,
    "81 kabupaten/kota pada enam provinsi prioritas, kode Kemendagri, urutan yang sama di setiap berkas. Nilai disalin menurut nama wilayah. Sel yang tidak ada tidak diisi angka. FWI #N/A dibiarkan. Bukan FDRS BMKG dan bukan peringatan resmi.",
  ];
}

function csvSel(value) {
  const teks = value == null ? "" : String(value);
  if (/[",\n\r]/.test(teks)) return `"${teks.replaceAll('"', '""')}"`;
  return teks;
}

export function namaBerkasKarhutla81(id, jenis) {
  const akhir = jenis === "xlsx" ? "xlsx" : "csv";
  return `${id}-81-kab-kota-2026-10-23-0914.${akhir}`;
}

export function csvKarhutla81(baris, id) {
  const metrik = metrikDari(id);
  const kepala = ["Kode Kab/Kota", "Provinsi", "Kab/Kota", metrik.kolom];
  const lines = catatanUnduh81(metrik).map((line) => `# ${line}`);
  lines.push(kepala.join(","));
  for (const item of baris ?? []) {
    lines.push([item.kode, item.provinsi, item.nama, item.nilai?.[id] ?? metrik.kosong].map(csvSel).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function lembarKarhutla81(baris, id) {
  const metrik = metrikDari(id);
  const kepala = ["Kode Kab/Kota", "Provinsi", "Kab/Kota", metrik.kolom];
  return {
    nama: metrik.lembar,
    baris: [
      [metrik.judul],
      ...catatanUnduh81(metrik).slice(1).map((line) => [line]),
      [],
      kepala,
      ...(baris ?? []).map((item) => [item.kode, item.provinsi, item.nama, item.nilai?.[id] ?? metrik.kosong]),
    ],
  };
}
