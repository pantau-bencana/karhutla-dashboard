# Banjir nasional tahap 1

Halaman yang diperluas: `src/components/FloodPage.jsx`. Bukan halaman baru.

Keputusan yang dipakai (menggantikan draf yang masih menyebut IRBI 2024, warna dua keadaan, dan jadwal 3 jam untuk CAP):

1. Peta provinsi nasional. Klik provinsi, atau pilih dari daftar yang memuat setiap provinsi plus **Semua provinsi**, membuka peta kab/kota dan tabel.
2. CAP nowcast BMKG dari RSS resmi, tanpa kunci. `scripts/cap-kab.mjs` tidak lagi menyaring Aceh/Bengkulu. Ada keluaran `data/live/bmkg-cap-prov.csv`. Workflow `.github/workflows/refresh-cap.yml` berjalan pada menit 12 dan 42 UTC. Jeda antar permintaan BMKG 1,1 detik.
3. Istilah `severity` dan `event` CAP ditampilkan apa adanya. Warna Awas / Siaga / Waspada hanya dari **Analisis Pantau Bencana (gabungan BMKG × IRBI BNPB)** di `src/lib/analisisPantauBencana.js`. Tanpa peringatan yang masih berlaku, wilayah tidak diwarnai. Bukan status resmi.
4. IRBI 2025 banjir memakai 510 kabupaten/kota dari Buku IRBI 2025, halaman 212–227. Empat kabupaten/kota tanpa kelas banjir dikosongkan. Skor tidak dikarang. Tabel banjir bandang dan skor IRB total tidak dipakai.
5. Kejadian BNPB 2024 dibaca dari `data/bnpb/banjir-2024.csv` bila ada. Sebelum berkas itu ada, keadaan kosong dan tautan resource `a4daec53-1119-43ef-b05e-00ec3a4c42a4`.
6. Overlay inaRISK punya tombol nyala/mati dan mati secara bawaan.
7. Kolom dasarian tetap manual, dengan tanggal acuan dan tautan https://iklim.bmkg.go.id/.
8. Banner **Prototipe internal – menunggu izin tertulis BNPB** tetap. Waktu ditampilkan dalam WIB.

## Prakiraan 3 hari

Label periode dihitung dari hari ini zona WIB, misalnya `Periode: 20–22 Oktober 2026 (WIB)` bila dibuka pada 20 Oktober. CAP tidak dipakai sebagai status 3 hari.

Angka 3 hari datang dari API `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=`. Halaman Banjir memakai satu titik per kabupaten/kota, disimpan di `data/live/bmkg-prakiraan-kab.csv`. Berkas karhutla `data/live/bmkg_prakiraan.csv` tetap enam kelurahan prioritas.

Enam kota prioritas memakai kelurahan yang sudah dicek. Kabupaten/kota lain memakai satu kode kelurahan terkecil, atau desa terkecil bila tidak ada kelurahan, dan hanya disimpan bila API mengembalikan HTTP 200. Itu bukan ibu kota yang diverifikasi dan bukan rata-rata kabupaten. Kode `14.71.01.1001` tidak dipakai. Kecamatan dan kelurahan tidak ditampilkan di halaman Banjir.

Teks `weather_desc` dipetakan di dasbor: Extreme (hujan sangat lebat / hujan ekstrem), Severe (hujan lebat atau petir), Moderate (hujan sedang). Di luar itu, wilayah abu-abu. Keparahan terburuk pada tanggal `local_datetime` dipasangkan dengan kelas IRBI pada matriks yang sama. Tab 0–3 jam tetap CAP, terpisah.

Pengambilan kab/kota ada di workflow CAP (menit 12 dan 42) lewat `scripts/prakiraan-kab.mjs`, jeda 1,1 detik, di bawah 60 permintaan per menit. Cron `17 */3 * * *` dan `47 1-23/3 * * *` tidak dipindah.

## Penduduk dan rumah tangga

Hanya total satu kabupaten/kota, dan hanya pada baris yang punya status analisis. Labelnya `total kab/kota, bukan jumlah terpapar`. Berkas `data/static/penduduk-kabkota.csv` hanya header sampai ada salinan manual dari tabel BPS. Tidak ada WorldPop atau GHSL. Dropdown DAS berstatus **Dalam pengembangan** dan tidak memuat data DAS.

## Sumber

- CAP: https://data.bmkg.go.id/peringatan-dini-cuaca/ dan https://www.bmkg.go.id/alerts/nowcast/id
- Prakiraan: https://data.bmkg.go.id/prakiraan-cuaca/
- BNPB 2024: https://data.bnpb.go.id/dataset/data-bencana-indonesia/resource/a4daec53-1119-43ef-b05e-00ec3a4c42a4
- Iklim: https://iklim.bmkg.go.id/
- Batas: layanan BIG yang sudah dipakai dasbor, diminta saat peta dibuka
