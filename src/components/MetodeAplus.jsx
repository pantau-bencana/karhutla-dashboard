import { useEffect } from "react";
import { contohSkorUtama } from "../lib/aplus.js";
import { formatAngka, formatWib } from "../lib/format.js";
import { Term } from "./Term.jsx";

const RUJUKAN = [
  {
    judul: "de Groot, W.J., Field, R.D., Brady, M.A., Roswintiarti, O., Mohamad, M. (2007). Development of the Indonesian and Malaysian Fire Danger Rating Systems.",
    tautan: [
      ["DOI 10.1007/s11027-006-9043-8", "https://doi.org/10.1007/s11027-006-9043-8"],
      ["PDF penulis", "http://www.columbia.edu/~rf2426/index_files/deGrootetal2006MITI.pdf"],
      ["Van Wagner 1987", "https://ostrnrcan-dostrncan.canada.ca/entities/publication/d96e56aa-e836-4394-ba29-3afe91c3aa6c"],
    ],
    catatan: "Ambang FFMC dan DC pada tabel di atas. Van Wagner (1987), Development and structure of the Canadian Forest Fire Weather Index System, Forestry Technical Report 35, adalah dokumen sistem FWI Kanada. Dasbor tidak menghitung komponen FWI sendiri.",
  },
  {
    judul: "Field, R.D., Wang, Y., Roswintiarti, O., Guswanto (2004). A drought-based predictor of recent haze events in western Indonesia.",
    tautan: [["DOI 10.1016/j.atmosenv.2004.01.011", "https://doi.org/10.1016/j.atmosenv.2004.01.011"]],
    catatan: "Asap berat mungkin di atas DC sekitar 388 (selang 95%: 377–399). Ambang itu regional, bukan per kabupaten/kota.",
  },
  {
    judul: "Dymond, C.C., Field, R.D., Roswintiarti, O., Guswanto (2005). Using satellite fire detection to calibrate components of the Fire Weather Index System in Malaysia and Indonesia.",
    tautan: [["DOI 10.1007/s00267-003-0241-9", "https://doi.org/10.1007/s00267-003-0241-9"]],
    catatan: "Kalibrasi FFMC dengan hotspot satelit 1994–2000.",
  },
  {
    judul: "ASMC, Fire Danger Rating System (produk harian MetMalaysia untuk ASEAN).",
    tautan: [
      ["Halaman FDRS", "https://asmc.asean.org/asmc-fire/"],
      ["DC", "https://asmc.asean.org/asmc-fire-dc/"],
      ["FFMC", "https://asmc.asean.org/asmc-fire-ffmc/"],
      ["FWI", "https://asmc.asean.org/asmc-fire-fwi/"],
    ],
    catatan: "Tafsiran kelas mengikuti de Groot. Peta ASMC tidak diunduh.",
  },
  {
    judul: "ASMC Alert Levels.",
    tautan: [["Halaman peringatan", "https://asmc.asean.org/asmc-alerts/"]],
    catatan: "Dasar syarat hotspot pada minimal 2 hari berturut-turut. Tingkat peringatan ASMC sendiri tidak ditiru.",
  },
  {
    judul: "Field, R.D., van der Werf, G.R., Shen, S.S.P. (2009). Human amplification of drought-induced biomass burning in Indonesia since 1960.",
    tautan: [["DOI 10.1038/ngeo443", "https://doi.org/10.1038/ngeo443"]],
    catatan: "Defisit hujan musiman memicu kebakaran. Datanya bukan ambang 14 hari.",
  },
  {
    judul: "Taufik, M. dkk. (2017). Amplification of wildfire area burnt by hydrological drought in the humid tropics.",
    tautan: [["DOI 10.1038/nclimate3280", "https://doi.org/10.1038/nclimate3280"]],
    catatan: "Kekeringan air tanah memperbesar luas terbakar. Dasbor tidak punya muka air gambut.",
  },
  {
    judul: "Mortelmans, J. dkk. (2025). Using hydrological modelling to improve the Fire Weather Index system over tropical peatlands.",
    tautan: [["DOI 10.1071/WF24057", "https://doi.org/10.1071/WF24057"]],
    catatan: "Kode kelembapan FWI kurang mewakili gambut tropis.",
  },
  {
    judul: "GWIS, Fire Danger Forecast (dokumentasi teknis Copernicus EMS/JRC).",
    tautan: [["Dokumentasi", "https://gwis.jrc.ec.europa.eu/about-gwis/technical-background/fire-danger-forecast"]],
    catatan: "Sumber angka FWI, FFMC, dan DC model ECMWF. Kelas global GWIS tidak dipakai sebagai ambang Indonesia.",
  },
  {
    judul: "Camia, A., Amatulli, G. (2010). Climatology of FWI over Europe: fire danger anomalies and index percentile rankings.",
    tautan: [["PDF EFFIS", "https://data.effis.emergency.copernicus.eu/effis/reports-and-publications/effis-related-publications/Camia_and_Amatulli_2010__ICFFR-2010_B04.pdf"]],
    catatan: "Persentil pada GWIS dibanding klimatologi satu lokasi. Metode A+ memakai peringkat antar-kab/kota, bukan antar-waktu.",
  },
  {
    judul: "Di Giuseppe, F. dkk. (2016). The potential predictability of fire danger provided by numerical weather prediction.",
    tautan: [["DOI 10.1175/JAMC-D-15-0297.1", "https://doi.org/10.1175/JAMC-D-15-0297.1"]],
    catatan: "Sistem GEFF yang menghasilkan FWI pada GWIS. Keterampilan prakiraan menurun seiring waktu tunggu.",
  },
  {
    judul: "Vitolo, C. dkk. (2020). ERA5-based global meteorological wildfire danger maps.",
    tautan: [["DOI 10.1038/s41597-020-0554-z", "https://doi.org/10.1038/s41597-020-0554-z"]],
    catatan: "Peta bahaya kebakaran meteorologis global berbasis ERA5, bagian rantai GWIS/EFFIS.",
  },
  {
    judul: "Setzer, A.W., Sismanoglu, R.A., dos Santos, J.G.M. (2019). Metode perhitungan Risco de Fogo INPE, versi 11.",
    tautan: [
      ["URI INPE", "http://urlib.net/sid.inpe.br/mtc-m21c/2019/11.21.11.03"],
      ["PDF ringkas", "https://dataserver-coids.inpe.br/queimadas/queimadas/Publicacoes-Impacto/documentos/RiscoFogo_Sucinto_v11_2019.pdf"],
    ],
    catatan: "Contoh lembaga yang menaikkan risiko bila ada hotspot terkini. Konstanta dan faktor vegetasinya tidak disalin.",
  },
  {
    judul: "Open-Meteo, lisensi ensemble ECMWF yang dipakai untuk peluang hujan.",
    tautan: [["Lisensi", "https://open-meteo.com/en/licence"]],
    catatan: "CC BY 4.0, nonkomersial. Wajib disebut. Tidak dipakai bila situs menjadi komersial.",
  },
];

