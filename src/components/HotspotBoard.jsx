import { useMemo, useRef, useState } from "react";
import { HotspotMap } from "./HotspotMap.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { formatAngka, formatWib } from "../lib/format.js";
import { hotspotSourceLabel } from "../lib/freshness.js";
import { countHotspots, filterHotspotWindow } from "../lib/hotspotWindow.js";
import {
  BIG_EDITION_NOTE,
  BIG_SOURCE_LABEL,
  DESA_UNIDENTIFIED,
  CONFIDENCE_COLORS,
  CONFIDENCE_LABELS,
  CONFIDENCE_NOTE,
  FILTER_INCOMPLETE,
  desaLabel,
  distinctSorted,
  filterHotspotRows,
  hotspotKey,
  summarizeByWilayah,
  unverifiedWilayahCount,
  wilayahGroupKey,
} from "../lib/bigWilayah.js";

const WINDOWS = [
  [24, "24 jam"],
  [48, "48 jam"],
  [168, "7 hari"],
];

const GROUP_LEVELS = [
  ["kecamatan", "Kecamatan"],
  ["kabupaten", "Kabupaten/kota"],
  ["desa", "Desa/kelurahan"],
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

export function HotspotBoard({ points, priority, meta, feed, fetchedAt, observedAt, freshness, sumber }) {
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
  const [groupLevel, setGroupLevel] = useState("kecamatan");

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
  const groups = summarizeByWilayah(filtered, groupLevel);
  const desaCoverage = filtered.filter((point) => point.desa && point.desa !== DESA_UNIDENTIFIED).length;
  const unverified = unverifiedWilayahCount(filtered);
  const dates = distinctSorted(windowed.rows, "tanggal");
  const satellites = distinctSorted(windowed.rows, "satelit");
  const provinces = distinctSorted(confident, "provinsi").filter((name) => name !== "Belum terpetakan");
  const kabOptions = distinctSorted(filterHotspotRows(confident, { provinsi }), "kabupaten");
  const kecOptions = distinctSorted(filterHotspotRows(confident, { provinsi, kabupaten }), "kecamatan");
  const desaOptions = [...new Set(filterHotspotRows(confident, { provinsi, kabupaten, kecamatan }).map((point) => desaLabel(point)))].sort((a, b) => a.localeCompare(b, "id"));
  const filterIncomplete = (points ?? []).some((point) => point.wilayahStatus === "gagal");

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
    setSelectedDesa(wilayahGroupKey(point, groupLevel));
    const row = document.getElementById(`desa-${wilayahGroupKey(point, groupLevel)}`);
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
        Sumber titik: {hotspotSourceLabel(feed, sumber || meta?.sumber)}. Koordinat yang digambar adalah koordinat FIRMS, tidak dibulatkan dan tidak ditukar.
        Sumber wilayah: {BIG_SOURCE_LABEL}. {BIG_EDITION_NOTE}
      </p>
      <DatasetTiming feed={feed} />
      {fetchedAt ? <p className="fine">Diambil {formatWib(fetchedAt)}. Usia cuplikan mengikuti waktu ambil itu.</p> : null}
      {filterIncomplete ? <p className="banner warn is-sticky">{FILTER_INCOMPLETE}</p> : null}
      {unverified ? <p className="fine">{formatAngka(unverified)} titik belum terverifikasi wilayah</p> : null}
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
        <p><strong>Confidence deteksi satelit</strong> — keyakinan deteksi, bukan intensitas atau bahaya</p>
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
      <p className="lintasan-line" role="status">
        <strong>Lintasan satelit terakhir: {observedAt ? formatWib(observedAt) : "—"}</strong>
        {freshness?.tertunda ? <span className="tag">tertunda</span> : null}
      </p>
      <div className="map-toolbar">
        <button type="button" className="button" onClick={() => mapApi.current?.showIndonesia()}>Kembali ke seluruh Indonesia</button>
      </div>
      <div className="map-stage">
        {freshness?.tertunda || feed?.status === "usang" || feed?.status === "gagal" ? (
          <div className="banner warn map-overlay" role="status">
            <strong>{feed?.status === "gagal" ? "Peta kosong" : "Data tertunda"}</strong>
            <p>
              {feed?.status === "gagal"
                ? feed.error
                : `Lintasan satelit terakhir: ${observedAt ? formatWib(observedAt) : "—"}. Yang tampil adalah cuplikan, bukan permintaan peramban ke NASA FIRMS.`}
            </p>
          </div>
        ) : null}
        <HotspotMap points={filtered} frame="indonesia" mapApi={mapApi} selectedKey={selectedKey} onSelect={choosePoint} />
      </div>
      <div className="province-filter" role="group" aria-label="Tingkat ringkasan wilayah">
        {GROUP_LEVELS.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={groupLevel === value} onClick={() => setGroupLevel(value)}>
            {label}
          </button>
        ))}
      </div>
      <h3>{groupLevel === "desa" ? "Jumlah deteksi per desa" : groupLevel === "kabupaten" ? "Jumlah deteksi per kabupaten/kota" : "Jumlah deteksi per kecamatan"}</h3>
      <p className="fine">nama desa tersedia untuk {formatAngka(desaCoverage)} dari {formatAngka(filtered.length)} titik. Satu nama desa bisa muncul di lebih dari satu tempat. Kode wilayah membedakannya. Baris tanpa padanan desa tertulis {DESA_UNIDENTIFIED}.</p>
      <div className="table-wrap wrap-cells">
        <table>
          <thead>
            <tr>
              {groupLevel === "desa" ? <th scope="col">Desa/kelurahan</th> : null}
              {groupLevel === "desa" ? <th scope="col">Kode desa</th> : null}
              {groupLevel !== "kabupaten" ? <th scope="col">Kecamatan</th> : null}
              {groupLevel !== "kabupaten" ? <th scope="col">Kode kecamatan</th> : null}
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
                {groupLevel === "desa" ? <th scope="row">{group.desa}</th> : null}
                {groupLevel === "desa" ? <td>{group.kodeDesa || "—"}</td> : null}
                {groupLevel === "kecamatan" ? <th scope="row">{group.kecamatan || "—"}</th> : null}
                {groupLevel === "desa" ? <td>{group.kecamatan || "—"}</td> : null}
                {groupLevel !== "kabupaten" ? <td>{group.kodeKecamatan || "—"}</td> : null}
                {groupLevel === "kabupaten" ? <th scope="row">{group.kabupaten || "—"}</th> : <td>{group.kabupaten || "—"}</td>}
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
                <td colSpan={groupLevel === "desa" ? 12 : groupLevel === "kabupaten" ? 8 : 10}>Tidak ada deteksi pada saringan ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
