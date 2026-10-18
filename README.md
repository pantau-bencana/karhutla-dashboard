# Dashboard Peringatan Dini Karhutla Nasional

Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.

Dasbor statis untuk memantau kebakaran hutan dan lahan (karhutla): sebaran titik panas, jumlah deteksi per provinsi, lapisan Kualitas Udara (ISPU), rekap SiPongi, dan indeks IRBI. Antarmuka berbahasa Indonesia. Tidak ada server aplikasi. Situs publik membaca cuplikan di `data/live`. Berkas contoh hotspot tidak ditampilkan bila cuplikan gagal.

Angka dan status pada prototipe ini **bukan** peringatan dini resmi BNPB, BMKG, atau instansi sumber.

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

Header memuat tab bahaya **Karhutla**, **Banjir**, dan **Gunung Api**, lalu halaman **Ringkasan**, **Peta dan Data**, **Logika Pemantauan**, **Sumber Data**, dan **Glosarium**. Karhutla yang diisi. Banjir memuat prototipe internal peta risiko dan matriks Aceh/Bengkulu dengan label **Prototipe internal – menunggu izin tertulis BNPB**. Gunung Api menampilkan status **Belum terhubung / menunggu data** tanpa angka buatan. Rute memakai hash (`#/`, `#/karhutla/peta`, `#/logika`, `#/glosarium/ispu`) supaya tetap benar di subfolder GitHub Pages.

GitHub Actions mengambil sumber publik lewat [`.github/workflows/refresh-data.yml`](.github/workflows/refresh-data.yml). Dua cron UTC, selisih 90 menit: `17 */3 * * *` dan `47 1-23/3 * * *` (bukan menit 0). Dalam WIB itu 07.17, 08.47, 10.17, 11.47, 13.17, 14.47, 16.17, 17.47, 19.17, 20.47, 22.17, 23.47, 01.17, 02.47, 04.17, dan 05.47. Workflow [`.github/workflows/refresh-watchdog.yml`](.github/workflows/refresh-watchdog.yml) berjalan tiap jam pada menit 7 dan memicu pembaruan bila cuplikan lebih tua dari 4 jam. Commit data oleh `github-actions[bot]` tidak memicu workflow Pages lain; deploy cuplikan dilakukan di dalam workflow pembaruan yang sama. Hasilnya disimpan di `data/live/` bersama manifes. Situs membaca snapshot itu lebih dulu, lalu berkas contoh bila snapshot tidak ada. Header menampilkan waktu ambil dan jadwal berikutnya dalam WIB.

Alur: sumber → pengambilan terjadwal → snapshot → dasbor → status peringatan dini (prototipe, bukan peringatan resmi).

Secret FIRMS, bila dipakai, hanya di **Settings → Secrets and variables → Actions** dengan nama `FIRMS_MAP_KEY`. Daftarkan kunci sendiri di <https://firms.modaps.eosdis.nasa.gov/api/map_key/>. Jangan menempelkan kunci di obrolan, berkas, atau commit. Tanpa secret, build tetap jalan dan hotspot berstatus **Belum terhubung** dengan data contoh.

Pembanding terbuka (hujan 14 hari Open-Meteo, PM2.5 CAMS lewat Open-Meteo, dan FWI GWIS) tidak memakai secret. Secret CDS tidak dipasang: angka FWI harian diambil dari WMS publik `ecmwf.query`, sedangkan dataset musiman CEMS di Early Warning Data Store membutuhkan akun dan bukan deret 9 hari itu. CHIRPS, laporan Smithsonian, dan VAAC Darwin hanya tautan.

`npm run preview` membuka `http://127.0.0.1:4173`. Setara dengan itu:

```bash
npx serve dist
python3 -m http.server 4173 --directory dist
```

Setelah `npm run build`, yang tersaji adalah salinan di `dist/` (termasuk `dist/config.json` dan `dist/data/`). Ubah config atau CSV, lalu bangun ulang sebelum preview atau unggah.

## Data contoh

Berkas di `data/sample/` adalah **data buatan** agar dasbor bisa dibuka sebelum tautan Google Drive diisi. Setiap baris memuat kolom `keterangan` berisi `DATA CONTOH — bukan data operasional`. Koordinat hanya kira-kira di sekitar kabupaten yang disebut, bukan lokasi kebakaran sungguhan.

Selama `contoh` pada dataset masih `true`, pita kuning di bagian atas dasbor mengingatkan bahwa yang tampil bukan data operasional.

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

`provinsiPrioritas` mengisi tombol filter (enam provinsi ditambah pilihan Seluruh Indonesia). Dasbor tidak menghitung status provinsi.

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

