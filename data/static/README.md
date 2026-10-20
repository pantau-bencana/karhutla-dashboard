# Data statis

## IRBI 2025 banjir, Aceh dan Bengkulu

`irbi-2025-banjir-aceh-bengkulu.csv` berisi 33 kabupaten/kota. Skor, kelas, dan halaman sudah dicocokkan dengan Buku IRBI 2025 (BNPB, Januari 2026), halaman 212–227. Semua baris cocok. Provinsi lain tidak diisi. Buku melarang pengutipan atau perbanyakan tanpa izin tertulis BNPB; izin belum diperoleh.

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
