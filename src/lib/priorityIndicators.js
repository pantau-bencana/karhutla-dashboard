export const PRIORITY_INDICATOR_TITLE = "Indikator untuk Wilayah Prioritas";

export const PRIORITY_INDICATOR_NOTE =
  "Daftar prioritas kesiapsiagaan memakai Metode A+ (pemodelan pihak ketiga, bukan prakiraan resmi BMKG/BNPB) bila cuplikan segar. Produk resmi tetap terpisah: FDRS atau FWI BMKG terstruktur per kabupaten/kota belum tersambung (citra SPARTAN hingga H+7 sesuai produk BMKG, bukan prakiraan 14 hari), dan peluang hujan lebih dari 20 mm resmi per kabupaten/kota belum tersambung (bukan peluang dalam persen pada API 3 hari).";

export const PRIORITY_INDICATORS = [
  {
    id: "fwi",
    indikator: "FWI / FDRS",
    isian: "Nilai atau kelas FWI, nama wilayah, serta waktu berlaku atau penerbitan.",
    logika:
      "Dipakai untuk membaca kemudahan terbakar pada wilayah dan waktu yang tertulis di produk BMKG. Angka tidak didigitasi dan tidak ditarik dari citra. Produk citra yang tersedia hanya sampai horizon produk BMKG (hingga H+7 sesuai produk BMKG), bukan prakiraan 14 hari.",
    rincian:
      "Yang ditautkan untuk BMKG adalah halaman resmi. Dasbor tidak mengunduh citra SPARTAN dan tidak membaca angka dari gambar. Bila nanti ada data terstruktur, isiannya nilai atau kelas, wilayah, dan waktu berlaku atau penerbitan pada produk itu. Horizon tidak diperpanjang melewati produk BMKG. Overlay peta menampilkan FWI model ECMWF dari WMS GWIS untuk tanggal yang dipilih atau hari ini, hanya bila lapisan tanggal itu ada.",
    sumber: [
      { label: "BMKG SPARTAN", href: "https://spartan.bmkg.go.id/" },
      { label: "Halaman Karhutla BMKG", href: "https://www.bmkg.go.id/cuaca/karhutla" },
    ],
    status: "BMKG Tautan saja; pembanding GWIS tersedia sebagai overlay",
    keterbatasan:
      "Data kabupaten/kota BMKG belum tersedia sebagai data terstruktur yang dapat diambil aplikasi. Nilai per kabupaten/kota tidak diisi. Overlay peta adalah lapisan WMS ecmwf.fwi Copernicus EMS/JRC GWIS, pembanding visual, bukan produk BMKG/KLHK. Kelas Canadian FWI pada legenda GWIS tidak disamakan dengan kelas FWI/FDRS BMKG.",
  },
  {
    id: "ispu",
    indikator: "ISPU",
    isian: "Nilai ISPU, kategori, nama stasiun, dan waktu pengamatan.",
    logika:
      "Ini pengamatan di stasiun pemantau. Satu stasiun tidak mewakili seluruh kabupaten/kota. Wilayah tanpa stasiun ditandai Tidak ada data stasiun.",
    rincian:
      "Bila data stasiun resmi ada, satu baris adalah satu stasiun pada satu waktu pengamatan, lengkap dengan nilai dan kategori. Kabupaten atau kota yang tidak memiliki stasiun pada sumber itu ditulis Tidak ada data stasiun, bukan nol. Nilai stasiun bukan bukti tunggal bahwa polusi berasal dari karhutla.",
    sumber: [{ label: "Portal ISPU KLH", href: "https://ispu.kemenlh.go.id/app/#/" }],
    status: "Tautan saja",
    keterbatasan:
      "Tidak ada API resmi yang terdokumentasi. Nilai tidak diisi dari sumber lain dan tidak diubah dari kadar µg/m³.",
  },
  {
    id: "hujan",
    indikator: "Peluang Hujan >20 mm",
    isian: "Peluang dalam persen, nama wilayah, periode prakiraan, dan ambang waktu periode itu.",
    logika:
      "Yang dimaksud adalah peluang hujan lebih dari 20 mm pada satu periode atau dasarian. Kolom tp pada API prakiraan 3 hari adalah jumlah curah hujan, bukan peluang dalam persen. Nilai dengan basis waktu berbeda tidak digabung.",
    rincian:
      "Prediksi hujan dasarian dan API prakiraan cuaca menjawab pertanyaan yang berbeda. Dasarian memuat peluang untuk periode sekitar sepuluh hari. API terbuka memuat jumlah hujan tp untuk slot hingga 3 hari. Keduanya tidak dijumlahkan dan tidak saling mengganti.",
    sumber: [
      { label: "Prediksi hujan dasarian BMKG", href: "https://www.bmkg.go.id/iklim/prediksi-hujan-dasarian" },
      { label: "Prakiraan cuaca terbuka BMKG", href: "https://data.bmkg.go.id/prakiraan-cuaca/" },
    ],
    status: "Tautan saja",
    keterbatasan:
      "Produk peluang resmi belum tersambung. API prakiraan cuaca yang tersambung berhorizon 3 hari dan berisi tp, bukan peluang persen.",
  },
  {
    id: "iklim",
    indikator: "Indeks Kesesuaian Iklim",
    isian: "Kelas rendah, menengah, atau tinggi; nama wilayah; serta periode indeks atau tanggal pemutakhiran.",
    logika:
      "Indeks ini berbeda dari FWI. Kelas tidak dihitung dan tidak disimpulkan dari FWI atau indikator lain.",
    rincian:
      "Kelas rendah, menengah, dan tinggi hanya dipakai bila tertulis pada produk CEWS untuk wilayah dan periode yang sama. Dasbor tidak menurunkan kelas itu dari FWI, hotspot, peluang hujan, atau indikator lain.",
    sumber: [{ label: "BMKG CEWS", href: "https://cews.bmkg.go.id/dashboard-custom/prediksi-karhutla/" }],
    status: "Tautan saja",
    keterbatasan:
      "Belum tersedia sebagai data terstruktur per kabupaten/kota yang dapat diambil aplikasi. Kelas tidak dibuat di dasbor.",
  },
];
