# Prompt inspeksi dasbor

Salin bagian di bawah ini bila meminta AI lain memeriksa situs yang sedang tayang. Jangan memakai berkas repositori sebagai pengganti halaman. Buka URL, klik sendiri, dan catat kalimat yang benar-benar terlihat.

```
Periksa situs https://rixaga.github.io/karhutla-dashboard/ pada peramban.
Ini prototipe internal Dit. PD BNPB. Jangan mengubah angka, jangan mengisi data yang kosong, dan jangan menyebut data contoh sebagai data resmi.

Navigasi utama hanya tiga modul: Karhutla, Banjir, Gunung Api.
Di dalam Karhutla ada halaman: Ringkasan, Peta dan Data, Logika Pemantauan, Sumber Data, Glosarium.
Di dalam Karhutla, Peta dan Data punya lapisan Kualitas Udara (ISPU).

Periksa tiap halaman. Untuk setiap butir tulis SUDAH, SEBAGIAN, atau BELUM, plus kalimat yang terlihat.
- Status jujur: sumber yang gagal atau hanya tautan tidak ditulis seolah tersambung.
- Data contoh tidak disajikan sebagai data resmi.
- IRBI 2025 hanya konteks jangka panjang, di bagian bawah, bukan urutan prioritas 14 hari.
- Slot 15–20 kabupaten/kota tidak diisi peringkat bila data resmi BMKG belum ada. Status yang diharapkan: menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota).
- FWI/SPARTAN BMKG hanya tautan. Horizon produk sampai H+7, bukan prakiraan 14 hari. Citra tidak tertanam.
- Kualitas Udara (ISPU) hanya Hari Ini dan Historis, tanpa Prediksi. Titik adalah stasiun, bukan seluruh kabupaten/kota.
- Warna titik panas adalah confidence deteksi satelit, bukan tingkat bahaya atau tingkat kebakaran. Nilai asli confidence tetap terlihat.
- Titik panas hanya di dalam Indonesia. Periksa sekitar Malaysia, Singapura, Brunei, Timor Leste, dan Papua Nugini.
- Atribusi sumber terlihat, termasuk NASA FIRMS, BIG, dan CARTO/OpenStreetMap pada peta.
- Lebar 390 piksel tidak memotong isi, dan footer tetap: Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.
```

# Hasil inspeksi 18 Oktober 2026

Situs yang dibuka memakai bundel `index-Ccz34wMm.js`, terbit dari commit `1d3b103` di `main`. Cuplikan hotspot yang termuat: 32.685 baris, tanggal 13–17 Oktober 2026, lintasan terbaru 17 Oktober 2026 pukul 19.25 UTC. Manifest `generated_at` 17 Oktober 2026 pukul 22.58 UTC.

