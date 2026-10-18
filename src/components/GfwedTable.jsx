import { formatAngka, formatTanggal } from "../lib/format.js";
import { GFWED_CITATION, GFWED_LABEL, GFWED_UNAVAILABLE } from "../lib/gfwed.js";

export function GfwedTable({ rows }) {
  const usable = (rows ?? []).filter((row) => row.kode && Number.isFinite(row.fwiRata) && Number.isFinite(row.fwiMaks));
  const ordered = [...usable].sort((a, b) => a.kode.localeCompare(b.kode, "en"));
  const tanggal = ordered[0]?.tanggal || "";
  return (
    <section className="card" id="gfwed-kabupaten">
      <header className="card-head">
        <div>
          <h2>{GFWED_LABEL}</h2>
          <p>Nilai model pada sel grid. Bukan kelas FWI/FDRS BMKG dan bukan status wilayah.</p>
        </div>
      </header>
      <div className="logic-body">
        {ordered.length ? (
          <>
            <p>
              Tanggal data: <strong>{formatTanggal(tanggal)}</strong> <span className="tag">tertunda</span>
            </p>
            <p>
              Rata-rata dan maksimum dihitung dari sel yang pusatnya jatuh di dalam kabupaten/kota. Kabupaten/kota tanpa sel seperti itu tidak dicantumkan. Itu bukan nilai nol. Urutan mengikuti kode wilayah, bukan peringkat.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Kode</th>
                    <th scope="col">Kabupaten/kota</th>
                    <th scope="col">Provinsi</th>
                    <th scope="col">FWI rata-rata</th>
                    <th scope="col">FWI maksimum</th>
                    <th scope="col">Jumlah sel</th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((row) => (
                    <tr key={row.kode}>
                      <td>{row.kode}</td>
                      <td>{row.kabupaten}</td>
                      <td>{row.provinsi}</td>
                      <td>{formatAngka(row.fwiRata, 2)}</td>
                      <td>{formatAngka(row.fwiMaks, 2)}</td>
                      <td>{formatAngka(row.nSel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine">{ordered[0]?.sumber || GFWED_CITATION}</p>
          </>
        ) : (
          <p>{GFWED_UNAVAILABLE}</p>
        )}
      </div>
    </section>
  );
}
