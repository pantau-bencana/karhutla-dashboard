# Banjir nasional tahap 1

Halaman yang diperluas: `src/components/FloodPage.jsx`. Bukan halaman baru.

Keputusan yang dipakai (menggantikan draf yang masih menyebut IRBI 2024, warna dua keadaan, dan jadwal 3 jam untuk CAP):

1. Peta provinsi nasional. Klik provinsi, atau pilih dari daftar yang memuat setiap provinsi plus **Semua provinsi**, membuka peta kab/kota dan tabel.
2. CAP nowcast BMKG dari RSS resmi, tanpa kunci. `scripts/cap-kab.mjs` tidak lagi menyaring Aceh/Bengkulu. Ada keluaran `data/live/bmkg-cap-prov.csv`. Workflow `.github/workflows/refresh-cap.yml` berjalan pada menit 12 dan 42 UTC. Jeda antar permintaan BMKG 1,1 detik.
3. Istilah `severity` dan `event` CAP ditampilkan apa adanya. Warna Awas / Siaga / Waspada hanya dari **Analisis Pantau Bencana (gabungan BMKG × IRBI BNPB)** di `src/lib/analisisPantauBencana.js`. Cuplikan terakhir tetap diwarnai bila pembaruan gagal atau kosong. Setelah masa berlaku lewat, labelnya `Data terakhir — masa berlaku sudah lewat, menunggu pembaruan BMKG`. Itu bukan peringatan yang masih berlaku dan bukan status resmi.
4. IRBI 2025 banjir memakai 510 kabupaten/kota dari Buku IRBI 2025, halaman 212–227. Empat kabupaten/kota tanpa kelas banjir dikosongkan. Skor tidak dikarang. Tabel banjir bandang dan skor IRB total tidak dipakai.
5. Kejadian BNPB 2024 dibaca dari `data/bnpb/banjir-2024.csv` bila ada. Sebelum berkas itu ada, keadaan kosong dan tautan resource `a4daec53-1119-43ef-b05e-00ec3a4c42a4`.
6. Overlay inaRISK punya tombol nyala/mati dan mati secara bawaan.
7. Kolom dasarian tetap manual, dengan tanggal acuan dan tautan https://iklim.bmkg.go.id/.
8. Banner **Prototipe internal – menunggu izin tertulis BNPB** tetap. Waktu ditampilkan dalam WIB.

## Prakiraan 3 hari

Label periode dihitung dari hari ini zona WIB, misalnya `Periode: 20–22 Oktober 2026 (WIB)` bila dibuka pada 20 Oktober. CAP tidak dipakai sebagai status 3 hari.

Angka 3 hari datang dari API `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=`. Halaman Banjir memakai satu titik per kabupaten/kota, disimpan di `data/live/bmkg-prakiraan-kab.csv`. Berkas karhutla `data/live/bmkg_prakiraan.csv` tetap enam kelurahan prioritas.

Enam kota prioritas memakai kelurahan yang sudah dicek. Kabupaten/kota lain memakai satu kode kelurahan terkecil, atau desa terkecil bila tidak ada kelurahan, dan hanya disimpan bila API mengembalikan HTTP 200. Itu bukan ibu kota yang diverifikasi dan bukan rata-rata kabupaten. Kode `14.71.01.1001` tidak dipakai. Kecamatan dan kelurahan tidak ditampilkan di halaman Banjir.

Teks `weather_desc` dipetakan di dasbor. Cerah, berawan, udara kabur, asap, dan kabut berlabel `Tidak ada status (cuaca tidak berpotensi banjir)`. Hujan ringan dan hujan lokal tidak berstatus, kecuali Waspada bila IRBI Tinggi dan hujan ada pada ketiga hari prakiraan. Hujan sedang, hujan lebat, dan hujan petir (sekurang-kurangnya setara hujan lebat) memakai matriks. Kode yang belum dikenali berlabel `Tidak terklasifikasi (kode cuaca BMKG belum dikenali)`. Tab 0–3 jam tetap CAP, terpisah. Pada API 20 Oktober 2026, weather 61 berteks Hujan Ringan dan 63 berteks Hujan Sedang; dasbor mengikuti teks itu.

Pengambilan kab/kota ada di workflow prakiraan (`0 0,2,12,14 * * *` UTC, yaitu 07.00, 09.00, 19.00, dan 21.00 WIB) lewat `scripts/prakiraan-kab.mjs`, jeda 1,1 detik, di bawah 60 permintaan per menit. Bila `analysis_date` tidak lebih baru, cuplikan tidak ditulis. Cron `17 */3 * * *` dan `47 1-23/3 * * *` tidak dipindah. CAP tetap menit 12 dan 42.

## Data Pembanding curah hujan

Lapisan terpisah, mati secara bawaan. Jumlah harian `precipitation_sum` (mm) dari Open-Meteo, model ECMWF IFS, pada koordinat titik adm4 yang sama. Labelnya `prakiraan model, bukan BMKG`. Angka itu tidak masuk matriks dan tidak mengubah Awas, Siaga, atau Waspada. Pengambilan ada di workflow data (bukan tiap 30 menit) lewat `scripts/hujan-pembanding.mjs`, 20 titik per permintaan, jeda 1,5 detik. Bila gagal, cuplikan terakhir tetap. NASA GPM IMERG tidak diunduh karena membutuhkan akun.

## Penduduk dan rumah tangga

Hanya total satu kabupaten/kota, dan hanya pada baris yang punya status analisis. Labelnya `potensi = total kab/kota (BPS), bukan estimasi jumlah terpapar`. Berkas `data/static/penduduk-kabkota.csv` menyimpan proyeksi penduduk 2026; rumah tangga hanya DKI Jakarta, Banten, dan Jawa Timur. Tidak ada WorldPop atau GHSL. Dropdown DAS berstatus **belum terintegrasi**. Klasifikasi DAS belum terintegrasi dan tidak memuat data DAS.

## Sumber

- CAP: https://data.bmkg.go.id/peringatan-dini-cuaca/ dan https://www.bmkg.go.id/alerts/nowcast/id
- Prakiraan: https://data.bmkg.go.id/prakiraan-cuaca/
- BNPB 2024: https://data.bnpb.go.id/dataset/data-bencana-indonesia/resource/a4daec53-1119-43ef-b05e-00ec3a4c42a4
- Iklim: https://iklim.bmkg.go.id/
- Batas peta Banjir: `data/static/batas-kabkota.topojson`, diambil dari layanan publik BIG BATAS_WILAYAH (toleransi 0,001°) lalu disimpan sebagai TopoJSON. Bukan batas hukum. geoBoundaries ADM2 tidak dipakai karena tidak memuat kode Kemendagri. Nama hotspot tetap dari kueri saat pembaruan, tanpa geometri.
