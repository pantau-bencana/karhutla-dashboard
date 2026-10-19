import { Badge } from "./Badge.jsx";
import { hazardById } from "../lib/hazards.js";

export function VolcanoPage() {
  const hazard = hazardById("gunung-api");
  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Gunung Api</h1>
          <p className="lead">Status aktivitas ditetapkan PVMBG. Dasbor ini tidak menyimpan status dan tidak membuat peta dampak.</p>
        </div>
        <Badge kind="tau">Tautan saja</Badge>
      </header>
      <section className="card">
        <h2>Sumber resmi</h2>
        <ul className="plain-list">
          {hazard.sumber.map((row) => (
            <li key={row.nama}>
              <a href={row.url} target="_blank" rel="noreferrer">{row.nama}</a>
              {" · "}{row.instansi} · {row.status}
            </li>
          ))}
        </ul>
        <h2>Daftar gunung berstatus di atas Normal</h2>
        <p className="empty">
          Belum tersedia. Yang dibutuhkan: akses data status resmi PVMBG (API atau izin penggunaan) dan peta kawasan rawan bencana untuk wilayah terdampak. {hazard.catatan} Istilah resmi tetap Normal, Waspada, Siaga, Awas; tidak ditampilkan sebagai status saat ini.
        </p>
      </section>
    </main>
  );
}
