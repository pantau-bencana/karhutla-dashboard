import {
  PRIORITY_INDICATOR_NOTE,
  PRIORITY_INDICATOR_TITLE,
  PRIORITY_INDICATORS,
} from "../lib/priorityIndicators.js";
import { pageHref } from "../lib/route.js";

export function PriorityIndicators({ rinci = false }) {
  return (
    <section className="card" id="indikator-wilayah-prioritas">
      <header className="card-head">
        <div>
          <h2>{PRIORITY_INDICATOR_TITLE}</h2>
          <p>Nilai yang perlu disiapkan untuk kabupaten/kota prioritas. Bagian ini tidak memuat angka.</p>
        </div>
      </header>
      <div className="logic-body">
        <p>{PRIORITY_INDICATOR_NOTE}</p>
        <div className="table-wrap wrap-cells">
          <table>
            <thead>
              <tr>
                <th scope="col">Indikator</th>
                <th scope="col">Isian yang perlu ditampilkan per kabupaten/kota</th>
                <th scope="col">Logika pemantauan</th>
                <th scope="col">Sumber resmi dan tautan</th>
                <th scope="col">Status/keterbatasan saat ini</th>
              </tr>
            </thead>
            <tbody>
              {PRIORITY_INDICATORS.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.indikator}</th>
                  <td>{row.isian}</td>
                  <td>{row.logika}</td>
                  <td>
                    <ul className="plain-list">
                      {row.sumber.map((link) => (
                        <li key={link.href}>
                          <a href={link.href} target="_blank" rel="noopener noreferrer">
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <span className="status-pill status-off">{row.status}</span>
                    <p>{row.keterbatasan}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rinci ? (
          PRIORITY_INDICATORS.map((row) => (
            <p key={row.id}>
              <strong>{row.indikator}.</strong> {row.rincian}
            </p>
          ))
        ) : (
          <p className="fine">
            Penjelasan yang lebih panjang ada di <a href={pageHref("logika")}>Logika Pemantauan</a>.
          </p>
        )}
      </div>
    </section>
  );
}
