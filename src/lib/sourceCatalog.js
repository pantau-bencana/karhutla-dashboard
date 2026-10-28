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
      "API area membutuhkan MAP_KEY dan hanya mengembalikan sampai 5 hari. Tanpa secret, dasbor tidak mengaku tersambung. Berkas contoh hotspot tidak ditampilkan; peta memakai cuplikan data/live atau dikosongkan. Titik tanpa nama wilayah tidak ditebak dari kotak koordinat.",
  },
  {
    id: "sipongi",
    nama: "SiPongi+",
    instansi: "Kementerian Kehutanan",
    fungsi: "Hitungan titik panas per kabupaten dari endpoint publik halaman sebaran SiPongi+, tanpa login. Kolom utama Rekap Harian. FIRMS ditampilkan terpisah sebagai pembanding.",
    officialUrl: "https://sipongi.gakkum.kehutanan.go.id/",
    officialLabel: "sipongi.gakkum.kehutanan.go.id",
    extraUrls: [["Endpoint sebaran publik", "https://opsroom.sipongidata.my.id/api/sebaran"]],
    access: "API",
    needsKey: false,
    kind: "dinamis",
    updateType: "Harian",
    expectedMaxAgeHours: 30,
    limitation:
      "Pemeriksaan 22 Oktober 2026: GET https://opsroom.sipongidata.my.id/api/konfigurasi dan /api/sebaran tanpa header otorisasi mengembalikan HTTP 200 JSON. Tidak ada token yang disalin dari skrip halaman. Satelit mengikuti sumber_satelit. Jumlah adalah counter High, Medium, dan Low. Baris tanpa nama kabupaten tidak dibagikan. Host lama sipongi.menlhk.go.id tidak punya DNS. Hotspot adalah deteksi satelit, bukan kebakaran terkonfirmasi. Berkas contoh tidak ditampilkan.",
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
      "Produk FWI/FFMC/DMC/DC/ISI/BUI di SPARTAN berupa citra PNG (pengamatan dan prakiraan H+0 sampai H+7), bukan API. Horizon yang ditulis: hingga H+7 sesuai produk BMKG, bukan 10 atau 14 hari. Citra tidak diunduh dan tidak dipotong. Angka FWI contoh tidak ditampilkan. Peringkat 14 hari kabupaten berstatus menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota). Izin integrasi diurus lewat PTSP BMKG.",
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
          "Nilai harian pada titik tengah kasar enam provinsi prioritas: hujan akumulasi, suhu maksimum, kelembapan rata-rata, angin maksimum, 14 hari ke belakang dan 1 hari berjalan. Hari tanpa hujan dihitung bila hujan harian di bawah 1 mm. Bukan titik kabupaten dan tidak dihitung menjadi FWI.",
        updateType: "Harian",
        expectedMaxAgeHours: 36,
        access: "API",
      },
      {
        id: "fwi_gwis_pembanding",
        nama: "FWI prakiraan ECMWF",
        instansi: "Copernicus EMS — GWIS/EFFIS",
        provider: "GWIS",
        fungsi: "Angka FWI pada titik wakil kabupaten. Bukan FDRS BMKG dan bukan prakiraan 14 hari.",
        officialUrl: "https://maps.effis.emergency.copernicus.eu/gwis",
        license:
          "The geodata are released under the terms and conditions of the EU Data License, available at http://ec.europa.eu/geninfo/legal_notices_en.htm. © European Union, Copernicus EMS / JRC GWIS.",
        method:
          "Angka titik wakil: GetFeatureInfo WMS lapisan ecmwf.query, format HTML, pada piksel tengah kotak 0,04 derajat. Overlay peta: GetMap lapisan ecmwf.fwi, parameter TIME, hanya di peramban; raster tidak disimpan. GetCapabilities menulis rentang 2018-01-01/2099-12-31 dengan default 2019-01-01 dan nearestValue 0, tetapi tanggal tanpa berkas mengembalikan PNG kosong. Pemeriksaan 18 Oktober 2026: piksel ada sampai 27 Oktober 2026 dan kosong mulai 28 Oktober 2026. Lapisan mf010.query hanya mencakup Eropa. Dataset musiman CEMS membutuhkan akun, jadi secret CDS tidak dipasang.",
        updateType: "Harian",
        expectedMaxAgeHours: 36,
        access: "API",
      },
      {
        id: "gfwed_kabupaten",
        nama: "FWI GFWED per kabupaten/kota",
        instansi: "NASA GFWED — GEOS-5",
        provider: "NASA GFWED",
        fungsi: "Pembanding model NASA GFWED (GEOS-5, analisis), bukan BMKG. Bukan kelas FDRS.",
        officialUrl: "https://portal.nccs.nasa.gov/datashare/GlobalFWI/",
        license: "Berkas publik NASA NCCS Datashare, tanpa login. Kutipan Field et al. 2015, doi:10.5194/nhess-15-1407-2015.",
        method:
          "Berkas harian terbaru FWI.GEOS-5.Daily.Default.YYYYMMDD.nc pada v2.0/fwiCalcs.GEOS-5/Default/GEOS-5/. Variabel GEOS-5_FWI. Sel di dalam bingkai peta Indonesia dipasangkan ke kabupaten/kota lewat kueri BIG yang dikelompokkan. Yang disimpan hanya kode, nama, dan nilai. Rata-rata dan maksimum dihitung dari sel yang pusatnya jatuh di dalam. Pemeriksaan 18 Oktober 2026: berkas terbaru bertanggal 14 Oktober 2026.",
        updateType: "Harian, tertunda",
        expectedMaxAgeHours: 24 * 6,
        access: "Berkas publik",
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
    comparisons: [
      {
        id: "hujan_14_pembanding",
        nama: "Hujan dan angin 14 hari",
        instansi: "Open-Meteo",
        provider: "Open-Meteo",
        fungsi: "Jumlah hujan, peluang hujan, dan angin maksimum 14 hari pada titik wakil kabupaten prioritas. Bukan prakiraan BMKG.",
        officialUrl: "https://open-meteo.com/en/docs",
        license: "CC BY 4.0 untuk pemakaian nonkomersial. Cantumkan Open-Meteo.com. Pemakaian komersial punya syarat terpisah.",
        method:
          "forecast_days 14 pada API prakiraan, zona Asia/Jakarta untuk semua titik termasuk Kalimantan Selatan. curah hujan adalah precipitation_sum (mm). Peluang adalah precipitation_probability_max: peluang ensemble hujan di atas 0,1 mm, nilai maksimum pada hari itu, dalam persen. Angin adalah wind_speed_10m_max (km/jam). Titik adalah lintang/bujur pada baris kabupaten Satu Data BNPB, bukan batas administrasi dan bukan kotak perkiraan. Jumlah kejadian bencana pada tabel itu tidak dibaca.",
        updateType: "Harian",
        expectedMaxAgeHours: 36,
        access: "API",
      },
    ],
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
      "Portal menampilkan peta. Layanan yang terdaftar di Satu Data berupa ImageServer raster, bukan tabel kabupaten yang bisa disimpan apa adanya. Raster inaRISK tidak digambar di dasbor.",
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
      "Tabel dikutip dari versi HTML Buku IRBI 2025 halaman 294–307 untuk ancaman kebakaran hutan dan lahan. 467 kabupaten/kota punya skor dan kelas; 47 yang tidak ada di tabel dikosongkan dan dicatat IRBI tidak tersedia. Skor yang ada tidak diubah. Bukan peta, karena batas wilayah resmi tidak disertakan. Komponen bahaya, kerentanan, dan kapasitas tidak ada pada halaman itu.",
  },
  {
    id: "ispu",
    nama: "ISPU",
    instansi: "Kementerian Lingkungan Hidup",
    fungsi: "Menunjukkan kualitas udara di stasiun pemantau pada lapisan Kualitas Udara (ISPU) di dalam Karhutla. Bukan bukti tunggal bahwa polutan berasal dari karhutla.",
    officialUrl: "https://ispu.kemenlh.go.id/app/#/",
    officialLabel: "Portal ISPU",
    extraUrls: [
      ["Analisis kawasan ISPU", "https://ispu.kemenlh.go.id/kawasan/analytic"],
      ["Permen LHK No. 14 Tahun 2020", "https://peraturan.bpk.go.id/Details/163466/permen-lhk-no-14-tahun-2020"],
    ],
    access: "Tautan portal",
    needsKey: false,
    kind: "tautan",
    updateType: "",
    limitation:
      "Pada Satu Data KemenLH tidak ada dataset deret waktu ISPU harian, per jam, atau per stasiun (diperiksa 19 Oktober 2026). Token yang tertanam di aplikasi web tidak dipakai. Hari Ini dan Historis ditulis tidak tersedia. Tidak ada prediksi ISPU. Indeks Kualitas Udara 2024 adalah tabel tahunan terpisah, bukan pengganti ISPU.",
    comparisons: [
      {
        id: "ispu_pembanding",
        nama: "PM2.5 model (CAMS), pembanding",
        instansi: "Open-Meteo / CAMS",
        provider: "Open-Meteo Air Quality",
        fungsi: "Konsentrasi model dalam µg/m³. Bukan pengukuran stasiun dan bukan ISPU KemenLH.",
        officialUrl: "https://open-meteo.com/en/docs/air-quality-api",
        license: "CC BY 4.0. Model udara dari Copernicus Atmosphere Monitoring Service (CAMS).",
        method:
          "Rata-rata harian PM2.5 dan PM10 dalam µg/m³ pada titik tengah kasar provinsi, 7 hari ke belakang dan hingga 5 hari yang API isi. Domain global CAMS sekitar 0,4°. Bukan sel grid pada peta, bukan pengukuran stasiun, dan bukan ISPU.",
        updateType: "Model",
        expectedMaxAgeHours: 36,
        access: "API",
      },
    ],
  },
  {
    id: "iku_2024",
    nama: "Indeks Kualitas Udara 2024",
    instansi: "Kementerian Lingkungan Hidup – Direktorat Perlindungan dan Pengelolaan Mutu Udara",
    fungsi: "Konteks tahunan mutu udara per kabupaten/kota. Bukan ISPU dan bukan kondisi harian.",
    officialUrl: "https://satudata.kemenlh.go.id/dataset/indeks-kualitas-udara",
    officialLabel: "Satu Data KemenLH — Indeks Kualitas Udara",
    extraUrls: [["Kebijakan Satu Data KemenLH", "https://satudata.kemenlh.go.id/tentang/kebijakan"]],
    access: "Terbuka",
    needsKey: false,
    kind: "statis",
    updateType: "Tahunan / statis",
    file: "data/static/iku-2024-kabupaten.csv",
    limitation:
      "509 baris tahun 2024 dari API terbuka Satu Data, disalin 19 Oktober 2026. Sumber menulis pembaruan 8 Juli 2026. Metode pada halaman dataset: 40% indeks SO2, 40% indeks NO2, dan 20% indeks PM2.5 dari data ambien tahunan. Tidak ada kelas warna resmi pada berkas ini. Beberapa kode wilayah terulang untuk nama yang berbeda dan disimpan apa adanya. Tidak diurutkan sebagai peringkat.",
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
      "Diambil dari RSS resmi, lalu tiap berkas CAP XML. Halaman web nowcast tidak dikorek. Poligon tidak digambar dan tidak disimpan. Irisan dengan kabupaten/kota Aceh dan Bengkulu hanya menyimpan kode, nama, dan isi peringatan. areaDesc adalah kantor penerbit, bukan provinsi yang terdampak. Atribusi: Sumber: BMKG.",
  },
  {
    id: "bmkg_siklon",
    nama: "Siklon tropis dan bibit siklon",
    instansi: "BMKG",
    fungsi: "Status ada atau tidak ada siklon tropis di sekitar Indonesia. Bukan jejak, bukan kerucut, dan bukan peringatan resmi dasbor.",
    officialUrl: "https://www.bmkg.go.id/cuaca/siklon-tropis",
    officialLabel: "Siklon Tropis BMKG",
    extraUrls: [
      ["Peta TCWC BMKG", "https://tropicalcyclone.bmkg.go.id/"],
      ["Ikhtisar cuaca harian", "https://dataweb.bmkg.go.id/cuaca/dokumen/ikhtisar-cuaca-harian.pdf"],
    ],
    access: "Halaman publik dan PDF",
    needsKey: false,
    kind: "dinamis",
    updateType: "Harian",
    expectedMaxAgeHours: 30,
    file: "data/live/siklon-bmkg.json",
    limitation:
      "Status Ada/Tidak Ada dibaca dari halaman publik Siklon Tropis. Ada berarti halaman menyebut siklon atau bibit yang sedang berjalan, beserta kalimat pertama, titik analisis, dan teks dampak bila ada. Tanda merah pada navigasi hanya untuk sistem di dalam wilayah pemantauan TCWC Jakarta atau yang punya kalimat dampak ke wilayah Indonesia. Sistem yang jauh tetap ditampilkan sebagai informasi. Daftar siaran pers dibaca dari https://www.bmkg.go.id/siaran-pers ; tidak ada RSS siaran pers. Yang disimpan hanya judul, tautan, waktu daftar, dan kutipan yang memuat kata siklon atau bibit. Bila daftar gagal, kutipan sebelumnya tetap dipakai. Tingkat dampak adalah analisis otomatis Pantau Bencana, bukan status resmi, dan hanya memakai teks dampak halaman plus tanda wilayah TCWC Jakarta. IMD dan JTWC tidak diambil. API https://tropicalcyclone.bmkg.go.id/cms/service-api/cyclone/current tanpa token mengembalikan HTTP 401 pada pemeriksaan 23 Oktober 2026; token di halaman tidak disalin dan tidak dipakai. Ikhtisar PDF hanya mengisi nama, tahap, dan dampak bila kalimatnya terbaca. Bila PDF gagal, kolom itu belum terintegrasi. Jejak dan kerucut tidak disimpan dan tidak digambar. Peta TCWC hanya tautan ke situs BMKG, tidak disematkan. Windy bukan sumber data dan tidak ditautkan. Atribusi: Sumber: BMKG. Izin tertulis untuk integrasi pihak ketiga belum ada.",
  },
  {
    id: "chirps",
    nama: "CHIRPS hujan historis",
    instansi: "UC Santa Barbara Climate Hazards Center",
    fungsi: "Arsip hujan satelit-stasiun untuk konteks kekeringan. Belum diolah menjadi angka kabupaten.",
    officialUrl: "https://www.chc.ucsb.edu/data/chirps",
    officialLabel: "CHIRPS — Climate Hazards Center",
    extraUrls: [
      ["Berkas bulanan global v3", "https://data.chc.ucsb.edu/products/CHIRPS/v3.0/monthly/global/tifs/"],
      ["DOI CHIRPS3", "https://doi.org/10.15780/G2JQ0P"],
    ],
    access: "Tautan unduhan",
    needsKey: false,
    kind: "tautan",
    updateType: "",
    limitation:
      "Data CHIRPS berada di domain publik (Creative Commons Public Domain). Berkas GeoTIFF bulanan global September 2026 berukuran sekitar 24 MB. Dasbor tidak mengunduh atau merata-rata raster itu, karena tidak ada pustaka raster dan berkasnya tidak disimpan di repositori. Tidak ada angka kekeringan historis pada prototipe 14 hari.",
  },
  {
    id: "dibi_banjir_2024",
    nama: "Kejadian banjir kabupaten 2024",
    instansi: "BNPB — Satu Data / DIBI",
    fungsi: "Jumlah kejadian BANJIR tahun 2024 untuk kabupaten/kota Aceh dan Bengkulu pada matriks modul Banjir.",
    officialUrl: "https://data.bnpb.go.id/api/3/action/package_show?id=data-bencana-indonesia",
    officialLabel: "CKAN data-bencana-indonesia",
    access: "API",
    needsKey: false,
    kind: "statis",
    updateType: "Tahunan / statis",
    expectedMaxAgeHours: 24 * 30 * 18,
    file: "data/live/dibi-banjir-2024.csv",
    limitation:
      "Lisensi ODC-BY. Hanya kolom BANJIR pada resource a4daec53-1119-43ef-b05e-00ec3a4c42a4 untuk kode wilayah 11 dan 17. Baris yang tidak tercantum bukan nol. Koordinat tidak disimpan. Bukan rangkaian 2010–2024. Tabel kabupaten ini tidak memuat korban atau rumah rusak. Angka korban terdampak dan rumah rusak pada paket yang sama hanya nasional atau provinsi, jadi tidak disalin ke kabupaten. Pemeriksaan 20 Oktober 2026 tidak menemukan rangkaian publik kejadian banjir per kabupaten untuk 2011–2025. Tabel kabupaten 2010–2024 (resource 21044ffd-c397-4b3c-acbd-5adaa03d79e3) dan berkas tahunan 2010–2023 menjumlahkan semua jenis bencana, jadi tidak dipakai sebagai jumlah banjir.",
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
      "Lisensi ODC-BY. Hanya baris jenis KEBAKARAN HUTAN DAN LAHAN pada tabel nasional. Tabel kabupaten 2010–2024 pada paket yang sama menjumlahkan semua jenis bencana, sehingga tidak dipakai sebagai kejadian karhutla per kabupaten. Tabel kabupaten 2024 yang memuat kolom BANJIR dipakai hanya pada modul Banjir. Unduhan XLSX dapat tertahan Cloudflare; pengambilan memakai datastore CKAN.",
  },
  {
    id: "prioritas_aplus",
    nama: "Prioritas kesiapsiagaan 14 hari (FWI hanya 9 hari)",
    instansi: "Pemodelan pihak ketiga (GWIS, Open-Meteo, FIRMS, IRBI)",
    fungsi: "Daftar paling banyak 15 kab/kota pada enam provinsi, plus blok hotspot nasional. Bukan prakiraan resmi BMKG/BNPB.",
    officialUrl: "https://gwis.jrc.ec.europa.eu/about-gwis/technical-background/fire-danger-forecast",
    officialLabel: "GWIS Fire Danger Forecast",
    extraUrls: [
      ["Lisensi Open-Meteo", "https://open-meteo.com/en/licence"],
      ["de Groot dkk. 2007", "https://doi.org/10.1007/s11027-006-9043-8"],
    ],
    access: "API",
    needsKey: false,
    kind: "dinamis",
    updateType: "Harian",
    expectedMaxAgeHours: 36,
    file: "data/live/prioritas_aplus.json",
    limitation:
      "Open-Meteo CC BY 4.0, nonkomersial. FWI hanya 9 hari. Ambang FFMC/DC dari literatur, diterapkan pada nilai model, bukan kelas BMKG. Geometri BIG tidak disimpan.",
  },
  {
    id: "penduduk_kabkota",
    nama: "Penduduk dan rumah tangga kabupaten/kota",
    instansi: "BPS",
    fungsi:
      "Potensi penduduk terdampak dan potensi rumah terdampak: total satu kabupaten/kota, hanya pada baris berstatus Awas, Siaga, atau Waspada. potensi = total kab/kota (BPS), bukan estimasi jumlah terpapar.",
    officialUrl: "https://sensus.bps.go.id/publikasi/index/sp2020",
    officialLabel: "Publikasi Proyeksi Penduduk Kabupaten/Kota, Sensus Penduduk 2020",
    access: "Data statis",
    needsKey: false,
    kind: "statis",
    updateType: "Tahunan / statis",
    file: "data/static/penduduk-kabkota.csv",
    limitation:
      "514 kabupaten/kota. Penduduk adalah proyeksi BPS 2026. potensi = total kab/kota (BPS), bukan estimasi jumlah terpapar. Rumah tangga hanya DKI Jakarta, Banten, dan Jawa Timur; sel lain belum tersedia dan bukan nol. Kode mengikuti batas BIG, bukan kode BPS di dalam kalimat sumber. Tidak ada kunci API.",
  },
  {
    id: "hujan_pembanding_banjir",
    nama: "Curah hujan model pada titik adm4",
    instansi: "Open-Meteo",
    fungsi:
      "Jumlah hujan harian pada titik adm4 yang sama dengan prakiraan BMKG, hanya sebagai lapisan pembanding di halaman Banjir.",
    officialUrl: "https://open-meteo.com/en/docs",
    officialLabel: "Open-Meteo Forecast API",
    extraUrls: [
      ["Lisensi Open-Meteo", "https://open-meteo.com/en/licence"],
      ["NASA GPM IMERG", "https://gpm.nasa.gov/data/directory"],
    ],
    access: "API",
    needsKey: false,
    kind: "dinamis",
    updateType: "Harian",
    expectedMaxAgeHours: 36,
    file: "data/live/hujan-pembanding-kab.csv",
    limitation:
      "Pembanding (data terbuka, bukan resmi). prakiraan model ECMWF (via Open-Meteo), bukan BMKG. Model ecmwf_ifs025, precipitation_sum, mm, zona Asia/Jakarta, hanya tab Hari ini, Besok, dan Lusa. Tab 0–3 jam hanya memuat peringatan CAP BMKG. Tidak masuk matriks Awas/Siaga/Waspada. NASA GPM IMERG tidak diunduh karena membutuhkan akun Earthdata atau PPS. Lisensi CC BY 4.0, pemakaian nonkomersial.",
  },
];

export function officialLinks(id) {
  const source = SOURCES.find((item) => item.id === id);
  if (!source?.officialUrl) return [];
  const links = [{ href: source.officialUrl, label: source.officialLabel || source.nama }];
  for (const [label, href] of source.extraUrls ?? []) {
    if (href) links.push({ href, label });
  }
  return links;
}

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
