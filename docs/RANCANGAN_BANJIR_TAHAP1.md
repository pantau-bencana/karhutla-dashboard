# Banjir nasional tahap 1

Halaman yang diperluas: `src/components/FloodPage.jsx`. Bukan halaman baru.

Keputusan yang dipakai (menggantikan draf yang masih menyebut IRBI 2024, warna dua keadaan, dan jadwal 3 jam untuk CAP):

1. Peta provinsi nasional. Klik provinsi, atau pilih dari daftar yang memuat setiap provinsi plus **Semua provinsi**, membuka peta kab/kota dan tabel.
2. CAP nowcast BMKG dari RSS resmi, tanpa kunci. `scripts/cap-kab.mjs` tidak lagi menyaring Aceh/Bengkulu. Ada keluaran `data/live/bmkg-cap-prov.csv`. Workflow `.github/workflows/refresh-cap.yml` berjalan pada menit 12 dan 42 UTC. Jeda antar permintaan BMKG 1,1 detik.
3. Istilah `severity` dan `event` CAP ditampilkan apa adanya. Warna Awas / Siaga / Waspada hanya dari **Analisis Pantau Bencana (gabungan BMKG × IRBI BNPB)** di `src/lib/analisisPantauBencana.js`. Tanpa peringatan yang masih berlaku, wilayah tidak diwarnai. Bukan status resmi.
4. IRBI 2025 memakai tabel buku yang sudah ada (Aceh dan Bengkulu). Provinsi lain kosong. Angka tidak dikarang.
5. Kejadian BNPB 2024 dibaca dari `data/bnpb/banjir-2024.csv` bila ada. Sebelum berkas itu ada, keadaan kosong dan tautan resource `a4daec53-1119-43ef-b05e-00ec3a4c42a4`.
6. Overlay inaRISK punya tombol nyala/mati dan mati secara bawaan.
7. Kolom dasarian tetap manual, dengan tanggal acuan dan tautan https://iklim.bmkg.go.id/.
8. Banner **Prototipe internal – menunggu izin tertulis BNPB** tetap. Waktu ditampilkan dalam WIB.

## Prakiraan 3 hari

Label periode dihitung dari hari ini zona WIB, misalnya `Periode: 20–22 Oktober 2026 (WIB)` bila dibuka pada 20 Oktober. CAP tidak dipakai sebagai status 3 hari.

Angka 3 hari datang dari API `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=`. Yang tersambung saat ini adalah enam kelurahan yang kodenya sudah dicek (ibu kota provinsi prioritas karhutla). Tiap titik disebut sampel, bukan rata-rata kabupaten. Hujan lebat dan hujan petir dibaca dari `weather_desc`, per hari `local_datetime`.

Mengambil satu adm4 untuk setiap kabupaten/kota berarti sekitar 500 permintaan. Batas BMKG 60 permintaan per menit, jadi satu putaran memakan waktu sekitar sepuluh menit dan tidak dimasukkan ke workflow 30 menit. Kode yang belum dicek ke API tidak ditebak: percobaan `14.71.01.1001` pernah mengembalikan 404. Layer desa BIG yang ada di layanan ini hanya 1.419 wilayah dan bukan daftar ibu kota.

## Penduduk dan rumah tangga

Hanya total satu kabupaten/kota, dan hanya pada baris yang punya status analisis. Labelnya `total kab/kota, bukan jumlah terpapar`. Berkas `data/static/penduduk-kabkota.csv` hanya header sampai ada salinan manual dari tabel BPS. Tidak ada WorldPop atau GHSL. Dropdown DAS berstatus **Dalam pengembangan** dan tidak memuat data DAS.

## Sumber

- CAP: https://data.bmkg.go.id/peringatan-dini-cuaca/ dan https://www.bmkg.go.id/alerts/nowcast/id
- Prakiraan: https://data.bmkg.go.id/prakiraan-cuaca/
- BNPB 2024: https://data.bnpb.go.id/dataset/data-bencana-indonesia/resource/a4daec53-1119-43ef-b05e-00ec3a4c42a4
- Iklim: https://iklim.bmkg.go.id/
- Batas: layanan BIG yang sudah dipakai dasbor, diminta saat peta dibuka
