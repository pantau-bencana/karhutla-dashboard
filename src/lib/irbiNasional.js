import { kelasIrbi } from "./analisisPantauBencana.js";
import { identitasTampil } from "./identitas.js";
import { formatAngka } from "./format.js";
import { IRBI_PENGGUNAAN_INTERNAL, IRBI_TIDAK_TERSEDIA } from "./floodMatrix.js";
import { daftarKabkota } from "./kabProvinsi.js";
import { PROVINSI } from "./provinsi.js";

export const IRBI_BELUM_BERKAS = "belum terintegrasi";
export const IRBI_BUKU_URL = "https://inarisk.bnpb.go.id/IRBI-2025/";

export const IRBI_ANCAMAN = Object.freeze([
  { id: "banjir", nama: "Banjir", berkas: "data/static/irbi-2025-banjir.csv", halaman: "212–227" },
  { id: "longsor", nama: "Tanah longsor", berkas: "data/static/irbi-2025-longsor.csv", halaman: "310–323" },
  { id: "karhutla", nama: "Karhutla", berkas: "data/static/irbi-2025-karhutla.csv", halaman: "294–307" },
  { id: "gempabumi", nama: "Gempabumi", berkas: "data/static/irbi-2025-gempabumi.csv", halaman: "230–245" },
  { id: "tsunami", nama: "Tsunami", berkas: "data/static/irbi-2025-tsunami.csv", halaman: "248–256" },
  { id: "gunung-api", nama: "Letusan gunung api", berkas: "data/static/irbi-2025-gunung-api.csv", halaman: "260–263" },
  { id: "banjir-bandang", nama: "Banjir bandang", berkas: "data/static/irbi-2025-banjir-bandang.csv", halaman: "266–278" },
  { id: "gelombang-abrasi", nama: "Gelombang ekstrem dan abrasi", berkas: "data/static/irbi-2025-gelombang-abrasi.csv", halaman: "282–291" },
  { id: "kekeringan", nama: "Kekeringan", berkas: "data/static/irbi-2025-kekeringan.csv", halaman: "326–341" },
  { id: "likuefaksi", nama: "Likuefaksi", berkas: "data/static/irbi-2025-likuefaksi.csv", halaman: "344–355" },
  { id: "cuaca-ekstrem", nama: "Cuaca ekstrem", berkas: "data/static/irbi-2025-cuaca-ekstrem.csv", halaman: "358–373" },
  { id: "multibahaya", nama: "Multibahaya", berkas: "data/static/irbi-2025-multibahaya.csv", halaman: "40–55", opsional: true },
]);

const IDENTITAS = identitasTampil();

function kunci(provinsi, nama) {
  const rapikan = (nilai) =>
    String(nilai ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return `${rapikan(provinsi)}|${rapikan(nama)}`;
}

function skorMentah(row) {
  return String(row?.skor ?? row?.indeks_risiko ?? "").trim();
}

function kelasMentah(row) {
  return String(row?.kelas ?? row?.kelas_risiko ?? "").trim();
}

export function teksSkorIrbi(row) {
  const skor = skorMentah(row);
  const kelas = kelasMentah(row);
  if (!skor || !kelas) return IRBI_TIDAK_TERSEDIA;
  const angka = Number(skor.replace(",", "."));
  if (!Number.isFinite(angka)) return IRBI_TIDAK_TERSEDIA;
  const tampil = kelasIrbi(kelas) || kelas;
  return `${tampil} (${formatAngka(angka, 2)})`;
}

function aliasNama(berkas) {
  const peta = new Map();
  for (const item of daftarKabkota()) peta.set(kunci(item.provinsi, item.nama), item.kode);
  for (const rows of Object.values(berkas ?? {})) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const kode = String(row?.kode_wilayah ?? "").trim();
      if (!kode) continue;
      for (const nama of [row.kabupaten_irbi, row.nama_big, row.kabupaten]) {
        if (!nama) continue;
        const key = kunci(row.provinsi, nama);
        if (!peta.has(key)) peta.set(key, kode);
      }
    }
  }
  return peta;
}

