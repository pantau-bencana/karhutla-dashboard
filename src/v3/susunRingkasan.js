// Butir Ringkasan v0.3 dari cuplikan yang sudah ada. Tidak mengisi angka yang tidak ada.
const ROMAWI = { 4: "IV", 3: "III" };

export const JENDELA_WAKTU = Object.freeze([
  ["hari", "Hari cuplikan"],
  ["24", "24 jam"],
  ["48", "48 jam"],
  ["168", "7 hari"],
]);

function rapikan(teks) {
  return String(teks || "").replace(/\s+/g, " ").trim();
}

function adaTeksDampak(teks) {
  const rata = rapikan(teks);
  return Boolean(rata) && !/^[-–—.]+$/.test(rata);
}

function cocok(teks, wilayah) {
  if (!wilayah) return true;
  return rapikan(teks).toLowerCase().includes(rapikan(wilayah).toLowerCase());
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
  wilayah = "",
  waktuGunung = "",
  waktuBanjir = "",
  waktuHotspot = "",
  waktuSiklon = "",
} = {}) {
  const butir = [];
  for (const item of gunung) {
    const level = Number(item?.level);
    if (level < 3) continue;
    if (!cocok(item?.lokasi, wilayah) && !cocok(item?.nama, wilayah)) continue;
    const kritis = level >= 4;
    butir.push({
      id: `gunung-${item.nama}`,
      jenis: "gunung",
      tingkat: kritis ? "kritis" : "peringatan",
      label: kritis ? "Kritis" : "Peringatan",
      judul: `${item.nama} · Level ${ROMAWI[level] || level} (${item.tingkat})`,
      rincian: `${item.lokasi || "Lokasi mengikuti halaman PVMBG"}. Tingkat aktivitas resmi pada cuplikan.`,
      sumber: "PVMBG",
      aksi: "Buka gunung api",
      href: "#/gunung-api",
      meta: waktuGunung ? `Diambil ${waktuGunung}. Sumber: PVMBG.` : "Sumber: PVMBG.",
    });
  }
  for (const baris of banjirBaris) {
    if (baris?.status !== "Awas" && baris?.status !== "Siaga") continue;
    if (wilayah && baris.provinsi !== wilayah) continue;
    const kritis = baris.status === "Awas";
    butir.push({
      id: `banjir-${baris.kode || baris.kab_kota}`,
      jenis: "banjir",
      tingkat: kritis ? "kritis" : "peringatan",
      label: kritis ? "Kritis" : "Peringatan",
      judul: `${baris.kab_kota || "Kabupaten/kota"}, ${baris.provinsi || ""}`.replace(/, $/, ""),
      rincian: `Status ${baris.status} pada tab Hari ini. Analisis dasbor, bukan status resmi BMKG atau BNPB.`,
      sumber: "Analisis dasbor",
      aksi: "Buka banjir",
      href: "#/banjir",
      meta: waktuBanjir ? `Diambil ${waktuBanjir}. Analisis dasbor, bukan peringatan resmi.` : "Analisis dasbor, bukan peringatan resmi.",
    });
  }
  for (const sistem of sistemBmkg) {
    const agensi = String(sistem?.agensi || "BMKG").toUpperCase();
    if (agensi !== "BMKG" || !adaTeksDampak(sistem?.dampak)) continue;
    const teks = [sistem.dampak, sistem.lokasi, sistem.kalimat, sistem.nama].join(" ");
    if (!cocok(teks, wilayah)) continue;
    butir.push({
      id: `siklon-${sistem.nama}`,
      jenis: "siklon",
      tingkat: "peringatan",
      label: "Peringatan",
      judul: sistem.nama,
      rincian: rapikan(sistem.dampak),
      sumber: "BMKG",
      aksi: "Buka siklon",
      href: "#/siklon",
      meta: waktuSiklon ? `Diambil ${waktuSiklon}. Sumber: BMKG. Bukan peringatan resmi dasbor.` : "Sumber: BMKG.",
    });
  }
  const puncakHotspot = [...peringkatProvinsi]
    .filter((baris) => baris?.merah && baris.nama !== "Belum terpetakan" && (!wilayah || baris.nama === wilayah))
    .sort((kiri, kanan) => kanan.merah - kiri.merah || kanan.total - kiri.total || kiri.nama.localeCompare(kanan.nama, "id"))
    .slice(0, 3);
  for (const baris of puncakHotspot) {
    butir.push({
      id: `karhutla-${baris.nama}`,
      jenis: "karhutla",
      tingkat: "peringatan",
      label: "Peringatan",
      judul: baris.nama,
      rincian: `${baris.merah} deteksi kepercayaan tinggi dari ${baris.total} deteksi pada jendela ini. Deteksi satelit, bukan kebakaran terkonfirmasi.`,
      sumber: "Deteksi satelit",
      aksi: "Buka peta",
      href: "#/karhutla/peta",
      meta: waktuHotspot ? `Waktu data ${waktuHotspot}. Hotspot adalah deteksi satelit, bukan titik api.` : "Hotspot adalah deteksi satelit, bukan titik api.",
    });
  }
  return susun(butir);
}

