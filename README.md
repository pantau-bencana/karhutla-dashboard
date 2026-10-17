# Dashboard Peringatan Dini Karhutla Nasional

Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.

Dasbor statis untuk memantau kebakaran hutan dan lahan (karhutla): sebaran titik panas, status peringatan per provinsi, tren ISPU, rekap SiPongi, indeks IRBI, dan cuaca/FDRS. Antarmuka berbahasa Indonesia. Tidak ada server aplikasi. Peramban mengambil CSV langsung dari berkas contoh atau dari tautan yang Anda isi.

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

`provinsiPrioritas` mengisi tombol filter (enam provinsi ditambah pilihan Seluruh Indonesia). `peringatan.hotspot` dan `peringatan.fwi` adalah ambang status.

Setelah mengedit config untuk situs yang sudah dibangun, jalankan `npm run build` lagi (atau biarkan GitHub Actions yang membangun saat berkas masuk ke `main`).

## MAP_KEY NASA FIRMS

Titik panas bisa diambil langsung dari API area FIRMS bila `firms.mapKey` diisi.

1. Minta kunci gratis di <https://firms.modaps.eosdis.nasa.gov/api/map_key/>.
2. Isi `firms.mapKey`. Kosongkan (`""`) untuk memakai `csvUrl` dataset `hotspot`.
3. `firms.sumber` bawaan `VIIRS_SNPP_NRT`. Nilai lain yang diterima FIRMS antara lain `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, dan `MODIS_NRT`.
4. `firms.area` adalah `barat,selatan,timur,utara`. Bawaan `95,-11,141,6` menutup wilayah Indonesia secara kasar.
5. `firms.rentangHari` adalah jendela hari yang diminta ke API (maksimum sesuai ketentuan FIRMS, biasanya 5 hari untuk beberapa sumber NRT; kurangi jika API menolak).

**Kunci di situs statis bisa dibaca siapa saja** yang membuka `config.json`. Anggap kunci itu publik. Jangan memakai kunci yang juga dipakai sistem internal lain. Kuota FIRMS (sekitar 5.000 transaksi per 10 menit) terpakai bersama oleh setiap pengunjung dasbor. Panel metadata menyembunyikan kunci di tautan yang ditampilkan, tetapi berkas config tetap utuh.

CSV FIRMS tidak memuat nama provinsi. Prototipe menebak provinsi dari kotak batas kasar di `src/lib/geo.js`. Itu bukan batas administrasi resmi; titik di dekat perbatasan bisa salah provinsi. Untuk data operasional yang lebih rapi, unduh CSV FIRMS, tambahkan kolom `provinsi`, unggah ke Sheets, dan biarkan `mapKey` kosong.

Jika kunci kosong, permintaan gagal, atau peramban menolak karena CORS, dasbor memakai `csvUrl` hotspot dan menjelaskan kegagalan itu di pita peringatan serta di metadata.

## Cara status dihitung

Untuk tiap provinsi, pada rentang tanggal yang dipilih:

- level titik panas dari **jumlah titik** dibanding `peringatan.hotspot`
- level FDRS dari **FWI tertinggi** dibanding `peringatan.fwi`
- status provinsi = level yang lebih tinggi di antara keduanya

Label: Normal, Waspada, Siaga, Awas. Ambang bawaan (ilustratif, untuk jendela sekitar 7 hari):

| | Waspada | Siaga | Awas |
| --- | --- | --- | --- |
| Jumlah titik panas | ≥ 8 | ≥ 20 | ≥ 45 |
| FWI maksimum | ≥ 6 | ≥ 13 | ≥ 21 |

Kelas FDRS pada berkas contoh (`Rendah` sampai `Ekstrem`) diselaraskan dengan ambang ini, bukan tabel resmi BMKG. Kartu "Provinsi waspada+" menghitung provinsi yang bukan Normal. Subjudulnya memisahkan yang sudah Siaga atau Awas.

Kepercayaan tinggi = teks `high` / `tinggi` / `h`, atau angka ≥ 80 (kebiasaan MODIS). `nominal` dan `low` mengikuti teks VIIRS; angka 30–79 dianggap nominal.

ISPU terkini = nilai **tertinggi pada tanggal terakhir** yang ada datanya di cakupan filter. Kategori ISPU memakai rentang yang umum dipakai: 0–50 Baik, 51–100 Sedang, 101–200 Tidak Sehat, 201–300 Sangat Tidak Sehat, di atas 300 Berbahaya.

## Kolom CSV

Header bahasa Indonesia pada berkas contoh, atau header FIRMS bahasa Inggris untuk titik panas.

**hotspot** — wajib `tanggal` atau `acq_date`, `lintang` atau `latitude`, `bujur` atau `longitude`. Opsional: `waktu`/`acq_time`, `provinsi`, `kabupaten`, `satelit`/`satellite`, `kepercayaan`/`confidence`, `frp`, `kecerahan`/`brightness`/`bright_ti4`, `keterangan`.

**sipongi** — `tanggal`, `provinsi`, `jumlah_hotspot`, `luas_terbakar_ha`.

**irbi** — `provinsi`, `kabupaten`, `indeks_risiko`, `kelas_risiko`. Opsional: `tahun`, `skor_bahaya`, `skor_kerentanan`, `skor_kapasitas`. Tidak difilter tanggal.

**bmkg** — `tanggal`, `provinsi`, `fwi`. Opsional: `curah_hujan_mm`, `suhu_c`, `kelembapan_pct`, `kec_angin_ms`, `kelas_fdrs`.

**ispu** — `tanggal`, `provinsi`, `ispu`. Opsional: `kota`, `kategori`, `parameter_dominan`, `pm25`. Kategori dihitung ulang dari angka ISPU.

## GitHub Pages

Workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) memasang dependensi, menjalankan `npm run check`, membangun `dist`, lalu — hanya untuk push ke `main` — mengunggah artefak Pages. Workflow ini **tidak** mengaktifkan Pages dan **tidak** mengubah visibilitas repositori.

Untuk menyalakannya (lakukan sendiri, setelah ada persetujuan publikasi):

1. Di repositori GitHub: **Settings → Pages**.
2. **Build and deployment → Source**: pilih **GitHub Actions**.
3. Gabungkan perubahan ke `main`, atau jalankan workflow **Deploy GitHub Pages** secara manual.
4. Alamat proyek biasanya `https://<pemilik>.github.io/karhutla-dashboard/`.

