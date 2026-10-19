import { useCallback, useMemo, useRef, useState } from "react";
import { ClusterLegend, HotspotMap } from "./HotspotMap.jsx";
import { GwisFwiToggle } from "./GwisFwiToggle.jsx";
import { tanggalJakarta } from "../lib/gwisFwi.js";
import { HotspotAccordion } from "./HotspotAccordion.jsx";
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
  unverifiedWilayahCount,
  wilayahGroupKey,
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

export function HotspotBoard({ points, priority, meta, feed, fetchedAt, observedAt, freshness, sumber, from = "", to = "" }) {
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
  const [selectedGroup, setSelectedGroup] = useState("");
  const [mapReveal, setMapReveal] = useState("");
  const [fwiOn, setFwiOn] = useState(false);
  const [fwiReady, setFwiReady] = useState(false);
  const modelDate = tanggal || tanggalJakarta();
  const onFwiReady = useCallback((ready) => setFwiReady(ready), []);

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
    setSelectedGroup(wilayahGroupKey(point, "kecamatan"));
    setMapReveal(key);
  }

  function focusGroup(groupPoints, groupKey) {
    setSelectedGroup(groupKey);
    const first = groupPoints?.[0];
    setSelectedKey(first ? hotspotKey(first) : "");
    const latlngs = (groupPoints ?? []).map((point) => [Number(point.lintang), Number(point.bujur)]);
    mapApi.current?.focus(latlngs);
  }

  return (
    <div className="logic-body">
      <p>
        Deteksi satelit, bukan kebakaran terkonfirmasi. Confidence deteksi satelit — keyakinan deteksi, bukan intensitas atau bahaya.
      </p>
      <details className="read-help">
        <summary>Cara membaca</summary>
        <p>Sumber titik: {hotspotSourceLabel(feed, sumber || meta?.sumber)}. Koordinat yang digambar adalah koordinat FIRMS, tidak dibulatkan dan tidak ditukar. Sumber wilayah: {BIG_SOURCE_LABEL}.</p>
        <p>{BIG_EDITION_NOTE}</p>
        <p>{CONFIDENCE_NOTE} Jumlah per kelas adalah jumlah deteksi, bukan tingkat keparahan.</p>
        <p>
          Pada zoom kecil, cincin berwarna membagi petak menjadi hijau, kuning, dan merah menurut bagian kelas confidence di dalamnya. Angka di tengah adalah jumlah deteksi, bukan kelas confidence. Pada zoom 6 ke atas, atau bila petak hanya berisi satu titik, tiap titik memakai warna confidence (hijau rendah, kuning nominal, merah tinggi) dan koordinat FIRMS.
          Garis desa BIG hanya diminta untuk tampilan dekat, tidak untuk seluruh Indonesia, dan tidak disimpan.
        </p>
      </details>
      <DatasetTiming feed={feed} />
      {fetchedAt ? <p className="fine">Diambil {formatWib(fetchedAt)}. Usia cuplikan mengikuti waktu ambil itu.</p> : null}
      {filterIncomplete ? <p className="banner warn is-sticky">{FILTER_INCOMPLETE}</p> : null}
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
        <ClusterLegend />
      </div>
      <p className="fine">
        {WINDOWS.find(([value]) => value === hours)?.[1]}: {formatAngka(tally.jumlah)} titik.
        nama desa tersedia untuk {formatAngka(desaCoverage)} dari {formatAngka(filtered.length)} titik.
      </p>
      <p className="lintasan-line" role="status">
        <strong>Lintasan satelit terakhir: {observedAt ? formatWib(observedAt) : "—"}</strong>
        {freshness?.tertunda ? <span className="tag">tertunda</span> : null}
      </p>
      <GwisFwiToggle date={modelDate} enabled={fwiOn} onEnabled={setFwiOn} onReady={onFwiReady} />
      <div className="board-split">
      <div className="board-map">
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
        <HotspotMap points={filtered} frame="indonesia" mapApi={mapApi} selectedKey={selectedKey} onSelect={choosePoint} fwiDate={fwiOn && fwiReady ? modelDate : ""} />
      </div>
      </div>
      <section className="hotspot-count" aria-labelledby="hotspot-count-heading">
        <h2 id="hotspot-count-heading">Jumlah deteksi hotspot (bukan status)</h2>
        <p>
          Periode {WINDOWS.find(([value]) => value === hours)?.[1]}
          {from && to ? ` di dalam tanggal ${from}–${to}` : ""}. Bukan status operasional.
          {unverified ? ` ${formatAngka(unverified)} titik belum terverifikasi wilayah.` : ""}
          {" "}Daftar mengikuti saringan di atas dan memusatkan peta saat baris dipilih.
        </p>
        <details className="read-help">
          <summary>Cara membaca</summary>
          <p>
            Satelit: {hotspotSourceLabel(feed, sumber || meta?.sumber)}. Urutan provinsi mengikuti jumlah titik, dari yang terbanyak. Angka berwarna adalah confidence deteksi satelit: rendah, nominal (sedang), dan tinggi. Bukan tingkat bahaya. Membuka provinsi menampilkan kecamatan, lalu desa.
          </p>
        </details>
        <HotspotAccordion points={filtered} onFocus={focusGroup} selectedKey={selectedGroup} revealKey={mapReveal} />
      </section>
      </div>
    </div>
  );
}