function hitungTanggal(baris) {
  const peta = new Map();
  for (const titik of baris || []) {
    const hari = String(titik?.tanggal || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hari)) continue;
    peta.set(hari, (peta.get(hari) || 0) + 1);
  }
  return peta;
}

function geserHari(iso, hari) {
  const [tahun, bulan, tanggal] = iso.split("-").map(Number);
  const waktu = new Date(Date.UTC(tahun, bulan - 1, tanggal));
  waktu.setUTCDate(waktu.getUTCDate() + hari);
  return waktu.toISOString().slice(0, 10);
}

export function batangTanggal(baris) {
  return [...hitungTanggal(baris).entries()]
    .sort((kiri, kanan) => kiri[0].localeCompare(kanan[0]))
    .slice(-7)
    .map(([hari, jumlah]) => ({ hari, jumlah }));
}

export function trenTujuhHari(baris) {
  const peta = hitungTanggal(baris);
  const tanggal = [...peta.keys()].sort();
  if (!tanggal.length) {
    return {
      hari: [],
      lengkap: false,
      catatan: "Tidak ada tanggal pada cuplikan. Hari kosong tidak diisi nol.",
    };
  }
  const akhir = tanggal.at(-1);
  const awalData = tanggal[0];
  const awalJendela = geserHari(akhir, -6);
  const awal = awalData > awalJendela ? awalData : awalJendela;
  const hari = [];
  for (let iso = awal; iso <= akhir; iso = geserHari(iso, 1)) {
    if (peta.has(iso)) hari.push({ hari: iso, jumlah: peta.get(iso), ada: true });
    else hari.push({ hari: iso, jumlah: null, ada: false });
  }
  const lengkap = awal === awalJendela && hari.length === 7;
  const catatan = lengkap
    ? "Tujuh hari hingga hari terakhir cuplikan. Hari tanpa baris ditandai tidak ada, bukan nol."
    : `Cuplikan memuat ${tanggal.length} hari, belum 7 hari. Yang tampil hanya rentang tanggal yang ada. Hari tanpa baris di antaranya ditandai tidak ada, bukan nol.`;
  return { hari, lengkap, catatan };
}

const BULAN_LAPORAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function angkaId(nilai) {
  return new Intl.NumberFormat("id-ID").format(Number(nilai) || 0);
}

function tanggalId(iso) {
  const [tahun, bulan, tanggal] = String(iso || "").split("-");
  const nama = BULAN_LAPORAN[Number(bulan) - 1];
  if (!nama || !tahun) return iso;
  return `${Number(tanggal)} ${nama} ${tahun}`;
}

