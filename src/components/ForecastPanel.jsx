import { OpenMeteoCredit } from "./Atribusi.jsx";
import { formatAngka, formatTanggal } from "../lib/format.js";

const BMKG_FWI = "https://www.bmkg.go.id/cuaca/karhutla/fwi";
const BMKG_API = "https://gis.bmkg.go.id/portal/dataapi";
const BMKG_OPEN = "https://data.bmkg.go.id/prakiraan-cuaca/";

function datesOf(rows) {
  return [...new Set((rows ?? []).map((row) => String(row.tanggal || "").slice(0, 10)).filter(Boolean))].sort();
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function ForecastPanel({ provinces = [], weatherRows = [], fwiRows = [] }) {
  const weatherDates = datesOf(weatherRows);
  const fwiDates = datesOf(fwiRows);
  const latestWeather = weatherDates.at(-1) || "";
  const latestFwi = fwiDates.at(-1) || "";
  const rainByProvince = new Map();
  for (const row of weatherRows) {
    if (String(row.tanggal).slice(0, 10) !== latestWeather) continue;
    rainByProvince.set(row.provinsi, row.curahHujan);
  }
  const fwiByProvince = new Map();
  for (const row of fwiRows) {
    if (latestFwi && String(row.tanggal).slice(0, 10) !== latestFwi) continue;
    const list = fwiByProvince.get(row.provinsi) ?? [];
    if (Number.isFinite(row.fwi)) list.push(row.fwi);
    fwiByProvince.set(row.provinsi, list);
  }
  const names = provinces.length ? provinces : [...rainByProvince.keys()];

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>Prakiraan kondisi (pembanding, bukan resmi)</h2>
          <p>Pembanding, bukan produk BMKG/KLHK</p>
          <p>
            Pembanding model, bukan prakiraan BMKG. Bukan prakiraan titik panas dan bukan FDRS BMKG. Angka di bawah berasal dari data terbuka yang tersambung.
            Pengguna membuka peta FWI resmi di situs BMKG.
          </p>
        </div>
      </header>
      <div className="logic-body">
        <p>
          <a className="button" href={BMKG_FWI} target="_blank" rel="noopener noreferrer">
            Buka Peta FWI/Peringatan Karhutla BMKG
          </a>
        </p>
        <p className="fine">Sumber: BMKG — Fire Weather Index/Peringatan Karhutla. Tautan ini tidak mengunduh atau menyematkan citra.</p>
        <p className="fine">
          <a href={BMKG_API} target="_blank" rel="noopener noreferrer">
            Satu Peta MKG Data API
          </a>
          {" · "}
          <a href={BMKG_OPEN} target="_blank" rel="noopener noreferrer">
            Data Terbuka prakiraan cuaca BMKG
          </a>
        </p>
        <p>
          Open-Meteo pada snapshot ini
          {weatherDates.length ? ` mencakup ${formatTanggal(weatherDates[0])} sampai ${formatTanggal(latestWeather)} (${weatherDates.length} tanggal).` : " belum ada."}
          {" "}
          Itu cuaca model pada titik provinsi, bukan data FDRS, dan bukan prakiraan 14 hari resmi BMKG. Prakiraan cuaca terbuka BMKG yang tersambung tetap 3 hari.
        </p>
        <OpenMeteoCredit />
        <p>
          FWI GWIS
          {fwiDates.length
            ? ` mencakup ${formatTanggal(fwiDates[0])} sampai ${formatTanggal(latestFwi)} (${fwiDates.length} tanggal pada berkas).`
            : " belum ada pada snapshot ini."}
          {" "}
          Nilai GWIS tidak disebut FDRS. Nilainya tidak dipakai sebagai prakiraan hotspot.
        </p>
        {names.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Provinsi prioritas</th>
                  <th scope="col">Hujan Open-Meteo pada {latestWeather || "—"} (mm)</th>
                  <th scope="col">FWI GWIS rata-rata pada {latestFwi || "—"}</th>
                </tr>
              </thead>
              <tbody>
                {names.map((name) => (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    <td>{formatAngka(rainByProvince.get(name), 1)}</td>
                    <td>{formatAngka(mean(fwiByProvince.get(name) ?? []), 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Cuplikan pembanding belum cukup untuk tabel provinsi.</p>
        )}
      </div>
    </section>
  );
}
