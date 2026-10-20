# Penduduk dan rumah tangga kabupaten/kota

Berkas `penduduk-kabkota.csv` sengaja hanya berisi header. Jangan mengisi angka yang tidak disalin dari tabel resmi. Sel kosong bukan nol dan bukan jumlah penduduk atau rumah tangga yang terpapar banjir.

Header:

```
kode,nama,penduduk,tahun_penduduk,sumber_penduduk,rumah_tangga,tahun_rt,sumber_rt
```

- `kode` — kode kabupaten/kota Kemendagri, bentuk `11.13`.
- `penduduk` — bilangan utuh tanpa pemisah ribuan. Kosongkan bila tidak ada.
- `tahun_penduduk` dan `sumber_penduduk` — tahun proyeksi dan nama tabel BPS yang disalin.
- `rumah_tangga` — bilangan utuh rumah tangga atau KK, sesuai tabel yang disalin.
- `tahun_rt` dan `sumber_rt` — tahun dan nama tabel. Tulis di `sumber_rt` apakah angkanya rumah tangga atau KK.

## Dari mana angkanya

Unduhan dilakukan orang. Tidak ada kunci API, dan workflow tidak mengambil berkas ini.

Penduduk: publikasi BPS “Proyeksi Penduduk Kabupaten/Kota” hasil Sensus Penduduk 2020, satu buku per provinsi. Daftar publikasi yang dibuka pada 20 Oktober 2026:

https://sensus.bps.go.id/publikasi/index/sp2020

Rumah tangga: tabel BPS provinsi “Jumlah Rumah Tangga menurut Kabupaten/Kota”. Tidak ada satu berkas nasional kabupaten/kota yang disimpan di sini. Tabel Long Form yang hanya sampai provinsi jangan disalin ke baris kabupaten.

Jangan memakai kisi penduduk global. Angka hanya dari tabel BPS yang disalin ke berkas ini.

Setelah angka disalin, status sumber dapat menjadi **Data statis**. Sampai isi itu ada, dasbor berstatus **Tautan saja** dan menulis “Belum diisi”.
