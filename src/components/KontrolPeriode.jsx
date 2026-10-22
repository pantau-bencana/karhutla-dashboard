import { useState } from "react";
import { labelJendela, JENDELA_PERIODE } from "../lib/peringkatHotspot.js";

export function teksJendela(periodeJam) {
  return `Jendela ${labelJendela(periodeJam)} dihitung dari deteksi terbaru di dalam tanggal yang dipilih. Peta, angka ringkas, dan tabel peringkat memakai jendela ini.`;
}

export function KontrolPeriode({
  from,
  to,
  setFrom,
  setTo,
  periodeJam,
  setPeriodeJam,
  onHariTerakhir,
  onTujuhHari,
}) {
  const [tanggalTerbuka, setTanggalTerbuka] = useState(false);

  function updateFrom(value) {
    setFrom?.(value);
    if (value && to && value > to) setTo?.(value);
  }

  function updateTo(value) {
    setTo?.(value);
    if (value && from && value < from) setFrom?.(value);
  }

  return (
    <section className="filters periode-kontrol" aria-label="Periode titik panas">
      <div className="periode-baris">
        <button
          type="button"
          className="button ghost tanggal-tombol"
          aria-expanded={tanggalTerbuka}
          aria-controls="rentang-tanggal"
          onClick={() => setTanggalTerbuka((buka) => !buka)}
        >
          Tanggal
        </button>
        <div id="rentang-tanggal" className={`date-filter${tanggalTerbuka ? " is-open" : ""}`}>
          <label>
            Dari
            <input type="date" value={from} onChange={(event) => updateFrom(event.target.value)} />
          </label>
          <label>
            Sampai
            <input type="date" value={to} onChange={(event) => updateTo(event.target.value)} />
          </label>
          <button type="button" className="button ghost periode-duplikat" onClick={onHariTerakhir}>
            Hari terakhir
          </button>
          <button type="button" className="button ghost periode-duplikat" onClick={onTujuhHari}>
            7 hari terakhir
          </button>
        </div>
        <div className="province-filter jendela-chips" role="group" aria-label={`Jendela periode, sekarang ${labelJendela(periodeJam)}`}>
          {JENDELA_PERIODE.map(([jam, label]) => (
            <button key={jam} type="button" aria-pressed={periodeJam === jam} onClick={() => setPeriodeJam?.(jam)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="fine peta-penjelas">{teksJendela(periodeJam)}</p>
    </section>
  );
}
