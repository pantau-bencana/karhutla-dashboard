import { formatWib } from "../../lib/format.js";

export function StatusSumber({ daftar, banjir }) {
  const tetap = daftar.filter((item) => item.siap).length;
  const banjirSiap = banjir?.siap ? 1 : 0;
  const jumlah = daftar.length + 1;
  const siap = tetap + banjirSiap;
  return (
    <section className="v3-kartu" aria-labelledby="v3-sumber-judul">
      <header className="v3-kartu-kepala">
        <h2 id="v3-sumber-judul">Status sumber data</h2>
        <span className="v3-samar">{siap} dari {jumlah} siap</span>
      </header>
      <ul className="v3-sumber">
        {daftar.map((item) => (
          <li key={item.id}>
            <p className="v3-sumber-nama">{item.nama}</p>
            <p className="v3-sumber-catatan">{item.catatan}</p>
            {item.diambil ? <p className="v3-sumber-waktu">Diambil {formatWib(item.diambil)}</p> : null}
            <p className={item.siap ? "v3-siap" : "v3-gagal"}>{item.status}</p>
          </li>
        ))}
        <li>
          <p className="v3-sumber-nama">Analisis banjir</p>
          <p className="v3-sumber-catatan">Analisis dasbor dari CAP dan prakiraan BMKG. Bukan status resmi.</p>
          {banjir?.diambil ? <p className="v3-sumber-waktu">Diambil {formatWib(banjir.diambil)}</p> : null}
          <p className={banjir?.siap ? "v3-siap" : "v3-gagal"}>{banjir?.siap ? "Siap" : (banjir?.status || "Tidak termuat")}</p>
        </li>
      </ul>
      <a className="v3-tautan" href="#/sumber">Buka sumber data</a>
    </section>
  );
}
