export const RANKING_STATUS = "Belum tersedia – metode menunggu persetujuan";

export function karhutlaRankingPlan() {
  return {
    dapatDisusun: false,
    status: RANKING_STATUS,
    target: "15–20 kabupaten/kota",
    horizonDiminta: "14 hari",
    izin: "Peringkat tidak disusun. Metode 15–20 kabupaten/kota untuk 14 hari menunggu persetujuan. Yang masih kurang: FDRS atau FWI BMKG terstruktur per kabupaten/kota (citra SPARTAN hanya tautan, horizon hingga H+7 sesuai produk BMKG), peluang hujan lebih dari 20 mm resmi per kabupaten/kota (bukan jumlah tp pada prakiraan 3 hari), serta aturan gabungan yang disetujui. IRBI 2025, GWIS, dan GFWED tidak dipakai sebagai daftar prioritas.",
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
  };
}