const FAQ = [
  {
    tanya: "Apakah ini data resmi?",
    jawab:
      "Bukan. Pantau Bencana v0.1 adalah proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH. Daftar prioritas berjenis pemodelan pihak ketiga. Angkanya disusun dari model ECMWF lewat GWIS dan Open-Meteo, deteksi NASA FIRMS, dan IRBI 2025. Ini bukan prakiraan resmi BMKG/BNPB, bukan FDRS BMKG, dan bukan status siaga.",
  },
  {
    tanya: "Kenapa kab/kota dengan banyak hotspot tidak masuk 15 besar?",
    jawab:
      "Daftar 15 adalah urutan skor potensi di antara yang lolos syarat, paling banyak 15 nama. Syaratnya data lengkap, peluang 14 hari tanpa hari hujan di atas 20 mm minimal 50%, serta FFMC minimal 78 pada minimal 3 dari 9 hari atau DC minimal 260. Kab/kota yang hotspotnya banyak tetapi tidak lolos syarat, atau lolos tetapi skornya di bawah 15 teratas, tidak dipaksa masuk daftar. Aktivitas saat ini tetap ditampilkan di blok terpisah bila jumlahnya mencapai ambang nasional dan terdeteksi pada minimal 2 hari berturut-turut.",
  },
  {
    tanya: "Apa beda FWI dan FDRS BMKG?",
    jawab:
      "FWI pada daftar dan pada overlay peta adalah angka model ECMWF dari Copernicus GWIS, bukan produk BMKG. FDRS dan potensi karhutla BMKG hanya tautan ke SPARTAN dan halaman BMKG. Citra itu tidak diunduh dan tidak dibaca angkanya. Horizon citra SPARTAN mengikuti produk BMKG, hingga H+7, bukan 14 hari. Kelas Canadian FWI pada legenda GWIS tidak disamakan dengan kelas FDRS BMKG. Ambang FFMC dan DC di daftar berasal dari literatur, diterapkan pada nilai model.",
  },
  {
    tanya: "Kenapa 14 hari tapi FWI 9 hari?",
    jawab:
      "Peluang hujan dihitung dari ensemble ECMWF untuk 14 hari, termasuk hari berjalan. Layanan GWIS yang dipakai mengembalikan FWI, FFMC, dan DC sekitar 9 hari (H0 sampai H8), bukan 14 hari. Karena itu judulnya menyebut kedua horizon. Prakiraan cuaca terbuka BMKG yang tersambung tetap 3 hari dan tidak diperpanjang.",
  },
  {
    tanya: "Apa itu hotspot dan kenapa bisa bukan kebakaran?",
    jawab:
      "Hotspot di dasbor adalah deteksi panas satelit NASA FIRMS (VIIRS Suomi-NPP), bukan kebakaran yang sudah dikonfirmasi di lapangan. Keyakinan deteksi (rendah, nominal, tinggi) adalah keyakinan satelit, bukan tingkat bahaya. Sumber panas lain, misalnya gunung api atau industri, dapat ikut terdeteksi. Nama wilayah diisi dari layanan BIG bila layanan itu menjawab; nama yang kosong tidak ditebak.",
  },
  {
    tanya: "Seberapa sering data diperbarui?",
    jawab:
      "Cuplikan hotspot dan sumber terjadwal lain diambil pada dua slot tiap sekitar 3 jam (menit 17 dan 47 UTC, yaitu 07.17, 08.47, dan seterusnya sampai 05.47 WIB). Itu cuplikan, bukan waktu nyata. Prioritas kesiapsiagaan dihitung sekali sehari, sekitar 19.32 WIB. Bila ensemble lebih dari 36 jam, FWI lebih dari 48 jam atau kurang dari 5 hari, atau kab/kota lengkap kurang dari 30, daftar ditulis Belum tersedia. Blok hotspot disembunyikan bila cuplikan FIRMS lebih dari 24 jam.",
  },
  {
    tanya: "Kenapa ISPU hanya tautan?",
    jawab:
      "Portal ISPU tidak menyediakan API publik yang terdokumentasi. Pada Satu Data KemenLH tidak ada dataset deret waktu ISPU harian, per jam, atau per stasiun (diperiksa 19 Oktober 2026). Token di dalam aplikasi web tidak dipakai. Hari Ini dan Historis tidak diisi dari sumber lain, dan tidak ada prediksi ISPU. Indeks Kualitas Udara 2024 adalah tabel tahunan terpisah, bukan ISPU dan bukan kondisi harian.",
  },
  {
    tanya: "Kenapa status dasarian diisi manual?",
    jawab:
      "Peringatan Dini Curah Hujan Tinggi dasarian BMKG dibaca sebagai halaman resmi, bukan sebagai tabel per kabupaten yang diunduh otomatis. Untuk modul Banjir Aceh dan Bengkulu, status disalin ke berkas CSV. Labelnya: disalin manual dari halaman resmi BMKG, bukan integrasi data otomatis. Citra tidak diunduh dan tidak dipotong. Baris yang belum diisi tetap kosong, bukan nol.",
  },
];

