# Laporan aplikasi v0.1

Diperiksa pada situs tayang https://rixaga.github.io/karhutla-dashboard/ tanggal 18 Oktober 2026, lalu diperbarui agar sesuai perbaikan aturan pada commit `4cf72fb`. Bundel inspeksi awal `index-Ccz34wMm.js` berasal dari commit `1d3b103`. Judul peramban sesudah perbaikan: **Prototipe Pemantauan Karhutla**.

## Maksud

Prototipe internal Dit. PD BNPB untuk melihat deteksi satelit karhutla dan status sumber lain tanpa menyajikannya sebagai peringatan resmi. Footer pada setiap halaman: **Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.**

## Halaman dan fitur

Navigasi modul: Karhutla, Banjir, Gunung Api.

Karhutla yang siap dibuka:

- **Ringkasan.** Kartu status sumber, matriks **Indikator untuk Wilayah Prioritas**, peta hotspot dengan lintasan satelit terakhir, tabel jumlah deteksi (bawaan kecamatan), panel prakiraan pembanding, slot wilayah perhatian yang masih kosong, slot 15–20 kabupaten/kota yang menunggu data resmi BMKG, dan di bagian bawah **Konteks risiko jangka panjang (IRBI 2025)** dengan urutan nama.
- **Peta dan Data.** Lapisan hotspot dengan peta, saringan, dan tabel wilayah yang sama. Memilih baris memusatkan peta. Di bawah peta ada tabel **Jumlah deteksi hotspot (bukan status)**. Tidak ada tabel status provinsi dan tidak ada FWI contoh. Grafik dan rekap SiPongi bila ada tetap di situ. Tabel IRBI berada di bawah, terpisah dari hitungan hotspot. Lapisan **Kualitas Udara (ISPU)** ada di halaman ini. FDRS pada lapisan itu menulis menunggu data resmi BMKG.
- **Logika Pemantauan.** Penjelasan alur dan matriks indikator dalam bentuk yang lebih panjang.
- **Sumber Data.** Daftar sumber, status, dan tautan.
- **Glosarium.** Istilah yang dipakai dasbor.

Banjir dan Gunung Api menampilkan **Belum terhubung / menunggu data**. Keduanya tidak memuat peta atau angka.

## Sumber data

Terhubung sebagai cuplikan di `data/live` pada manifest 17 Oktober 2026 pukul 22.58 UTC:

- Hotspot NASA FIRMS, 32.685 baris, status ok. Kunci FIRMS tercatat terpakai pada manifest (`firms_key: used`).
- Prakiraan cuaca BMKG dan angin dari sumber yang sama, masing-masing 102 baris.
- Cuaca pembanding, hujan 14 hari pembanding, FWI GWIS pembanding, dan CAP BMKG.
- IRBI 2025 karhutla, 467 baris, data statis dari buku.
- DIBI karhutla, 15 baris, data statis.
- Titik wakil, 81 baris, data statis.
- PM2.5 model CAMS lewat Open-Meteo, 72 baris. Berkas ini tidak ditampilkan sebagai ISPU dan tidak diubah menjadi kategori ISPU.

Hanya tautan, status gagal diintegrasikan pada manifest:

- ISPU resmi Kementerian Lingkungan Hidup.
- SiPongi.
- FDRS BMKG.
- Peluang hujan.
- inaRISK.
- Arsip citra asap. Manifest menulis bahwa arsip citra dimatikan menunggu izin tertulis BMKG, dan citra tidak diunduh.

## Hari Ini, Prediksi, dan Historis

| Modul | Hari Ini | Prediksi | Historis |
| --- | --- | --- | --- |
| Karhutla hotspot | Jendela 24 jam, 48 jam, dan 7 hari pada cuplikan FIRMS paling baru | Tidak ada | Tidak ada arsip selain cuplikan sampai 5 hari |
| Kualitas Udara (ISPU) | Ada, tanpa angka stasiun resmi | Tidak ada | Ada sebagai tombol, tanpa riwayat stasiun resmi |
| Banjir | Tidak ada | Tidak ada | Tidak ada |
| Gunung Api | Tidak ada | Tidak ada | Tidak ada |

## Jadwal pembaruan

