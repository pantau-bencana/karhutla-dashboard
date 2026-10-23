const BERKAS = [
  {
    label: "Unduh FWI (81 kab/kota)",
    path: "data/static/karhutla-81/fwi-81-kab-kota.csv",
    nama: "fwi-81-kab-kota.csv",
  },
  {
    label: "Unduh Peluang Hujan",
    path: "data/static/karhutla-81/peluang-hujan-81-kab-kota.csv",
    nama: "peluang-hujan-81-kab-kota.csv",
  },
  {
    label: "Unduh Indeks Kesesuaian Iklim",
    path: "data/static/karhutla-81/indeks-kesesuaian-iklim-81-kab-kota.csv",
    nama: "indeks-kesesuaian-iklim-81-kab-kota.csv",
  },
];

function hrefBerkas(path) {
  return new URL(path, document.baseURI).href;
}

export function UnduhKarhutla81() {
  return (
    <section className="card" id="karhutla-81">
      <header className="card-head">
        <div>
          <h2>Berkas 81 kab/kota</h2>
          <p>
            Daftar tetap untuk enam provinsi prioritas supaya nama kabupaten/kota seragam: Riau 12, Jambi 11, Sumatera Selatan 17, Kalimantan Barat 14, Kalimantan Tengah 14, Kalimantan Selatan 13.
          </p>
        </div>
        <span className="status-pill status-csv">Snapshot/arsip</span>
      </header>
      <p className="fine">
        Cuplikan baca-saja dari lembar Analisis Karhutla 2026, bukan sinkron langsung. Peluang hujan adalah rentang persen untuk hujan lebih dari 20 mm. Indeks kesesuaian iklim memakai kelas pada lembar, termasuk gabungan kelas bila tertulis lebih dari satu. Sel FWI yang berisi #N/A dibiarkan, bukan diisi dan bukan nol. Bukan FDRS BMKG dan bukan peringatan resmi.
      </p>
      <div className="karhutla-81-unduh">
        {BERKAS.map((item) => (
          <a key={item.nama} className="button" href={hrefBerkas(item.path)} download={item.nama}>
            {item.label}
          </a>
        ))}
      </div>
    </section>
  );
}