const DIGIT_NILAI = { I1: 3, I2: 3, I3: 2, I4: 0 };

function angka(value, digits) {
  return formatAngka(value, digits);
}

function pecahanPeringkat(item) {
  if (item.peringkat == null) return "—";
  if (item.n <= 1) return "1";
  const atas = item.urutan - 1;
  const bawah = item.n - 1;
  if (Number.isInteger(atas) && Number.isInteger(bawah)) return `${atas}/${bawah}`;
  return angka(item.peringkat, 6);
}

function KolomDanGerbang() {
  return (
    <>
      <h3>Kolom pada tabel</h3>
      <p>Angka di daftar prioritas dihitung seperti ini. <Term id="ffmc">FFMC</Term> dan <Term id="dc">DC</Term> hanya gerbang. Keduanya tidak masuk skor.</p>
      <div className="table-wrap wrap-cells">
        <table>
          <thead>
            <tr>
              <th scope="col">Kolom</th>
              <th scope="col">Cara hitung</th>
              <th scope="col">Peran</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Titik</th>
              <td>Paling banyak 5 simpul pada grid 0,25° yang jatuh di dalam batas <Term id="kabkota">kabupaten/kota</Term> <Term id="big">BIG</Term>. Simpul pertama yang paling dekat ke pusat kumpulan, lalu yang paling jauh dari simpul yang sudah dipilih. Bila tidak ada simpul di dalam batas, dipakai 1 titik wakil.</td>
              <td>Sampel. Bukan indikator.</td>
            </tr>
            <tr>
              <th scope="row"><Term id="fwi">FWI</Term> <Term id="p75">P75</Term></th>
              <td>Pada tiap hari prakiraan GWIS, FWI di titik kabupaten itu diringkas menjadi P75. P75 memakai persentil tipe 7: posisi (n−1)×0,75, lalu interpolasi linier. I1 adalah rata-rata P75 harian itu, paling banyak 9 hari.</td>
              <td>Masuk skor (I1).</td>
            </tr>
            <tr>
              <th scope="row">FWI (Maks)</th>
              <td>FWI tertinggi pada satu titik, pada salah satu hari prakiraan.</td>
              <td>Informasi saja. Tidak masuk skor.</td>
            </tr>
            <tr>
              <th scope="row">Hari <Term id="ffmc">FFMC</Term>≥78</th>
              <td>Jumlah hari yang P75 FFMC-nya minimal 78.</td>
              <td>Gerbang cuaca. Tidak masuk skor.</td>
            </tr>
            <tr>
              <th scope="row"><Term id="dc">DC</Term> maks</th>
              <td>Nilai tertinggi dari P75 DC harian.</td>
              <td>Gerbang cuaca. Tidak masuk skor.</td>
            </tr>
            <tr>
              <th scope="row"><Term id="ensemble">P(14 hari tanpa &gt;20 mm)</Term></th>
              <td>Pada tiap titik, bagian anggota ensemble ECMWF IFS 0,25° (Open-Meteo, model ecmwf_ifs025) yang tidak punya satu hari hujan harian di atas 20 mm selama 14 hari, zona waktu Asia/Jakarta. Titik dengan kurang dari 14 hari atau kurang dari 51 anggota dibuang. I2 adalah P75 dari bagian itu antar titik.</td>
              <td>Masuk skor (I2).</td>
            </tr>
            <tr>
              <th scope="row"><Term id="irbi">IRBI 2025</Term></th>
              <td>Indeks karhutla dari buku IRBI BNPB 2025, data statis, disambungkan menurut nama provinsi dan kabupaten. Nilainya tidak diubah.</td>
              <td>Masuk skor (I3).</td>
            </tr>
            <tr>
              <th scope="row"><Term id="hotspot">Hotspot</Term></th>
              <td>Jumlah deteksi NASA FIRMS dengan keyakinan nominal atau tinggi pada cuplikan. Bila berkas hotspot ada tetapi kabupaten tidak muncul, jumlahnya 0. Bukan kebakaran terkonfirmasi.</td>
              <td>Masuk skor (I4).</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3>Gerbang</h3>
      <p>Baris masuk daftar hanya bila ketiga gerbang terpenuhi. Peringkat dihitung di antara kabupaten/kota yang lolos gerbang data, termasuk yang tidak lolos gerbang kering atau cuaca.</p>
      <div className="table-wrap wrap-cells">
        <table>
          <thead>
            <tr>
              <th scope="col">Gerbang</th>
              <th scope="col">Syarat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Data lengkap (data_ok)</th>
              <td>Hari GWIS minimal 5, I2 ada, dan I3 atau I4 ada.</td>
            </tr>
            <tr>
              <th scope="row">Kering</th>
              <td>I2 minimal 0,5.</td>
            </tr>
            <tr>
              <th scope="row">Cuaca</th>
              <td>P75 FFMC minimal 78 pada minimal 3 hari, atau DC maks minimal 260.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3>Skor</h3>
      <p>Di antara kabupaten/kota yang data lengkap, tiap indikator diubah menjadi <Term id="peringkat">peringkat</Term> persen. Nilai diurutkan dari kecil ke besar. Urutan adalah posisi mulai dari 1; nilai yang sama mendapat rata-rata urutan. Peringkat = (urutan−1)/(n−1). Kabupaten yang tidak punya indikator itu tidak masuk n indikator tersebut. Skor adalah rata-rata peringkat yang tersedia, bobot sama. Baris yang lolos ketiga gerbang diurutkan menurut skor menurun; bila skor sama, menurut kode. Daftar menampilkan 15 teratas, atau lebih pendek bila yang lolos lebih sedikit.</p>
      <p>Skor ini relatif terhadap kabupaten/kota pada cuplikan hari yang sama. Skor hari ini tidak dibandingkan dengan skor hari lain.</p>
    </>
  );
}

