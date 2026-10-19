# Arahan pemilik (19 Okt 2026): ISPU resmi dan pembanding kualitas udara — wajib diikuti

Tambahkan bagian Kualitas Udara di dalam tab Karhutla. Tampilkan data hari ini sebagai tampilan awal, lalu sediakan pilihan untuk melihat riwayat jika datanya memang tersedia. Jangan membuat prakiraan ISPU.

A. Data resmi ISPU KemenLH
- Jadikan portal resmi ISPU KemenLH (https://ispu.kemenlh.go.id/app/#/) sebagai sumber utama.
- Periksa apakah tersedia API publik terdokumentasi atau mekanisme embed yang secara jelas diizinkan untuk digunakan.
- Jika tersedia, gunakan sesuai dokumentasi dan ketentuan sumber. Tampilkan nama stasiun, lokasi, nilai dan kategori ISPU, parameter kritis, waktu pengamatan, waktu pengambilan data, serta tautan sumber.
- Jika tidak ada API atau izin penggunaan otomatis yang jelas, jangan mengambil data dengan scraping endpoint internal atau cara yang mengakali pembatasan. Jangan menampilkan angka ISPU hasil salinan manual seolah-olah diperbarui otomatis.
- Dalam kondisi tersebut, tampilkan peta atau daftar stasiun yang datanya belum terhubung, dengan tautan langsung ke portal ISPU KemenLH. Bila portal mengizinkan embed, embed halaman sumber dan pertahankan identitas serta atribusinya.
- Jangan menganggap satu stasiun mewakili seluruh kabupaten/kota. Wilayah tanpa stasiun atau data terbaru harus diberi label "Tidak ada data stasiun" atau "Data belum tersedia".
- Riwayat hanya ditampilkan sesuai periode yang benar-benar disediakan sumber. Jangan menyebut ringkasan 24 jam sebagai riwayat satu minggu.

B. Pembanding OpenAQ
- Periksa ketersediaan stasiun dan data Indonesia melalui dokumentasi resmi OpenAQ API (https://docs.openaq.org/). API memerlukan akun/API key; jangan membuat akun atau key baru, mengubah GitHub Secrets, atau meminta akses tanpa persetujuan saya.
- Jika akses yang sah sudah tersedia dan ada data yang relevan, tampilkan pengukuran sebagai "Pembanding kualitas udara — OpenAQ", bukan ISPU resmi.
- Cantumkan nama stasiun, penyedia asal bila tersedia, polutan, nilai, satuan, waktu pengukuran, waktu pengambilan, dan tautan sumber.
- Jangan mengubah konsentrasi PM2.5/PM10 menjadi nilai ISPU, kecuali ada metode konversi resmi yang sesuai dan sumbernya dicantumkan. Jangan menganggap data OpenAQ mewakili wilayah yang tidak memiliki stasiun.

C. Pembanding model Open-Meteo/CAMS
- Jika berguna untuk konteks asap, gunakan Open-Meteo Air Quality API (https://open-meteo.com/en/docs/air-quality-api) untuk menampilkan konsentrasi polutan berbasis model, terutama PM2.5.
- Beri label "Model kualitas udara CAMS — pembanding, bukan pengukuran stasiun dan bukan ISPU KemenLH".
- Tampilkan waktu prakiraan, resolusi/cakupan model, dan sumber. Jangan menampilkan hasilnya sebagai kondisi terukur di suatu stasiun.
- Jangan membuat atau menyebut prakiraan ISPU. Jika data model tidak tersedia atau terlalu kasar untuk kesimpulan tingkat kabupaten/kota, jelaskan keterbatasannya.

D. Tampilan peta dan tabel
- Sediakan peta stasiun yang benar-benar memiliki koordinat sumber. Bedakan simbol stasiun resmi KemenLH, stasiun/data OpenAQ, dan sel/grid model CAMS.
- Sertakan legenda, filter sumber, tanggal/periode, waktu pembaruan, serta status data.
- Tabel minimal berisi: sumber dan jenis data, lokasi/stasiun atau koordinat, indikator, nilai dan satuan, kategori indeks bila memang disediakan sumber, waktu observasi/prakiraan, dan tautan sumber.
- Jangan memberi warna kategori ISPU Indonesia pada nilai AQI OpenAQ atau indeks model dari standar negara/lembaga lain. Pertahankan skala dan kategori asli masing-masing sumber.
- Jika sumber tidak dapat diakses, tampilkan status gagal/belum tersedia dengan keterangan singkat; jangan mengganti data dengan data contoh atau angka lama tanpa penanda.

E. Laporan bila terhambat
Jika integrasi ISPU resmi membutuhkan izin, API key, akun baru, perubahan GitHub Secrets, atau konfirmasi KemenLH, jangan lakukan langkah tersebut. Laporkan sumber yang terhambat, izin/akses yang dibutuhkan, dan opsi aman sementara. Jangan menghubungi instansi atau membuat/mengubah akses tanpa persetujuan saya.
