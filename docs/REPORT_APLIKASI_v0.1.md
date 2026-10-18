# Laporan aplikasi v0.1

Diperiksa pada situs tayang https://rixaga.github.io/karhutla-dashboard/ tanggal 18 Oktober 2026. Bundel yang termuat `index-Ccz34wMm.js`, dari commit `1d3b103` di cabang `main`.

## Maksud

Prototipe internal Dit. PD BNPB untuk melihat deteksi satelit karhutla dan status sumber lain tanpa menyajikannya sebagai peringatan resmi. Footer pada setiap halaman: **Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.**

## Halaman dan fitur

Navigasi modul: Karhutla, Banjir, Gunung Api.

Karhutla yang siap dibuka:

- **Ringkasan.** Kartu status sumber, matriks **Indikator untuk Wilayah Prioritas**, peta hotspot, tabel jumlah deteksi per desa, panel prakiraan pembanding, slot wilayah perhatian yang masih kosong, slot 15–20 kabupaten/kota yang menunggu data resmi BMKG, dan konteks IRBI 2025.
- **Peta dan Data.** Lapisan hotspot dengan peta, saringan, dan tabel desa yang sama. Memilih baris memusatkan peta. Di bawahnya ada indikator provinsi, grafik, rekap SiPongi bila ada, dan tabel IRBI kabupaten. Lapisan **Kualitas Udara (ISPU)** ada di halaman ini.
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

Workflow **Perbarui data** memakai cron `0 */3 * * *` UTC. Dalam WIB itu jatuh pada 07.00, 10.00, 13.00, 16.00, 19.00, 22.00, 01.00, dan 04.00. Halaman juga menampilkan `next_run` dari manifest. Pada inspeksi, nilai itu masih 18 Oktober 2026 pukul 00.00 UTC, yaitu 07.00 WIB, meskipun jam itu sudah lewat.

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
- FWI BMKG hanya tautan, sampai H+7 sesuai produk, bukan 14 hari.
- Daftar 15–20 kabupaten/kota tidak disusun dari IRBI, citra, atau prakiraan terbuka.

## Langkah berikutnya

- Ajukan izin data terstruktur FDRS/FWI dan potensi karhutla per kabupaten/kota ke BMKG melalui PTSP.
- Ajukan data tingkat aktivitas dan wilayah terdampak ke PVMBG / Badan Geologi melalui PPID ESDM.
- Sambungkan ISPU stasiun hanya bila ada kanal resmi. Jangan memakai token yang tertanam di aplikasi web.
- Isi Banjir dan Gunung Api setelah sumber resminya benar-benar bisa diambil.
- Biarkan slot 15–20 kabupaten/kota kosong sampai data resmi BMKG itu ada.
