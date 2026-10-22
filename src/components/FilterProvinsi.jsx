import { useMemo } from "react";
import { chipProvinsi } from "../lib/peringkatHotspot.js";
import { PROVINSI, SEMUA_PROVINSI } from "../lib/provinsi.js";

export function FilterProvinsi({ province = "", setProvince, points = [], from = "", to = "", hours = null, prioritas = [] }) {
  const chips = useMemo(() => chipProvinsi(points, { from, to, hours }), [points, from, to, hours]);
  const pilihan = useMemo(() => {
    const names = PROVINSI.map((item) => item.nama);
    if (province && !names.includes(province)) names.push(province);
    return names.sort((a, b) => a.localeCompare(b, "id"));
  }, [province]);
  const nilaiPilih = pilihan.includes(province) ? province : "";

  return (
    <div className="province-picker">
      <div className="province-filter" role="group" aria-label="Cakupan wilayah">
        <div className="province-chips">
          <button type="button" aria-pressed={province === ""} onClick={() => setProvince("")}>
            Seluruh Indonesia
          </button>
          {chips.map((name) => (
            <button key={name} type="button" aria-pressed={province === name} onClick={() => setProvince(name)}>
              {name}
            </button>
          ))}
        </div>
        <label className="filter-field province-semua">
          <span className="sr-only">{SEMUA_PROVINSI}</span>
          <select aria-label={SEMUA_PROVINSI} value={nilaiPilih} onChange={(event) => setProvince(event.target.value)}>
            <option value="">{SEMUA_PROVINSI}</option>
            {pilihan.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="fine peta-penjelas">
        Tombol mengikuti peringkat deteksi hotspot pada periode aktif: merah, lalu oranye, lalu kuning, lalu total.
        {prioritas.length ? ` Konteks provinsi prioritas untuk prakiraan dan kesiapsiagaan tetap: ${prioritas.join(", ")}.` : ""}
      </p>
    </div>
  );
}
