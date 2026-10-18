# Panduan baca v0.1

Panduan ini untuk pimpinan dan pembaca yang tidak mengoperasikan kode. Situsnya https://rixaga.github.io/karhutla-dashboard/. Ini prototipe internal. Angka di layar adalah bahan pantau, bukan perintah operasi dan bukan peringatan resmi. Isi panduan ini mengikuti commit `4cf72fb`.

## Peta titik panas

Peta pada Ringkasan dan pada Peta dan Data menunjukkan deteksi satelit NASA FIRMS. Satu titik berarti satelit melihat panas pada koordinat itu. Titik itu belum berarti ada kebakaran yang sudah dicek di lapangan.

Tampilan awal memuat wilayah Indonesia. Tombol **Kembali ke seluruh Indonesia** mengembalikan pandangan ke lingkup itu. Pada pandangan jauh, beberapa deteksi yang berdekatan disatukan menjadi kelompok abu-abu berisi jumlah. Pada pandangan dekat, tiap deteksi tampil sendiri di koordinat aslinya.

Di atas peta tertulis **Lintasan satelit terakhir** dalam WIB. Bila lintasan itu lebih lama dari sekitar 8 jam, atau jadwal pembaruan sudah lewat lebih dari satu jam, data ditandai **tertunda**. Jam pembaruan yang sudah lewat tidak ditampilkan. Cuplikan yang tersimpan dilabeli **VIIRS S-NPP NRT (snapshot ±3 jam)**.

Di bawah peta ada daftar provinsi yang tertutup. Tiap baris hanya memuat nama provinsi, jumlah titik, dan tiga angka berwarna: rendah, nominal (sedang), dan tinggi. Itu **confidence deteksi satelit**, bukan tingkat bahaya. Urutannya dari jumlah terbesar. Kotak **Cari provinsi** menyaring nama. Membuka provinsi menampilkan kecamatan, beserta kabupaten/kota dan kode kecamatan. Membuka kecamatan menampilkan desa yang teridentifikasi. Memilih baris menggeser peta ke kelompok itu. Penjelasan panjang ada di **Cara membaca**.

Halaman menulis **nama desa tersedia untuk N dari M titik**. Tabel **Jumlah deteksi hotspot (bukan status)** pada Peta dan Data memakai daftar yang sama. Tidak ada status operasional. Titik yang pencarian wilayahnya gagal tidak masuk hitungan, dan halamannya menulis berapa titik yang belum terverifikasi.

## Warna dan confidence

Warna mengikuti **confidence deteksi satelit**, yaitu keyakinan satelit bahwa deteksi itu bukan gangguan. Hijau untuk rendah, kuning untuk nominal, merah untuk tinggi. Pada satelit VIIRS, huruf aslinya `l`, `n`, dan `h`. Nominal adalah kelas menengah. Kata yang dipakai untuk kelas itu adalah sedang. Nilai asli tetap bisa dibaca di rincian titik.

Di samping warna itu tertulis **keyakinan deteksi, bukan intensitas atau bahaya**. Warna ini bukan tingkat bahaya dan bukan tingkat kebakaran. Jumlah di tabel juga jumlah deteksi, bukan tingkat keparahan.

## Wilayah

Nama desa, kecamatan, kabupaten/kota, dan provinsi dicocokkan ke layanan batas Badan Informasi Geospasial. Edisi desa yang layanan umumkan adalah Mei 2021. Cakupannya tidak lengkap untuk seluruh Indonesia. Hasilnya pencocokan koordinat pada peta, bukan hasil cek lapangan.

Bila layanan itu gagal pada saat data diperbarui, titik satelit tetap ditampilkan. Halaman lalu menyatakan bahwa penyaringan wilayah dan batas Indonesia pada pembaruan tersebut tidak lengkap. Titik yang gagal dicari tidak masuk hitungan per provinsi atau per kabupaten.

## Banjir (Aceh dan Bengkulu)

Modul Banjir memuat peta dan tabel jangka panjang berlabel **Prototipe internal – menunggu izin tertulis BNPB**, plus matriks nowcast berlabel **Prototipe internal – menunggu izin tertulis BNPB/BMKG**.

