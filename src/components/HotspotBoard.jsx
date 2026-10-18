import { useMemo, useRef, useState } from "react";
import { HotspotMap } from "./HotspotMap.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { formatAngka, formatWib } from "../lib/format.js";
import { countHotspots, filterHotspotWindow } from "../lib/hotspotWindow.js";
import {
  BIG_EDITION_NOTE,
  BIG_SOURCE_LABEL,
  DESA_UNIDENTIFIED,
  CONFIDENCE_COLORS,
  CONFIDENCE_LABELS,
  CONFIDENCE_NOTE,
  WILAYAH_UNAVAILABLE,
  desaGroupKey,
  desaLabel,
  distinctSorted,
  filterHotspotRows,
  hotspotKey,
  summarizeByDesa,
} from "../lib/bigWilayah.js";

const WINDOWS = [
  [24, "24 jam"],
  [48, "48 jam"],
  [168, "7 hari"],
];

function SelectFilter({ label, value, onChange, options, empty }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{empty}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function HotspotBoard({ points, priority, meta, feed, fetchedAt, observedAt }) {
  const mapApi = useRef(null);
  const [hours, setHours] = useState(24);
  const [provinceFilter, setProvinceFilter] = useState("semua");
  const [tanggal, setTanggal] = useState("");
  const [satelit, setSatelit] = useState("");
  const [provinsi, setProvinsi] = useState("");
  const [kabupaten, setKabupaten] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [desa, setDesa] = useState("");
  const [confidence, setConfidence] = useState(() => new Set(["rendah", "nominal", "tinggi"]));
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedDesa, setSelectedDesa] = useState("");

  const selectedProvinces = provinceFilter === "prioritas" ? priority : provinceFilter === "semua" ? null : [provinceFilter];
  const windowed = filterHotspotWindow(points, { hours, provinces: selectedProvinces });
  const dated = useMemo(() => {
    const rows = tanggal ? windowed.rows.filter((point) => point.tanggal === tanggal) : windowed.rows;
    return satelit ? rows.filter((point) => point.satelit === satelit) : rows;
  }, [windowed.rows, tanggal, satelit]);
  const confident = useMemo(() => dated.filter((point) => confidence.has(point.kelasKepercayaan)), [dated, confidence]);
  const filtered = useMemo(
    () => filterHotspotRows(confident, { provinsi, kabupaten, kecamatan, desa }),
    [confident, provinsi, kabupaten, kecamatan, desa],
  );
  const tally = countHotspots(filtered);
  const groups = summarizeByDesa(filtered);
  const dates = distinctSorted(windowed.rows, "tanggal");
  const satellites = distinctSorted(windowed.rows, "satelit");
  const provinces = distinctSorted(confident, "provinsi").filter((name) => name !== "Belum terpetakan");
  const kabOptions = distinctSorted(filterHotspotRows(confident, { provinsi }), "kabupaten");
  const kecOptions = distinctSorted(filterHotspotRows(confident, { provinsi, kabupaten }), "kecamatan");
  const desaOptions = [...new Set(filterHotspotRows(confident, { provinsi, kabupaten, kecamatan }).map((point) => desaLabel(point)))].sort((a, b) => a.localeCompare(b, "id"));
  const wilayahGagal = filtered.some((point) => point.wilayahStatus === "gagal") || filtered.some((point) => !point.wilayahStatus && !point.kecamatan && !point.desa);

  function toggleConfidence(kelas) {
    setConfidence((current) => {
      const next = new Set(current);
      if (next.has(kelas)) next.delete(kelas);
      else next.add(kelas);
      return next;
    });
  }

  function choosePoint(point) {
    const key = hotspotKey(point);
    setSelectedKey(key);
    setSelectedDesa(desaGroupKey(point));
    const row = document.getElementById(`desa-${desaGroupKey(point)}`);
    row?.scrollIntoView({ block: "nearest" });
  }

  function chooseDesa(group) {
    setSelectedDesa(group.key);
    const first = group.points[0];
    setSelectedKey(first ? hotspotKey(first) : "");
    const latlngs = group.points.map((point) => [Number(point.lintang), Number(point.bujur)]);
    mapApi.current?.focus(latlngs);
  }

  return (
    <div className="logic-body">
      <p>
        Sumber titik: NASA FIRMS{meta?.sumber ? ` (${meta.sumber})` : ""}. Koordinat yang digambar adalah koordinat FIRMS, tidak dibulatkan dan tidak ditukar.
        Sumber wilayah: {BIG_SOURCE_LABEL}. {BIG_EDITION_NOTE}
      </p>
      <DatasetTiming feed={feed} />
      {fetchedAt ? <p className="fine">Diambil {formatWib(fetchedAt)}. Waktu data {formatWib(observedAt)}.</p> : null}
      {wilayahGagal ? <p className="fine">{WILAYAH_UNAVAILABLE}. Titik FIRMS tetap ditampilkan.</p> : null}
      <div className="province-filter" role="group" aria-label="Jendela waktu hotspot">
        {WINDOWS.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={hours === value} onClick={() => setHours(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="province-filter" role="group" aria-label="Provinsi prioritas">
        <button type="button" aria-pressed={provinceFilter === "semua"} onClick={() => setProvinceFilter("semua")}>Semua</button>
        <button type="button" aria-pressed={provinceFilter === "prioritas"} onClick={() => setProvinceFilter("prioritas")}>Enam prioritas</button>
        {(priority ?? []).map((name) => (
          <button key={name} type="button" aria-pressed={provinceFilter === name} onClick={() => setProvinceFilter(name)}>{name}</button>
        ))}
      </div>
      <div className="hotspot-filters">
        <SelectFilter label="Tanggal" value={tanggal} onChange={setTanggal} options={dates} empty="Semua tanggal pada jendela" />
        <SelectFilter label="Satelit" value={satelit} onChange={setSatelit} options={satellites} empty="Semua satelit" />
        <SelectFilter label="Provinsi" value={provinsi} onChange={(value) => { setProvinsi(value); setKabupaten(""); setKecamatan(""); setDesa(""); }} options={provinces} empty="Semua provinsi" />
        <SelectFilter label="Kab/kota" value={kabupaten} onChange={(value) => { setKabupaten(value); setKecamatan(""); setDesa(""); }} options={kabOptions} empty="Semua kab/kota" />
        <SelectFilter label="Kecamatan" value={kecamatan} onChange={(value) => { setKecamatan(value); setDesa(""); }} options={kecOptions} empty="Semua kecamatan" />
        <SelectFilter label="Desa/kelurahan" value={desa} onChange={setDesa} options={desaOptions} empty="Semua desa" />
      </div>
      <div className="confidence-legend" aria-label="Confidence deteksi satelit">
        <p><strong>Confidence deteksi satelit</strong></p>
        <div className="province-filter" role="group" aria-label="Saring kelas confidence">
          {CONFIDENCE_LABELS.map(([kelas, label]) => (
            <button key={kelas} type="button" aria-pressed={confidence.has(kelas)} onClick={() => toggleConfidence(kelas)}>
              <i className="swatch" style={{ background: CONFIDENCE_COLORS[kelas] }} /> {label}
            </button>
          ))}
        </div>
        <p className="fine">{CONFIDENCE_NOTE} Jumlah per kelas di tabel adalah jumlah deteksi, bukan tingkat keparahan.</p>
      </div>
      <p className="fine">
        {WINDOWS.find(([value]) => value === hours)?.[1]} sampai deteksi terbaru: {formatAngka(tally.jumlah)} titik.
        Rendah {formatAngka(tally.kepercayaan.rendah || 0)}, nominal {formatAngka(tally.kepercayaan.nominal || 0)}, tinggi {formatAngka(tally.kepercayaan.tinggi || 0)}.
        Pada zoom kecil, kelompok abu-abu diletakkan pada salah satu koordinat asli dan hanya menunjukkan jumlah deteksi. Pada zoom besar setiap titik memakai warna confidence dan koordinat FIRMS.
        Garis desa BIG hanya diminta untuk tampilan dekat, tidak untuk seluruh Indonesia, dan tidak disimpan.
      </p>
      <div className="map-toolbar">
        <button type="button" className="button" onClick={() => mapApi.current?.showIndonesia()}>Kembali ke seluruh Indonesia</button>
      </div>
      <HotspotMap points={filtered} frame="indonesia" mapApi={mapApi} selectedKey={selectedKey} onSelect={choosePoint} />
      <h3>Jumlah deteksi per desa</h3>
      <p className="fine">Satu nama desa bisa muncul di lebih dari satu tempat. Kode wilayah membedakannya. Baris tanpa padanan desa tertulis {DESA_UNIDENTIFIED}.</p>
      <div className="table-wrap wrap-cells">
        <table>
          <thead>
            <tr>
              <th scope="col">Desa/kelurahan</th>
              <th scope="col">Kode desa</th>
              <th scope="col">Kecamatan</th>
              <th scope="col">Kode kecamatan</th>
              <th scope="col">Kab/kota</th>
              <th scope="col">Kode kab/kota</th>
              <th scope="col">Provinsi</th>
              <th scope="col">Kode provinsi</th>
              <th scope="col">Jumlah</th>
              <th scope="col">Rendah</th>
              <th scope="col">Nominal</th>
              <th scope="col">Tinggi</th>
            </tr>
          </thead>
          <tbody>
            {groups.length ? groups.map((group) => (
              <tr
                key={group.key}
                id={`desa-${group.key}`}
                className={selectedDesa === group.key ? "is-selected" : undefined}
                onClick={() => chooseDesa(group)}
              >
                <th scope="row">{group.desa}</th>
                <td>{group.kodeDesa || "—"}</td>
                <td>{group.kecamatan || "—"}</td>
                <td>{group.kodeKecamatan || "—"}</td>
                <td>{group.kabupaten || "—"}</td>
                <td>{group.kodeKabupaten || "—"}</td>
                <td>{group.provinsi && group.provinsi !== "Belum terpetakan" ? group.provinsi : "—"}</td>
                <td>{group.kodeProvinsi || "—"}</td>
                <td>{formatAngka(group.jumlah)}</td>
                <td>{formatAngka(group.rendah)}</td>
                <td>{formatAngka(group.nominal)}</td>
                <td>{formatAngka(group.tinggi)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={12}>Tidak ada deteksi pada saringan ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
