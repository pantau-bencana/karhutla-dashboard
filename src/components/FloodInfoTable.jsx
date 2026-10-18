import { useMemo, useState } from "react";
import {
  BMKG_ATTRIBUTION,
  DASARIAN_NOTE,
  NOWCAST_FAIL,
  NOWCAST_LOADING,
  nowcastAbsent,
  nowcastCrossTab,
  nowcastExpiredText,
} from "../lib/capKab.js";
import {
  DASARIAN_BMKG_URL,
  DASARIAN_EMPTY,
  DASARIAN_EXPIRED,
  DASARIAN_UNLISTED,
} from "../lib/dasarianManual.js";
import { formatTanggal, formatWib } from "../lib/format.js";
import { FLOOD_INFO_COLUMNS, RAIN_RISK_MATRIX, krbLinksFor, skorTeks, sortFloodRows } from "../lib/floodMatrix.js";

const CELLS = {
  wilayah: (row) => (
    <>
      {row.kode}
      <small>{row.nama}</small>
    </>
  ),
  "irbi-banjir": (row) => (
    <>
      {skorTeks(row.banjirSkor)} · {row.banjirKelas}
      <small>hal. {row.banjirHalaman}</small>
    </>
  ),
  "irbi-multi": (row) => (
    <>
      {row.multiKelas || "—"}
      <small>
        hal. {row.multiHalaman || "—"}
        {row.multiSkor ? ` · skor ${skorTeks(row.multiSkor)}` : ""}
      </small>
    </>
  ),
  nowcast: (row) => {
    if (row.nowcastStatus === "memuat") return NOWCAST_LOADING;
    if (row.nowcastStatus !== "ok") return NOWCAST_FAIL;
    if (row.nowcastExpired) return nowcastExpiredText(row.nowcastJam);
    if (!row.nowcastAda) return nowcastAbsent(row.nowcastJam);
    return (row.nowcastAlerts ?? []).map((alert) => (
      <span key={alert.cap_id || alert.url} className="nowcast-item">
        <strong>Ada</strong>
        <small>{alert.event}</small>
        <small>
          {alert.onset ? `Onset ${formatWib(alert.onset)}. ` : ""}
          Berlaku {formatWib(alert.effective)} sampai {formatWib(alert.expires)}
        </small>
        {alert.url ? (
          <a href={alert.url} target="_blank" rel="noreferrer">
            Berkas CAP
          </a>
        ) : null}
      </span>
    ));
  },
  dasarian: (row) => {
    if (row.dasarianKind === "memuat") return NOWCAST_LOADING;
    if (row.dasarianKind === "gagal") return NOWCAST_FAIL;
    if (row.dasarianKind === "tak-tercantum") return DASARIAN_UNLISTED;
    if (row.dasarianKind !== "isi") {
      return (
        <>
          {DASARIAN_EMPTY}
          <a href={DASARIAN_BMKG_URL} target="_blank" rel="noreferrer">
            Peringatan dini hujan tinggi
          </a>
        </>
      );
    }
    const tone = row.dasarianExpired ? "expired" : String(row.dasarianStatus || "").toLowerCase();
    return (
      <span className={`dasarian-cell ${tone}`}>
        <strong className="dasarian-status">{row.dasarianStatus}</strong>
        {row.dasarianExpired ? <small className="dasarian-badge">{DASARIAN_EXPIRED}</small> : null}
        {row.dasarianNama ? <small>{row.dasarianNama}</small> : null}
        {row.dasarianKutipan ? <small>{row.dasarianKutipan}</small> : null}
        {row.dasarianUrl ? (
          <a href={row.dasarianUrl} target="_blank" rel="noreferrer">
            Halaman BMKG
          </a>
        ) : null}
        {row.dasarianAkses ? <small>Diakses {formatTanggal(row.dasarianAkses)}</small> : null}
      </span>
    );
  },
  dibi: (row) => row.dibiTeks,
  kajian: () => "Belum terhubung",
  krb: (row) =>
    krbLinksFor(row).map((link) => (
      <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
        {link.nama}
      </a>
    )),
};

export function FloodInfoTable({ rows, columns = FLOOD_INFO_COLUMNS }) {
  const [sort, setSort] = useState({ key: "kode", direction: "asc" });
  const ordered = useMemo(() => sortFloodRows(rows, sort.key, sort.direction), [rows, sort]);
  const grouped = sort.key === "kode";

  function toggle(key) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "nama" || key === "kode" ? "asc" : "desc" },
    );
  }

  const body = [];
  let lastProvince = "";
  for (const row of ordered) {
    if (grouped && row.provinsi !== lastProvince) {
      lastProvince = row.provinsi;
      body.push(
        <tr key={`${row.provinsi}-grup`} className="flood-group">
          <th scope="colgroup" colSpan={columns.length}>
            {row.provinsi}
          </th>
        </tr>,
      );
    }
    body.push(
      <tr key={row.kode}>
        {columns.map((column, index) => {
          const content = (CELLS[column.id] ?? (() => "—"))(row);
          if (index === 0) {
            return (
              <th key={column.id} scope="row">
                {content}
              </th>
            );
          }
          return <td key={column.id}>{content}</td>;
        })}
      </tr>,
    );
  }

  return (
    <div className="table-wrap flood-table">
      <p className="fine">{RAIN_RISK_MATRIX.note}</p>
      <p className="fine">{DASARIAN_NOTE}</p>
      <p className="fine">{BMKG_ATTRIBUTION}</p>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col">
                {column.sortKey ? (
                  <button type="button" onClick={() => toggle(column.sortKey)}>
                    {column.label}
                  </button>
                ) : (
                  column.label
                )}
                {column.detail ? <small>{column.detail}</small> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}

function namaSel(rows) {
  if (!rows.length) return "—";
  return rows.map((row) => `${row.nama} (${row.kode})`).join(", ");
}

export function NowcastCrossTab({ rows }) {
  const tab = nowcastCrossTab(rows);
  if (tab.pending) return <p className="fine">{NOWCAST_LOADING}</p>;
  if (!tab.ok) {
    return (
      <p className="fine">
        {NOWCAST_FAIL}. Kisi silang tidak diisi.
      </p>
    );
  }
  return (
    <div className="nowcast-cross">
      <table>
        <thead>
          <tr>
            <th scope="col">Kelas risiko banjir IRBI 2025</th>
            <th scope="col">Peringatan aktif</th>
            <th scope="col">Tidak ada peringatan aktif</th>
          </tr>
        </thead>
        <tbody>
          {tab.kelas.map((kelas) => (
            <tr key={kelas}>
              <th scope="row">{kelas}</th>
              <td>{namaSel(tab.cell(kelas, true))}</td>
              <td>{namaSel(tab.cell(kelas, false))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
