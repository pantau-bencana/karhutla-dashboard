import { labelJendela, JENDELA_PERIODE } from "../lib/peringkatHotspot.js";

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
  function updateFrom(value) {
    setFrom?.(value);
    if (value && to && value > to) setTo?.(value);
  }

  function updateTo(value) {
    setTo?.(value);
    if (value && from && value < from) setFrom?.(value);
  }

  return (
    <section className="filters" aria-label="Periode titik panas">
      <div className="date-filter">
        <label>
          Dari
          <input type="date" value={from} onChange={(event) => updateFrom(event.target.value)} />
        </label>
        <label>
          Sampai
          <input type="date" value={to} onChange={(event) => updateTo(event.target.value)} />
        </label>
        <button type="button" className="button ghost" onClick={onHariTerakhir}>
          Hari terakhir
        </button>
        <button type="button" className="button ghost" onClick={onTujuhHari}>
          7 hari terakhir
        </button>
      </div>
      <div className="province-filter" role="group" aria-label={`Jendela periode, sekarang ${labelJendela(periodeJam)}`}>
        {JENDELA_PERIODE.map(([jam, label]) => (
          <button key={jam} type="button" aria-pressed={periodeJam === jam} onClick={() => setPeriodeJam?.(jam)}>
            {label}
          </button>
        ))}
      </div>
      <p className="fine">
        Jendela {labelJendela(periodeJam)} dihitung dari deteksi terbaru di dalam tanggal yang dipilih. Peta, angka ringkas, dan tabel peringkat memakai jendela ini.
      </p>
    </section>
  );
}