function indeksBerkas(rows, alias) {
  const peta = new Map();
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    let kode = String(row?.kode_wilayah ?? "").trim();
    if (!kode) {
      for (const nama of [row.kabupaten_irbi, row.nama_big, row.kabupaten]) {
        kode = alias.get(kunci(row.provinsi, nama)) || "";
        if (kode) break;
      }
    }
    if (!kode || peta.has(kode)) continue;
    peta.set(kode, teksSkorIrbi(row));
  }
  return peta;
}

export function susunIrbiNasional(berkas = {}) {
  const alias = aliasNama(berkas);
  const indeks = new Map(IRBI_ANCAMAN.map((ancaman) => [ancaman.id, indeksBerkas(berkas[ancaman.id], alias)]));
  const urutProvinsi = new Map(PROVINSI.map((item, index) => [item.nama, index]));
  const kelompok = new Map();
  for (const item of daftarKabkota()) {
    const nilai = {};
    for (const ancaman of IRBI_ANCAMAN) {
      const peta = indeks.get(ancaman.id);
      nilai[ancaman.id] = peta == null ? IRBI_BELUM_BERKAS : peta.get(item.kode) || IRBI_TIDAK_TERSEDIA;
    }
    const daftar = kelompok.get(item.provinsi) ?? [];
    daftar.push({ kode: item.kode, provinsi: item.provinsi, nama: item.nama, nilai });
    kelompok.set(item.provinsi, daftar);
  }
  return [...kelompok.entries()]
    .sort((a, b) => (urutProvinsi.get(a[0]) ?? 99) - (urutProvinsi.get(b[0]) ?? 99) || a[0].localeCompare(b[0], "id"))
    .map(([provinsi, kab]) => ({
      provinsi,
      kab: kab.sort((a, b) => a.nama.localeCompare(b.nama, "id") || a.kode.localeCompare(b.kode)),
    }));
}

export function ancamanTerpilih(ids) {
  const set = new Set(ids ?? []);
  return IRBI_ANCAMAN.filter((item) => set.has(item.id));
}

export function barisUnduh(kelompok, { provinsi = [], ancaman = [] } = {}) {
  const wilayah = new Set(provinsi ?? []);
  const kolom = ancamanTerpilih(ancaman);
  const baris = [];
  for (const grup of kelompok ?? []) {
    if (wilayah.size && !wilayah.has(grup.provinsi)) continue;
    for (const item of grup.kab) {
      baris.push({
        provinsi: item.provinsi,
        nama: item.nama,
        kode: item.kode,
        nilai: Object.fromEntries(kolom.map((ancaman) => [ancaman.id, item.nilai[ancaman.id] || IRBI_TIDAK_TERSEDIA])),
      });
    }
  }
  return baris;
}

function csvSel(value) {
  const teks = value == null ? "" : String(value);
  if (/[",\n\r]/.test(teks)) return `"${teks.replaceAll('"', '""')}"`;
  return teks;
}

export function catatanUnduhIrbi() {
  return [
    IRBI_PENGGUNAAN_INTERNAL,
    "Status sumber: Data statis. Tahun 2025. Tahunan, bukan prakiraan harian. Kabupaten/kota tanpa skor ditulis IRBI tidak tersedia. Skor tidak diubah dan tidak diisi nol.",
    IDENTITAS,
  ];
}

export function csvIrbiNasional(baris, ancamanIds) {
  const kolom = ancamanTerpilih(ancamanIds);
  const kepala = ["Provinsi", "Kab/Kota", "Kode", ...kolom.map((item) => item.nama)];
  const lines = catatanUnduhIrbi().map((line) => `# ${line}`);
  lines.push(kepala.join(","));
  for (const item of baris ?? []) {
    lines.push([item.provinsi, item.nama, item.kode, ...kolom.map((ancaman) => item.nilai[ancaman.id])].map(csvSel).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function lembarIrbiNasional(baris, ancamanIds) {
  const kolom = ancamanTerpilih(ancamanIds);
  const kepala = ["Provinsi", "Kab/Kota", "Kode", ...kolom.map((item) => item.nama)];
  return {
    nama: "IRBI 2025",
    baris: [
      ["IRBI 2025"],
      ...catatanUnduhIrbi().map((line) => [line]),
      [],
      kepala,
      ...(baris ?? []).map((item) => [item.provinsi, item.nama, item.kode, ...kolom.map((ancaman) => item.nilai[ancaman.id])]),
    ],
  };
}
