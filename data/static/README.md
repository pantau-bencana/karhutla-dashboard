# Data statis

## IRBI 2025 banjir

`irbi-2025-banjir.csv` berisi 514 kabupaten/kota. 510 baris punya skor, kelas, dan halaman dari Buku IRBI 2025 (BNPB, Januari 2026), halaman 212–227: 282 Tinggi, 221 Sedang, 7 Rendah. Empat baris dikosongkan karena tidak ada di tabel banjir: Adm. Kep. Seribu (31.01), Bangli (51.06), Kep. Siau Tagulandang Biaro (71.09), dan Kota Ternate (82.71). Skor IRB total dan tabel banjir bandang tidak disalin.

Padanan nama terhadap kode batas BIG: Mamuju Utara = Pasangkayu (76.01), Toba Samosir = Toba (12.12), Padangsidimpuan = Kota Padang Sidempuan (12.77), Maluku Tenggara Barat = Kepulauan Tanimbar (81.03). Nama Jakarta disambungkan ke kode administrasi BIG (31.01 dan 31.71–31.75).

`irbi-2025-banjir-aceh-bengkulu.csv` tetap 33 baris yang sudah dicocokkan angka-nya dengan berkas nasional. Buku melarang pengutipan atau perbanyakan tanpa izin tertulis BNPB; izin belum diperoleh.

`irbi-2025-longsor.csv` berisi 514 kabupaten/kota dari tabel tanah longsor buku yang sama, halaman 310–323. 455 baris punya skor dan kelas: 369 Tinggi, 52 Sedang, 34 Rendah. 59 baris dikosongkan karena tidak ada di tabel itu. Skor tidak diubah. Berkas multibahaya Aceh–Bengkulu bukan tabel longsor nasional. Bukan peta rawan longsor PVMBG.

## IRBI 2025, tabel kabupaten lain

Sumbernya HTML publik Flip PDF `https://inarisk.bnpb.go.id/IRBI-2025/files/basic-html/page{N}.html` (halaman 1–380). Angka disalin dari blok teks, bukan dihitung ulang. Buku melarang pengutipan atau perbanyakan tanpa izin tertulis BNPB; izin belum diperoleh. Kalimat izin pada dasbor tidak diubah.

Banjir (halaman 212–227) dan longsor (halaman 310–323) dicocokkan ulang ke HTML: 510 dan 455 skor sama persis, termasuk kelas dan halaman. Kedua berkas itu tidak ditimpa. Skor banjir bandang tidak masuk berkas banjir.

`irbi-2025-karhutla.csv` tetap memakai kolom yang sudah dibaca dasbor. 467 skor halaman 294–307 cocok dengan HTML (380 Tinggi, 77 Sedang, 10 Rendah) dan tidak diubah. 47 kabupaten/kota yang tidak ada di tabel ditambahkan dengan `indeks_risiko` kosong dan keterangan `IRBI tidak tersedia`. Sel kosong bukan nol.

Berkas baru memakai kolom `provinsi,kabupaten_irbi,kode_wilayah,nama_big,skor,kelas,halaman,catatan`. Urutannya mengikuti 514 baris tabel banjir. Tanpa skor: `catatan` = `IRBI tidak tersedia`, skor dan kelas kosong. Nama HTML yang terpotong di tanda hubung, atau `KEP, SIAU TAGULANDANG BIARO`, diisi hanya bila satu nama pada tabel banjir yang cocok. Baris buku yang tidak terpadankan tidak ada.

| Berkas | Halaman | Ada skor | IRBI tidak tersedia | Kelas yang ada |
| --- | --- | --- | --- | --- |
| `irbi-2025-multibahaya.csv` | 40–55 | 514 | 0 | 169 Tinggi, 345 Sedang |
| `irbi-2025-gempabumi.csv` | 230–245 | 514 | 0 | 336 Tinggi, 34 Sedang, 144 Rendah |
| `irbi-2025-tsunami.csv` | 248–256 | 274 | 240 | 206 Tinggi, 19 Sedang, 49 Rendah |
| `irbi-2025-gunung-api.csv` | 260–263 | 132 | 382 | 79 Tinggi, 22 Sedang, 31 Rendah |
| `irbi-2025-banjir-bandang.csv` | 266–278 | 420 | 94 | 4 Tinggi, 315 Sedang, 101 Rendah |
| `irbi-2025-gelombang-abrasi.csv` | 282–291 | 322 | 192 | 241 Tinggi, 57 Sedang, 24 Rendah |
| `irbi-2025-karhutla.csv` | 294–307 | 467 | 47 | 380 Tinggi, 77 Sedang, 10 Rendah |
| `irbi-2025-kekeringan.csv` | 326–341 | 514 | 0 | 375 Tinggi, 107 Sedang, 32 Rendah |
| `irbi-2025-likuefaksi.csv` | 344–355 | 381 | 133 | 314 Tinggi, 40 Sedang, 27 Rendah |
| `irbi-2025-cuaca-ekstrem.csv` | 358–373 | 514 | 0 | 185 Tinggi, 276 Sedang, 53 Rendah |

`irbi-2025-multibahaya.csv` adalah tabel nasional kabupaten/kota (skor gabungan, misalnya 278,51). `irbi-2025-multibahaya-aceh-bengkulu.csv` tetap 33 baris; angkanya cocok dengan tabel nasional itu. Likuefaksi ada sebagai tabel sendiri di buku dan tidak digabung ke gempabumi. Tidak ada menu pilihan bahaya pada dasbor di perubahan ini.

