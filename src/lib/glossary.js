// Istilah yang dipakai dasbor. Penjelasan mengikuti sumber yang ditautkan.
// Jika tidak ada rujukan resmi, keterangannya deskriptif dan bukan definisi hukum.

export const GLOSSARY = [
  {
    id: "asap",
    istilah: "Citra sebaran asap",
    nama: "Citra sebaran asap",
    penjelasan:
      "Produk BMKG yang menampilkan sebaran asap. Berkas gambarnya utuh di layanan inderaja. Pemakaian ulang citra membutuhkan izin tertulis, dan gambar tidak boleh dipotong.",
    penggunaan: "Status tautan saja – menunggu izin BMKG. Arsip pukul 08.00 tidak dijalankan. Tidak ada gambar historis buatan.",
    rujukan: "https://www.bmkg.go.id/cuaca/satelit/citra-sebaran-asap",
    rujukanLabel: "BMKG — Citra sebaran asap",
  },
  {
    id: "bmkg",
    istilah: "BMKG",
    nama: "Badan Meteorologi, Klimatologi, dan Geofisika",
    penjelasan: "Lembaga pemerintah yang menyediakan prakiraan cuaca dan produk karhutla, termasuk FDRS pada portal SPARTAN.",
    penggunaan: "Prakiraan 3 hari (suhu, kelembapan, cuaca, hujan slot, angin) diambil dari API data terbuka BMKG dan diberi atribusi BMKG.",
    rujukan: "https://www.bmkg.go.id/",
    rujukanLabel: "bmkg.go.id",
  },
  {
    id: "bnpb",
    istilah: "BNPB",
    nama: "Badan Nasional Penanggulangan Bencana",
    penjelasan: "Lembaga pemerintah yang menerbitkan inaRISK dan Indeks Risiko Bencana Indonesia.",
    penggunaan: "IRBI 2025 disimpan dari buku BNPB. Peta bahaya inaRISK hanya ditautkan.",
    rujukan: "https://www.bnpb.go.id/",
    rujukanLabel: "bnpb.go.id",
  },
  {
    id: "bui",
    istilah: "BUI",
    nama: "Buildup Index",
    penjelasan:
      "Salah satu komponen Fire Weather Index pada sistem cuaca kebakaran Kanada. BUI menggabungkan kelembapan bahan bakar sedang dan kasar.",
    penggunaan: "Tidak dihitung dan tidak ditampilkan sebagai angka tersendiri di dasbor ini.",
    rujukan: "https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi",
    rujukanLabel: "Natural Resources Canada — FWI",
  },
  {
    id: "cams",
    istilah: "CAMS",
    nama: "Copernicus Atmosphere Monitoring Service",
    penjelasan: "Layanan pemantauan atmosfer Copernicus yang menjadi salah satu sumber model pada API kualitas udara Open-Meteo.",
    penggunaan: "Bila angka model ditampilkan, labelnya model pembanding dalam µg/m³. Angka itu bukan pengukuran stasiun dan tidak diubah menjadi ISPU atau kategori ISPU.",
    rujukan: "https://atmosphere.copernicus.eu/",
    rujukanLabel: "atmosphere.copernicus.eu",
  },
  {
    id: "cap",
    istilah: "CAP",
    nama: "Common Alerting Protocol",
    penjelasan:
      "Format peringatan yang dipakai BMKG pada berkas XML nowcast. RSS resmi ada di halaman peringatan dini cuaca. Dasar waktunya sekitar 0–3 jam, berbeda dari peringatan dasarian dan dari prakiraan berbasis dampak.",
    penggunaan:
      "Pada modul Banjir, peringatan CAP dipasangkan ke kabupaten/kota lewat irisan poligon dengan BIG. Yang tersimpan hanya kode, nama, dan teks peringatan. areaDesc adalah kantor penerbit, bukan provinsi terdampak. Bila tidak ada cuplikan yang lebih baru, peringatan terakhir tetap ditampilkan beserta masa berlakunya. Setelah masa berlaku lewat, labelnya data terakhir, bukan peringatan yang masih berlaku.",
    rujukan: "https://www.bmkg.go.id/alerts/nowcast/id",
    rujukanLabel: "BMKG — RSS nowcast",
  },
  {
    id: "confidence",
    istilah: "Confidence",
    nama: "Tingkat kepercayaan deteksi",
    penjelasan:
      "Pada hotspot VIIRS di FIRMS, kepercayaan disebut low, nominal, atau high, yang dasbor tulis rendah, nominal, atau tinggi. Pada MODIS sering berupa angka. Nilai ini menilai kualitas deteksi satelit, bukan hasil cek lapangan dan bukan tingkat bahaya.",
    penggunaan: "Warna titik: rendah kuning, nominal oranye, tinggi merah. Nilai yang tidak terbaca ditulis Tidak diketahui dan tidak dihitung sebagai kuning. VIIRS memakai l, n, atau h. MODIS 0–29 rendah, 30–79 nominal, 80–100 tinggi. Nilai asli tetap ditampilkan. Nominal adalah kelas menengah, padanan katanya sedang. Ini kualitas deteksi satelit, bukan tingkat bahaya atau tingkat kebakaran.",
    rujukan: "https://firms.modaps.eosdis.nasa.gov/",
    rujukanLabel: "NASA FIRMS",
  },
  {
    id: "das",
    istilah: "DAS",
    nama: "Daerah Aliran Sungai",
    penjelasan: "Wilayah tangkapan air sungai. Klasifikasi DAS yang disebut untuk banjir berasal dari data KLHK yang disajikan BNPB sebagai layanan peta.",
    penggunaan: "Lapisan opsional pada modul Banjir. Label yang ditampilkan adalah nilai kolom KRITERIA, yaitu DIPULIHKAN atau DIPERTAHANKAN. Geometri tidak disimpan.",
    rujukan: "https://gis.bnpb.go.id/server/rest/services/inarisk/Klasifikasi_DAS_KLHK/MapServer",
    rujukanLabel: "BNPB — Klasifikasi DAS KLHK",
  },
  {
    id: "dasarian",
    istilah: "Dasarian",
    nama: "Dasarian",
    penjelasan:
      "Pada layanan iklim BMKG, dasarian adalah periode sekitar sepuluh hari dalam sebulan: tanggal 1–10, 11–20, dan 21 sampai akhir bulan. Itu bukan prakiraan cuaca harian yang bergulir sepuluh hari ke depan.",
    penggunaan:
      "Prediksi hujan dasarian tetap tautan; citranya tidak disalin. Status Peringatan Dini Curah Hujan Tinggi untuk Aceh dan Bengkulu diisi manual pada berkas CSV, lalu dibaca dasbor. Halaman BMKG itu tidak dikorek.",
    rujukan: "https://www.bmkg.go.id/iklim/prediksi-hujan-dasarian",
    rujukanLabel: "BMKG — Prediksi hujan dasarian",
  },
  {
    id: "dc",
    istilah: "DC",
    nama: "Drought Code",
    penjelasan: "Komponen Fire Weather Index yang menggambarkan kekeringan bahan bakar kasar yang mengering dalam waktu lama.",
    penggunaan: "Daftar prioritas menampilkan DC maksimum dari model GWIS, bukan komponen FDRS BMKG yang dihitung dasbor.",
    rujukan: "https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi",
    rujukanLabel: "Natural Resources Canada — FWI",
  },
  {
    id: "dibi",
    istilah: "DIBI",
    nama: "Data dan Informasi Bencana Indonesia",
    penjelasan:
      "Kompilasi kejadian dan dampak bencana pada Satu Data BNPB. Paket yang dipakai berlisensi ODC-BY dan memuat jumlah menurut jenis bencana pada tingkat nasional.",
    penggunaan: "Hanya rangkaian nasional kebakaran hutan dan lahan tahun 2010–2024. Tabel kabupaten pada paket yang sama tidak memisahkan jenis bencana, jadi tidak dipakai sebagai kejadian karhutla per kabupaten. Pemeriksaan 20 Oktober 2026 tidak menemukan rangkaian publik kejadian banjir per kabupaten untuk 2011–2025.",
    rujukan: "https://data.bnpb.go.id/api/3/action/package_show?id=data-bencana-indonesia",
    rujukanLabel: "Satu Data BNPB — data-bencana-indonesia",
  },
  {
    id: "dmc",
    istilah: "DMC",
    nama: "Duff Moisture Code",
    penjelasan: "Komponen Fire Weather Index yang menggambarkan kelembapan lapisan bahan bakar sedang.",
    penggunaan: "Tidak ditampilkan sebagai angka tersendiri.",
    rujukan: "https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi",
    rujukanLabel: "Natural Resources Canada — FWI",
  },
  {
    id: "fdrs",
    istilah: "FDRS",
    nama: "Fire Danger Rating System",
    penjelasan:
      "Fire Danger Rating System adalah sistem peringkat bahaya kebakaran BMKG di SPARTAN. FWI pada GWIS adalah indeks model ECMWF dari Copernicus, bukan keluaran FDRS BMKG. Kelas pada legenda GWIS tidak disamakan dengan kelas FDRS BMKG.",
    penggunaan: "FDRS BMKG hanya tautan. Citra SPARTAN mencakup pengamatan dan prakiraan hingga H+7 sesuai produk BMKG, bukan 14 hari. Angka FWI contoh tidak ditampilkan. Angka FWI pada daftar prioritas berasal dari GWIS, bukan dari SPARTAN.",
    rujukan: "https://spartan.bmkg.go.id/",
    rujukanLabel: "SPARTAN BMKG",
  },
  {
    id: "ffmc",
    istilah: "FFMC",
    nama: "Fine Fuel Moisture Code",
    penjelasan: "Komponen Fire Weather Index yang menggambarkan kekeringan bahan bakar halus di permukaan.",
    penggunaan: "Daftar prioritas menghitung hari dengan FFMC model GWIS minimal 78. Itu bukan komponen FDRS BMKG yang dihitung dasbor.",
    rujukan: "https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi",
    rujukanLabel: "Natural Resources Canada — FWI",
  },
  {
    id: "firms",
    istilah: "FIRMS",
    nama: "Fire Information for Resource Management System",
    penjelasan: "Layanan NASA untuk deteksi kebakaran aktif dan anomali termal dari satelit, antara lain VIIRS dan MODIS.",
    penggunaan: "Disiapkan lewat API area bila secret FIRMS_MAP_KEY terpasang di GitHub Actions. Tanpa secret, statusnya belum terhubung.",
    rujukan: "https://firms.modaps.eosdis.nasa.gov/",
    rujukanLabel: "firms.modaps.eosdis.nasa.gov",
  },
  {
    id: "frp",
    istilah: "FRP",
    nama: "Fire Radiative Power",
    penjelasan: "Perkiraan daya radiatif deteksi kebakaran aktif pada produk satelit, dalam megawatt pada berkas FIRMS. Bukan luas area yang terbakar.",
    penggunaan: "Ditampilkan bila kolom FRP ada pada data hotspot. Tidak dipakai sebagai ambang wilayah perhatian.",
    rujukan: "https://firms.modaps.eosdis.nasa.gov/",
    rujukanLabel: "NASA FIRMS",
  },
  {
    id: "fwi",
    istilah: "FWI",
    nama: "Fire Weather Index",
    penjelasan:
      "Indeks cuaca kebakaran pada sistem Kanada. FWI memakai beberapa kode kelembapan bahan bakar dan indeks sebaran. BMKG memakai keluarga indeks ini di dalam FDRS.",
    penggunaan:
      "FDRS resmi menunggu data resmi BMKG. Lapisan pembanding GWIS menampilkan FWI ECMWF pada titik wakil dan tidak disebut FDRS BMKG. Angka itu tidak mengubah urutan 14 hari.",
    rujukan: "https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi",
    rujukanLabel: "Natural Resources Canada — FWI",
  },
  {
    id: "hotspot",
    istilah: "Hotspot",
    nama: "Hotspot atau titik panas",
    penjelasan:
      "Deteksi satelit atas suhu atau pancaran yang menonjol. Dalam pemantauan karhutla, hotspot adalah indikasi yang perlu diperiksa. Titik api atau kebakaran terkonfirmasi baru ada setelah verifikasi lapangan. Dasbor tidak menampilkan hotspot hari besok.",
    penggunaan: "Peta dan tabel memakai koordinat deteksi. Nama wilayah diisi dari kueri BIG pada saat pembaruan. Titik yang pencariannya gagal tidak masuk hitungan provinsi atau kabupaten.",
    rujukan: "https://firms.modaps.eosdis.nasa.gov/",
    rujukanLabel: "NASA FIRMS",
  },
  {
    id: "inarisk",
    istilah: "inaRISK",
    nama: "inaRISK",
    penjelasan: "Portal BNPB untuk peta bahaya, kerentanan, kapasitas, dan risiko bencana, termasuk kebakaran hutan dan lahan.",
    penggunaan: "Ditautkan sebagai peta bahaya. Tidak digambar sebagai lapisan di atas peta dasar dasbor.",
    rujukan: "https://inarisk2.bnpb.go.id/portal/",
    rujukanLabel: "inarisk2.bnpb.go.id/portal",
  },
  {
    id: "irbi",
    istilah: "IRBI",
    nama: "Indeks Risiko Bencana Indonesia",
    penjelasan: "Indeks tahunan BNPB untuk membandingkan risiko bencana antarwilayah. Buku IRBI 2025 memuat indeks per ancaman, termasuk kebakaran hutan dan lahan.",
    penggunaan: "Tabel kabupaten/kota tahun 2025 disimpan lokal dari halaman buku resmi. Tidak mengikuti filter tanggal dan tidak berupa peta.",
    rujukan: "https://inarisk.bnpb.go.id/IRBI-2025/files/basic-html/page294.html",
    rujukanLabel: "Buku IRBI 2025, halaman 294",
  },
  {
    id: "isi",
    istilah: "ISI",
    nama: "Initial Spread Index",
    penjelasan: "Komponen Fire Weather Index yang menggambarkan perkiraan sebaran awal api pada bahan bakar halus.",
    penggunaan: "Tidak ditampilkan sebagai angka tersendiri.",
    rujukan: "https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi",
    rujukanLabel: "Natural Resources Canada — FWI",
  },
  {
    id: "iku",
    istilah: "IKU",
    nama: "Indeks Kualitas Udara",
    penjelasan:
      "Indeks tahunan mutu udara per kabupaten/kota pada Satu Data Kementerian Lingkungan Hidup. Bukan Indeks Standar Pencemar Udara dan bukan pengukuran hari ini.",
    penggunaan:
      "Tabel 2024 ditampilkan sebagai konteks statis di lapisan Kualitas Udara, dengan atribusi ke Direktorat Perlindungan dan Pengelolaan Mutu Udara. Tidak diwarnai dan tidak dijadikan peringkat.",
    rujukan: "https://satudata.kemenlh.go.id/dataset/indeks-kualitas-udara",
    rujukanLabel: "Satu Data KemenLH — Indeks Kualitas Udara",
  },
  {
    id: "ispu",
    istilah: "ISPU",
    nama: "Indeks Standar Pencemar Udara",
    penjelasan:
      "Indeks resmi mutu udara di Indonesia. Permen LHK No. 14 Tahun 2020 menetapkan kategori Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, dan Berbahaya, serta cara mengubah konsentrasi menjadi angka indeks.",
    penggunaan: "Lapisan Kualitas Udara (ISPU) di dalam Karhutla menampilkan stasiun resmi bila tersambung. Tanpa angka resmi, statusnya Tidak tersedia. Berkas contoh dan model tidak diisi sebagai ISPU.",
    rujukan: "https://peraturan.bpk.go.id/Details/163466/permen-lhk-no-14-tahun-2020",
    rujukanLabel: "Permen LHK No. 14 Tahun 2020",
  },
  {
    id: "klh",
    istilah: "KLH",
    nama: "Kementerian Lingkungan Hidup",
    penjelasan:
      "Portal ISPU saat ini berada di ispu.kemenlh.go.id. Peraturan ISPU tahun 2020 diterbitkan oleh Kementerian Lingkungan Hidup dan Kehutanan. Dasbor mengikuti nama yang tertulis pada situs dan pada peraturan itu.",
    penggunaan: "Dua halaman resmi ditautkan dari lapisan Kualitas Udara (ISPU). Tidak ada angka stasiun yang ditarik dari portal.",
    rujukan: "https://ispu.kemenlh.go.id/app/#/",
    rujukanLabel: "ispu.kemenlh.go.id",
  },
  {
    id: "magma",
    istilah: "MAGMA",
    nama: "MAGMA Indonesia",
    penjelasan:
      "Layanan PVMBG untuk informasi gunung api, termasuk tingkat aktivitas Normal, Waspada, Siaga, dan Awas. Tidak ditemukan API publik yang terdokumentasi.",
    penggunaan: "Tab Gunung Api hanya menautkan situs resmi. Tidak ada tingkat gunung yang diisi.",
    rujukan: "https://magma.esdm.go.id/",
    rujukanLabel: "magma.esdm.go.id",
  },
  {
    id: "modis",
    istilah: "MODIS",
    nama: "Moderate Resolution Imaging Spectroradiometer",
    penjelasan: "Sensor pada satelit Terra dan Aqua yang juga menghasilkan deteksi kebakaran aktif di FIRMS.",
    penggunaan: "API yang disiapkan memakai VIIRS Suomi-NPP, bukan MODIS. Data contoh dapat berisi nama satelit lain.",
    rujukan: "https://www.earthdata.nasa.gov/data/instruments/modis",
    rujukanLabel: "NASA Earthdata — MODIS",
  },
  {
    id: "nrt",
    istilah: "NRT",
    nama: "Near Real-Time",
    penjelasan: "Data dekat waktu nyata: produk satelit yang diproses segera setelah lintasan, sebelum produk standar yang lebih lambat selesai.",
    penggunaan: "Sumber FIRMS yang disiapkan adalah VIIRS_SNPP_NRT. Tanpa kunci, produk ini tidak diunduh.",
    rujukan: "https://firms.modaps.eosdis.nasa.gov/api/area/",
    rujukanLabel: "Dokumentasi API area FIRMS",
  },
  {
    id: "observasi",
    istilah: "Observasi",
    nama: "Observasi",
    penjelasan: "Data yang mencatat kondisi yang sudah teramati, misalnya lintasan satelit atau pengukuran stasiun. Bukan prakiraan untuk waktu yang belum terjadi.",
    penggunaan: "Hotspot, IRBI, dan ISPU resmi (bila nanti tersambung) bersifat observasi atau indeks yang sudah disusun. Prakiraan BMKG ditandai terpisah.",
  },
  {
    id: "pembanding",
    istilah: "Pembanding",
    nama: "Pembanding (data terbuka, bukan resmi)",
    penjelasan:
      "Lapisan dari sumber terbuka yang diletakkan di samping produk resmi yang belum bisa diunduh. Nilainya tidak menggantikan angka instansi dan tidak masuk daftar wilayah perhatian.",
    penggunaan:
      "Open-Meteo untuk cuaca provinsi, hujan 14 hari pada titik wakil, dan PM2.5 model dalam µg/m³. GWIS untuk FWI ECMWF. Pengukuran stasiun terbuka, bila ada kunci, tetap dalam µg/m³. Semuanya berlabel pembanding dan tidak mengganti baris resmi.",
    rujukan: "https://open-meteo.com/en/licence",
    rujukanLabel: "Lisensi Open-Meteo",
  },
  {
    id: "pm",
    istilah: "PM2.5",
    nama: "PM2.5 dan PM10",
    penjelasan:
      "Partikulat di udara dengan diameter aerodinamis di bawah 2,5 mikrometer (PM2.5) atau 10 mikrometer (PM10). Keduanya parameter pada ISPU. Peraturan memakai rata-rata 24 jam.",
    penggunaan: "Pada ISPU resmi, PM2.5 dapat menjadi parameter kritis. Konsentrasi model tidak ditampilkan sebagai nilai atau kategori ISPU.",
    rujukan: "https://peraturan.bpk.go.id/Details/163466/permen-lhk-no-14-tahun-2020",
    rujukanLabel: "Permen LHK No. 14 Tahun 2020",
  },
  {
    id: "prakiraan",
    istilah: "Prakiraan",
    nama: "Prakiraan",
    penjelasan: "Perkiraan kondisi yang belum terjadi, untuk jangka waktu yang disebutkan produknya. Bukan pengamatan dan bukan prediksi titik api.",
    penggunaan: "Kartu BMKG menulis horizon 3 hari dan waktu produksi data. Tidak ada lapisan hotspot terprediksi.",
    rujukan: "https://data.bmkg.go.id/prakiraan-cuaca/",
    rujukanLabel: "Data Prakiraan Cuaca Terbuka BMKG",
  },
  {
    id: "pvmbg",
    istilah: "PVMBG",
    nama: "Pusat Vulkanologi dan Mitigasi Bencana Geologi",
    penjelasan: "Unit Badan Geologi yang menerbitkan tingkat aktivitas gunung api. Permintaan data resmi dapat melalui PPID ESDM.",
    penggunaan: "Belum terhubung. Pengorek pihak ketiga tidak dipakai. Laporan mingguan Smithsonian dan nasihat VAAC Darwin hanya tautan.",
    rujukan: "https://ppid.esdm.go.id/",
    rujukanLabel: "PPID ESDM",
  },
  {
    id: "chirps",
    istilah: "CHIRPS",
    nama: "Climate Hazards Center InfraRed Precipitation with Station data",
    penjelasan:
      "Rangkaian hujan global dari UC Santa Barbara yang menggabungkan citra inframerah dan data stasiun. Berkas bulanan global tersedia sebagai GeoTIFF tanpa kunci.",
    penggunaan:
      "Hanya ditautkan. Berkas bulanan sekitar 24 MB tidak diunduh dan tidak diubah menjadi angka kabupaten, karena dasbor tidak memproses raster.",
    rujukan: "https://www.chc.ucsb.edu/data/chirps",
    rujukanLabel: "Climate Hazards Center — CHIRPS",
  },
  {
    id: "gwis",
    istilah: "GWIS",
    nama: "Global Wildfire Information System",
    penjelasan:
      "Layanan Copernicus EMS dan JRC untuk bahaya kebakaran global. Prakiraan FWI model ECMWF disajikan lewat WMS publik, terpisah dari FDRS BMKG.",
    penggunaan:
      "Peta Karhutla dapat menampilkan overlay WMS lapisan ecmwf.fwi untuk tanggal yang dipilih atau hari ini. Angka titik wakil tetap terpisah. Keduanya bukan FDRS BMKG dan tidak masuk urutan prototipe. Kelas pada legenda GWIS tidak dibandingkan dengan kelas BMKG.",
    rujukan: "https://gwis.jrc.ec.europa.eu/about-gwis/technical-background/fire-danger-forecast",
    rujukanLabel: "GWIS — Fire Danger Forecast",
  },
  {
    id: "vaac",
    istilah: "VAAC",
    nama: "Volcanic Ash Advisory Centre",
    penjelasan:
      "Pusat nasihat abu vulkanik untuk penerbangan. Untuk Indonesia, pusat yang relevan adalah VAAC Darwin pada Bureau of Meteorology Australia.",
    penggunaan:
      "Tab Gunung Api hanya menautkan halaman resmi. Klien netral mendapat jawaban 403, jadi teks nasihat tidak disimpan.",
    rujukan: "https://www.bom.gov.au/aviation/warnings/volcanic-ash/",
    rujukanLabel: "Bureau of Meteorology — volcanic ash",
  },
  {
    id: "sipongi",
    istilah: "SiPongi+",
    nama: "SiPongi+",
    penjelasan: "Sistem Pemantauan Karhutla pada portal Kementerian Kehutanan. Dasbor hanya menautkan situs resmi. Angka hotspot tidak diambil dari portal itu.",
    penggunaan: "Status Tautan saja. Hitungan hotspot pada dasbor memakai NASA FIRMS.",
    rujukan: "https://sipongi.gakkum.kehutanan.go.id/",
    rujukanLabel: "sipongi.gakkum.kehutanan.go.id",
  },
  {
    id: "snapshot",
    istilah: "Snapshot",
    nama: "Snapshot atau arsip",
    penjelasan:
      "Salinan data pada saat pengambilan, disimpan bersama waktu unduh dan waktu yang dirujuk data itu. Arsip berarti kumpulan salinan menurut tanggal. Jika suatu tanggal tidak punya berkas, tanggal itu dikosongkan, bukan diisi data buatan.",
    penggunaan: "GitHub Actions menyimpan CSV/JSON di data/live. Citra asap pukul 08.00 dicatat sebagai belum ada sampai berkas resmi bisa disimpan.",
  },
  {
    id: "spartan",
    istilah: "SPARTAN",
    nama: "Sistem Peringatan Hutan dan Lahan",
    penjelasan:
      "Sistem BMKG untuk pemantauan, pencegahan, dan mitigasi kebakaran hutan dan lahan. Situsnya menyebut Fire Danger Rating System (SPARTAN).",
    penggunaan: "Hanya ditautkan. Tidak ada angka FDRS resmi yang ditarik ke dasbor.",
    rujukan: "https://spartan.bmkg.go.id/",
    rujukanLabel: "spartan.bmkg.go.id",
  },
  {
    id: "statis",
    istilah: "Data statis",
    nama: "Data statis",
    penjelasan: "Data resmi yang disimpan di aplikasi dan tidak diambil ulang setiap jadwal, karena sumbernya berkala panjang atau berupa terbitan.",
    penggunaan: "IRBI 2025 disimpan sebagai CSV lokal berlabel tahun 2025.",
    rujukan: "https://inarisk.bnpb.go.id/IRBI-2025/files/basic-html/page294.html",
    rujukanLabel: "Buku IRBI 2025",
  },
  {
    id: "viirs",
    istilah: "VIIRS",
    nama: "Visible Infrared Imaging Radiometer Suite",
    penjelasan: "Sensor pada satelit Suomi-NPP, NOAA-20, dan NOAA-21 yang menghasilkan deteksi kebakaran aktif beresolusi lebih halus daripada MODIS.",
    penggunaan: "Integrasi FIRMS yang disiapkan memakai VIIRS Suomi-NPP near real-time.",
    rujukan: "https://www.earthdata.nasa.gov/data/instruments/viirs",
    rujukanLabel: "NASA Earthdata — VIIRS",
  },
  {
    id: "wib",
    istilah: "WIB",
    nama: "Waktu Indonesia Barat",
    penjelasan: "Waktu sipil bagian barat Indonesia, UTC+7. Tidak ada pergantian musim panas.",
    penggunaan: "Waktu pengambilan dan jadwal pembaruan ditampilkan dalam WIB. Waktu lintasan satelit FIRMS pada berkas sumber tetap UTC sampai diubah di label.",
    rujukan: "https://www.bmkg.go.id/",
    rujukanLabel: "BMKG",
  },
  {
    id: "wilayah-perhatian",
    istilah: "Wilayah perhatian",
    nama: "Wilayah perhatian",
    penjelasan:
      "Daftar wilayah yang perlu dilihat karena ada data pendukung, misalnya deteksi satelit pada data yang memang tersambung. Ini bukan peringatan resmi dan bukan urutan prioritas operasional BNPB.",
    penggunaan:
      "Ringkasan pimpinan hanya menyusun daftar dari data yang bukan contoh. Tabel provinsi pada Peta dan Data adalah jumlah deteksi, bukan penetapan operasional.",
  },
  {
    id: "big",
    istilah: "BIG",
    nama: "Badan Informasi Geospasial — batas wilayah",
    penjelasan:
      "Lembaga yang menyediakan batas administrasi. Dasbor memakai layanan peta publik BATAS_WILAYAH untuk nama desa atau kelurahan, kecamatan, kabupaten/kota, dan provinsi.",
    penggunaan:
      "Nama wilayah hotspot diisi hanya bila layanan itu menjawab. Geometri batas tidak disimpan. Titik yang gagal dicari tidak ditebak dari kotak koordinat dan berstatus belum terpetakan.",
    rujukan: "https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/BATAS_WILAYAH/MapServer",
    rujukanLabel: "BIG — layanan BATAS_WILAYAH",
  },
  {
    id: "ensemble",
    istilah: "Open-Meteo ensemble",
    nama: "Ensemble prakiraan Open-Meteo",
    penjelasan:
      "API ensemble Open-Meteo menyajikan anggota prakiraan model, termasuk ECMWF. Peluang pada daftar prioritas dihitung dari anggota itu, bukan dari peluang persen pada API prakiraan BMKG.",
    penggunaan:
      "Perhitungan daftar memakai API ensemble Open-Meteo dan menolak hasil bila anggota yang kembali kurang dari 51. Lisensinya CC BY 4.0 untuk pemakaian nonkomersial. Ini pembanding, bukan prakiraan resmi BMKG.",
    rujukan: "https://open-meteo.com/en/docs/ensemble-api",
    rujukanLabel: "Open-Meteo — Ensemble API",
  },
  {
    id: "gfwed",
    istilah: "GFWED",
    nama: "Global Fire Weather Database",
    penjelasan:
      "Basis data cuaca kebakaran global NASA yang menghitung Fire Weather Index dari medan cuaca, termasuk analisis GEOS-5. Bukan FDRS BMKG dan bukan FWI pada GWIS.",
    penggunaan:
      "Bila berkas kabupaten tersedia, tabelnya berlabel pembanding model NASA GFWED (GEOS-5, analisis), bukan BMKG. Bila berkas tidak ada, statusnya Tidak tersedia.",
    rujukan: "https://data.giss.nasa.gov/impacts/gfwed/",
    rujukanLabel: "NASA GISS — GFWED",
  },
  {
    id: "kabkota",
    istilah: "Kabupaten/kota",
    nama: "Kabupaten atau kota",
    penjelasan:
      "Wilayah administrasi di bawah provinsi. Satu stasiun, satu titik model, atau satu sel grid tidak mewakili seluruh kabupaten atau kota.",
    penggunaan:
      "Nama pada hotspot mengikuti jawaban layanan batas BIG. Daftar prioritas memakai kabupaten/kota pada enam provinsi cakupan. Kode atau nama yang tidak ada tidak diisi nol.",
    rujukan: "https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/BATAS_WILAYAH/MapServer",
    rujukanLabel: "BIG — layanan BATAS_WILAYAH",
  },
  {
    id: "krb",
    istilah: "KRB",
    nama: "Kajian Risiko Bencana",
    penjelasan:
      "Dokumen kajian risiko bencana. Pada modul Banjir, kolom KRB hanya menautkan dokumen yang sudah dicatat. Label peta banjir inaRISK pada modul itu menyebut KRB 2021.",
    penggunaan:
      "Status tautan saja untuk dokumen. Peta gunung api kawasan rawan bencana tidak ditampilkan. Prototipe banjir menunggu izin tertulis BNPB.",
    rujukan: "https://inarisk.bnpb.go.id/",
    rujukanLabel: "inarisk.bnpb.go.id",
  },
  {
    id: "nowcast",
    istilah: "Nowcast",
    nama: "Peringatan dini cuaca jangka sangat pendek",
    penjelasan:
      "Peringatan BMKG untuk beberapa jam ke depan, terbit sebagai RSS nowcast berformat CAP. Dasar waktunya sekitar 0–3 jam. Bukan prakiraan dasarian dan bukan prospek musiman.",
    penggunaan:
      "Pada modul Banjir, peringatan yang masih berlaku dipasangkan ke kabupaten/kota. Peringatan yang sudah berakhir tidak ditampilkan sebagai aktif.",
    rujukan: "https://www.bmkg.go.id/alerts/nowcast/id",
    rujukanLabel: "BMKG — RSS nowcast",
  },
  {
    id: "p75",
    istilah: "P75",
    nama: "Persentil ke-75",
    penjelasan:
      "Nilai yang berada di atas atau sama dengan 75 persen dari nilai pada kumpulan yang sama. Pada daftar prioritas, kumpulannya adalah titik sampel di dalam satu kabupaten atau kota, bukan seluruh Indonesia.",
    penggunaan:
      "FWI, FFMC, DC, dan peluang kering memakai P75 antartitik. Nilai maksimum FWI tetap ditulis di sampingnya. Rumusnya ada di bagian cara menghitung pada halaman ini.",
  },
  {
    id: "pdcht",
    istilah: "PDCHT",
    nama: "Peringatan Dini Curah Hujan Tinggi",
    penjelasan:
      "Produk iklim BMKG untuk peringatan curah hujan tinggi pada periode dasarian. Halaman resminya berisi citra dan narasi, bukan tabel kabupaten yang diunduh otomatis.",
    penggunaan:
      "Status tautan saja. Untuk modul Banjir, status Aceh dan Bengkulu yang sudah diisi disalin manual ke CSV. Baris kosong bukan nol. Citra tidak diunduh dan tidak dipotong.",
    rujukan: "https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi",
    rujukanLabel: "BMKG — Peringatan dini curah hujan tinggi",
  },
  {
    id: "peringkat",
    istilah: "Rata-rata peringkat",
    nama: "Skor rata-rata peringkat",
    penjelasan:
      "Setiap indikator diubah menjadi peringkat di antara kabupaten/kota yang datanya lengkap. Nilai yang sama mendapat rata-rata peringkat. Skor adalah rata-rata peringkat itu, 25 persen tiap indikator yang dipakai.",
    penggunaan:
      "Ini cara hitung Metode A+ pada daftar prioritas. Bukan peringatan resmi BMKG atau BNPB, dan bukan urutan FDRS.",
  },
  {
    id: "vona",
    istilah: "VONA",
    nama: "Volcano Observatory Notice for Aviation",
    penjelasan:
      "Pemberitahuan observatorium gunung api untuk penerbangan. PVMBG menerbitkannya lewat MAGMA Indonesia bila aktivitas gunung berubah, naik atau turun.",
    penggunaan: "Tab Gunung Api tidak menampilkan teks VONA dan tidak menyimpan kode warna penerbangan.",
    rujukan: "https://magma.esdm.go.id/vona/",
    rujukanLabel: "MAGMA Indonesia — VONA",
  },
];
