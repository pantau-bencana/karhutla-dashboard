import { FirmsAck, OpenMeteoCredit } from "./Atribusi.jsx";
import { Badge } from "./Badge.jsx";
import { CatatanRingkas } from "./CatatanRingkas.jsx";
import { Term } from "./Term.jsx";
import { CATATAN_SATU_TITIK, tampilanPrioritas } from "../lib/aplus.js";
import { formatAngka, formatWib } from "../lib/format.js";

function waktuGwis(view) {
  const mulai = formatWib(view.gwis_fetched_at);
  if (!view.gwis_fetched_until) return mulai;
  return `${mulai}–${formatWib(view.gwis_fetched_until)}`;
}

function waktuData(view) {
  if (view.catatan_cuplikan) {
    return `Waktu data cuplikan: Open-Meteo ${formatWib(view.ensemble_fetched_at)}. GWIS ${view.gwis_hari} hari, ${waktuGwis(view)}. Cuplikan hotspot ${formatWib(view.firms_observed_at)}.`;
  }
  if (!view.tersedia) return "Waktu data: cuplikan segar belum ada.";
  return `Waktu data: ensemble ${formatWib(view.ensemble_fetched_at)}, GWIS ${view.gwis_hari} hari (${waktuGwis(view)}), FIRMS ${formatWib(view.firms_observed_at)}.`;
}

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
      <p className="fine">Bukan prakiraan resmi. Daftar resmi 15–20 kabupaten/kota: menunggu data resmi BMKG (FDRS/potensi karhutla per kab/kota).</p>
      {view.catatan_cuplikan ? <p>{view.catatan_cuplikan}</p> : null}
      {view.tersedia ? (
        <p className="fine">
          {waktuData(view)}
          {view.gwis_tanggal?.length ? ` Hari model ${view.gwis_tanggal[0]}–${view.gwis_tanggal.at(-1)}.` : ""}
          {" "}
          {formatAngka(view.kab_lengkap)} kab/kota lengkap, {formatAngka(view.lolos)} lolos syarat.
        </p>
      ) : (
        <p>
          <Badge kind="tun">belum cukup data</Badge> Komponen yang belum cukup: {view.alasan.join("; ")}. Peringkat tidak ditampilkan agar tidak tampak lengkap.
        </p>
      )}

      {view.tersedia && view.blok_alasan ? <p>Blok hotspot disembunyikan: {view.blok_alasan}.</p> : null}
      {view.tersedia && !view.blok_alasan ? (
        <div className="logic-body">
          <h3>Aktivitas hotspot tinggi saat ini</h3>
          <FirmsAck />
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
                    <th scope="col"><Term id="kabkota">Kab/kota</Term></th>
                    <th scope="col"><Term id="peringkat">Skor</Term></th>
                    <th scope="col"><Term id="fwi">FWI P75 (maks, periode model ~9 hari)</Term></th>
                    <th scope="col"><Term id="ffmc">Hari FFMC≥78</Term></th>
                    <th scope="col"><Term id="dc">DC maks</Term></th>
                    <th scope="col"><Term id="ensemble">P(14 hari tanpa &gt;20 mm)</Term></th>
                    <th scope="col"><Term id="irbi">IRBI 2025</Term></th>
                    <th scope="col"><Term id="hotspot">Hotspot</Term></th>
                    <th scope="col">Titik</th>
                  </tr>
                </thead>
                <tbody>
                  {view.daftar.map((row) => (
                    <tr key={row.kode}>
                      <td>{row.peringkat_daftar}</td>
                      <th scope="row">
                        {row.kab}
                      </th>
                      <td>{formatAngka(row.skor, 3)}</td>
                      <td>
                        {row.I1 == null ? "belum cukup data" : `${formatAngka(row.I1, 1)} (${formatAngka(row.fwi_titik_maks, 1)})`}
                      </td>
                      <td>{formatAngka(row.ffmc78_hari)}</td>
                      <td>{formatAngka(row.dc_maks, 0)}</td>
                      <td>{row.I2 == null ? "belum cukup data" : persen(row.I2)}</td>
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
      <OpenMeteoCredit />
      <CatatanRingkas judul="Cara hitung & rujukan">
        <p>{view.disclaimer}</p>
        <p className="fine method-note">
          Skor = rata-rata peringkat empat indikator (25% tiap indikator). Masuk daftar bila data lengkap, peluang 14 hari tanpa hari hujan di atas 20 mm minimal 50%, serta FFMC minimal 78 pada minimal 3 dari 9 hari atau DC minimal 260.
          {" "}FWI, FFMC, dan DC memakai hari model GWIS yang tersimpan (sekitar 9 hari), bukan 14 hari dan bukan prediksi resmi BMKG.
          {" "}Peluang kering dihitung dari anggota ensemble precipitation_sum di atas 20 mm selama 14 hari. Bukan precipitation_probability (peluang hujan di atas 0,1 mm) dan bukan peluang resmi BMKG.
          {" "}Analisis dasbor, bukan resmi BMKG/BNPB.
          {" "}
          <a href="#/sumber-metode/cara-hitung">Cara hitung & rujukan</a>
        </p>
      </CatatanRingkas>
      <nav className="method-links" aria-label="Metode perhitungan dan rujukan">
        <a href="#/sumber-metode/cara-hitung">Metode perhitungan dan rujukan →</a>
        <a href="#/sumber-metode/rujukan">Rujukan</a>
        <a href="#/sumber-metode/glosarium">Glosarium</a>
      </nav>
    </section>
  );
}
