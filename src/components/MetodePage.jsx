import { Badge } from "./Badge.jsx";
import { decorateSources } from "../lib/sourceCatalog.js";
import { MetodeAplus } from "./MetodeAplus.jsx";

const KINDS = [
  ["akt", "Aktif", "Observasi", "Diukur atau dideteksi langsung (satelit, stasiun)."],
  ["tun", "Prakiraan", "Prakiraan", "Perkiraan masa depan dari model; ada ketidakpastian."],
  ["pem", "Pembanding, bukan BMKG/KLHK", "Model pembanding", "Dihitung lembaga lain; bukan produk BMKG/KLH."],
  ["sta", "Data statis", "Data statis", "Terbit sekali per periode, tidak berubah harian."],
  ["tau", "Tautan saja", "Tautan saja", "Dashboard hanya mengarahkan ke sumber resmi."],
];

function badgeKind(status) {
  const text = String(status || "");
  if (text === "Aktif") return "akt";
  if (text.includes("Pembanding") || text.includes("pembanding")) return "pem";
  if (text.includes("Prototipe")) return "pro";
  if (text.includes("statis") || text.includes("Statis")) return "sta";
  if (text.includes("Tautan") || text.includes("tautan")) return "tau";
  if (text.includes("Belum") || text.includes("Gagal") || text.includes("Rencana")) return "tun";
  return "tau";
}

export function MetodePage({ manifest, anchor = "" }) {
  const sources = decorateSources(manifest);
  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Sumber & Metode</h1>
          <p className="lead">Apa fungsi tiap indikator, dari mana datanya, seberapa sering diperbarui, dan apa batasannya.</p>
        </div>
      </header>

      <section className="card">
        <h2>Jenis data yang dibedakan</h2>
        <div className="kind-row">
          {KINDS.map(([kind, badge, title, note]) => (
            <article key={kind} className="tbox">
              <Badge kind={kind}>{badge}</Badge>
              <h3>{title}</h3>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Logika pemantauan</h2>
        <ol className="steps">
          <li><span>1</span><div><strong>Ambil</strong><p>Workflow terjadwal mengambil data dari sumber terbuka yang sah.</p></div></li>
          <li><span>2</span><div><strong>Periksa</strong><p>Cek waktu data; jika basi, tampilkan “Tertunda”, bukan angka lama.</p></div></li>
          <li><span>3</span><div><strong>Cocokkan</strong><p>Titik dicocokkan ke batas wilayah BIG bila layanan itu menjawab. Tingkat kecocokan mengikuti kolom yang terisi, tanpa menebak nama desa.</p></div></li>
          <li><span>4</span><div><strong>Tampilkan</strong><p>Setiap angka diberi label jenis data, sumber, dan waktu.</p></div></li>
        </ol>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Daftar sumber</h2>
          <p>Status mengikuti cuplikan terakhir. Waktu data tampil di tiap tab.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Sumber</th>
                <th scope="col">Indikator</th>
                <th scope="col">Status</th>
                <th scope="col">Izin / ketentuan</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <th scope="row">
                    <a href={source.officialUrl} target="_blank" rel="noreferrer">{source.nama}</a>
                    <small>{source.instansi}</small>
                  </th>
                  <td>{source.fungsi}</td>
                  <td><Badge kind={badgeKind(source.status)}>{source.status}</Badge></td>
                  <td>{source.access}{source.limitation ? ` · ${source.limitation}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <MetodeAplus anchor={anchor} />

      <div className="split">
        <section className="card">
          <h2>Fungsi bagi pengambil keputusan</h2>
          <p>Hotspot menunjukkan di mana ada deteksi panas sekarang. FWI pembanding menunjukkan kemudahan terbakar menurut model pihak ketiga, bukan FDRS BMKG. IRBI adalah konteks risiko jangka panjang. ISPU, bila nanti terhubung, adalah dampak asap di stasiun pemantau.</p>
        </section>
        <section className="card">
          <h2>Batasan</h2>
          <p>Hotspot bukan konfirmasi kebakaran. FWI GWIS memakai kelas sendiri, tidak sama dengan kelas FDRS BMKG. Tidak ada prediksi ISPU. Daftar prioritas adalah pemodelan pihak ketiga (Metode A+), bukan prakiraan resmi BMKG/BNPB. FWI pada daftar hanya 9 hari.</p>
        </section>
      </div>
    </main>
  );
}
