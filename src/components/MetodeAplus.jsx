import { useEffect } from "react";

const RUJUKAN = [
  {
    judul: "de Groot, W.J., Field, R.D., Brady, M.A., Roswintiarti, O., Mohamad, M. (2007). Development of the Indonesian and Malaysian Fire Danger Rating Systems.",
    tautan: [
      ["DOI 10.1007/s11027-006-9043-8", "https://doi.org/10.1007/s11027-006-9043-8"],
      ["PDF penulis", "http://www.columbia.edu/~rf2426/index_files/deGrootetal2006MITI.pdf"],
    ],
    catatan: "Ambang FFMC dan DC pada tabel di atas. Van Wagner (1987), Development and structure of the Canadian Forest Fire Weather Index System, Forestry Technical Report 35, dikutip lewat makalah ini; dokumen aslinya tidak ditautkan karena tidak dibuka.",
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

function jangkarDariHash() {
  const parts = String(window.location.hash ?? "")
    .replace(/^#/, "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  const anchor = parts[0] === "sumber-metode" || parts[0] === "metode" ? parts[1] : "";
  return anchor === "cara-hitung" || anchor === "rujukan" || anchor === "faq" ? anchor : "";
}

export function MetodeAplus({ anchor = "" }) {
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
        <pre className="formula">{`P75 = persentil-75 antartitik pada kabupaten/kota itu
I1 = rata-rata harian P75(FWI)   (hingga 9 hari)
I2 = P75( anggota tanpa hari > 20 mm / 51 )
I3 = IRBI 2025
I4 = jumlah hotspot nominal + tinggi
r  = peringkat persentil antar kabupaten/kota
skor = (rI1 + rI2 + rI3 + rI4) / 4`}</pre>
        <h3>Ambang FFMC dan DC</h3>
        <p>Angka berikut dari literatur FDRS ASEAN (de Groot dkk. 2007, Tabel 1 dan 2), bukan kelas BMKG. Syarat memakai batas bawah kelas Tinggi: FFMC minimal 78 dan DC minimal 260.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Kelas literatur</th>
                <th scope="col">FFMC</th>
                <th scope="col">DC</th>
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
