import { useMemo, useState } from "react";
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
