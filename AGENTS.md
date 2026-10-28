# AGENTS.md

Standar untuk agen yang mengubah repositori `rixaga/karhutla-dashboard`. Baca berkas ini sebelum menyentuh kode. Untuk pekerjaan yang sesuai, baca juga satu skill di `.grok/skills/*/SKILL.md`.

## Bagaimana skill dipakai

Cursor memuat `AGENTS.md` di akar repositori sebagai instruksi proyek. Tidak ada pengaturan tambahan setelah berkas ini ada di cabang yang dikerjakan agen.

`.grok/skills/` bukan direktori skill bawaan Cursor (bawaan Cursor ada di `.cursor/skills` atau skill pengguna). Paket ini sengaja diletakkan di `.grok/skills` agar terpisah dari skill produk. Agen memilih skill dengan membaca `SKILL.md` yang namanya cocok dengan tugas, mengikuti tabel di bawah. Sesi Grok yang membuka repositori ini melakukan hal yang sama: `AGENTS.md` dulu, lalu satu skill.

Tidak ada kunci, layanan berbayar, atau konfigurasi lain. Menggabungkan pull request ini ke `main` membuat berkasnya tersedia bagi agen berikutnya.

| Skill | Baca saat |
| --- | --- |
| `karhutla-data-engineer` | Fetch, manifes, `data/live`, FIRMS, BMKG, BNPB, cap waktu |
| `geospatial-gis` | Leaflet, lapisan, koordinat, batas wilayah |
| `dashboard-ui-ux` | Halaman, navigasi, kartu, grafik, salinan Bahasa Indonesia |
| `fire-risk-analyst` | Ambang, tren, FDRS, daftar perhatian, peringkat 14 hari |
| `data-source-validator` | Status sumber, lisensi, kesegaran, data contoh vs resmi |
| `github-pages-deployer` | Actions, Pages, base path, secret |
| `dashboard-qa` | `npm run check`, pratinjau, regresi |
| `indonesia-geodata` | Nama wilayah, kode adm4, WIB, dasarian |

## Tumpukan

Vite 6, React 18, Leaflet, Recharts. Situs statis. Rute hash. GitHub Pages lewat Actions, prefiks `/karhutla-dashboard/`. Pembaruan terjadwal: workflow cron `17 */3 * * *` dan `47 1-23/3 * * *` UTC menulis `data/live/` dan manifes; penjaga `7 * * * *` memicu pembaruan bila cuplikan lebih tua dari 4 jam. Situs membaca snapshot itu. Berkas contoh tidak ditampilkan bila snapshot tidak ada. Secret Actions hanya `FIRMS_MAP_KEY`. Pada komit `main` saat berkas skill ini pertama kali ditambahkan, jadwal itu belum tentu sudah tergabung. Ikuti kontraknya. Jangan membuat jalur data lain.

## Prinsip

- Perubahan kecil lewat pull request ke `main`. Jangan force-push. Jangan mengubah visibilitas repositori atau menyalakan Pages di luar workflow yang ada.
- Jangan menambah dependensi berbayar, proxy CORS, atau server aplikasi.
- Jangan mengarang endpoint, kode wilayah, atau riwayat. Jika produk resmi tidak punya API yang terdokumentasi, statusnya **Tautan saja**.
- Data contoh tidak ditampilkan. Sumber resmi yang belum tersambung berstatus **Tautan saja** atau **Tidak tersedia**.
- Hotspot atau titik panas adalah deteksi satelit, bukan kebakaran terkonfirmasi.
- Batas administrasi resmi, bukan kotak koordinat. Tanpa batas itu: **Belum terpetakan** / **belum dapat dipetakan secara administratif**.
- Horizon prakiraan hanya sepanjang produk resmi. API prakiraan BMKG: **3 hari**. Citra SPARTAN: **hingga H+7 sesuai produk BMKG**. Dasarian bukan prakiraan harian 14 hari.
- Indikator gabungan adalah prototipe. Tuliskan rumus, bobot, ambang, dan periode. Bukan peringatan resmi.
- Lapisan terbuka memakai lencana persis **Pembanding (data terbuka, bukan resmi)** dan tidak masuk skor peringatan.
- Setiap angka menampilkan waktu ambil dalam WIB dan waktu observasi atau terbitan sumbernya.
- Jangan mengisi tanggal kosong, citra yang hilang, atau peringkat yang belum ada datanya.
- Peringkat 15–20 kabupaten/kota untuk 14 hari berstatus **menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota)** sampai ada produk resmi. Jangan menyusunnya dari citra prakiraan.
- Kalimat identitas: `Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.` Edisi v0.2 di `/v2/` memakai kalimat yang sama dengan `v0.2`. Akar situs tetap v0.1.

