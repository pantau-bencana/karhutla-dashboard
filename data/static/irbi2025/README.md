# IRBI 2025 (BNPB) — ekstraksi tabel

**Sumber:** Buku Indeks Risiko Bencana Indonesia (IRBI) 2025, BNPB (Vol. 04 No. 04, Januari 2026, ISSN 2985-6922).
- Flipbook: https://inarisk.bnpb.go.id/IRBI-2025/mobile/index.html
- PDF resmi (tautan Download di config flipbook `mobile/javascript/config.js`, `downloadURL`): https://inarisk.bnpb.go.id/pdf/BUKU%20IRBI%202025.pdf
  (380 halaman, 139.577.269 byte, SHA-256 11b5587cdb6e9481ae74ca5407fe52bfa02e8c76f1a467ec60051650fdbe4d9f). Nomor halaman PDF = nomor halaman cetak = pageN.html.
- Diakses: 2026-10-18 05:52 WIB.

**Metode:** `pdftotext -layout` (poppler) + regex dengan daftar 38 provinsi dari tabel hal. 36 (`parse.py`, `prov.py`). Divalidasi ulang terhadap ekstraksi independen `pdftotext -raw`: 5.017/5.017 baris kab/kota cocok (no, nama, skor, kelas, halaman). Nilai tidak diubah, tidak ada pengisian celah.

## Berkas
| Berkas | Isi | Halaman | Baris |
|---|---|---|---|
| irbi2025_provinsi.csv | Skor IRBI provinsi (kolom SEB dan 2025) + kelas dari narasi bab provinsi | 36 (narasi 58–209) | 38 |
| irbi2025_kabkota_total.csv | IRBI multi-bahaya kab/kota, skor + kelas | 40–55 | 514 |
| irbi2025_kabkota_karhutla.csv | Indeks risiko kebakaran hutan dan lahan | 294–307 | 467 |
| irbi2025_kabkota_banjir.csv | Banjir | 212–227 | 510 |
| irbi2025_kabkota_letusan_gunung_api.csv | Letusan gunung api | 260–263 | 132 |
| irbi2025_kabkota_{gempabumi,tsunami,banjir_bandang,gelombang_ekstrem_abrasi,tanah_longsor,kekeringan,likuefaksi,cuaca_ekstrem}.csv | Ancaman lain | 230–375 | 514/274/420/322/455/514/381/514 |
| validation.json, spotcheck.csv | Hasil validasi | | |

Kolom kab/kota: no, provinsi, kabupaten_kota, skor, kelas, halaman, catatan. Skor ditulis desimal titik.

## Catatan / keterbatasan
- Hanya skor indeks dan kelas. Komponen bahaya, kerentanan, kapasitas **tidak** ditabelkan per kab/kota di buku.
- Tabel per ancaman hanya memuat kab/kota yang terpapar ancaman itu (mis. karhutla 467 kab/kota di 37 provinsi; DKI Jakarta tidak ada).
- Ambang kelas (hal. 35): total <14,67 rendah; 14,67–176,00 sedang; >176,00 tinggi. Tabel provinsi hal. 36 tidak punya kolom kelas; kolom `kelas_menurut_ambang_hal35` adalah turunan dari ambang itu, `kelas_narasi` dikutip dari teks bab provinsi.
- Arti kolom "SEB" di tabel provinsi tidak dijelaskan di halaman itu (kemungkinan nilai sebelum pembaruan kapasitas) — belum terverifikasi.
- Inkonsistensi di sumber (dicatat, tidak dikoreksi): narasi provinsi Sulut/Sulteng/Sulsel/Sultra memuat nilai yang bergeser dari tabel hal. 36 (mis. Sulsel narasi "Tinggi 196,55", tabel 148,05); selisih kecil DKI (57,58 vs 57,59), Malut (220,03 vs 220,33), Papua (218,51 vs 218,52). Banggai Kepulauan: tabel nasional 193,22 vs tabel provinsi hal. 159 197,45. Tabel provinsi Sumsel hal. 79 menulis "OGAN KOMERING ULU 113,63" (di tabel nasional itu nilai OKU Selatan). "KEP, SIAU" (koma) di tabel total. Urutan tsunami no. 205→206 tidak menurun di sumber.
- Perbaikan teknis yang ditandai di kolom catatan: nama provinsi terpotong di sumber ("KEPULAUAN BANGKA BELI-", "DAERAH ISTIMEWA YOGYAKAR-") dipetakan ke nama lengkap; Pinrang (banjir no. 167) baris terpecah di layout, diambil dari teks raw; "BOLAANG MONGONDOW SE-/LATAN" (banjir no. 156) digabung.
- Tahun data: bahaya berbasis data 2021, kerentanan proyeksi, kapasitas IKD 2025 (hal. 9, 34).
- Buku mencantumkan "Dilarang mengutip atau memperbanyak sebagian atau seluruh isi buku tanpa izin tertulis penerbit" (hal. ii). Pertimbangkan izin BNPB sebelum mempublikasikan ulang tabel di dasbor publik.
- Catatan pada kolom `catatan` untuk KEP, SIAU, Banggai Kepulauan, Maluku Tenggara Barat (total) dan Bolaang Mongondow Selatan (banjir) ditambahkan setelah parse.py; menjalankan ulang parse.py akan menimpanya.
