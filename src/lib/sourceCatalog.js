// Katalog sumber untuk halaman Sumber Data, ringkasan, dan skrip pembaruan.
// Status mengikuti yang benar-benar dapat diambil, bukan rencana.

export const SMOKE_URL = "https://www.bmkg.go.id/cuaca/satelit/citra-sebaran-asap";
export const SMOKE_IMAGE_URL = "https://inderaja.bmkg.go.id/Trajektori/Asap.png";

export const SOURCES = [
  {
    id: "hotspot",
    nama: "Hotspot harian",
    instansi: "NASA FIRMS",
    fungsi: "Menunjukkan lokasi dan waktu deteksi satelit yang perlu diperiksa. Bukan konfirmasi kebakaran lapangan.",
    officialUrl: "https://firms.modaps.eosdis.nasa.gov/api/area/",
    officialLabel: "Dokumentasi API area FIRMS",
    extraUrls: [
      ["Pendaftaran MAP_KEY", "https://firms.modaps.eosdis.nasa.gov/api/map_key/"],
      ["Beranda FIRMS", "https://firms.modaps.eosdis.nasa.gov/"],
      ["Dasbor BNPB", "https://data.bnpb.go.id/data/karhutla2026"],
      ["SiPongi+", "https://sipongi.gakkum.kehutanan.go.id/"],
    ],
    access: "API",
    needsKey: true,
    secret: "FIRMS_MAP_KEY",
    kind: "dinamis",
    updateType: "Realtime / mendekati realtime",
    expectedMaxAgeHours: 18,
    limitation:
      "API area membutuhkan MAP_KEY dan hanya mengembalikan sampai 5 hari. Tanpa secret, dasbor tidak mengaku tersambung dan peta memakai data contoh. Titik tanpa nama wilayah tidak ditebak dari kotak koordinat.",
  },
  {
    id: "sipongi",
    nama: "SiPongi+",
    instansi: "Kementerian Kehutanan",
    fungsi: "Portal pemantauan karhutla. Tidak dipakai sebagai angka di dasbor karena tidak ada unduhan atau API publik yang ditemukan.",
    officialUrl: "https://sipongi.gakkum.kehutanan.go.id/",
    officialLabel: "sipongi.gakkum.kehutanan.go.id",
    access: "Tautan portal",
    needsKey: false,
    kind: "tautan",
    updateType: "",
    limitation:
      "Halaman peta bukan API publik. Akses data perlu diminta ke pengelola, misalnya posko.karhutla@menlhk.go.id yang tercantum di situs. Tabel SiPongi di halaman Peta dan Data masih data contoh.",
  },
  {
    id: "bmkg_prakiraan",
    nama: "Prakiraan cuaca, hujan, dan angin",
    instansi: "BMKG",
    fungsi: "Memberi suhu, kelembapan, kondisi cuaca, hujan pada slot 3 jam, serta arah dan kecepatan angin untuk satu kelurahan di tiap provinsi prioritas.",
    officialUrl: "https://data.bmkg.go.id/prakiraan-cuaca/",
    officialLabel: "Data Prakiraan Cuaca Terbuka BMKG",
    access: "API",
    needsKey: false,
    kind: "dinamis",
    updateType: "Berkala (tiap 3 jam)",
    expectedMaxAgeHours: 36,
    extraUrls: [
      ["Prakiraan cuaca", "https://www.bmkg.go.id/cuaca/prakiraan-cuaca"],
      ["PTSP BMKG", "https://ptsp.bmkg.go.id/"],
    ],
    limitation:
      "Horizon resmi 3 hari, 8 waktu per hari (per 3 jam), dimutakhirkan 2 kali sehari. Bukan prakiraan 14 hari, bukan peluang hujan dalam persen, dan bukan FDRS. Lokasi adalah satu kelurahan ibu kota provinsi prioritas, bukan agregat kabupaten. Diambil dari API resmi dengan User-Agent netral, bukan dari halaman web. Atribusi: Sumber: BMKG. Izin tertulis untuk integrasi aplikasi yang lebih luas belum ada.",
  },
  {
    id: "fdrs",
    nama: "Indeks kemudahan terbakar (FDRS)",
    instansi: "BMKG — SPARTAN",
    fungsi: "Menunjukkan kondisi cuaca yang dapat mendukung kebakaran. Belum tersambung sebagai angka.",
    officialUrl: "https://spartan.bmkg.go.id/",
    officialLabel: "SPARTAN BMKG",
    extraUrls: [
      ["Cuaca karhutla BMKG", "https://www.bmkg.go.id/cuaca/karhutla"],
      ["PTSP BMKG", "https://ptsp.bmkg.go.id/"],
    ],
    access: "Tautan portal",
    needsKey: false,
    kind: "tautan",
    updateType: "",
    limitation:
      "Produk FWI/FFMC/DMC/DC/ISI/BUI di SPARTAN berupa citra PNG (pengamatan dan prakiraan H+0 sampai H+7), bukan API. Horizon yang ditulis: hingga H+7 sesuai produk BMKG, bukan 10 atau 14 hari. Citra tidak diunduh dan tidak dipotong. Angka FWI pada indikator prototipe masih data contoh. Peringkat 14 hari kabupaten berstatus menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota). Izin integrasi diurus lewat PTSP BMKG.",
    comparisons: [
      {
        id: "fdrs_pembanding",
        nama: "Cuaca harian terbuka",
        instansi: "Open-Meteo",
        provider: "Open-Meteo",
        fungsi: "Pembanding hujan, suhu, kelembapan, angin, dan hari tanpa hujan. Bukan FDRS dan bukan prakiraan BMKG.",
        officialUrl: "https://open-meteo.com/en/docs",
        license: "CC BY 4.0. Cantumkan Open-Meteo.",
        method:
          "Nilai harian pada titik tengah kasar enam provinsi prioritas: hujan akumulasi, suhu maksimum, kelembapan rata-rata, angin maksimum. Hari tanpa hujan dihitung bila hujan harian di bawah 1 mm. Tidak dihitung menjadi FWI atau FDRS.",
        updateType: "Harian",
        expectedMaxAgeHours: 36,
        access: "API",
      },
    ],
  },
  {
    id: "peluang_hujan",
    nama: "Peluang hujan",
    instansi: "BMKG",
    fungsi: "Memberi konteks apakah hujan dapat memengaruhi kemudahan terbakar.",
    officialUrl: "https://www.bmkg.go.id/cuaca/prakiraan-cuaca",
    officialLabel: "Prakiraan cuaca BMKG",
    extraUrls: [
      ["Data terbuka, horizon 3 hari", "https://data.bmkg.go.id/prakiraan-cuaca/"],
      ["Prediksi hujan dasarian", "https://www.bmkg.go.id/iklim/prediksi-hujan-dasarian"],
      ["Peringatan dini curah hujan tinggi", "https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi"],
      ["Potensi cuaca ekstrem", "https://www.bmkg.go.id/cuaca/potensi-cuaca-ekstrem"],
      ["Potensi hujan sepekan", "https://www.bmkg.go.id/cuaca/potensi-hujan-sepekan"],
    ],
    access: "Tautan portal",
    needsKey: false,
    kind: "tautan",
    updateType: "",
    limitation:
      "API terbuka berisi nilai tp per 3 jam selama 3 hari, bukan peluang dalam persen. Prediksi dasarian (3 dasarian, citra), peringatan curah hujan tinggi, potensi cuaca ekstrem, dan narasi hujan sepekan hanya ditautkan. Halaman itu tidak dikorek dan citranya tidak dipotong.",
  },
  {
    id: "angin",
    nama: "Arah dan kecepatan angin",
    instansi: "BMKG",
    fungsi: "Membantu membaca angin pada prakiraan jangka pendek. Bukan penentu titik sumber kebakaran.",
    officialUrl: "https://data.bmkg.go.id/prakiraan-cuaca/",
    officialLabel: "Data Prakiraan Cuaca Terbuka BMKG",
    extraUrls: [["Vektor angin satelit", "https://www.bmkg.go.id/cuaca/satelit/vektor-angin"]],
    access: "API",
    needsKey: false,
    kind: "dinamis",
    updateType: "Berkala (tiap 3 jam)",
    expectedMaxAgeHours: 36,
    sameFileAs: "bmkg_prakiraan",
    limitation:
      "Angin yang tersambung adalah arah (wd) dan kecepatan (ws, km/jam menurut dokumentasi BMKG) pada prakiraan 3 hari untuk satu kelurahan per provinsi prioritas. Peta vektor angin satelit hanya tautan portal.",
  },
  {
    id: "asap",
    nama: "Citra sebaran asap",
    instansi: "BMKG",
    fungsi: "Menunjukkan sebaran asap yang terpantau. Arsip pukul 08.00 baru dimulai; tanggal tanpa berkas tidak diisi gambar buatan.",
    officialUrl: SMOKE_URL,
    officialLabel: "Halaman citra sebaran asap BMKG",
    extraUrls: [["Berkas citra utuh", SMOKE_IMAGE_URL]],
    access: "Tautan portal",
    needsKey: false,
    kind: "tautan",
    statusLabel: "Tautan saja – menunggu izin BMKG",
    updateType: "",
    expectedMaxAgeHours: 30,
    limitation:
      "Citra di inderaja.bmkg.go.id hanya gambar. Pemakaian ulang butuh izin tertulis BMKG, gambar tidak boleh dipotong, dan logo BMKG harus tetap. Arsip pukul 08.00 disiapkan di kode tetapi mati selama bmkg.arsipCitra bukan true. Tidak ada gambar historis buatan.",
  },
  {
    id: "inarisk",
    nama: "Peta bahaya karhutla inaRISK",
    instansi: "BNPB",
    fungsi: "Konteks bahaya dasar suatu wilayah. Belum ditimpa sebagai lapisan peta.",
    officialUrl: "https://inarisk2.bnpb.go.id/portal/",
    officialLabel: "Portal inaRISK",
    extraUrls: [
      ["Layanan peta risiko karhutla", "https://gis.bnpb.go.id/server/rest/services/inarisk/layer_risiko_kebakaran_hutan_dan_lahan/ImageServer"],
    ],
    access: "Layanan peta/GIS",
    needsKey: false,
    kind: "tautan",
    updateType: "",
    limitation:
      "Portal menampilkan peta. Layanan yang terdaftar di Satu Data berupa ImageServer raster, bukan tabel kabupaten yang bisa disimpan apa adanya. Batas administrasi resmi juga belum dipasang, jadi peta bahaya tidak digambar di dasbor.",
  },
  {
    id: "irbi",
    nama: "IRBI 2025 kebakaran hutan dan lahan",
    instansi: "BNPB",
    fungsi: "Membandingkan tingkat risiko antarwilayah sebagai konteks perencanaan tahunan. Tidak mengikuti filter tanggal.",
    officialUrl: "https://inarisk.bnpb.go.id/IRBI-2025/files/basic-html/page294.html",
    officialLabel: "Buku IRBI 2025, halaman 294",
    extraUrls: [["Indeks Risiko Bencana Indonesia", "https://inarisk.bnpb.go.id/irbi"]],
    access: "Data statis",
    needsKey: false,
    kind: "statis",
    updateType: "Tahunan / statis",
    expectedMaxAgeHours: 24 * 30 * 18,
    file: "data/static/irbi-2025-karhutla.csv",
    limitation:
      "Tabel dikutip dari versi HTML Buku IRBI 2025 halaman 294–307 untuk ancaman kebakaran hutan dan lahan (467 kabupaten/kota). Skor dan kelas tidak diubah. Bukan peta, karena batas wilayah resmi tidak disertakan. Komponen bahaya, kerentanan, dan kapasitas tidak ada pada halaman itu.",
  },
  {
    id: "ispu",
    nama: "ISPU",
    instansi: "Kementerian Lingkungan Hidup",
    fungsi: "Menunjukkan kualitas udara resmi. Riwayat sepekan resmi belum tersedia di dasbor.",
    officialUrl: "https://ispu.kemenlh.go.id/app/#/",
    officialLabel: "Portal ISPU",
    extraUrls: [
      ["Permen LHK No. 14 Tahun 2020", "https://peraturan.bpk.go.id/Details/163466/permen-lhk-no-14-tahun-2020"],
    ],
    access: "Tautan portal",
    needsKey: false,
    kind: "tautan",
    updateType: "",
    limitation:
      "Tidak ada dokumentasi API publik. Token yang tertanam di aplikasi web tidak dipakai. Angka ISPU pada grafik lama masih data contoh. Tren resmi sepekan tidak ditampilkan.",
    comparisons: [
      {
        id: "ispu_pembanding",
        nama: "ISPU perkiraan dari PM2.5",
        instansi: "Open-Meteo / CAMS",
        provider: "Open-Meteo Air Quality",
        fungsi: "Pembanding kualitas udara. Bukan ISPU stasiun KLH.",
        officialUrl: "https://open-meteo.com/en/docs/air-quality-api",
        license: "CC BY 4.0. Model udara dari Copernicus Atmosphere Monitoring Service (CAMS).",
        method:
          "Rata-rata harian PM2.5 pada titik tengah kasar provinsi diubah ke angka ISPU dengan batas PM2.5 pada Lampiran Permen LHK No. 14 Tahun 2020. Contoh di peraturan: 31,4 µg/m³ menjadi 70. Ini perkiraan, bukan pengukuran stasiun.",
        updateType: "Estimasi",
        expectedMaxAgeHours: 36,
        access: "API",
      },
    ],
  },
  {
    id: "bmkg_cap",
    nama: "Peringatan dini cuaca (CAP)",
    instansi: "BMKG",
    fungsi: "Konteks nowcast sekitar 0–6 jam. Bukan prospek karhutla dan bukan prakiraan 14 hari.",
    officialUrl: "https://www.bmkg.go.id/alerts/nowcast/id",
    officialLabel: "RSS peringatan dini cuaca BMKG",
    extraUrls: [["Contoh data CAP", "https://github.com/infoBMKG/data-cap"]],
    access: "API",
    needsKey: false,
    kind: "dinamis",
    updateType: "Realtime / mendekati realtime",
    expectedMaxAgeHours: 8,
    limitation:
      "Diambil dari RSS resmi, lalu tiap berkas CAP XML. Halaman web nowcast tidak dikorek. Poligon kecamatan tidak digambar. Atribusi: Sumber: BMKG.",
  },
  {
    id: "dibi_karhutla",
    nama: "Kejadian karhutla historis (nasional)",
    instansi: "BNPB — Satu Data / DIBI",
    fungsi: "Rangkaian tahunan jumlah kejadian kebakaran hutan dan lahan untuk seluruh Indonesia pada kompilasi 2010–2024.",
    officialUrl: "https://data.bnpb.go.id/api/3/action/package_show?id=data-bencana-indonesia",
    officialLabel: "CKAN data-bencana-indonesia",
    access: "API",
    needsKey: false,
    kind: "statis",
    updateType: "Tahunan / statis",
    expectedMaxAgeHours: 24 * 30 * 18,
    limitation:
      "Lisensi ODC-BY. Hanya baris jenis KEBAKARAN HUTAN DAN LAHAN pada tabel nasional. Tabel kabupaten dan provinsi di paket yang sama menjumlahkan semua jenis bencana, sehingga tidak dipakai sebagai kejadian karhutla per kabupaten. Unduhan XLSX dapat tertahan Cloudflare; pengambilan memakai datastore CKAN.",
  },
];

