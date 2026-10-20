import { useEffect, useState } from "react";
import { InfoTip } from "./InfoTip.jsx";
import { formatTanggal } from "../lib/format.js";
import {
  GWIS_ATTRIBUTION,
  GWIS_CLASS_NOTE,
  GWIS_CREDIT,
  GWIS_LABEL,
  GWIS_LEGEND_URL,
  GWIS_UNAVAILABLE,
  gwisDateAvailable,
} from "../lib/gwisFwi.js";

export function GwisFwiToggle({ date, enabled, onEnabled, onReady }) {
  const [phase, setPhase] = useState("mati");

  useEffect(() => {
    if (!enabled) {
      setPhase("mati");
      onReady(false);
      return undefined;
    }
    let cancel = false;
    setPhase("cek");
    onReady(false);
    gwisDateAvailable(date)
      .then((ready) => {
        if (cancel) return;
        setPhase(ready ? "ada" : "kosong");
        onReady(ready);
      })
      .catch(() => {
        if (cancel) return;
        setPhase("kosong");
        onReady(false);
      });
    return () => {
      cancel = true;
    };
  }, [date, enabled, onReady]);

  return (
    <section className="gwis-fwi" aria-label="FWI pembanding GWIS">
      <span className="layer-with-info">
        <label className="gwis-fwi-toggle">
          <input type="checkbox" checked={enabled} onChange={(event) => onEnabled(event.target.checked)} />
          <span>{GWIS_LABEL}</span>
        </label>
        <InfoTip label="Penjelasan lapisan Data Pembanding">
          <p>Pembanding (data terbuka, bukan resmi). FWI model ECMWF lewat GWIS, bukan FDRS BMKG.</p>
          <p>Lapisan ini tidak masuk skor peringatan. Tanggal mengikuti filter peta. Raster ini bukan batas kab/kota.</p>
          <p>
            <a href="#/sumber-metode">Sumber dan batasan data</a>
          </p>
        </InfoTip>
      </span>
      <p>
        Tanggal model: <strong>{formatTanggal(date)}</strong>.
        {enabled && phase === "cek" ? " Lapisan sedang diperiksa." : null}
      </p>
      <p>{GWIS_CLASS_NOTE}</p>
      {enabled && phase === "kosong" ? <p role="status">{GWIS_UNAVAILABLE}</p> : null}
      {enabled && phase === "ada" ? (
        <img className="gwis-legend" src={GWIS_LEGEND_URL} alt="Legenda FWI GWIS. Kelas pada gambar ini adalah skala Canadian FWI, bukan kelas FWI atau FDRS BMKG." />
      ) : null}
      {enabled ? (
        <p className="fine">
          {GWIS_CREDIT}. {GWIS_ATTRIBUTION}
        </p>
      ) : null}
    </section>
  );
}
