import { analisisDampakIndonesia } from "../lib/siklonBmkg.js";

const ROMAWI = { 4: "IV", 3: "III", 2: "II", 1: "I" };

function rapikan(teks) {
  return String(teks || "").replace(/\s+/g, " ").trim();
}

export function batangTanggal(baris) {
  const peta = new Map();
  for (const titik of baris || []) {
    const hari = String(titik?.tanggal || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hari)) continue;
    peta.set(hari, (peta.get(hari) || 0) + 1);
  }
  return [...peta.entries()]
    .sort((kiri, kanan) => kiri[0].localeCompare(kanan[0]))
    .slice(-7)
    .map(([hari, jumlah]) => ({ hari, jumlah }));
}

export function ubahHari(batang) {
  if (!batang || batang.length < 2) return null;
  const kini = batang[batang.length - 1];
  const lalu = batang[batang.length - 2];
  const selisih = kini.jumlah - lalu.jumlah;
  const persen = lalu.jumlah > 0 ? (selisih / lalu.jumlah) * 100 : null;
  return { kini, lalu, selisih, persen };
}

function berdampakKeIndonesia(sistem) {
  const agensi = String(sistem?.agensi || "BMKG").toUpperCase();
  if (agensi !== "BMKG") return false;
  const hasil = analisisDampakIndonesia(sistem);
  return hasil.tingkat === "Disebut BMKG" || hasil.tingkat === "Di wilayah pemantauan";
}

function susun(daftar) {
  const bobot = { kritis: 0, peringatan: 1 };
  const jenis = { gunung: 0, banjir: 1, siklon: 2, karhutla: 3 };
  return daftar.sort(
    (kiri, kanan) =>
      (bobot[kiri.tingkat] ?? 9) - (bobot[kanan.tingkat] ?? 9)
      || (jenis[kiri.jenis] ?? 9) - (jenis[kanan.jenis] ?? 9)
      || kiri.judul.localeCompare(kanan.judul, "id"),
  );
}

export function susunButir({
  gunung = [],
  banjirBaris = [],
  peringkatProvinsi = [],
  sistemBmkg = [],
} = {}) {
  const butir = [];
  for (const item of gunung) {
    const level = Number(item?.level);
    if (level < 3) continue;
    const kritis = level >= 4;
    butir.push({
      id: `gunung-${item.nama}`,
      jenis: "gunung",
      tingkat: kritis ? "kritis" : "peringatan",
      label: kritis ? "Kritis" : "Peringatan",
      judul: `${item.nama} · Level ${ROMAWI[level] || level} (${item.tingkat})`,
      rincian: `${item.lokasi || "Lokasi mengikuti halaman PVMBG"}. Sumber: PVMBG.`,
      aksi: "Buka gunung api",
      href: "#/gunung-api",
    });
  }
  for (const baris of banjirBaris) {
    if (baris?.status !== "Awas" && baris?.status !== "Siaga") continue;
    const kritis = baris.status === "Awas";
    butir.push({
      id: `banjir-${baris.kode || baris.kab_kota}`,
      jenis: "banjir",
      tingkat: kritis ? "kritis" : "peringatan",
      label: kritis ? "Kritis" : "Peringatan",
      judul: `${baris.kab_kota || "Kabupaten/kota"}, ${baris.provinsi || ""}`.replace(/, $/, ""),
      rincian: `Status ${baris.status} pada tab Hari ini. Analisis dasbor, bukan status resmi.`,
      aksi: "Buka banjir",
      href: "#/banjir",
    });
  }
  for (const sistem of sistemBmkg) {
    if (!berdampakKeIndonesia(sistem)) continue;
    const hasil = analisisDampakIndonesia(sistem);
    const teks = rapikan(sistem.dampak);
    butir.push({
      id: `siklon-${sistem.nama}`,
      jenis: "siklon",
      tingkat: "peringatan",
      label: "Peringatan",
      judul: sistem.nama,
      rincian: hasil.tingkat === "Disebut BMKG"
        ? teks
        : "Di dalam wilayah pemantauan TCWC Jakarta. Sumber: BMKG.",
      aksi: "Buka siklon",
      href: "#/siklon",
    });
  }
  const puncak = [...peringkatProvinsi]
    .filter((baris) => baris?.merah > 0 && baris.nama !== "Belum terpetakan")
    .sort((kiri, kanan) => kanan.merah - kiri.merah || kanan.total - kiri.total || kiri.nama.localeCompare(kanan.nama, "id"))
    .slice(0, 3);
  for (const baris of puncak) {
    butir.push({
      id: `karhutla-${baris.nama}`,
      jenis: "karhutla",
      tingkat: "peringatan",
      label: "Peringatan",
      judul: baris.nama,
      rincian: `${baris.merah} deteksi kepercayaan tinggi dari ${baris.total} deteksi. Deteksi satelit, bukan kebakaran terkonfirmasi.`,
      aksi: "Buka peta",
      href: "#/karhutla/peta",
    });
  }
  return susun(butir);
}

export function namaGunungPerLevel(gunung) {
  const kelompok = { 4: [], 3: [], 2: [], 1: [] };
  for (const item of gunung || []) {
    const level = Number(item?.level);
    if (kelompok[level]) kelompok[level].push(item.nama);
  }
  return kelompok;
}

export function susunUbin({
  adaHotspot = false,
  jumlahHotspot = 0,
  merahHotspot = 0,
  banjir = null,
  siklonStatus = "",
  sistemBmkg = [],
  gunung = [],
  gunungGalat = false,
} = {}) {
  const banjirSiap = Boolean(banjir);
  const awas = banjir?.awas || 0;
  const siaga = banjir?.siaga || 0;
  const berdampak = sistemBmkg.some((item) => berdampakKeIndonesia(item));
  const hitung = { 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const item of gunung) {
    const level = Number(item?.level);
    if (hitung[level] != null) hitung[level] += 1;
  }
  return [
    {
      id: "karhutla",
      nama: "Karhutla",
      baris: adaHotspot ? `${new Intl.NumberFormat("id-ID").format(jumlahHotspot)} deteksi satelit` : "Tidak ditampilkan",
      warna: !adaHotspot ? "abu" : merahHotspot > 0 ? "oranye" : "hijau",
      status: !adaHotspot ? "Tidak ada cuplikan" : merahHotspot > 0 ? "Kepercayaan tinggi" : "Tanpa kepercayaan tinggi",
    },
    {
      id: "banjir",
      nama: "Banjir",
      baris: banjirSiap ? `${awas} Awas · ${siaga} Siaga` : "Tidak termuat",
      warna: !banjirSiap ? "abu" : awas > 0 ? "merah" : siaga > 0 ? "oranye" : "hijau",
      status: !banjirSiap ? "Tidak termuat" : "Analisis dasbor",
    },
    {
      id: "siklon",
      nama: "Siklon",
      baris: siklonStatus || "Memuat…",
      warna: !siklonStatus ? "abu" : berdampak ? "oranye" : "hijau",
      status: berdampak ? "Ada teks dampak" : "Tanpa teks dampak ke Indonesia",
    },
    {
      id: "gunung",
      nama: "Gunung Api",
      baris: gunungGalat && !gunung.length ? "Tidak termuat" : gunung.length ? `${hitung[4]} Awas · ${hitung[3]} Siaga` : "Memuat…",
      warna: gunungGalat && !gunung.length ? "abu" : hitung[4] > 0 ? "merah" : hitung[3] > 0 ? "oranye" : gunung.length ? "hijau" : "abu",
      status: "Sumber: PVMBG",
    },
  ];
}