## Titik sampel prakiraan

`prakiraan-sampel-adm4.csv` menyimpan satu kode adm4 per kabupaten/kota yang sudah dicek ke API prakiraan BMKG. Enam kelurahan prioritas bertanda `terverifikasi`. Sisanya `kelurahan-terkecil` atau `desa-terkecil`: itu calon kode, bukan ibu kota yang diverifikasi. Baris `status` selain `ok` tidak diambil ulang dan tidak punya prakiraan. Pada 20 Oktober 2026 yang gagal (HTTP 404): Sorong Selatan, Raja Ampat, Tambrauw, dan Maybrat.

## Penduduk dan rumah tangga kabupaten/kota

Berkas `penduduk-kabkota.csv` menyimpan total satu kabupaten/kota. Angka itu bukan jumlah penduduk atau rumah tangga yang terpapar banjir. Sel rumah tangga yang kosong berarti belum tersedia, bukan nol.

Header:

```
kode,nama,penduduk,tahun_penduduk,sumber_penduduk,rumah_tangga,tahun_rt,sumber_rt
```

- `kode` mengikuti kode kabupaten pada batas BIG, bentuk `31.74`. Kode BPS yang tertulis di dalam `sumber_penduduk` boleh berbeda.
- `penduduk` adalah proyeksi BPS tahun 2026, bilangan utuh tanpa pemisah ribuan.
- `rumah_tangga` terisi untuk DKI Jakarta, Banten, dan Jawa Timur. Provinsi lain dikosongkan.

Sumber penduduk: tabel BPS “Jumlah Penduduk menurut Kabupaten/Kota (Proyeksi Penduduk hasil SP2020)”.

https://www.bps.go.id/id/statistics-table/2/Mjc5MCMy/-jumlah-penduduk-menurut-kabupaten-kota-dan-kelompok-umur.html

Daftar publikasi proyeksi per provinsi: https://sensus.bps.go.id/publikasi/index/sp2020

Rumah tangga disalin manual dari tabel BPS provinsi. Tidak ada kunci API, dan workflow tidak mengambil berkas ini. Jangan memakai kisi penduduk global.

## Koordinat titik adm4

`prakiraan-adm4-koordinat.csv` menyimpan lintang dan bujur dari bidang `lokasi` API prakiraan BMKG untuk kode adm4 yang statusnya `ok` di `prakiraan-sampel-adm4.csv`. Itu titik yang sama dengan prakiraan 3 hari, bukan pusat poligon kabupaten. Koordinat tidak diambil ulang tiap jadwal hujan. Kabupaten yang API-nya 404 tidak punya baris.

## Daftar 81 kab/kota (Analisis Karhutla 2026)

Folder `karhutla-81/` menyimpan cuplikan baca-saja untuk enam provinsi prioritas: Riau 12, Jambi 11, Sumatera Selatan 17, Kalimantan Barat 14, Kalimantan Tengah 14, Kalimantan Selatan 13. Kode pada berkas ini mengikuti lembar (tanpa titik, dan tidak sama dengan kode Kemendagri). Tombol unduh menulis ulang 81 baris menurut nama ke kode Kemendagri pada `kabkota-provinsi.json`, urutan yang sama untuk FWI, peluang hujan, dan indeks iklim. Nilai tidak dihitung ulang. Waktu cuplikan pada berkas unduhan: 23 Oktober 2026, 09.14 WIB. Bukan sinkron ke lembar, dan dasbor tidak menulis balik.

`fwi-81-kab-kota.csv` memakai nilai FWI yang ada pada cuplikan. 29 sel tertulis `#N/A` (seluruh Riau, 10 Kalimantan Barat, 3 Jambi, 2 Sumatera Selatan, 2 Kalimantan Selatan) dan dibiarkan, bukan nol. `template-fwi-81-kab-kota.csv` mengosongkan kolom FWI untuk isian tim; tombol unduhan memakai berkas yang ada nilainya, bukan templat kosong. `master-81-kab-kota.csv` hanya kode, provinsi, dan kabupaten/kota.

`peluang-hujan-81-kab-kota.csv` menyimpan rentang persen untuk hujan lebih dari 20 mm. `indeks-kesesuaian-iklim-81-kab-kota.csv` menyimpan kelas pada lembar, termasuk gabungan kelas. Judul kolom iklim dibiarkan seperti cuplikan, termasuk ejaan `Kesesuain`. Angka ini bukan FDRS BMKG dan bukan peringatan resmi. Rekap harian tetap menulis Indeks Kesesuaian Iklim sebagai belum terintegrasi.

## Batas kabupaten/kota

`batas-kabkota.topojson` menyimpan 514 kabupaten/kota untuk peta Banjir. Geometri diambil dari layanan publik BIG `PUBLIK/BATAS_WILAYAH` layer kabupaten/kota (`kdpkab`, `wadmkk`, `wadmpr`) dengan toleransi 0,001 derajat, lalu dikuantisasi TopoJSON 1e5. Kode dicocokkan ke `irbi-2025-banjir.csv`. Satu kode ganda pada layanan (`71.05`/`71.10`) tidak masuk karena tidak ada di tabel IRBI.

Layanan itu tidak menyatakan lisensi CC. Berkas ini bukan salinan shapefile resmi dan bukan batas untuk keperluan hukum. geoBoundaries Indonesia ADM2 (CC BY 3.0 IGO) tidak dipakai: propertinya tidak memuat kode Kemendagri. Nama wilayah hotspot tidak memakai berkas ini.