## Status sumber

Hanya: **Aktif**, **Data statis**, **Snapshot/arsip**, **Tautan saja**, **Belum terhubung**, **Gagal/stale**.

Citra asap: **Tautan saja – menunggu izin BMKG**. Mekanisme arsip boleh ada di kode, tetapi mati secara bawaan (`bmkg.arsipCitra` bukan `true`). Jangan mengunduh atau memotong citra.

## Istilah

- **Karhutla** — kebakaran hutan dan lahan.
- **Hotspot / titik panas** — deteksi satelit. **Titik api** — baru setelah verifikasi, dan dasbor ini tidak menampilkannya sebagai fakta.
- **FIRMS, VIIRS, MODIS, NRT** — produk NASA. Tanpa `FIRMS_MAP_KEY`, jangan menyebut FIRMS tersambung.
- **BMKG** — atribusi **Sumber: BMKG**. API resmi untuk mesin (ketentuan 8 Juli 2026, Pasal 4e). Dilarang mengorek antarmuka web (8a). Integrasi ke aplikasi pihak ketiga perlu izin tertulis (9c), melalui PTSP / Biro Hukum, Humas, dan Kerja Sama (`https://ptsp.bmkg.go.id/`). Citra utuh, logo tetap (8c–d, 9b).
- **FDRS / SPARTAN** — sistem peringkat bahaya kebakaran BMKG. Komponen FWI, FFMC, DMC, DC, ISI, BUI tidak dihitung di dasbor dan tidak diambil dari PNG.
- **ISPU** — indeks resmi mutu udara. Portal `https://ispu.kemenlh.go.id/`. Jangan memakai token dari berkas JavaScript situs itu.
- **inaRISK, IRBI** — produk BNPB. IRBI 2025 yang disimpan adalah tabel buku, tahunan, bukan peta.
- **DIBI / Satu Data BNPB** — kompilasi CKAN `data-bencana-indonesia`, lisensi ODC-BY. Yang boleh disimpan untuk karhutla adalah rangkaian nasional jenis kebakaran hutan dan lahan. Tabel kabupaten 2010–2024 mencakup semua jenis bencana. Tabel kabupaten 2024 (`a4daec53-1119-43ef-b05e-00ec3a4c42a4`) punya kolom `BANJIR` dan hanya dipakai modul Banjir; baris yang tidak ada bukan nol.
- **CAP** — peringatan dini cuaca BMKG dari RSS nowcast, konteks opsional, bukan prospek musiman.
- **MAGMA / PVMBG** — `https://magma.esdm.go.id/` adalah **Tautan saja**. Jangan memakai pengorek pihak ketiga. Permintaan data tingkat aktivitas lewat PPID ESDM (`https://ppid.esdm.go.id/`) kepada PVMBG / Badan Geologi.
- **WIB** — Asia/Jakarta, UTC+7. **Dasarian** — periode sekitar sepuluh hari di dalam bulan pada layanan iklim BMKG.
- **SiPongi+** — portal pemantauan, bukan API yang dipakai dasbor.

## Sumber yang sudah diperiksa (17 Oktober 2026)

Boleh diintegrasikan tanpa kunci: API prakiraan cuaca BMKG; RSS CAP nowcast; CKAN DIBI untuk rangkaian nasional dan untuk kolom BANJIR 2024 pada modul Banjir; layanan peta inaRISK dan BIG untuk prototipe Banjir, hanya di memori. Kegagalan layanan itu tidak boleh menggagalkan Karhutla.

Hanya tautan: citra SPARTAN H+0..H+7, prediksi hujan dasarian, peringatan dini curah hujan tinggi, citra sebaran asap, potensi cuaca ekstrem, potensi hujan sepekan, MAGMA.

## Pemeriksaan

`npm run check` harus lulus. Perubahan antarmuka diverifikasi di pratinjau. Diff tidak memuat kunci API, token `eyJ`, atau `FIRMS_MAP_KEY` yang terisi.
