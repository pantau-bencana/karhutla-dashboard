# Dashboard Peringatan Dini Karhutla Nasional

Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.

Situs publik v0.1: <https://pantau-bencana.github.io/karhutla-dashboard/>

Edisi v0.2 (navigasi kiri, kartu ringkas) ada di jalur terpisah dan tidak mengganti v0.1: <https://pantau-bencana.github.io/karhutla-dashboard/v2/>. Edisi v0.3 (Ringkasan baru) ada di <https://pantau-bencana.github.io/karhutla-dashboard/v3/>. `npm run build` menulis v0.1 di `dist/`, v0.2 di `dist/v2/`, dan v0.3 di `dist/v3/`. Membangun satu edisi tidak menghapus folder edisi lain. Ketiganya memakai cuplikan `data/live` yang sama. Workflow Pages tetap mengunggah folder `dist` tanpa syarat terbit yang baru.

Dasbor statis untuk memantau kebakaran hutan dan lahan (karhutla), banjir, gunung api, dan kualitas udara. Karhutla menampilkan sebaran titik panas (deteksi satelit, bukan kebakaran terkonfirmasi) bila cuplikan hotspot pada manifes ada. Banjir memuat peta kabupaten/kota, CAP BMKG yang masih berlaku, prakiraan cuaca 3 hari, dan analisis dasbor yang bukan peringatan resmi. Gunung api belum terintegrasi dan hanya menautkan MAGMA. ISPU stasiun resmi belum terintegrasi; model CAMS adalah pembanding dalam tabel, bukan ISPU. Antarmuka berbahasa Indonesia. Tidak ada server aplikasi. Situs membaca cuplikan di `data/live` lewat manifes yang sama di setiap halaman. Berkas contoh tidak ditampilkan. Satu sumber yang gagal tidak mengosongkan kategori lain.

Angka dan status pada prototipe ini **bukan** peringatan dini resmi BNPB, BMKG, atau instansi sumber. Ini proyek pribadi nonkomersial, bukan produk resmi, dan tidak berafiliasi dengan BNPB atau BMKG.

Kode sumber berlisensi MIT (`LICENSE`, pemegang hak cipta: Pantau Bencana contributors). Data tetap milik penyedia aslinya. Daftar lisensi dan atribusi ada di [NOTICE.md](NOTICE.md).

## Dokumen

Indeks ada di [docs/README.md](docs/README.md). Cara mengisi status dasarian Aceh dan Bengkulu ada di [docs/PANDUAN_ISI_DASARIAN.md](docs/PANDUAN_ISI_DASARIAN.md).

## Menjalankan di komputer sendiri

Perlu Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`. Perubahan pada `public/config.json` dan `data/sample/` terbaca setelah halaman dimuat ulang.

Pemeriksaan logika data (tanpa peramban):

```bash
npm run check
```

Bangun situs statis, lalu sajikan folder `dist` dengan server statis apa pun:

```bash
npm run build
npm run preview
```

Header memuat tab bahaya **Karhutla**, **Banjir**, dan **Gunung Api**, lalu halaman **Ringkasan**, **Peta dan Data**, **Logika Pemantauan**, **Sumber Data**, dan **Glosarium**. Karhutla membaca cuplikan hotspot, prakiraan BMKG 3 hari, dan daftar prioritas model pihak ketiga bila komponennya cukup. Banjir memuat peta nasional, kartu lapisan di dalam peta, dan tabel kabupaten di bawah peta. Status Awas/Siaga/Waspada pada tab prakiraan adalah analisis dasbor, bukan peringatan resmi BMKG atau BNPB. CAP yang masa berlakunya sudah lewat ditulis data terakhir/kedaluwarsa dan tidak diwarnai sebagai peringatan aktif. Gunung Api berstatus belum terintegrasi, tanpa angka aktivitas. Rute memakai hash (`#/`, `#/karhutla/peta`, `#/banjir`, `#/gunung-api`, `#/logika`, `#/glosarium/ispu`) supaya tetap benar di subfolder GitHub Pages.

