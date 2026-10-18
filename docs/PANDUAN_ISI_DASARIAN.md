# Cara mengisi peringatan dasarian

Status **Peringatan Dini Curah Hujan Tinggi** untuk Aceh dan Bengkulu diisi manual. Dasbor tidak mengambil angka itu dari halaman BMKG.

Berkas yang diisi: [data/manual/bmkg-pdcht-dasarian.csv](https://github.com/rixaga/karhutla-dashboard/blob/main/data/manual/bmkg-pdcht-dasarian.csv).

Halaman sumber: <https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi>.

## Jadwal dasarian

- Dasarian I: tanggal 1 sampai 10.
- Dasarian II: tanggal 11 sampai 20.
- Dasarian III: tanggal 21 sampai akhir bulan.

Setiap dasarian baru, buka halaman BMKG lagi dan perbarui berkas.

## Langkah mengisi

1. Buka halaman BMKG di atas.
2. Cari baris kabupaten dan kota di Aceh dan Bengkulu.
3. Salin status persis seperti tertulis: **Waspada**, **Siaga**, atau **Awas**.
4. Kabupaten yang tidak ada di halaman itu dibiarkan kosong. Jangan menulis aman.
5. Buka berkas CSV di GitHub, lalu klik ikon pensil (**Edit**).
6. Isi kolom pada baris yang tercantum. Jangan menghapus baris. Jangan menambah baris contoh.

Kolom:

| Kolom | Isi |
| --- | --- |
| status | Waspada, Siaga, atau Awas. Kosongkan bila tidak tercantum. |
| dasarian | Nama dasarian, misalnya Dasarian II Oktober 2026. |
| berlaku_mulai | Tanggal awal, bentuk YYYY-MM-DD. |
| berlaku_sampai | Tanggal akhir, bentuk YYYY-MM-DD. |
| kutipan | Kalimat singkat dari halaman BMKG. |
| sumber_url | Tautan halaman BMKG. |
| tanggal_akses | Hari Anda menyalin, bentuk YYYY-MM-DD. |
| diisi_oleh | Nama Anda. |

Bila status diisi, dasarian, sumber_url, dan tanggal_akses wajib ada. Tanggal yang terisi harus YYYY-MM-DD.

Isi dulu semua kabupaten yang tercantum pada dasarian itu. Yang tidak tercantum dibiarkan statusnya kosong. Jangan menggabungkan perubahan yang baru terisi separuh: baris kosong akan terbaca sebagai tidak tercantum.

## Contoh baris

Baris ini **CONTOH**. Kabupatennya fiktif. Jangan disalin ke berkas sungguhan. Status pada contoh ini bukan status BMKG.

```
kode_wilayah,kab_kota,provinsi,status,dasarian,berlaku_mulai,berlaku_sampai,kutipan,sumber_url,tanggal_akses,diisi_oleh
99.99,CONTOH Kabupaten Fiktif,CONTOH,Waspada,CONTOH Dasarian II,2026-10-11,2026-10-20,CONTOH kutipan fiktif,https://www.bmkg.go.id/iklim/peringatan-dini-hujan-tinggi,2026-10-18,CONTOH Nama
```

## Menyimpan lewat pull request

Jangan memilih commit langsung ke `main`.

1. Klik **Commit changes**.
2. Pilih **Create a new branch and start a pull request** (pada dialog GitHub tulisannya **Create a new branch for this commit and start a pull request**).
3. Klik **Propose changes**, lalu **Create pull request**.
4. Tunggu pemeriksaan menjadi hijau.
5. Klik **Merge**.

Sesudah tergabung ke `main`, situs memperbarui sendiri. Workflow Pages membangun ulang karena berkas ini tidak dikecualikan.

## Bila pemeriksaan gagal

Buka pemeriksaan yang merah. Pesannya berbahasa Indonesia, misalnya:

- Status tidak dikenal. Yang boleh diisi: Waspada, Siaga, Awas, atau dikosongkan.
- Tanggal tidak berbentuk YYYY-MM-DD.
- dasarian, sumber_url, atau tanggal_akses wajib diisi bila status diisi.
- Baris kabupaten hilang, atau ada kode di luar Aceh dan Bengkulu.

Perbaiki berkas pada cabang pull request itu, bukan pada `main`. Simpan lagi. Tunggu pemeriksaan hijau, baru gabungkan.