`vite.config.js` memakai `base: './'` supaya jalur CSS, JS, config, dan CSV relatif. Itu cocok untuk Pages proyek (bukan hanya situs di akar domain).

Repositori **privat**: GitHub Pages untuk repo privat memerlukan paket berbayar (GitHub Pro, Team, atau Enterprise). Repo publik bisa memakai Pages gratis, tetapi prototipe ini tidak boleh dijadikan publik tanpa persetujuan. `noindex` di HTML hanya isyarat untuk perayap, bukan pengunci akses.

## Keterbatasan

- Situs statis hanya bisa membaca CSV yang **publik**. Spreadsheet pribadi, tautan yang minta login, atau berkas Drive yang tidak dipublikasikan akan gagal. Dasbor menampilkan galat sumber itu dan tetap menggambar bagian yang berhasil dimuat.
- Respons HTML (halaman login Google) ditolak dan dijelaskan, bukan dipaksa menjadi tabel.
- `MAP_KEY` FIRMS di `config.json` terlihat oleh pengunjung. CORS pada API FIRMS bisa saja memblokir permintaan dari peramban; kalau begitu CSV cadangan yang dipakai.
- Jendela `firms.rentangHari` tidak sama dengan filter tanggal di layar. Memilih tanggal di luar data yang kembali membuat peta kosong.
- Tebakan provinsi untuk CSV FIRMS memakai kotak kasar, bukan shapefile resmi.
- Ambang peringatan, kelas FDRS contoh, dan angka IRBI/SiPongi/ISPU/cuaca contoh bersifat ilustratif.
- Peta dasar OpenStreetMap butuh internet dan tunduk pada [kebijakan petak OSM](https://operations.osmfoundation.org/policies/tiles/). Pemakaian operasional yang ramai sebaiknya memakai server petak sendiri.
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