export function integrationStatus(source, entry) {
  if (!source) return "Belum terhubung";
  if (source.statusLabel) return source.statusLabel;
  if (source.kind === "tautan") return "Tautan saja";
  if (source.kind === "arsip") return "Snapshot/arsip";
  if (source.kind === "statis" && (!entry || entry.status === "ok")) return "Data statis";
  if (entry?.status === "ok") return "Aktif";
  if (entry?.kept_previous) return "Gagal/stale";
  if (source.needsKey && entry?.status === "failed") return "Belum terhubung";
  if (entry?.status === "failed") return "Gagal/stale";
  return "Belum terhubung";
}

export function comparisonStatus(entry) {
  if (entry?.status === "ok") return "Aktif";
  if (entry?.kept_previous) return "Gagal/stale";
  if (entry?.status === "failed") return "Gagal/stale";
  return "Belum terhubung";
}

export function decorateSources(manifest) {
  const datasets = manifest?.datasets ?? {};
  return SOURCES.map((source) => {
    const entry = datasets[source.sameFileAs] || datasets[source.id] || null;
    const comparisons = (source.comparisons ?? []).map((item) => ({
      ...item,
      entry: datasets[item.id] || null,
      status: comparisonStatus(datasets[item.id]),
    }));
    return {
      ...source,
      entry,
      status: integrationStatus(source, entry),
      comparisons,
    };
  });
}