function ContohHitung({ prioritas }) {
  const contoh = contohSkorUtama(prioritas);
  const terpakai = contoh.indikator.filter((item) => item.peringkat != null);
  return (
    <div id="contoh-hitung">
      <h3>Contoh hitung pada cuplikan ini</h3>
      {!contoh.ada ? (
        <p>Contoh hitung belum dapat disusun: cuplikan prioritas belum ada, atau tidak ada kabupaten/kota yang lolos gerbang.</p>
      ) : (
        <>
          <p>
            Dihitung ulang dari <code>data/live/prioritas_aplus.json</code> saat halaman dibuka, untuk baris peringkat 1.
            Cuplikan {formatWib(contoh.tanggal)}. Open-Meteo {formatWib(contoh.ensemble_fetched_at)}. GWIS {formatWib(contoh.gwis_fetched_at)}
            {contoh.gwis_fetched_until ? `–${formatWib(contoh.gwis_fetched_until)}` : ""}. Hotspot {formatWib(contoh.firms_observed_at)}.
          </p>
          <p>
            <strong>{contoh.kab}</strong> ({contoh.prov}) memakai {angka(contoh.n_titik, 0)} titik {contoh.src === "titik_wakil" || contoh.n_titik === 1 ? "wakil" : "grid 0,25° di dalam batas BIG"}.
            FWI maks satu titik {angka(contoh.fwi_titik_maks, 3)}, hanya informasi.
            Gerbang terpenuhi: hari GWIS {angka(contoh.gwis_hari_baris, 0)} (minimal 5), I2 {angka(contoh.indikator.find((item) => item.kunci === "I2")?.nilai, 3)} (minimal 0,5), hari FFMC≥78 = {angka(contoh.ffmc78_hari, 0)} (minimal 3), DC maks {angka(contoh.dc_maks, 3)} (minimal 260). FFMC dan DC tidak masuk skor.
          </p>
          <div className="table-wrap wrap-cells">
            <table>
              <thead>
                <tr>
                  <th scope="col">Indikator</th>
                  <th scope="col">Nilai</th>
                  <th scope="col">Di bawah</th>
                  <th scope="col">n</th>
                  <th scope="col">Urutan</th>
                  <th scope="col">(urutan−1)/(n−1)</th>
                  <th scope="col">Peringkat</th>
                </tr>
              </thead>
              <tbody>
                {contoh.indikator.map((item) => (
                  <tr key={item.kunci}>
                    <th scope="row">{item.kode} {item.nama}</th>
                    <td>{item.nilai == null ? "—" : angka(item.nilai, DIGIT_NILAI[item.kunci])}</td>
                    <td>{item.diBawah == null ? "—" : `${angka(item.diBawah, 0)} dari ${angka(item.n, 0)}`}</td>
                    <td>{item.n ? angka(item.n, 0) : "—"}</td>
                    <td>{item.urutan == null ? "—" : angka(item.urutan, Number.isInteger(item.urutan) ? 0 : 1)}</td>
                    <td>{pecahanPeringkat(item)}</td>
                    <td>{item.peringkat == null ? "—" : angka(item.peringkat, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {contoh.indikator.some((item) => item.tanpa > 0) ? (
            <p className="fine">
              {contoh.indikator.filter((item) => item.tanpa > 0).map((item) => `${angka(item.tanpa, 0)} kab/kota lengkap tanpa ${item.nama}, jadi n ${item.kode} = ${angka(item.n, 0)}`).join(". ")}.
            </p>
          ) : null}
          <p>
            Skor = ({terpakai.map((item) => pecahanPeringkat(item)).join(" + ")}) / {terpakai.length} = {angka(contoh.skor_tampil, 3)}.
            Peringkat pada tabel dibulatkan tiga desimal ({terpakai.map((item) => angka(item.peringkat, 3)).join(", ")}). Rata-rata dihitung sebelum pembulatan itu.
          </p>
        </>
      )}
      <h3>Kenapa pakai peringkat</h3>
      <p>Satuan indikator tidak sama. FWI tidak bersatuan, peluang berada di antara 0 dan 1, IRBI bernilai puluhan, dan hotspot bisa mencapai ribuan. Jumlah mentah akan didominasi hotspot. Peringkat menyamakan skala sebelum dirata-rata.</p>
    </div>
  );
}

const SUMBER_HITUNG = [
  {
    judul: "Van Wagner, C.E. (1987). Development and structure of the Canadian Forest Fire Weather Index System. Canadian Forestry Service, Forestry Technical Report 35.",
    tautan: [["Repositori NRCan", "https://ostrnrcan-dostrncan.canada.ca/entities/publication/d96e56aa-e836-4394-ba29-3afe91c3aa6c"]],
    catatan: "Dokumen sistem FWI Kanada. Dasbor tidak menghitung FFMC, DMC, DC, ISI, BUI, atau FWI sendiri.",
  },
  {
    judul: "de Groot, W.J., Field, R.D., Brady, M.A., Roswintiarti, O., Mohamad, M. Development of the Indonesian and Malaysian Fire Danger Rating Systems. Mitigation and Adaptation Strategies for Global Change 12, 165–180.",
    tautan: [["DOI 10.1007/s11027-006-9043-8", "https://doi.org/10.1007/s11027-006-9043-8"]],
    catatan: "Ambang FFMC dan DC kelas Tinggi (78 dan 260) yang dipakai sebagai gerbang. Diterapkan pada nilai model, bukan kelas BMKG.",
  },
  {
    judul: "Copernicus EMS, GWIS — Fire Danger Forecast.",
    tautan: [["Dokumentasi GWIS", "https://gwis.jrc.ec.europa.eu/about-gwis/technical-background/fire-danger-forecast"]],
    catatan: "Sumber angka FWI, FFMC, dan DC model ECMWF pada daftar.",
  },
  {
    judul: "Copernicus EMS, EFFIS — Fire Danger Forecast.",
    tautan: [["Dokumentasi EFFIS", "https://forest-fire.emergency.copernicus.eu/about-effis/technical-background/fire-danger-forecast"]],
    catatan: "Latar sistem FWI pada rantai EFFIS/GWIS. Kelas global tidak dipakai sebagai ambang Indonesia.",
  },
  {
    judul: "Open-Meteo Ensemble API, model ECMWF IFS 0.25 (ecmwf_ifs025).",
    tautan: [["Dokumentasi Ensemble API", "https://open-meteo.com/en/docs/ensemble-api"]],
    catatan: "Hujan harian 14 hari untuk peluang tanpa hari di atas 20 mm. Lisensi CC BY 4.0, nonkomersial.",
  },
  {
    judul: "NASA LANCE FIRMS, termasuk penjelasan confidence.",
    tautan: [
      ["FIRMS", "https://firms.modaps.eosdis.nasa.gov/"],
      ["FIRMS FAQ", "https://www.earthdata.nasa.gov/data/tools/firms/faq"],
    ],
    catatan: "Deteksi panas satelit. Yang dihitung keyakinan nominal dan tinggi, bukan kebakaran terkonfirmasi.",
  },
  {
    judul: "BNPB, Buku IRBI 2025, halaman 294.",
    tautan: [["IRBI 2025", "https://inarisk.bnpb.go.id/IRBI-2025/files/basic-html/page294.html"]],
    catatan: "Indeks risiko tahunan, data statis. Bukan prakiraan 14 hari.",
  },
  {
    judul: "Hyndman, R.J. dan Fan, Y. (1996). Sample Quantiles in Statistical Packages. The American Statistician 50(4), 361–365.",
    tautan: [["DOI 10.1080/00031305.1996.10473566", "https://doi.org/10.1080/00031305.1996.10473566"]],
    catatan: "Definisi persentil tipe 7 yang dipakai untuk P75.",
  },
];

function SumberHitung() {
  return (
    <>
      <h3>Sumber perhitungan</h3>
      <p>Tautan berikut dipakai untuk rumus dan ambang pada contoh hitung. Diperiksa 19 Oktober 2026.</p>
      <ul className="plain-list">
        {SUMBER_HITUNG.map((item) => (
          <li key={item.judul}>
            {item.judul}{" "}
            {item.tautan.map(([label, href]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"> {label}</a>
            ))}
            <small>{item.catatan}</small>
          </li>
        ))}
      </ul>
    </>
  );
}

function jangkarDariHash() {
  const parts = String(window.location.hash ?? "")
    .replace(/^#/, "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  const anchor = parts[0] === "sumber-metode" || parts[0] === "metode" ? parts[1] : "";
  return anchor === "cara-hitung" || anchor === "rujukan" || anchor === "faq" ? anchor : "";
}

export function MetodeAplus({ anchor = "", prioritas = null }) {
  useEffect(() => {
    const id = jangkarDariHash() || anchor;
    if (!id) return undefined;
    let cancelled = false;
    const timers = [];
    const run = () => {
      if (cancelled) return;
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    run();
    const frame = window.requestAnimationFrame(run);
    for (const delay of [50, 200, 600]) timers.push(window.setTimeout(run, delay));
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [anchor]);

  return (
    <>
      <section className="card" id="cara-hitung">
        <h2>Peringkat prioritas karhutla – cara menghitung</h2>
        <p>Jenis data: pemodelan pihak ketiga, bukan resmi BMKG/BNPB. Cakupan daftar adalah enam provinsi pada dasbor. Panjang daftar paling banyak 15 nama. Bila yang lolos lebih sedikit, daftar lebih pendek. Bila tidak ada yang lolos, itu hasil yang sah, bukan Belum tersedia. Horizon hujan 14 hari; FWI hanya 9 hari.</p>
        <ol className="steps">
          <li><span>1</span><div><strong>Titik</strong><p>Di dalam poligon kabupaten/kota BIG, saat proses, dipilih paling banyak 5 simpul grid 0,25°. Simpul pertama yang terdekat ke pusat, lalu yang terjauh dari yang sudah dipilih. Geometri tidak disimpan. Kabupaten/kota tanpa simpul memakai titik wakil yang sudah ada, dan ditandai hanya 1 titik sampel.</p></div></li>
          <li><span>2</span><div><strong>Empat indikator</strong><p>I1 FWI ECMWF dari GWIS, rata-rata harian persentil-75 antartitik, hingga 9 hari. I2 peluang 14 hari tanpa satu hari hujan di atas 20 mm, dari 51 anggota ensemble ECMWF lewat Open-Meteo, lalu persentil-75 antartitik. I3 IRBI Karhutla 2025 apa adanya. I4 jumlah hotspot FIRMS nominal dan tinggi pada jendela cuplikan. Nilai maksimum FWI tetap ditampilkan, tetapi skor memakai persentil-75.</p></div></li>
          <li><span>3</span><div><strong>Skor</strong><p>Setiap indikator diubah menjadi peringkat persentil antar kabupaten/kota yang datanya lengkap. Nilai kembar mendapat rata-rata peringkat. Skor adalah rata-rata empat peringkat, 25% tiap indikator. Bila IRBI kosong tetapi hotspot ada, rata-rata dihitung dari indikator yang ada.</p></div></li>
          <li><span>4</span><div><strong>Syarat</strong><p>Semua harus terpenuhi: data lengkap (minimal 5 hari GWIS, ada I2, serta ada I3 atau I4); I2 minimal 50%; FFMC persentil-75 minimal 78 pada minimal 3 dari 9 hari, atau DC persentil-75 minimal 260 pada salah satu hari.</p></div></li>
          <li><span>5</span><div><strong>Blok hotspot</strong><p>Nasional dan terpisah. Jumlah nominal+tinggi minimal maksimum dari persentil-95 kabupaten/kota yang punya hotspot dan 50 titik, serta terdeteksi pada minimal 2 hari berturut-turut. Tiap baris menyebut peringkat, tidak lolos syarat, atau di luar cakupan. Hotspot dapat berasal dari sumber panas lain.</p></div></li>
          <li><span>6</span><div><strong>Belum tersedia</strong><p>Seluruh daftar diganti Belum tersedia bila ensemble lebih dari 36 jam, FWI diambil lebih dari 48 jam lalu atau kurang dari 5 hari, atau kabupaten/kota lengkap kurang dari 30. Blok hotspot disembunyikan bila cuplikan FIRMS lebih dari 24 jam.</p></div></li>
        </ol>
        <pre className="formula">{`P75 = persentil-75 antartitik (Hyndman–Fan tipe 7)
I1 = rata-rata harian P75(FWI)          masuk skor
I2 = P75(anggota tanpa hari > 20 mm)    masuk skor
I3 = IRBI 2025                          masuk skor
I4 = jumlah hotspot nominal + tinggi    masuk skor
Hari FFMC≥78 dan DC maks                gerbang saja
r  = (urutan − 1) / (n − 1)
     nilai sama: urutan dirata-rata
skor = rata-rata r yang ada`}</pre>
        <KolomDanGerbang />
        <ContohHitung prioritas={prioritas} />
        <h3>Ambang FFMC dan DC</h3>
        <p>Angka berikut dari literatur FDRS ASEAN (de Groot dkk. 2007, Tabel 1 dan 2), bukan kelas BMKG. Syarat memakai batas bawah kelas Tinggi: FFMC minimal 78 dan DC minimal 260.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Kelas literatur</th>
                <th scope="col"><Term id="ffmc">FFMC</Term></th>
                <th scope="col"><Term id="dc">DC</Term></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Rendah</th>
                <td>0–72</td>
                <td>&lt;140</td>
              </tr>
              <tr>
                <th scope="row">Sedang</th>
                <td>73–77</td>
                <td>140–260</td>
              </tr>
              <tr>
                <th scope="row">Tinggi</th>
                <td>78–82</td>
                <td>260–350</td>
              </tr>
              <tr>
                <th scope="row">Ekstrem</th>
                <td>≥83</td>
                <td>&gt;350</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Pada data 1995–2000, 73% hotspot terjadi saat FFMC minimal 83. Asap berat mungkin terjadi di atas DC sekitar 388 (Field dkk. 2004; selang 95% 377–399). Ambang de Groot dikalibrasi pada cuaca stasiun pukul 12.00 waktu lokal, lalu di dasbor diterapkan pada nilai model GWIS. Hasilnya indikatif, bukan kelas BMKG, dan bukan ukuran muka air gambut.</p>
        <SumberHitung />
      </section>

      <section className="card" id="rujukan">
        <h2>Rujukan</h2>
        <p>Tautan di bawah ada pada catatan metode yang diperiksa 19 Oktober 2026. Ambang dikutip dari literatur pihak ketiga dan diterapkan pada nilai model.</p>
        <ul className="plain-list">
          {RUJUKAN.map((item) => (
            <li key={item.judul}>
              {item.judul}{" "}
              {item.tautan.map(([label, href]) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"> {label}</a>
              ))}
              <small>{item.catatan}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" id="faq">
        <h2>Pertanyaan yang sering muncul</h2>
        <div className="faq-list">
          {FAQ.map((item) => (
            <details key={item.tanya}>
              <summary>{item.tanya}</summary>
              <p>{item.jawab}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
