import { useCallback, useMemo, useRef, useState } from "react";
import { ClusterLegend, HotspotMap } from "./HotspotMap.jsx";
import { GwisFwiToggle } from "./GwisFwiToggle.jsx";
import { tanggalJakarta } from "../lib/gwisFwi.js";
import { HotspotAccordion } from "./HotspotAccordion.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { formatAngka, formatWib } from "../lib/format.js";
import { hotspotSourceLabel } from "../lib/freshness.js";
import { countHotspots } from "../lib/hotspotWindow.js";
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

export function HotspotBoard({ points, priority, meta, feed, fetchedAt, observedAt, freshness, sumber, from = "", to = "", periodeTeks = "", frame = "indonesia", onKembaliIndonesia }) {
  const mapApi = useRef(null);
  const [provinceFilter, setProvinceFilter] = useState("semua");
  const [tanggal, setTanggal] = useState("");
  const [satelit, setSatelit] = useState("");
  const [provinsi, setProvinsi] = useState("");
  const [kabupaten, setKabupaten] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [desa, setDesa] = useState("");
  const [confidence, setConfidence] = useState(() => new Set(["rendah", "nominal", "tinggi", "tidak_diketahui"]));
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [mapReveal, setMapReveal] = useState("");
  const [fwiOn, setFwiOn] = useState(false);
  const [fwiReady, setFwiReady] = useState(false);
  const modelDate = tanggal || tanggalJakarta();
  const onFwiReady = useCallback((ready) => setFwiReady(ready), []);

  const selectedProvinces = provinceFilter === "prioritas" ? priority : provinceFilter === "semua" ? null : [provinceFilter];
  const scoped = useMemo(() => {
    const rows = points ?? [];
    if (!selectedProvinces) return rows;
    const allow = new Set(selectedProvinces);
    return rows.filter((point) => allow.has(point.provinsi));
  }, [points, selectedProvinces]);
  const dated = useMemo(() => {
    const rows = tanggal ? scoped.filter((point) => point.tanggal === tanggal) : scoped;
    return satelit ? rows.filter((point) => point.satelit === satelit) : rows;
  }, [scoped, tanggal, satelit]);
  const confident = useMemo(() => dated.filter((point) => confidence.has(point.kelasKepercayaan)), [dated, confidence]);
  const filtered = useMemo(
    () => filterHotspotRows(confident, { provinsi, kabupaten, kecamatan, desa }),
    [confident, provinsi, kabupaten, kecamatan, desa],
  );
  const tally = countHotspots(filtered);
  const desaCoverage = filtered.filter((point) => point.desa && point.desa !== DESA_UNIDENTIFIED).length;
  const unverified = unverifiedWilayahCount(filtered);
  const dates = distinctSorted(scoped, "tanggal");
  const satellites = distinctSorted(scoped, "satelit");
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
          Pada zoom kecil, cincin berwarna membagi petak menjadi kuning (rendah), oranye (sedang), dan merah (tinggi). Abu-abu adalah tidak diketahui dan tidak dihitung sebagai kuning. Angka di tengah adalah jumlah deteksi, bukan kelas confidence. Pada zoom 6 ke atas, atau bila petak hanya berisi satu titik, tiap titik memakai warna itu dan koordinat FIRMS.
          Garis desa BIG hanya diminta untuk tampilan dekat, tidak untuk seluruh Indonesia, dan tidak disimpan.
        </p>
      </details>
      <DatasetTiming feed={feed} />
      {fetchedAt ? <p className="fine">Diambil {formatWib(fetchedAt)}. Usia cuplikan mengikuti waktu ambil itu.</p> : null}
      {filterIncomplete ? <p className="banner warn is-sticky">{FILTER_INCOMPLETE}</p> : null}
      <div className="province-filter" role="group" aria-label="Saringan peta tambahan">
        <button type="button" aria-pressed={provinceFilter === "semua"} onClick={() => setProvinceFilter("semua")}>Semua</button>
        <button type="button" aria-pressed={provinceFilter === "prioritas"} onClick={() => setProvinceFilter("prioritas")}>Enam prioritas</button>
      </div>
      <p className="fine">
        Enam prioritas membatasi peta ke {(priority ?? []).join(", ") || "provinsi pada konfigurasi kesiapsiagaan"}. Tombol cakupan di atas mengikuti peringkat hotspot periode ini.
      </p>
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
        {periodeTeks || "Periode aktif"}: {formatAngka(tally.jumlah)} titik pada peta setelah saringan. Tabel peringkat tetap menghitung seluruh jendela sebelum saringan kelas, satelit, atau desa.
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
        <button type="button" className="button" onClick={() => { onKembaliIndonesia?.(); mapApi.current?.showIndonesia(); }}>Kembali ke seluruh Indonesia</button>
      </div>
      <div className="map-stage">
        <HotspotMap points={filtered} frame={frame} mapApi={mapApi} selectedKey={selectedKey} onSelect={choosePoint} fwiDate={fwiOn && fwiReady ? modelDate : ""} />
        {freshness?.tertunda || feed?.status === "usang" || feed?.status === "gagal" ? (
          <details className={feed?.status === "gagal" ? "map-badge map-badge-gagal" : "map-badge"}>
            <summary>
              <span className="map-badge-judul">{feed?.status === "gagal" ? "Peta kosong" : "Data tertunda"}</span>
              {feed?.status === "gagal" ? null : <span className="map-badge-ringkas">{observedAt ? formatWib(observedAt) : "—"}</span>}
            </summary>
            <p>
              {feed?.status === "gagal"
                ? feed.error
                : `Lintasan satelit terakhir: ${observedAt ? formatWib(observedAt) : "—"}. Yang tampil adalah cuplikan, bukan permintaan peramban ke NASA FIRMS.`}
            </p>
          </details>
        ) : null}
      </div>
      </div>
      <section className="hotspot-count" aria-labelledby="hotspot-count-heading">
        <h2 id="hotspot-count-heading">Jumlah deteksi hotspot (bukan status)</h2>
        <p>
          Periode {periodeTeks || "aktif"}
          {from && to ? ` di dalam tanggal ${from}–${to}` : ""}. Bukan status operasional dan bukan bahaya kebakaran.
          {unverified ? ` ${formatAngka(unverified)} titik belum terverifikasi wilayah.` : ""}
          {" "}Daftar mengikuti saringan di atas dan memusatkan peta saat baris dipilih.
        </p>
        <details className="read-help">
          <summary>Cara membaca</summary>
          <p>
            Satelit: {hotspotSourceLabel(feed, sumber || meta?.sumber)}. Angka berwarna adalah confidence deteksi satelit: kuning rendah, oranye sedang, merah tinggi. Tidak diketahui tidak disebut kuning. Bukan tingkat bahaya. Membuka provinsi menampilkan kecamatan, lalu desa. Urutan daftar ini sama dengan tabel peringkat: tinggi (merah) dulu, lalu sedang (oranye), lalu rendah (kuning), lalu jumlah tiga kelas itu, lalu nama. Angka titik di samping nama menghitung semua deteksi, termasuk yang kepercayaannya tidak diketahui.
          </p>
        </details>
        <HotspotAccordion points={filtered} onFocus={focusGroup} selectedKey={selectedGroup} revealKey={mapReveal} />
      </section>
      </div>
    </div>
  );
}