Peta memilih Aceh atau Bengkulu. Gambarnya indeks risiko banjir inaRISK, edisi KRB 2021, piksel 100 m. Kalimat di bawah peta: **Indeks risiko banjir inaRISK BNPB, KRB 2021, piksel 100 m. Bukan peringatan dini. Bukan IRBI 2025.** Legenda resmi: 0–0,3 Rendah, 0,3–0,6 Sedang, 0,6–1,0 Tinggi. Klik peta membaca nilai pada titik itu. Bila titik di luar area yang dipetakan, tulisannya **Di luar area bahaya banjir yang dipetakan inaRISK**, bukan risiko rendah. Bila layanan tidak menjawab: **Nilai tidak tersedia (layanan BNPB tidak merespons)**. Batas provinsi dan kabupaten diminta langsung ke BIG dan tidak disimpan. Lapisan tambahan, bila dinyalakan: Klasifikasi DAS KLHK dengan label DIPULIHKAN atau DIPERTAHANKAN, dan bahaya banjir. Gagalnya layanan itu tidak mematikan Karhutla.

Tabel berjudul **Konteks risiko banjir jangka panjang per kabupaten/kota (bukan prioritas, bukan prakiraan)**. Isinya 33 kabupaten/kota Aceh dan Bengkulu, urut kode wilayah BIG. IRBI 2025 banjir dan IRBI multi-bahaya adalah data statis dari buku. Kejadian banjir 2024 berasal dari DIBI (ODC-BY). Lima kabupaten/kota yang tidak ada di tabel itu ditulis **Tidak tercantum di tabel DIBI 2024**, bukan 0. Angka 0 hanya muncul bila DIBI memang menulis nol. Ringkasan kajian inaRISK bertuliskan **Belum terhubung**. Dokumen KRB hanya tautan. Angka dari tahun yang berbeda tidak digabung.

Di tabel yang sama ada kolom **Peringatan hujan lebat BMKG aktif (0–3 jam)**. Isinya nowcast dari RSS CAP BMKG. Kabupaten yang terpotong poligon peringatan yang masih berlaku menulis **Ada**, beserta teks kejadian, masa berlaku, dan tautan berkas. Kabupaten tanpa peringatan menulis **Tidak ada peringatan aktif pada RSS pukul HH:MM WIB**. Bila cuplikan gagal diambil, tulisannya **Tidak tersedia**. Peringatan yang sudah berakhir tidak ditampilkan sebagai aktif. Di atas tabel ada kisi ringkas kelas IRBI TINGGI/SEDANG × ada atau tidaknya peringatan. Nama kabupaten di dalam sel mengikuti kode wilayah. Warna sel tidak memakai tingkat Waspada, Siaga, atau Awas.

**Cara membaca.** Nowcast adalah peringatan jangka pendek, kira-kira 0–3 jam. Itu berbeda dari Peringatan Dini Curah Hujan Tinggi dasarian dan dari prakiraan berbasis dampak (IBF). Kolom ini tidak memakai prakiraan adm4 dan tidak memakai Open-Meteo. Dasar waktu dan waktu ambil cuplikan tertulis di halaman, dengan atribusi **Sumber: BMKG**.

Kolom dan catatan dasarian berbunyi **Status Peringatan Dini Curah Hujan Tinggi dasarian (Waspada/Siaga/Awas): Tautan saja – menunggu izin tertulis BMKG**. Tautannya halaman peringatan dini hujan tinggi dan potensi cuaca ekstrem BMKG. Status dasarian tidak diisi dari RSS nowcast.

## Kualitas udara

Di dalam Karhutla, buka Peta dan Data lalu pilih **Kualitas Udara (ISPU)**. Ada dua pilihan: Hari Ini dan Historis. Tidak ada Prediksi.

ISPU menggambarkan kualitas udara di stasiun pemantau. Titik pada peta adalah lokasi pengukuran. Satu stasiun tidak mewakili seluruh kabupaten atau kota. Nilai ISPU juga bukan bukti tunggal bahwa polusi berasal dari karhutla. Saat panduan ini ditulis, angka stasiun resmi belum masuk. Portal resmi hanya ditautkan. Pembanding OpenAQ tidak menampilkan angka selama kunci aksesnya tidak ada.

## Tautan cuaca BMKG

Tombol **Buka Peta FWI/Peringatan Karhutla BMKG** membuka situs BMKG di tab baru. Dasbor tidak menempelkan gambar peta BMKG. Produk citra yang ditautkan berjalan sampai H+7 sesuai produk BMKG, bukan prakiraan 14 hari. FDRS resmi pada dasbor menulis **menunggu data resmi BMKG**. Angka contoh tidak ditampilkan sebagai FDRS.