Workflow **Perbarui data** memakai dua cron UTC, selisih 90 menit: `17 */3 * * *` dan `47 1-23/3 * * *`. Dalam WIB itu jatuh pada 07.17, 08.47, 10.17, 11.47, 13.17, 14.47, 16.17, 17.47, 19.17, 20.47, 22.17, 23.47, 01.17, 02.47, 04.17, dan 05.47. Workflow **Jaga jadwal data** berjalan tiap jam pada menit 7. Bila manifes lebih tua dari 4 jam dan tidak ada run pembaruan yang aktif, ia mengirim `workflow_dispatch`. Halaman menampilkan **Lintasan satelit terakhir** dalam WIB. Data ditandai **tertunda** bila lintasan terakhir lebih lama dari sekitar 8 jam, atau bila waktu sekarang melewati `next_run` lebih dari 1 jam. `next_run` yang sudah lewat disembunyikan. Cuplikan hotspot dilabeli **VIIRS S-NPP NRT (snapshot ±3 jam)**. Commit data oleh `github-actions[bot]` tidak memicu workflow Pages; deploy dilakukan di dalam workflow pembaruan yang sama.

Pada 18 Oktober 2026, cron menit 0 hanya membuat satu run `schedule` (04.02 UTC, terlambat dari slot 03.00 UTC) dengan actor `rixaga`. Setelah cron diubah menjadi menit 17 pada 04.23 UTC, slot 06.17 UTC dan 09.17 UTC tidak membuat run sama sekali. Workflow tetap `active`, repositori bukan fork, dan grup concurrency `pages` sedang kosong pada kedua slot itu. GitHub dapat menggugurkan jadwal tanpa menyisakan run. Langkah commit tetap mengambil `origin` lalu `git pull --rebase` sebelum push. Log workflow mencantumkan `wilayah_gagal` dan `big_queries`.

## Skill di repositori

Berkas di `.grok/skills/` mengatur bagian berikut:

- `karhutla-data-engineer`: pengambilan cuplikan, manifest, dan jadwal.
- `geospatial-gis` dan `indonesia-geodata`: peta, koordinat, dan wilayah.
- `data-source-validator`: status sumber dan larangan mengarang angka.
- `fire-risk-analyst`: batas tafsir hotspot, FWI, dan IRBI.
- `dashboard-ui-ux`: tata letak dan bahasa antarmuka.
- `dashboard-qa`: pemeriksaan sebelum bangun.
- `github-pages-deployer`: unggah situs hanya dari `main`.

## Batas

- Titik panas adalah deteksi satelit, bukan kebakaran yang sudah dikonfirmasi di lapangan.
- Penyaringan wilayah memakai layanan BIG saat pembaruan. Geometri batas tidak disimpan di repositori. Layer desa edisi Mei 2021 tidak memuat seluruh desa, jadi banyak titik hanya punya kecamatan, kabupaten/kota, dan provinsi.
- Bila BIG tidak tersedia pada satu pembaruan, titik FIRMS tetap ada dan halaman menulis bahwa penyaringan wilayah serta batas Indonesia pada pembaruan itu tidak lengkap.
- ISPU resmi belum terisi. OpenAQ tanpa kunci tidak menampilkan µg/m³.
- FWI BMKG hanya tautan, sampai H+7 sesuai produk, bukan 14 hari. Panel hujan 14 hari Open-Meteo, bila ada, adalah pembanding model, bukan prakiraan BMKG. Header kartu pembanding memuat **Pembanding, bukan produk BMKG/KLHK**. Nilai GWIS tidak disebut FDRS.
- Bila cuplikan hotspot gagal, dasbor tidak memakai `data/sample/hotspot.csv`. Yang tampil cuplikan terakhir beserta usianya, atau keadaan kosong dengan pita galat.
- Titik yang pencarian BIG-nya gagal tetap di peta, tetapi tidak masuk hitungan provinsi atau kabupaten. Halaman menulis berapa titik yang belum terverifikasi.
- Daftar 15–20 kabupaten/kota tidak disusun dari IRBI, citra, atau prakiraan terbuka.

## Langkah berikutnya

- Ajukan izin data terstruktur FDRS/FWI dan potensi karhutla per kabupaten/kota ke BMKG melalui PTSP.
- Ajukan data tingkat aktivitas dan wilayah terdampak ke PVMBG / Badan Geologi melalui PPID ESDM.
- Sambungkan ISPU stasiun hanya bila ada kanal resmi. Jangan memakai token yang tertanam di aplikasi web.
- Isi Banjir dan Gunung Api setelah sumber resminya benar-benar bisa diambil.
- Biarkan slot 15–20 kabupaten/kota kosong sampai data resmi BMKG itu ada.
