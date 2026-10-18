import { useEffect, useMemo, useState } from "react";
import { formatAngka } from "../lib/format.js";
import { CONFIDENCE_COLORS, hotspotKey } from "../lib/bigWilayah.js";
import { buildHotspotTree } from "../lib/hotspotTree.js";

function ConfidenceChips({ rendah, nominal, tinggi }) {
  const items = [
    ["rendah", rendah, "Rendah"],
    ["nominal", nominal, "Nominal, sedang"],
    ["tinggi", tinggi, "Tinggi"],
  ];
  return (
    <span className="conf-chips">
      {items.map(([kelas, value, label]) => (
        <span
          key={kelas}
          className={`conf-chip conf-${kelas}`}
          style={{ background: CONFIDENCE_COLORS[kelas] }}
          title={label}
        >
          <span className="sr-only">{label} </span>
          {formatAngka(value)}
        </span>
      ))}
    </span>
  );
}

function rowId(key) {
  return `acc-${encodeURIComponent(key)}`;
}

export function HotspotAccordion({ points, onFocus, selectedKey, revealKey }) {
  const tree = useMemo(() => buildHotspotTree(points), [points]);
  const [query, setQuery] = useState("");
  const [openProv, setOpenProv] = useState(() => new Set());
  const [openKec, setOpenKec] = useState(() => new Set());
  const needle = query.trim().toLocaleLowerCase("id");
  const visible = needle ? tree.filter((prov) => prov.provinsi.toLocaleLowerCase("id").includes(needle)) : tree;

  useEffect(() => {
    if (!revealKey) return;
    const point = (points ?? []).find((item) => hotspotKey(item) === revealKey);
    if (!point || point.wilayahStatus === "gagal") return;
    const provName = point.provinsi && point.provinsi !== "Belum terpetakan" ? point.provinsi : "Belum terpetakan";
    const kecKey = tree.flatMap((prov) => prov.kecamatan).find((kec) => kec.points.includes(point))?.key;
    setOpenProv((current) => new Set(current).add(provName));
    if (kecKey) setOpenKec((current) => new Set(current).add(kecKey));
    const target = kecKey || provName;
    requestAnimationFrame(() => document.getElementById(rowId(target))?.scrollIntoView({ block: "nearest" }));
  }, [revealKey, points, tree]);

  function toggle(setter, key) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="hotspot-acc">
      <label className="filter-field acc-search">
        <span>Cari provinsi</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nama provinsi" />
      </label>
      <p className="acc-legend" aria-label="Confidence deteksi satelit">
        <strong>Confidence deteksi satelit</strong>
        <span className="conf-chip conf-rendah" style={{ background: CONFIDENCE_COLORS.rendah }}>rendah</span>
        <span className="conf-chip conf-nominal" style={{ background: CONFIDENCE_COLORS.nominal }}>nominal</span>
        <span className="conf-chip conf-tinggi" style={{ background: CONFIDENCE_COLORS.tinggi }}>tinggi</span>
      </p>
      {visible.length ? visible.map((prov) => {
        const provOpen = openProv.has(prov.key);
        return (
          <div key={prov.key} className="acc-block">
            <button
              type="button"
              id={rowId(prov.key)}
              className={`acc-row${selectedKey === prov.key ? " is-selected" : ""}`}
              aria-expanded={provOpen}
              onClick={() => {
                toggle(setOpenProv, prov.key);
                onFocus?.(prov.points, prov.key);
              }}
            >
              <span className="acc-caret" aria-hidden="true">{provOpen ? "▾" : "▸"}</span>
              <span className="acc-name">{prov.provinsi}</span>
              <span className="acc-total">{formatAngka(prov.jumlah)} titik</span>
              <ConfidenceChips rendah={prov.rendah} nominal={prov.nominal} tinggi={prov.tinggi} />
            </button>
            {provOpen ? (
              <div className="acc-children">
                {prov.kecamatan.map((kec) => {
                  const kecOpen = openKec.has(kec.key);
                  const place = [kec.kabupaten, kec.kodeKecamatan].filter(Boolean).join(" · ");
                  return (
                    <div key={kec.key}>
                      <button
                        type="button"
                        id={rowId(kec.key)}
                        className={`acc-row acc-kec${selectedKey === kec.key ? " is-selected" : ""}`}
                        aria-expanded={kec.desa.length ? kecOpen : undefined}
                        onClick={() => {
                          if (kec.desa.length) toggle(setOpenKec, kec.key);
                          onFocus?.(kec.points, kec.key);
                        }}
                      >
                        <span className="acc-caret" aria-hidden="true">{kec.desa.length ? (kecOpen ? "▾" : "▸") : ""}</span>
                        <span className="acc-name">
                          {kec.kecamatan}
                          {place ? <small>{place}</small> : null}
                        </span>
                        <span className="acc-total">{formatAngka(kec.jumlah)} titik</span>
                        <ConfidenceChips rendah={kec.rendah} nominal={kec.nominal} tinggi={kec.tinggi} />
                      </button>
                      {kecOpen && kec.desa.length ? (
                        <div className="acc-children">
                          {kec.desa.map((desa) => (
                            <button
                              key={desa.key}
                              type="button"
                              id={rowId(desa.key)}
                              className={`acc-row acc-desa${selectedKey === desa.key ? " is-selected" : ""}`}
                              onClick={() => onFocus?.(desa.points, desa.key)}
                            >
                              <span className="acc-caret" aria-hidden="true" />
                              <span className="acc-name">
                                {desa.desa}
                                {desa.kodeDesa ? <small>{desa.kodeDesa}</small> : null}
                              </span>
                              <span className="acc-total">{formatAngka(desa.jumlah)} titik</span>
                              <ConfidenceChips rendah={desa.rendah} nominal={desa.nominal} tinggi={desa.tinggi} />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      }) : <p className="empty">Tidak ada provinsi pada saringan ini.</p>}
    </div>
  );
}