Panel hujan sekitar 14 hari, bila ada, adalah **pembanding model, bukan prakiraan BMKG**. Header kartu pembanding memuat **Pembanding, bukan produk BMKG/KLHK**. Nilai GWIS pada panel itu tidak disebut FDRS.

Pada peta hotspot ada sakelar **FWI pembanding (model ECMWF via Copernicus EMS/JRC GWIS) — Pembanding, bukan produk BMKG/KLHK**. Itu overlay WMS, bukan produk BMKG atau KLHK. Tanggal model mengikuti tanggal yang dipilih pada saringan; bila semua tanggal, tanggalnya hari ini (WIB). Legenda yang tampil adalah legenda GWIS. Kelasnya skala Canadian FWI dan tidak boleh dibandingkan dengan kelas FWI/FDRS BMKG. Bila tanggal itu tidak punya lapisan, tulisan yang muncul adalah **data belum tersedia**. Atribusi: © European Union, Copernicus EMS / JRC GWIS, plus kalimat EU Data License dari GetCapabilities.

Tabel **Pembanding model NASA GFWED (GEOS-5, analisis), bukan BMKG** memuat rata-rata dan maksimum FWI per kabupaten/kota dari berkas harian NASA. Tanggal data ditulis di atas tabel, dengan lencana **tertunda**, karena berkasnya biasanya beberapa hari di belakang. Urutannya kode wilayah, bukan peringkat, dan tidak ada kelas BMKG. Bila berkas gagal dimuat, yang tertulis **Tidak tersedia**.

Matriks **Indikator untuk Wilayah Prioritas** menyiapkan kolom yang nanti perlu diisi: FWI/FDRS, ISPU, peluang hujan lebih dari 20 mm, dan indeks kesesuaian iklim. Baris FWI/FDRS berstatus **BMKG Tautan saja; pembanding GWIS tersedia sebagai overlay**. Tiga baris lain tetap **Tautan saja**. Matriks itu tidak berisi angka kabupaten.

## Status yang perlu dibaca apa adanya

- **Aktif** atau cuplikan ok berarti berkas data terakhir berhasil disimpan.
- **Tautan saja** berarti hanya ada pranala. Tidak ada angka yang ditarik dari situ.
- **Data statis** berarti tabel terbitan, misalnya IRBI 2025, bukan kondisi hari ini.
- **Belum terhubung / menunggu data** pada Gunung Api berarti modul itu belum memantau.
- **Prototipe internal – menunggu izin tertulis BNPB** pada Banjir berarti peta dan tabel IRBI boleh dibaca di dalam, tetapi belum izin tertulis untuk pemakaian umum.
- Slot **15–20 kabupaten/kota** menunggu data resmi BMKG tentang FDRS atau potensi karhutla per kabupaten/kota. Dasbor tidak mengisi slot itu dengan urutan buatan.

IRBI 2025 berjudul **Konteks risiko jangka panjang (IRBI 2025)**. Tabel itu di bagian bawah, urutan nama, dan bukan daftar wilayah yang harus diprioritaskan minggu ini.

## Yang dasbor tidak klaim

- Tidak menetapkan peringatan resmi BNPB atau BMKG.
- Tidak menyatakan setiap titik panas adalah kebakaran hutan atau lahan yang sudah dikonfirmasi.
- Tidak menyatakan warna merah lebih berbahaya daripada warna hijau dalam arti operasi.
- Tidak menyatakan satu stasiun ISPU mewakili satu kabupaten atau kota.
- Tidak membuat prakiraan 14 hari, tidak membuat prediksi ISPU, dan tidak membuat peringkat 15–20 kabupaten dari data pembanding.
- Tidak menetapkan prioritas banjir dan tidak membuat prakiraan banjir. Peta banjir adalah indeks risiko KRB 2021, bukan peringatan dini dan bukan IRBI 2025. Nowcast BMKG pada tabel hanya menyatakan ada atau tidaknya peringatan hujan lebat 0–3 jam. Itu bukan prakiraan banjir dan bukan status dasarian.
- Tidak memantau gunung api. Modul itu masih menunggu data resmi.

Footer yang harus tetap ada: **Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.**
