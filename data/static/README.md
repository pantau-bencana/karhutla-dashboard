# Data statis

## IRBI 2025 banjir

`irbi-2025-banjir.csv` berisi 514 kabupaten/kota. 510 baris punya skor, kelas, dan halaman dari Buku IRBI 2025 (BNPB, Januari 2026), halaman 212–227: 282 Tinggi, 221 Sedang, 7 Rendah. Empat baris dikosongkan karena tidak ada di tabel banjir: Adm. Kep. Seribu (31.01), Bangli (51.06), Kep. Siau Tagulandang Biaro (71.09), dan Kota Ternate (82.71). Skor IRB total dan tabel banjir bandang tidak disalin.

Padanan nama terhadap kode batas BIG: Mamuju Utara = Pasangkayu (76.01), Toba Samosir = Toba (12.12), Padangsidimpuan = Kota Padang Sidempuan (12.77), Maluku Tenggara Barat = Kepulauan Tanimbar (81.03). Nama Jakarta disambungkan ke kode administrasi BIG (31.01 dan 31.71–31.75).

`irbi-2025-banjir-aceh-bengkulu.csv` tetap 33 baris yang sudah dicocokkan angka-nya dengan berkas nasional. Buku melarang pengutipan atau perbanyakan tanpa izin tertulis BNPB; izin belum diperoleh.

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
