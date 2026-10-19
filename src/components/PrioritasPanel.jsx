import { Badge } from "./Badge.jsx";
import { CATATAN_SATU_TITIK, tampilanPrioritas } from "../lib/aplus.js";
import { formatAngka, formatWib } from "../lib/format.js";
import { pageHref } from "../lib/route.js";

function persen(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${formatAngka(number * 100, 0)}%`;
}

export function PrioritasPanel({ snapshot, now }) {
  const view = tampilanPrioritas(snapshot, now ? new Date(now) : new Date());
  return (
    <section className="card" id="prioritas-kesiapsiagaan">
      <header className="card-head">
        <div>
          <h2>{view.judul}</h2>
          <p>Enam provinsi cakupan. Panjang daftar 15, atau lebih pendek bila yang lolos lebih sedikit.</p>
        </div>
        <Badge kind="pem">{view.jenis}</Badge>
      </header>
      <p>{view.disclaimer}</p>
      <p className="fine">
        <a href={pageHref("metode")}>Sumber & Metode</a>
        {" · "}
        {view.label_ambang}
        {" · "}
        Open-Meteo CC BY 4.0, nonkomersial.
      </p>
      {view.tersedia ? (
        <p className="fine">
          Ensemble diambil {formatWib(view.ensemble_fetched_at)}. GWIS {view.gwis_hari} hari, diambil {formatWib(view.gwis_fetched_at)}
          {view.gwis_tanggal?.length ? ` (${view.gwis_tanggal[0]}–${view.gwis_tanggal.at(-1)})` : ""}. FIRMS {formatWib(view.firms_observed_at)}.
          {" "}
          {formatAngka(view.kab_lengkap)} kab/kota lengkap, {formatAngka(view.lolos)} lolos syarat.
        </p>
      ) : (
        <p>
          <Badge kind="tun">Belum tersedia</Badge> {view.alasan.join("; ")}.
        </p>
      )}

      {view.tersedia && view.blok_alasan ? <p>Blok hotspot disembunyikan: {view.blok_alasan}.</p> : null}
      {view.tersedia && !view.blok_alasan ? (
        <div className="logic-body">
          <h3>Aktivitas hotspot tinggi saat ini</h3>
          <p className="fine">
            Ambang jumlah ≥ {formatAngka(view.ambang_hotspot)} (maksimum dari persentil-95 nasional {formatAngka(view.p95_hotspot)} dan 50) dan terdeteksi pada ≥2 hari berturut-turut. {view.catatan_hotspot}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Kab/kota</th>
                  <th scope="col">Hotspot (hari)</th>
                  <th scope="col">Status di daftar prioritas</th>
                </tr>
              </thead>
              <tbody>
                {view.blok.length ? (
                  view.blok.map((row) => (
                    <tr key={`${row.kode}-${row.kab}`}>
                      <th scope="row">{row.kab}{row.prov ? ` (${row.prov})` : ""}</th>
                      <td>{formatAngka(row.jumlah)} ({formatAngka(row.hari)})</td>
                      <td>{row.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>Tidak ada kab/kota yang melewati ambang hotspot pada jendela ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {view.tersedia ? (
        <div className="logic-body">
          <h3>Daftar prioritas</h3>
          {view.daftar.length ? null : <p>{view.daftar_kosong}</p>}
          {view.daftar.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Kab/kota</th>
                    <th scope="col">Skor</th>
                    <th scope="col">FWI P75 (maks)</th>
                    <th scope="col">Hari FFMC≥78</th>
                    <th scope="col">DC maks</th>
                    <th scope="col">P(14 hari tanpa &gt;20 mm)</th>
                    <th scope="col">IRBI 2025</th>
                    <th scope="col">Hotspot</th>
                    <th scope="col">Titik</th>
                  </tr>
                </thead>
                <tbody>
                  {view.daftar.map((row) => (
                    <tr key={row.kode}>
                      <td>{row.peringkat_daftar}</td>
                      <th scope="row">
                        {row.dalam_blok ? "🔥 " : ""}
                        {row.kab}
                      </th>
                      <td>{formatAngka(row.skor, 3)}</td>
                      <td>
                        {formatAngka(row.I1, 1)} ({formatAngka(row.fwi_titik_maks, 1)})
                      </td>
                      <td>{formatAngka(row.ffmc78_hari)}</td>
                      <td>{formatAngka(row.dc_maks, 0)}</td>
                      <td>{persen(row.I2)}</td>
                      <td>{row.I3 == null || row.I3 === "" ? "—" : `${formatAngka(row.I3, 2)} ${row.irbi_kelas || ""}`.trim()}</td>
                      <td>{formatAngka(row.I4)}</td>
                      <td>
                        {formatAngka(row.n_titik)}
                        {row.satu_titik || Number(row.n_titik) === 1 ? ` · ${CATATAN_SATU_TITIK}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