GitHub Actions mengambil sumber publik lewat [`.github/workflows/refresh-data.yml`](.github/workflows/refresh-data.yml). Dua cron UTC, selisih 90 menit: `17 */3 * * *` dan `47 1-23/3 * * *` (bukan menit 0). Dalam WIB itu 07.17, 08.47, 10.17, 11.47, 13.17, 14.47, 16.17, 17.47, 19.17, 20.47, 22.17, 23.47, 01.17, 02.47, 04.17, dan 05.47. Workflow [`.github/workflows/refresh-watchdog.yml`](.github/workflows/refresh-watchdog.yml) berjalan tiap jam pada menit 7 dan memicu pembaruan bila cuplikan lebih tua dari 4 jam, memicu CAP bila jadwalnya terlewat, dan memicu prakiraan BMKG bila slot 07.00, 09.00, 19.00, atau 21.00 WIB tidak meninggalkan run. Deploy Pages ke `main`, dan pull request dari repositori yang sama, juga memicu penjaga itu bila cron menit 7 tidak membuat run. Commit data oleh `github-actions[bot]` tidak memicu workflow Pages lain; deploy cuplikan dilakukan di dalam workflow pembaruan yang sama. Hasilnya disimpan di `data/live/` bersama manifes. Situs membaca snapshot itu. Bila snapshot resmi tidak ada, bagian itu berstatus Tautan saja atau Tidak tersedia. Berkas contoh tidak ditampilkan. Header menampilkan waktu ambil dan jadwal berikutnya dalam WIB.

Alur: sumber → pengambilan terjadwal → snapshot → dasbor → status peringatan dini (prototipe, bukan peringatan resmi).

Secret FIRMS, bila dipakai, hanya di **Settings → Secrets and variables → Actions** dengan nama `FIRMS_MAP_KEY`. Daftarkan kunci sendiri di <https://firms.modaps.eosdis.nasa.gov/api/map_key/>. Jangan menempelkan kunci di obrolan, berkas, atau commit. Tanpa secret, build tetap jalan dan hotspot berstatus **Belum terhubung**. Berkas contoh hotspot tidak ditampilkan.

Pembanding terbuka (hujan 14 hari Open-Meteo, PM2.5 CAMS lewat Open-Meteo, dan FWI GWIS) tidak memakai secret. Secret CDS tidak dipasang: angka FWI harian diambil dari WMS publik `ecmwf.query`, sedangkan dataset musiman CEMS di Early Warning Data Store membutuhkan akun dan bukan deret 9 hari itu. CHIRPS, laporan Smithsonian, dan VAAC Darwin hanya tautan.

`npm run preview` membuka `http://127.0.0.1:4173`. Setara dengan itu:

```bash
npx serve dist
python3 -m http.server 4173 --directory dist
```

Setelah `npm run build`, yang tersaji adalah salinan di `dist/` (termasuk `dist/config.json` dan `dist/data/`). Ubah config atau CSV, lalu bangun ulang sebelum preview atau unggah.

## Data contoh

Berkas di `data/sample/` adalah **data buatan** untuk pengujian pemuat dan penurunan angka. Setiap baris memuat kolom `keterangan` berisi `DATA CONTOH — bukan data operasional`. Dasbor tidak menampilkan berkas itu. Sumber resmi yang belum tersambung ditulis **Tautan saja** atau **Tidak tersedia**.

Hasilkan ulang berkas contoh:

```bash
npm run generate-sample
```

## Meletakkan data di Google Sheets

