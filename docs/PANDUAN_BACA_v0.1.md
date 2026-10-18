# Panduan baca v0.1

Panduan ini untuk pimpinan dan pembaca yang tidak mengoperasikan kode. Situsnya https://rixaga.github.io/karhutla-dashboard/. Ini prototipe internal. Angka di layar adalah bahan pantau, bukan perintah operasi dan bukan peringatan resmi.

## Peta titik panas

Peta pada Ringkasan dan pada Peta dan Data menunjukkan deteksi satelit NASA FIRMS. Satu titik berarti satelit melihat panas pada koordinat itu. Titik itu belum berarti ada kebakaran yang sudah dicek di lapangan.

Tampilan awal memuat wilayah Indonesia. Tombol **Kembali ke seluruh Indonesia** mengembalikan pandangan ke lingkup itu. Pada pandangan jauh, beberapa deteksi yang berdekatan disatukan menjadi kelompok abu-abu berisi jumlah. Pada pandangan dekat, tiap deteksi tampil sendiri di koordinat aslinya.

Di atas peta tertulis **Lintasan satelit terakhir** dalam WIB. Bila lintasan itu lebih lama dari sekitar 8 jam, atau jadwal pembaruan sudah lewat lebih dari satu jam, data ditandai **tertunda**. Jam pembaruan yang sudah lewat tidak ditampilkan. Cuplikan yang tersimpan dilabeli **VIIRS S-NPP NRT (snapshot ±3 jam)**.

Tabel di bawah peta secara bawaan mengelompokkan deteksi menurut kecamatan. Kabupaten/kota dan desa/kelurahan bisa dipilih. Halaman juga menulis **nama desa tersedia untuk N dari M titik**. Bila layanan peta BIG tidak punya desa pada koordinat itu, baris desa tertulis **Wilayah desa belum teridentifikasi**. Kode wilayah ikut ditulis supaya dua desa yang namanya sama tidak tertukar. Memilih baris akan menggeser peta ke kelompok itu.

Tabel **Jumlah deteksi hotspot (bukan status)** hanya menghitung titik. Tidak ada status operasional pada tabel itu. Titik yang pencarian wilayahnya gagal tidak masuk hitungan, dan halamannya menulis berapa titik yang belum terverifikasi.

## Warna dan confidence

Warna mengikuti **confidence deteksi satelit**, yaitu keyakinan satelit bahwa deteksi itu bukan gangguan. Hijau untuk rendah, kuning untuk nominal, merah untuk tinggi. Pada satelit VIIRS, huruf aslinya `l`, `n`, dan `h`. Nominal adalah kelas menengah. Kata yang dipakai untuk kelas itu adalah sedang. Nilai asli tetap bisa dibaca di rincian titik.

Di samping warna itu tertulis **keyakinan deteksi, bukan intensitas atau bahaya**. Warna ini bukan tingkat bahaya dan bukan tingkat kebakaran. Jumlah di tabel juga jumlah deteksi, bukan tingkat keparahan.

## Wilayah

Nama desa, kecamatan, kabupaten/kota, dan provinsi dicocokkan ke layanan batas Badan Informasi Geospasial. Edisi desa yang layanan umumkan adalah Mei 2021. Cakupannya tidak lengkap untuk seluruh Indonesia. Hasilnya pencocokan koordinat pada peta, bukan hasil cek lapangan.

Bila layanan itu gagal pada saat data diperbarui, titik satelit tetap ditampilkan. Halaman lalu menyatakan bahwa penyaringan wilayah dan batas Indonesia pada pembaruan tersebut tidak lengkap. Titik yang gagal dicari tidak masuk hitungan per provinsi atau per kabupaten.

## Kualitas udara

Di dalam Karhutla, buka Peta dan Data lalu pilih **Kualitas Udara (ISPU)**. Ada dua pilihan: Hari Ini dan Historis. Tidak ada Prediksi.

ISPU menggambarkan kualitas udara di stasiun pemantau. Titik pada peta adalah lokasi pengukuran. Satu stasiun tidak mewakili seluruh kabupaten atau kota. Nilai ISPU juga bukan bukti tunggal bahwa polusi berasal dari karhutla. Saat panduan ini ditulis, angka stasiun resmi belum masuk. Portal resmi hanya ditautkan. Pembanding OpenAQ tidak menampilkan angka selama kunci aksesnya tidak ada.

## Tautan cuaca BMKG

Tombol **Buka Peta FWI/Peringatan Karhutla BMKG** membuka situs BMKG di tab baru. Dasbor tidak menempelkan gambar peta BMKG. Produk citra yang ditautkan berjalan sampai H+7 sesuai produk BMKG, bukan prakiraan 14 hari. FDRS resmi pada dasbor menulis **menunggu data resmi BMKG**. Angka contoh tidak ditampilkan sebagai FDRS.

Panel hujan sekitar 14 hari, bila ada, adalah **pembanding model, bukan prakiraan BMKG**. Header kartu pembanding memuat **Pembanding, bukan produk BMKG/KLHK**. Nilai GWIS pada panel itu tidak disebut FDRS.

Matriks **Indikator untuk Wilayah Prioritas** menyiapkan kolom yang nanti perlu diisi: FWI/FDRS, ISPU, peluang hujan lebih dari 20 mm, dan indeks kesesuaian iklim. Keempatnya saat ini **Tautan saja**. Matriks itu tidak berisi angka kabupaten.

## Status yang perlu dibaca apa adanya

- **Aktif** atau cuplikan ok berarti berkas data terakhir berhasil disimpan.
- **Tautan saja** berarti hanya ada pranala. Tidak ada angka yang ditarik dari situ.
- **Data statis** berarti tabel terbitan, misalnya IRBI 2025, bukan kondisi hari ini.
- **Belum terhubung / menunggu data** pada Banjir dan Gunung Api berarti modul itu belum memantau.
- Slot **15–20 kabupaten/kota** menunggu data resmi BMKG tentang FDRS atau potensi karhutla per kabupaten/kota. Dasbor tidak mengisi slot itu dengan urutan buatan.

IRBI 2025 berjudul **Konteks risiko jangka panjang (IRBI 2025)**. Tabel itu di bagian bawah, urutan nama, dan bukan daftar wilayah yang harus diprioritaskan minggu ini.

## Yang dasbor tidak klaim

- Tidak menetapkan peringatan resmi BNPB atau BMKG.
- Tidak menyatakan setiap titik panas adalah kebakaran hutan atau lahan yang sudah dikonfirmasi.
- Tidak menyatakan warna merah lebih berbahaya daripada warna hijau dalam arti operasi.
- Tidak menyatakan satu stasiun ISPU mewakili satu kabupaten atau kota.
- Tidak membuat prakiraan 14 hari, tidak membuat prediksi ISPU, dan tidak membuat peringkat 15–20 kabupaten dari data pembanding.
- Tidak memantau banjir atau gunung api. Kedua modul itu masih menunggu data resmi.

Footer yang harus tetap ada: **Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.**