Kualitas Udara (ISPU) ada di dalam Karhutla, bukan sebagai modul utama. Periode yang ada hanya Hari Ini dan Historis. ISPU resmi tidak punya API publik; tanpa stasiun yang tersambung, peta dan tabel menulis tidak tersedia serta menautkan portal KLH. Kategori resmi, bila data stasiun ada: 0–50 Baik, 51–100 Sedang, 101–200 Tidak Sehat, 201–300 Sangat Tidak Sehat, di atas 300 Berbahaya. Angka contoh dan konsentrasi model tidak ditampilkan sebagai ISPU.

## Kolom CSV

Header bahasa Indonesia pada berkas contoh, atau header FIRMS bahasa Inggris untuk titik panas.

**hotspot** — wajib `tanggal` atau `acq_date`, `lintang` atau `latitude`, `bujur` atau `longitude`. Opsional: `waktu`/`acq_time`, `provinsi`, `kabupaten`, `satelit`/`satellite`, `kepercayaan`/`confidence`, `frp`, `kecerahan`/`brightness`/`bright_ti4`, `keterangan`.

**sipongi** — `tanggal`, `provinsi`, `jumlah_hotspot`, `luas_terbakar_ha`.

**irbi** — `provinsi`, `kabupaten`, `indeks_risiko`, `kelas_risiko`. Opsional: `tahun`, `skor_bahaya`, `skor_kerentanan`, `skor_kapasitas`. Tidak difilter tanggal.

**bmkg** — `tanggal`, `provinsi`, `fwi`. Opsional: `curah_hujan_mm`, `suhu_c`, `kelembapan_pct`, `kec_angin_ms`, `kelas_fdrs`.

**ispu** — `tanggal`, `provinsi`, `ispu`. Opsional: `kota`, `kategori`, `parameter_dominan`, `pm25`. Kategori dihitung ulang dari angka ISPU.

## GitHub Pages

Repositori ini publik. **Settings → Pages → Source** sudah **GitHub Actions**. Workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) berjalan pada push ke `main` dan lewat **workflow_dispatch**. Job itu memakai `actions/configure-pages`, `actions/upload-pages-artifact`, dan `actions/deploy-pages`.

Setelah pull request ini digabung ke `main`, situs terbit di:

<https://rixaga.github.io/karhutla-dashboard/>

`configure-pages` memberi `base_path` (untuk repositori ini `/karhutla-dashboard`). Build Actions memakai prefiks itu untuk CSS dan JS. `config.json` serta CSV contoh tetap jalur relatif (`data/sample/...`, tanpa garis miring di depan) supaya ikut terbaca di subfolder itu. Pembangunan lokal tanpa variabel itu memakai jalur relatif yang sama-sama benar.

Tidak ada rahasia di repositori. `firms.mapKey` di `public/config.json` kosong. Jangan mengisi kunci sungguhan lalu meng-commit: berkas itu ikut terbit dan bisa dibaca siapa saja. `npm run check` gagal jika kunci itu tidak kosong.

Pull request hanya membangun dan memeriksa hasilnya. Deploy tidak berjalan sebelum perubahan ada di `main`.

## Keterbatasan

- Situs statis hanya bisa membaca CSV yang **publik**. Spreadsheet pribadi, tautan yang minta login, atau berkas Drive yang tidak dipublikasikan akan gagal. Dasbor menampilkan galat sumber itu dan tetap menggambar bagian yang berhasil dimuat.
- Respons HTML (halaman login Google) ditolak dan dijelaskan, bukan dipaksa menjadi tabel.
- `MAP_KEY` FIRMS di `config.json` terlihat oleh pengunjung. CORS pada API FIRMS bisa saja memblokir permintaan dari peramban. Situs publik tidak memakai berkas contoh sebagai pengganti.
- Jendela `firms.rentangHari` tidak sama dengan filter tanggal di layar. Memilih tanggal di luar data yang kembali membuat peta kosong.
- Nama wilayah hotspot diisi dari kueri BIG saat pembaruan. Geometri batas tidak disimpan di repositori.
- Angka IRBI/SiPongi/ISPU contoh bersifat ilustratif. IRBI 2025 yang resmi adalah konteks jangka panjang, urutan nama.
- Peta dasar OpenStreetMap butuh internet dan tunduk pada [kebijakan petak OSM](https://operations.osmfoundation.org/policies/tiles/). Pemakaian operasional yang ramai sebaiknya memakai server petak sendiri. Zoom keluar dibatasi pada bingkai Indonesia; tombol "Tampilkan seluruh Indonesia" mengembalikan tampilan nasional.
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