Satu spreadsheet boleh berisi beberapa lembar, atau satu berkas per dataset. Baris pertama wajib header. Nama kolom yang dikenali ada di bagian [Kolom CSV](#kolom-csv). Angka memakai titik desimal (`12.5`) tanpa pemisah ribuan.

Agar situs statis bisa mengambil CSV dari peramban pengunjung:

1. Isi lembar, lalu **File → Bagikan → Publikasikan ke web**.
2. Pilih lembar yang benar dan format **Nilai yang dipisahkan koma (.csv)**.
3. Terbitkan, lalu salin tautannya. Bentuk yang umum:

   `https://docs.google.com/spreadsheets/d/e/2PACX-....../pub?gid=0&single=true&output=csv`

4. Tempel tautan itu ke `csvUrl` dataset yang sesuai.

Alternatif yang sering dipakai, selama berkas benar-benar terbuka tanpa login:

`https://docs.google.com/spreadsheets/d/ID_SPREADSHEET/gviz/tq?tqx=out:csv&gid=0`

`gid` adalah identitas lembar (angka di URL saat lembar itu dibuka). Mengatur akses menjadi "siapa saja yang punya tautan" **belum tentu cukup**: Google kadang mengalihkan permintaan peramban ke halaman masuk, dan dasbor lalu menampilkan galat, bukan tabel. Gunakan **Publikasikan ke web**.

Uji tautan dengan membukanya di jendela penyamaran. Yang harus tampil adalah teks CSV, bukan halaman Google.

## Mengubah konfigurasi

Satu berkas: [`public/config.json`](public/config.json). Dasbor membacanya saat halaman dibuka, jadi jalur dan catatan sumber tidak ditanam ke dalam kode komponen.

Setiap objek di `datasets` punya:

| Kolom | Isi |
| --- | --- |
| `id` | `hotspot`, `sipongi`, `irbi`, `bmkg`, atau `ispu`. Id lain tetap tampil di metadata, tetapi tidak masuk peta atau grafik. |
| `nama` | Nama yang tampil di panel metadata. |
| `instansi` | Instansi sumber. |
| `csvUrl` | Tautan CSV (`https://...`) atau jalur relatif seperti `data/sample/hotspot.csv`. Jangan awali dengan `/` supaya tetap benar di GitHub Pages proyek. |
| `frekuensi` | Seberapa sering sumber diperbarui, sebagai teks. |
| `lisensi` | Catatan izin pakai atau peringatan. |
| `terakhirDiperbarui` | Tanggal `YYYY-MM-DD` yang Anda catat sendiri. Dasbor tidak bisa mengetahui tanggal ubah berkas Drive. |
| `contoh` | `true` untuk data contoh. Set `false` setelah tautan operasional terpasang. |

`provinsiPrioritas` tetap menjadi konteks prakiraan dan kesiapsiagaan (enam provinsi). Tombol filter cakupan mengikuti peringkat hotspot pada periode aktif, plus pilihan Seluruh Indonesia dan daftar Semua provinsi. Dasbor tidak menghitung status provinsi.

Setelah mengedit config untuk situs yang sudah dibangun, jalankan `npm run build` lagi (atau biarkan GitHub Actions yang membangun saat berkas masuk ke `main`).

## MAP_KEY NASA FIRMS

Titik panas bisa diambil langsung dari API area FIRMS bila `firms.mapKey` diisi.

1. Minta kunci gratis di <https://firms.modaps.eosdis.nasa.gov/api/map_key/>.
2. Isi `firms.mapKey` hanya untuk percobaan lokal. Situs publik membiarkannya kosong dan memakai cuplikan `data/live`.
3. `firms.sumber` bawaan `VIIRS_SNPP_NRT`. Nilai lain yang diterima FIRMS antara lain `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, dan `MODIS_NRT`.
4. `firms.area` adalah `barat,selatan,timur,utara`. Bawaan `95,-11,141,6` menutup wilayah Indonesia secara kasar.
5. `firms.rentangHari` adalah jendela hari yang diminta ke API (maksimum sesuai ketentuan FIRMS, biasanya 5 hari untuk beberapa sumber NRT; kurangi jika API menolak).

**Kunci di situs statis bisa dibaca siapa saja** yang membuka `config.json`. Anggap kunci itu publik. Jangan memakai kunci yang juga dipakai sistem internal lain. Kuota FIRMS (sekitar 5.000 transaksi per 10 menit) terpakai bersama oleh setiap pengunjung dasbor. Panel metadata menyembunyikan kunci di tautan yang ditampilkan, tetapi berkas config tetap utuh.

CSV FIRMS tidak memuat nama provinsi. Dasbor tidak menebak provinsi dari kotak koordinat. Baris tanpa nama wilayah menjadi **Belum terpetakan**. Kotak di `src/lib/geo.js` bukan batas administrasi.

Kunci pada `config.json` tidak dipakai untuk situs publik. Pengambilan FIRMS yang sah berjalan di Actions dengan secret `FIRMS_MAP_KEY`, lalu menulis CSV tanpa kunci. Jika secret kosong atau permintaan gagal, cuplikan terakhir dipertahankan. Dasbor tidak menampilkan CSV contoh hotspot.

Prakiraan BMKG yang tersambung berhorizon **3 hari** untuk satu kelurahan ibu kota tiap provinsi prioritas. Atribusi: **Sumber: BMKG**. Citra SPARTAN, dasarian, asap, dan potensi cuaca ekstrem hanya ditautkan. Izin integrasi yang lebih luas diurus lewat <https://ptsp.bmkg.go.id/>.

## Jumlah deteksi

Untuk tiap provinsi, pada rentang tanggal yang dipilih, tabel **Jumlah deteksi hotspot (bukan status)** menghitung titik yang wilayahnya terverifikasi. Titik dengan pencarian wilayah gagal tidak masuk hitungan itu. FDRS resmi menunggu data resmi BMKG. Nilai GWIS, bila ada, tetap berlabel pembanding dan tidak disebut FDRS.

Kepercayaan tinggi = teks `high` / `tinggi` / `h`, atau angka ≥ 80 (kebiasaan MODIS). `nominal` dan `low` mengikuti teks VIIRS; angka 30–79 dianggap nominal. Warna itu keyakinan deteksi, bukan intensitas atau bahaya.

Data disebut tertunda bila lintasan satelit terakhir lebih lama dari sekitar 8 jam, atau bila waktu sekarang melewati `next_run` lebih dari 1 jam. `next_run` yang sudah lewat disembunyikan. Cuplikan hotspot dilabeli **VIIRS S-NPP NRT (snapshot ±3 jam)** bila yang tampil adalah berkas cuplikan.

Kualitas Udara (ISPU) ada di dalam Karhutla, bukan sebagai modul utama. Tiga jenis data dipisah: (1) ISPU stasiun KLH, saat ini **Data stasiun belum terintegrasi ke dashboard**, dengan tautan ke portal KLH; (2) model CAMS lewat Open-Meteo sebagai pembanding dalam µg/m³, hanya tabel, bukan ISPU dan bukan pengamatan; (3) tanggal sesudah hari ini pada berkas model, bila ada, adalah prakiraan model, bukan prediksi ISPU. OpenAQ tidak dihubungkan karena membutuhkan kunci. Periode tampilan yang ada hanya Hari Ini dan Historis. Kategori resmi, bila data stasiun nanti ada: 0–50 Baik, 51–100 Sedang, 101–200 Tidak Sehat, 201–300 Sangat Tidak Sehat, di atas 300 Berbahaya.

## Kolom CSV

Header bahasa Indonesia pada berkas contoh, atau header FIRMS bahasa Inggris untuk titik panas.

**hotspot** — wajib `tanggal` atau `acq_date`, `lintang` atau `latitude`, `bujur` atau `longitude`. Opsional: `waktu`/`acq_time`, `provinsi`, `kabupaten`, `satelit`/`satellite`, `kepercayaan`/`confidence`, `frp`, `kecerahan`/`brightness`/`bright_ti4`, `keterangan`.

**sipongi** — `tanggal`, `provinsi`, `jumlah_hotspot`, `luas_terbakar_ha`.

**irbi** — `provinsi`, `kabupaten`, `indeks_risiko`, `kelas_risiko`. Opsional: `tahun`, `skor_bahaya`, `skor_kerentanan`, `skor_kapasitas`. Tidak difilter tanggal.

**bmkg** — `tanggal`, `provinsi`, `fwi`. Opsional: `curah_hujan_mm`, `suhu_c`, `kelembapan_pct`, `kec_angin_ms`, `kelas_fdrs`.

**ispu** — `tanggal`, `provinsi`, `ispu`. Opsional: `kota`, `kategori`, `parameter_dominan`, `pm25`. Kategori dihitung ulang dari angka ISPU.

## GitHub Pages

Repositori ini publik. **Settings → Pages → Source** sudah **GitHub Actions**. Workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) berjalan pada push ke `main` dan lewat **workflow_dispatch**. Job itu memakai `actions/configure-pages`, `actions/upload-pages-artifact`, dan `actions/deploy-pages`.

Situs yang terbit dari `main`:

<https://pantau-bencana.github.io/karhutla-dashboard/>

`configure-pages` memberi `base_path` (untuk repositori ini `/karhutla-dashboard`). Build Actions memakai prefiks itu untuk CSS dan JS. `config.json` serta CSV contoh tetap jalur relatif (`data/sample/...`, tanpa garis miring di depan) supaya ikut terbaca di subfolder itu. Pembangunan lokal tanpa variabel itu memakai jalur relatif yang sama-sama benar.

Tidak ada rahasia di repositori. `firms.mapKey` di `public/config.json` kosong. Jangan mengisi kunci sungguhan lalu meng-commit: berkas itu ikut terbit dan bisa dibaca siapa saja. `npm run check` gagal jika kunci itu tidak kosong.

Pull request hanya membangun dan memeriksa hasilnya. Deploy tidak berjalan sebelum perubahan ada di `main`.

## Keterbatasan

- Situs statis hanya bisa membaca CSV yang **publik**. Spreadsheet pribadi, tautan yang minta login, atau berkas Drive yang tidak dipublikasikan akan gagal. Dasbor menampilkan galat sumber itu dan tetap menggambar bagian yang berhasil dimuat.
- Respons HTML (halaman login Google) ditolak dan dijelaskan, bukan dipaksa menjadi tabel.
- `MAP_KEY` FIRMS di `config.json` terlihat oleh pengunjung. CORS pada API FIRMS bisa saja memblokir permintaan dari peramban. Situs publik tidak memakai berkas contoh sebagai pengganti.
- Jendela `firms.rentangHari` tidak sama dengan filter tanggal di layar. Memilih tanggal di luar data yang kembali membuat peta kosong.
- Nama wilayah hotspot diisi dari kueri BIG saat pembaruan. Geometri desa dari kueri itu tidak disimpan. Peta banjir memakai salinan TopoJSON kabupaten/kota di `data/static/batas-kabkota.topojson`. Berkas itu tidak dihapus dari repositori ini.
- Pesan kosong yang dipakai di halaman: **tersedia**, **sebagian**, **belum terintegrasi**, **kedaluwarsa**, **gagal dimuat**, **belum cukup data**, **data terakhir/kedaluwarsa**, dan **Data stasiun belum terintegrasi ke dashboard**. Satu kategori gagal tidak menulis semua kategori sebagai gagal. Angka contoh tidak ditampilkan. IRBI 2025 adalah tabel buku, penggunaan internal, bukan prakiraan.
- Cuplikan diperbarui dua kali tiap sekitar 3 jam (`17 */3 * * *` dan `47 1-23/3 * * *` UTC). Penjaga jam menit ke-7 memicu pembaruan bila cuplikan lebih tua dari 4 jam. Horizon prakiraan BMKG yang tersambung 3 hari. FWI model pada daftar prioritas sekitar 9 hari, bukan 14 hari dan bukan produk BMKG. Citra SPARTAN hanya tautan, hingga H+7 sesuai produk BMKG.
- Peta dasar memakai gaya vektor OpenFreeMap `https://tiles.openfreemap.org/styles/liberty` (tanpa kunci API) lewat Leaflet dan MapLibre. Atribusi: OpenFreeMap © OpenMapTiles, data dari © OpenStreetMap contributors (ODbL). URL dan atribusi ada di konstanta `BASEMAP` pada `src/lib/basemap.js`. Ketentuan layanan: [OpenFreeMap](https://openfreemap.org/tos/). Ubin `tile.openstreetmap.org` tidak dipakai. Lapisan peta sedikit diturunkan saturasinya supaya warna titik tetap terbaca. Zoom keluar dibatasi pada bingkai Indonesia; tombol "Tampilkan seluruh Indonesia" mengembalikan tampilan nasional. Modul Gunung Api tidak punya peta dasar.
- Tidak ada login, jejak audit, atau penyimpanan di server.

## Berkas penting

| Berkas | Peran |
| --- | --- |
| `public/config.json` | Daftar sumber, ambang, dan kunci FIRMS |
| `data/sample/*.csv` | Data contoh |
| `src/` | Antarmuka React, peta Leaflet, grafik Recharts |
| `scripts/generate-sample.mjs` | Menyusun ulang CSV contoh |
| `scripts/self-check.mjs` | Pemeriksaan parser, status, dan data contoh |
| `.github/workflows/pages.yml` | Build dan deploy Pages |
