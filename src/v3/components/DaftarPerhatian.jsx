import { useState } from "react";

const AWAL = 5;

export function DaftarPerhatian({ butir, cari }) {
  const [buka, setBuka] = useState(false);
  const [rinci, setRinci] = useState("");
  const kata = String(cari || "").trim().toLowerCase();
  const saring = kata
    ? butir.filter((item) => `${item.judul} ${item.rincian} ${item.sumber}`.toLowerCase().includes(kata))
    : butir;
  const tampak = buka ? saring : saring.slice(0, AWAL);

  return (
    <section className="v3-kartu v3-perhatian" aria-labelledby="v3-perhatian-judul">
      <header className="v3-kartu-kepala">
        <h2 id="v3-perhatian-judul">
          Perlu perhatian
          <span className="v3-hitung">{saring.length}</span>
        </h2>
        {saring.length > AWAL ? (
          <button type="button" className="v3-tautan" onClick={() => setBuka((nilai) => !nilai)}>
            {buka ? "Ciutkan" : "Lihat semua"}
          </button>
        ) : null}
      </header>
      {saring.length ? (
        <ul className="v3-daftar">
          {tampak.map((item) => (
            <li key={item.id}>
              <article className="v3-baris">
                <span className={`v3-pil v3-pil-${item.tingkat}`}>{item.label}</span>
                <div>
                  <p className="v3-baris-judul">{item.judul}</p>
                  <p className="v3-baris-rinci">{item.rincian}</p>
                  {rinci === item.id ? <p className="v3-meta">{item.meta}</p> : null}
                </div>
                <span className="v3-sumber-kecil">{item.sumber}</span>
                <span className="v3-aksi">
                  <button type="button" className="v3-tombol-kecil" onClick={() => setRinci((nilai) => (nilai === item.id ? "" : item.id))}>
                    {rinci === item.id ? "Tutup" : "Rincian"}
                  </button>
                  <a className="v3-tombol" href={item.href}>{item.aksi}</a>
                </span>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p className="v3-kosong">
          {kata
            ? "Tidak ada butir yang cocok dengan pencarian."
            : "Tidak ada butir pada ambang ini. Gunung di bawah Level III, banjir di bawah Siaga, siklon tanpa teks dampak BMKG, dan provinsi tanpa deteksi kepercayaan tinggi tidak dimasukkan."}
        </p>
      )}
    </section>
  );
}
