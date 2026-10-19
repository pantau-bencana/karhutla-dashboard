import { OfficialLinks } from "./OfficialLinks.jsx";
import { hazardById } from "../lib/hazards.js";

export function HazardPlaceholder({ hazardId, bare = false }) {
  const hazard = hazardById(hazardId);
  const body = (
    <>
      {bare ? null : (
        <div className="banner warn" role="status">
          <strong>{hazard.status}</strong>
          <p>{hazard.catatan}</p>
        </div>
      )}
      <section className="card">
        <header className="card-head">
          <div>
            <h2>{bare ? "Status sumber lain" : "Indikator yang direncanakan"}</h2>
            <p>Bukan klaim kondisi saat ini dan bukan data contoh yang disamarkan sebagai data resmi.</p>
          </div>
        </header>
        <ul className="plain-list logic-body">
          {hazard.indikator.map((item) => (
            <li key={item}>
              {item}
              {item.includes("Tautan saja") ? (
                <OfficialLinks
                  links={hazard.sumber
                    .filter((row) => String(row.status).includes("Tautan saja"))
                    .map((row) => ({ href: row.url, label: row.nama }))}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <header className="card-head">
          <div>
            <h2>Sumber</h2>
            <p>Status mengikuti yang benar-benar terhubung pada tab ini.</p>
          </div>
        </header>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Instansi</th>
                <th scope="col">Tautan</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {hazard.sumber.map((row) => (
                <tr key={row.nama}>
                  <th scope="row">{row.nama}</th>
                  <td>{row.instansi}</td>
                  <td>
                    <a href={row.url} target="_blank" rel="noopener noreferrer">
                      {row.url}
                    </a>
                  </td>
                  <td>
                    <span className="link-only">
                      <span className="status-pill status-off">{row.status}</span>
                      {String(row.status).includes("Tautan saja") ? (
                        <a href={row.url} target="_blank" rel="noopener noreferrer">{row.nama}</a>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
  if (bare) return body;
  return <main className="wrap main">{body}</main>;
}
