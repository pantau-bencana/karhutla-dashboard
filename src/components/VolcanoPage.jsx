import { Badge } from "./Badge.jsx";
import { hazardById } from "../lib/hazards.js";

const LEVELS = [
  ["Level I – Normal", "level-normal"],
  ["Level II – Waspada", "level-waspada"],
  ["Level III – Siaga", "level-siaga"],
  ["Level IV – Awas", "level-awas"],
];

export function VolcanoPage() {
  const hazard = hazardById("gunung-api");
  const magma = hazard.sumber.find((row) => row.url.includes("magma.esdm.go.id"));
  const others = hazard.sumber.filter((row) => row !== magma);
  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Gunung Api</h1>
          <p className="lead">Status aktivitas gunung api ditetapkan PVMBG. Dashboard ini belum mengintegrasikan datanya dan tidak membuat status atau peta dampak sendiri.</p>
        </div>
        <div className="badges">
          <Badge kind="tau">Tautan saja</Badge>
          <Badge kind="tun">Integrasi belum tersedia</Badge>
        </div>
      </header>
      <div className="split">
        <section className="card stack-card">
          <h2>Lihat status resmi</h2>
          {magma ? (
            <a className="linkcard" href={magma.url} target="_blank" rel="noreferrer">
              <span>
                <strong>{magma.nama}</strong>
                <small>Status level aktivitas, VONA, dan laporan harian dibaca di situs ini.</small>
              </span>
              <span className="btn pri">Buka</span>
            </a>
          ) : null}
          {others.map((row) => (
            <a key={row.nama} className="linkcard" href={row.url} target="_blank" rel="noreferrer">
              <span>
                <strong>{row.nama}</strong>
                <small>{row.instansi} · {row.status}</small>
              </span>
              <span className="btn">Buka</span>
            </a>
          ))}
          <div className="empty">
            <h2>Daftar gunung berstatus di atas Normal</h2>
            <p>Belum tersedia. Membutuhkan akses data resmi PVMBG yang layak (API atau izin penggunaan). Sampai itu ada, tidak ada status yang ditampilkan di sini.</p>
          </div>
        </section>
        <div className="stack-card">
          <section className="card">
            <h2>Cara membaca level aktivitas</h2>
            <p className="fine">Keterangan istilah resmi. Bukan status saat ini.</p>
            <ul className="level-list">
              {LEVELS.map(([label, kind]) => (
                <li key={kind}><span className={`level-pill ${kind}`}>{label}</span></li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2>Yang dibutuhkan untuk integrasi</h2>
            <p>{hazard.catatan}</p>
          </section>
        </div>
      </div>
    </main>
  );
}
