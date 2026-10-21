// Peringkat jumlah deteksi satelit menurut kepercayaan sensor.
// Bukan bahaya kebakaran, bukan luas terbakar, dan bukan kebakaran terkonfirmasi.
import { inDateRange } from "./derive.js";
import { detectionMs } from "./hotspotWindow.js";

export const JENDELA_PERIODE = Object.freeze([
  [24, "24 jam"],
  [48, "48 jam"],
  [168, "7 hari"],
]);

export function labelJendela(hours) {
  return JENDELA_PERIODE.find(([value]) => value === hours)?.[1] || `${hours} jam`;
}

export function kelasPeringkat(point) {
  if (point?.kelasKepercayaan === "tinggi") return "merah";
  if (point?.kelasKepercayaan === "nominal") return "oranye";
  if (point?.kelasKepercayaan === "rendah") return "kuning";
  return "tidak_diketahui";
}

export function saringPeriodeHotspot(points, { from = "", to = "", province = "" } = {}) {
  if (from && to && from > to) return [];
  return (points ?? []).filter((row) => {
    if (!inDateRange(row?.tanggal, from, to)) return false;
    if (province && row.provinsi !== province) return false;
    return true;
  });
}

export function barisPeriodeAktif(points, { from = "", to = "", province = "", hours = null } = {}) {
  const ranged = saringPeriodeHotspot(points, { from, to, province }).filter(
    (row) => Number.isFinite(row?.lintang) && Number.isFinite(row?.bujur),
  );
  if (!hours) return ranged;
  const newest = ranged.reduce((max, row) => {
    const ms = detectionMs(row);
    if (ms == null) return max;
    return max == null || ms > max ? ms : max;
  }, null);
  if (newest == null) return [];
  const cutoff = newest - Number(hours) * 3600000;
  return ranged.filter((row) => {
    const ms = detectionMs(row);
    return ms != null && ms >= cutoff;
  });
}

function kunciWilayah(point, tingkat) {
  if (tingkat === "kabupaten") {
    const kab = String(point?.kabupaten || "").trim() || "Belum terpetakan";
    const prov = String(point?.provinsi || "").trim() || "Belum terpetakan";
    return `${kab}\u0000${prov}`;
  }
  return String(point?.provinsi || "").trim() || "Belum terpetakan";
}

function namaWilayah(kunci, tingkat) {
  if (tingkat !== "kabupaten") return kunci;
  const [kab, prov] = kunci.split("\u0000");
  if (!kab || kab === "Belum terpetakan") return "Belum terpetakan";
  return prov && prov !== "Belum terpetakan" ? `${kab}, ${prov}` : kab;
}

function isoDeteksi(point) {
  const ms = detectionMs(point);
  if (ms == null) return String(point?.tanggal || "");
  return new Date(ms).toISOString();
}

export function bandingPeringkat(a, b) {
  return (
    b.merah - a.merah ||
    b.oranye - a.oranye ||
    b.kuning - a.kuning ||
    b.total - a.total ||
    a.nama.localeCompare(b.nama, "id")
  );
}

export function sepuluhPrioritas(baris) {
  return (baris ?? []).slice(0, 10);
}

export const JUMLAH_CHIP_PROVINSI = 8;

export function namaChipProvinsi(baris, batas = JUMLAH_CHIP_PROVINSI) {
  const daftar = [];
  for (const row of baris ?? []) {
    const nama = String(row?.nama || "").trim();
    if (!nama || nama === "Belum terpetakan" || row?.tingkat === "kabupaten") continue;
    daftar.push(nama);
    if (daftar.length >= batas) break;
  }
  return daftar;
}

export function chipProvinsi(points, { from = "", to = "", hours = null } = {}) {
  const baris = susunPeringkatHotspot(barisPeriodeAktif(points, { from, to, province: "", hours }), {
    tingkat: "provinsi",
  }).baris;
  return namaChipProvinsi(baris);
}

export function susunPeringkatHotspot(points, { tingkat = "provinsi" } = {}) {
  const level = tingkat === "kabupaten" ? "kabupaten" : "provinsi";
  const groups = new Map();
  for (const point of points ?? []) {
    const kunci = kunciWilayah(point, level);
    let row = groups.get(kunci);
    if (!row) {
      row = {
        nama: namaWilayah(kunci, level),
        tingkat: level,
        merah: 0,
        oranye: 0,
        kuning: 0,
        tidakDiketahui: 0,
        total: 0,
        waktuData: "",
      };
      groups.set(kunci, row);
    }
    const kelas = kelasPeringkat(point);
    if (kelas === "tidak_diketahui") row.tidakDiketahui += 1;
    else {
      row[kelas] += 1;
      row.total += 1;
    }
    const iso = isoDeteksi(point);
    if (iso > row.waktuData) row.waktuData = iso;
  }
  const baris = [...groups.values()].sort(bandingPeringkat).map((row, index) => ({
    ...row,
    peringkat: index + 1,
  }));
  const jumlah = (points ?? []).length;
  const tidakDiketahui = baris.reduce((sum, row) => sum + row.tidakDiketahui, 0);
  return {
    tingkat: level,
    baris,
    jumlahTitik: jumlah,
    tidakDiketahui,
    total: baris.reduce((sum, row) => sum + row.total, 0),
    merah: baris.reduce((sum, row) => sum + row.merah, 0),
    oranye: baris.reduce((sum, row) => sum + row.oranye, 0),
    kuning: baris.reduce((sum, row) => sum + row.kuning, 0),
  };
}

export function keadaanHotspot(feed, { memuat = false, tertunda = false } = {}) {
  if (memuat && !feed) {
    return { status: "memuat", tampil: false, teks: "Memuat titik panas…" };
  }
  if (!feed) {
    return { status: "gagal", tampil: false, teks: "Titik panas gagal dimuat." };
  }
  if (feed.contoh) {
    return { status: "gagal", tampil: false, teks: "Data contoh tidak ditampilkan." };
  }
  const adaBaris = Array.isArray(feed.rows) && feed.rows.length > 0;
  if (feed.status === "gagal" && !adaBaris) {
    return { status: "gagal", tampil: false, teks: feed.error || "Titik panas gagal dimuat." };
  }
  if (feed.status === "usang" || tertunda) {
    return {
      status: "kedaluwarsa",
      tampil: adaBaris,
      teks: "Cuplikan terakhir, bukan data terkini. Angka di bawah tidak disebut kondisi saat ini.",
    };
  }
  if (feed.status === "berhasil") {
    return { status: "berhasil", tampil: true, teks: "" };
  }
  return { status: "sebagian", tampil: adaBaris, teks: feed.error || "Sebagian data titik panas." };
}