export function kalimatLaporanHariIni({
  adaHotspot = false,
  jumlahHotspot = 0,
  hitungTanggalHotspot = new Map(),
  jendelaLabel = "jendela ini",
  wilayah = "",
  banjirSiap = false,
  banjirAwas = 0,
  banjirSiaga = 0,
  gunungSiap = false,
  gunungAwas = [],
  gunungSiaga = [],
  siklonSiap = false,
  sistem = [],
  waktuLabel = "",
} = {}) {
  const kalimat = [];
  const tempat = wilayah ? ` di ${wilayah}` : "";
  if (adaHotspot) {
    let kalimatHotspot = `Pada ${jendelaLabel}${tempat} tercatat ${angkaId(jumlahHotspot)} deteksi satelit, bukan kebakaran terkonfirmasi.`;
    const tanggal = [...hitungTanggalHotspot.keys()].sort();
    const kini = tanggal.at(-1);
    const kemarin = kini ? geserHari(kini, -1) : "";
    if (kini && hitungTanggalHotspot.has(kemarin)) {
      const hariIni = hitungTanggalHotspot.get(kini);
      const hariLalu = hitungTanggalHotspot.get(kemarin);
      const selisih = hariIni - hariLalu;
      const arah = selisih > 0 ? "naik" : selisih < 0 ? "turun" : "tetap";
      const beda = selisih === 0 ? "" : ` ${angkaId(Math.abs(selisih))}`;
      kalimatHotspot += ` Terhadap ${tanggalId(kemarin)} (${angkaId(hariLalu)} deteksi), ${tanggalId(kini)} (${angkaId(hariIni)} deteksi) ${arah}${beda}.`;
    }
    kalimat.push(kalimatHotspot);
  }
  if (banjirSiap) {
    const cakupan = wilayah ? ` untuk ${wilayah}` : "";
    kalimat.push(`Analisis dasbor${cakupan}, bukan status resmi: ${angkaId(banjirAwas)} kabupaten/kota berstatus Awas dan ${angkaId(banjirSiaga)} Siaga.`);
  }
  if (gunungSiap) {
    const sebut = (daftar) => (daftar.length ? ` (${daftar.map((item) => item.nama).join(", ")})` : "");
    const cakupan = wilayah ? ` untuk ${wilayah}` : "";
    kalimat.push(`Sumber PVMBG${cakupan}: ${angkaId(gunungAwas.length)} gunung Awas${sebut(gunungAwas)} dan ${angkaId(gunungSiaga.length)} Siaga${sebut(gunungSiaga)}.`);
  }
  if (siklonSiap && (sistem.length || !wilayah)) {
    if (!sistem.length) {
      kalimat.push("Cuplikan BMKG tidak memuat sistem siklon.");
    } else {
      const bagian = sistem.map((item) => (
        adaTeksDampak(item.dampak) ? `${item.nama} (potensi dampak: ${String(item.dampak).replace(/\s+/g, " ").trim()})` : item.nama
      ));
      kalimat.push(`BMKG mencatat ${bagian.join("; ")}.`);
    }
  }
  if (waktuLabel) kalimat.push(`Waktu pembaruan data ${waktuLabel}.`);
  return kalimat;
}

const SUMBER_TETAP = [
  ["hotspot", "Titik panas", "Deteksi satelit. Bukan kebakaran terkonfirmasi."],
  ["bmkg_cap", "Peringatan dini cuaca", "Sumber: BMKG. Nowcast, bukan prospek musiman."],
  ["pvmbg_gunung", "Gunung api", "Sumber: PVMBG."],
  ["bmkg_siklon", "Siklon tropis", "Sumber: BMKG."],
];

export function susunStatusSumber(datasets = {}) {
  return SUMBER_TETAP.map(([id, nama, catatan]) => {
    const entri = datasets?.[id];
    if (!entri) {
      return { id, nama, catatan, siap: false, status: "Tidak ada cuplikan", rinci: "Berkas pada manifes tidak ada." };
    }
    const siap = entri.status === "ok";
    return {
      id,
      nama,
      catatan,
      siap,
      status: siap ? "Siap" : (entri.status === "failed" ? "Gagal" : "Tidak siap"),
      rinci: entri.error || catatan,
      diambil: entri.fetched_at || "",
      observasi: entri.observed_at || "",
    };
  });
}
