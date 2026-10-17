export const RANKING_STATUS = "menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota)";

function topIrbi(rows) {
  return [...(rows ?? [])]
    .filter((row) => Number.isFinite(row.indeks))
    .sort((a, b) => b.indeks - a.indeks || String(a.kabupaten).localeCompare(String(b.kabupaten), "id"))
    .slice(0, 20)
    .map((row, index) => ({
      urutan: index + 1,
      kabupaten: row.kabupaten,
      provinsi: row.provinsi,
      indeks: row.indeks,
      kelas: row.kelas,
      tahun: row.tahun || "2025",
    }));
}

export function karhutlaRankingPlan({ irbiFeed } = {}) {
  const annual = irbiFeed && !irbiFeed.contoh && irbiFeed.status !== "gagal" ? topIrbi(irbiFeed.rows) : [];
  return {
    dapatDisusun: false,
    status: RANKING_STATUS,
    target: "15–20 kabupaten/kota",
    horizonDiminta: "14 hari",
    izin: "Perlu permintaan data resmi dan izin tertulis ke BMKG melalui PTSP / Biro Hukum, Humas, dan Kerja Sama (https://ptsp.bmkg.go.id/). Peringkat tidak disusun dari citra prakiraan.",
    masukan: [
      {
        nama: "FDRS dan potensi karhutla BMKG",
        status: "Tautan saja",
        catatan: "Citra SPARTAN mencakup hingga H+7 sesuai produk BMKG, bukan 14 hari, dan tidak didigitasi.",
      },
      {
        nama: "Prakiraan cuaca BMKG",
        status: "Bukan masukan peringkat",
        catatan: "API terbuka berhorizon 3 hari untuk satu kelurahan per provinsi prioritas.",
      },
      {
        nama: "inaRISK",
        status: "Tautan saja",
        catatan: "Peta bahaya belum ditimpa ke kabupaten.",
      },
      {
        nama: "Kejadian historis",
        status: "Nasional saja",
        catatan: "Rangkaian DIBI yang terfilter karhutla berlingkup nasional, bukan per kabupaten.",
      },
    ],
    annual,
  };
}