| Butir | Hasil | Yang terlihat |
| --- | --- | --- |
| URL tayang | SUDAH | `https://rixaga.github.io/karhutla-dashboard/` memuat Ringkasan Karhutla. |
| Modul Karhutla, Banjir, Gunung Api | SUDAH | Tiga modul itu ada di navigasi. Tidak ada modul keempat. |
| Ringkasan: peta hotspot | SUDAH | Peta memuat Indonesia, legenda **Confidence deteksi satelit**, tombol kembali ke seluruh Indonesia, dan waktu pengambilan. |
| Warna confidence | SUDAH | Pada zoom kecil ada kelompok abu-abu plus titik hijau, kuning, dan merah. Popup menyimpan nilai asli, misalnya `n`. |
| Confidence bukan tingkat bahaya | SUDAH | Teks di peta menulis bahwa confidence bukan tingkat bahaya dan bukan tingkat kebakaran. |
| Hotspot hanya di Indonesia | SUDAH | Pada berkas peta yang situs muat, bujur 95,24565–141,0192 dan lintang -10,7479–5,45083. Tidak ada titik dalam 0,25 derajat dari pusat Singapura, Kuala Lumpur, Johor Bahru, Kuching, Bandar Seri Begawan, Dili, atau Port Moresby. Dua titik terdekat dengan Singapura berada di Kota Batam (Sagulung dan Nongsa). |
| Nama wilayah BIG | SEBAGIAN | Sumber tertulis **BIG – Batas Administrasi Desa/Kelurahan**, edisi Mei 2021, revisi kecamatan 27 Desember 2022. Contoh terisi: Dambung Raya (`63.09.12.2006`), Bintang Ara, Tabalong, Kalimantan Selatan. Dari 32.685 titik, 1.220 punya nama desa dan 31.465 tertulis **Wilayah desa belum teridentifikasi**. |
| Tabel desa dan saringan | SUDAH | Ada di Ringkasan dan di Peta dan Data. Saringan tanggal, satelit, provinsi, kab/kota, kecamatan, desa, dan kelas confidence ada. Memilih baris Dambung Raya memusatkan peta dan menyorot baris. |
| Matriks indikator | SUDAH | Ringkasan menampilkan **Indikator untuk Wilayah Prioritas**. Empat baris (FWI/FDRS, ISPU, Peluang Hujan >20 mm, Indeks Kesesuaian Iklim) berstatus **Tautan saja** dan tidak memuat angka kabupaten. |
| Slot 15–20 kabupaten/kota | SUDAH | Teksnya: menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota). Tidak ada daftar peringkat terisi. |
| IRBI sebagai konteks | SUDAH | Di Peta dan Data, tabel IRBI kabupaten ada di bawah peta dan disebut data buku 2025, bukan urutan 14 hari. |
| FWI BMKG tautan saja, H+7 | SUDAH | Tombol **Buka Peta FWI/Peringatan Karhutla BMKG** membuka tautan. Atribusi BMKG terlihat. Citra tidak tertanam. Matriks menyebut horizon produk hingga H+7, bukan 14 hari. |
| ISPU tanpa Prediksi | SUDAH | Lapisan **Kualitas Udara (ISPU)** punya Hari Ini dan Historis. Kata Prediksi tidak ada di lapisan itu. Kalimat stasiun pemantau terlihat utuh. |
| ISPU angka resmi | BELUM | Status data resmi: belum tersedia. Portal hanya ditautkan. OpenAQ menulis bahwa tanpa kunci tidak ada konsentrasi µg/m³. |
| Banjir | BELUM | Status **Belum terhubung / menunggu data**. Tidak ada peta atau angka. Indikator disebut rencana. |
| Gunung Api | BELUM | Status **Belum terhubung / menunggu data**. Tidak ada tingkat aktivitas. MAGMA, PVMBG, PPID ESDM, dan VAAC Darwin hanya tautan. |
| Logika, Sumber Data, Glosarium | SUDAH | Ketiga halaman ada di navigasi dan terbuka. |
| Atribusi peta | SUDAH | Peta menulis OpenStreetMap dan CARTO. Titik menulis NASA FIRMS. Wilayah menulis BIG. |
| Layar 390 piksel | SUDAH | Peta selebar 340 piksel dan tinggi 320 piksel. Halaman tidak melebar dari layar. Footer tetap. |
| Footer | SUDAH | **Prototipe internal Dit. PD BNPB. Jangan dipublikasikan tanpa persetujuan.** |
| Pesan bila BIG gagal | SEBAGIAN | Kode tayang memuat kalimat bahwa penyaringan wilayah dan batas Indonesia pada pembaruan itu tidak lengkap. Cuplikan yang sedang tayang punya `wilayah_gagal` 0, jadi kalimat itu tidak muncul di halaman. |

# Celah dari spesifikasi peta-dahulu

- Banjir dan Gunung Api belum punya peta, dan belum punya Hari Ini, Prediksi, atau Historis.
- Hotspot Karhutla memakai jendela 24 jam, 48 jam, dan 7 hari, bukan tiga tab bernama Hari Ini, Prediksi, dan Historis.
- Tabel desa ada di bawah peta, bukan di kolom kanan pada layar lebar.
- Arsip 60 hari dan sinyal berita tidak ada sebagai tampilan.
- Lapisan desa BIG edisi Mei 2021 hanya mencakup sebagian desa, jadi sebagian besar titik tidak punya nama desa.
- Angka ISPU stasiun resmi belum terisi.
- Tampilan "pembaruan berikutnya" pada manifest masih 18 Oktober 2026 pukul 00.00 UTC (07.00 WIB) ketika inspeksi dilakukan sesudah jam itu.
