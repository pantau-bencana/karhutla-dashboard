import { Fragment, useMemo, useState } from "react";
import { ANALISIS_NAMA, ANALISIS_WARNA, LABEL_KEDALUWARSA, keparahanTerburuk } from "../lib/analisisPantauBencana.js";
import {
  BMKG_ATTRIBUTION,
  CAP_DATA_TERAKHIR,
  DASARIAN_NOTE,
  NOWCAST_FAIL,
  NOWCAST_LOADING,
  nowcastAbsent,
  nowcastCrossTab,
  severityLabel,
} from "../lib/capKab.js";
import {
  DASARIAN_BMKG_URL,
  DASARIAN_EMPTY,
  DASARIAN_EXPIRED,
  DASARIAN_UNLISTED,
} from "../lib/dasarianManual.js";
import { formatTanggal, formatTanggalPendek, formatWib } from "../lib/format.js";
import {
  PENDUDUK_BUKAN_TERPAPAR,
  labelPenduduk,
  labelRumahTangga,
  teksAngkaPenduduk,
  teksRumahTangga,
} from "../lib/pendudukKab.js";
import { HISTORIS_DISCLAIMER, barisDampakHistoris } from "../lib/bnpbBanjir.js";
import { HUJAN_PEMBANDING_JENIS, barisHujanModel } from "../lib/hujanPembanding.js";
import { InfoTip } from "./InfoTip.jsx";
import { DIBI_UNAVAILABLE, FLOOD_INFO_COLUMNS, IRBI_TIDAK_TERSEDIA, RAIN_RISK_MATRIX, grupStatusTerbukaAwal, kelompokStatusKab, krbLinksFor, skorTeks, sortFloodRows } from "../lib/floodMatrix.js";

function selPenduduk(row, jenis) {
  if (!row.pendudukTampil) return "—";
  if (row.pendudukStatus === "memuat") return "Memuat angka penduduk…";
  const item = row.pendudukItem;
  if (jenis === "rumah" && item?.rumahTangga == null) {
    return (
      <>
        {teksRumahTangga(item)}
        <small>{PENDUDUK_BUKAN_TERPAPAR}</small>
      </>
    );
  }
  const angka = jenis === "penduduk" ? teksAngkaPenduduk(item?.penduduk ?? null) : teksRumahTangga(item);
  const label = jenis === "penduduk" ? labelPenduduk(item) : labelRumahTangga(item);
  return (
    <>
      {angka}
      <small>{label}</small>
      <small>{PENDUDUK_BUKAN_TERPAPAR}</small>
    </>
  );
}

function penandaHistoris(row) {
  if (row?.dibiAngka != null && Number.isFinite(Number(row.dibiAngka))) return String(row.dibiAngka);
  return "—";
}

const CELLS = {
  wilayah: (row) => (
    <>
      {row.kode}
      <small>{row.nama}</small>
    </>
  ),
  "irbi-banjir": (row) => {
    if (!row.banjirKelas) return IRBI_TIDAK_TERSEDIA;
    return (
      <>
        {row.banjirKelas}
        <small>
          Skor {skorTeks(row.banjirSkor)} · hal. {row.banjirHalaman}
        </small>
      </>
    );
  },
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
    const active = row.nowcastAlerts ?? [];
    const lampau = row.nowcastLampau ?? [];
    if (!active.length && !lampau.length) return nowcastAbsent(row.nowcastJam);
    return (
      <>
        {active.map((alert) => (
          <span key={alert.cap_id || alert.url} className="nowcast-item">
            <strong>{alert.event || "Peringatan"}</strong>
            <small>{severityLabel(alert.severity)}</small>
            <small>
              {alert.onset ? `Onset ${formatWib(alert.onset)}. ` : ""}
              Berlaku {formatWib(alert.effective)} sampai {formatWib(alert.expires)}
            </small>
          </span>
        ))}
        {lampau.map((alert) => (
          <span key={`lampau-${alert.cap_id || alert.url}`} className="nowcast-item nowcast-lampau">
            <strong>{alert.event || "Peringatan"}</strong>
            <small>{severityLabel(alert.severity)}</small>
            <small>
              Berlaku {formatWib(alert.effective)} sampai {formatWib(alert.expires)}
            </small>
            <small className="nowcast-lampau-label">{CAP_DATA_TERAKHIR}</small>
          </span>
        ))}
      </>
    );
  },
  berlaku: (row) => {
    const alerts = [...(row.nowcastAlerts ?? []), ...(row.nowcastLampau ?? [])];
    const latest = alerts.reduce((best, alert) => ((alert.expires || "") > (best || "") ? alert.expires : best), "");
    return latest ? formatWib(latest) : "—";
  },
  analisis: (row) => {
    if (!row.analisisStatus) return "—";
    const warna = ANALISIS_WARNA[row.analisisStatus];
    return (
      <>
        <span
          className="analisis-pill"
          style={{ background: warna, color: row.analisisStatus === "Awas" ? "#fff" : "#1c1915" }}
        >
          {row.analisisStatus}
        </span>
        {row.analisisLampau ? <small>{CAP_DATA_TERAKHIR}</small> : null}
      </>
    );
  },
  penduduk: (row) => selPenduduk(row, "penduduk"),
  "rumah-tangga": (row) => selPenduduk(row, "rumah"),
  dasarian: (row) => {
    if (row.dasarianKind === "memuat") return NOWCAST_LOADING;
    if (row.dasarianKind === "gagal") return NOWCAST_FAIL;
    if (row.dasarianKind === "tak-tercantum") return DASARIAN_UNLISTED;
    if (row.dasarianKind !== "isi") {
      return (
        <>
          {DASARIAN_EMPTY}
          <a href={DASARIAN_BMKG_URL} target="_blank" rel="noopener noreferrer">
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
          <a href={row.dasarianUrl} target="_blank" rel="noopener noreferrer">
            Halaman BMKG
          </a>
        ) : null}
        {row.dasarianAkses ? <small>Diakses {formatTanggal(row.dasarianAkses)}</small> : null}
      </span>
    );
  },
  dibi: (row) => penandaHistoris(row),
  tautan: (row) => {
    const links = [];
    for (const alert of [...(row.nowcastAlerts ?? []), ...(row.nowcastLampau ?? [])]) {
      if (alert.url) links.push({ nama: "Berkas CAP", url: alert.url });
    }
    for (const link of krbLinksFor(row)) links.push(link);
    if (!links.length) return "—";
    return links.map((link) => (
      <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
        {link.nama}
      </a>
    ));
  },
};

export function FloodInfoTable({ rows, columns = FLOOD_INFO_COLUMNS }) {
  const [sort, setSort] = useState({ key: "status", direction: "asc" });
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
    <div className="table-wrap flood-table flood-kab">
      <p className="fine">{ANALISIS_NAMA}. {RAIN_RISK_MATRIX.note}</p>
      <p className="fine">{DASARIAN_NOTE}</p>
      <p className="fine">{BMKG_ATTRIBUTION}</p>
      <p className="fine">{DIBI_UNAVAILABLE}. Tanda — pada kolom Historis bukan nol kejadian. Klasifikasi DAS belum terintegrasi.</p>
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
      <div className="flood-cards">
        {ordered.map((row) => (
          <article key={`kartu-${row.kode}`} className="flood-card">
            <h3>
              {row.nama} <small>{row.kode}</small>
            </h3>
            {columns.map((column) => (
              <p key={column.id}>
                <strong>{column.label}</strong>
                <span>{(CELLS[column.id] ?? (() => "—"))(row)}</span>
              </p>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}

export function rincianKab(row, hujanTeks) {
  const lines = [];
  if (row?.provinsi) lines.push(`Provinsi: ${row.provinsi}`);
  if (row?.peta?.lampau) lines.push(CAP_DATA_TERAKHIR);
  lines.push(...masaBerlaku(row));
  if (row?.cuacaHari?.length) lines.push(`Prakiraan: ${row.cuacaHari.join(", ")}`);
  if (row?.peta?.kind === "tak-dikenal" && row.peta.cuacaMentah?.length) {
    lines.push(`Kode cuaca: ${row.peta.cuacaMentah.join(", ")}`);
  }
  lines.push(...barisDampakHistoris());
  if (row?.pendudukTampil) {
    lines.push(
      `Penduduk ${teksAngkaPenduduk(row.pendudukItem?.penduduk)} · rumah tangga ${teksRumahTangga(row.pendudukItem)} · ${PENDUDUK_BUKAN_TERPAPAR}`,
    );
  }
  if (row?.hujanFallback) lines.push(...barisHujanModel(row.hujanFallback.teks, row.hujanFallback.waktu));
  else if (hujanTeks) lines.push(`Hujan model: ${hujanTeks}. ${HUJAN_PEMBANDING_JENIS}.`);
  return lines;
}

export function FloodKabDaftar({ rows, tampilProvinsi = false, hujanNilai = null }) {
  const ordered = rows ?? [];
  const kelompok = useMemo(() => kelompokStatusKab(ordered), [ordered]);
  const [buka, setBuka] = useState("");
  const [pilihanGrup, setPilihanGrup] = useState(null);
  const grupTerbuka = pilihanGrup ?? new Set([grupStatusTerbukaAwal(kelompok)]);
  const lebar = tampilProvinsi ? 6 : 5;

  function ubahGrup(id) {
    setPilihanGrup((saat) => {
      const dasar = new Set(saat ?? [grupStatusTerbukaAwal(kelompok)]);
      if (dasar.has(id)) dasar.delete(id);
      else dasar.add(id);
      return dasar;
    });
  }

  return (
    <div className="flood-daftar-bingkai">
      <p className="fine">{DIBI_UNAVAILABLE}. Tanda — pada kolom Historis bukan nol kejadian. Klasifikasi DAS belum terintegrasi.</p>
      <div className="table-wrap flood-side wrap-cells flood-daftar" tabIndex={0} aria-label="Tabel kabupaten dan kota menurut status">
        <table>
          <colgroup>
            <col className="col-no" />
            <col className="col-nama" />
            {tampilProvinsi ? <col className="col-prov" /> : null}
            <col className="col-status" />
            <col className="col-historis" />
            <col className="col-irbi" />
          </colgroup>
          <caption>
            Kolom: No, Kab/Kota{tampilProvinsi ? ", Provinsi" : ""}, Status, Historis, IRBI. Nomor mengikuti urutan Awas, Siaga, Waspada, tanpa status, lalu tidak terklasifikasi atau tanpa data.
            Bukan peringkat prioritas. Ketuk judul kelompok untuk membuka atau menutup. Ketuk nama untuk rincian.
          </caption>
          <thead>
            <tr>
              <th scope="col">No</th>
              <th scope="col">Kab/Kota</th>
              {tampilProvinsi ? <th scope="col">Provinsi</th> : null}
              <th scope="col">Status</th>
              <th scope="col">
                <span className="th-with-info">
                  Historis
                  <InfoTip label="Penjelasan kolom Historis" align="end">
                    <p>{HISTORIS_DISCLAIMER}</p>
                  </InfoTip>
                </span>
              </th>
              <th scope="col">IRBI</th>
            </tr>
          </thead>
          {kelompok.map((grup) => {
            const terbuka = grupTerbuka.has(grup.id);
            const panelId = `flood-grup-${grup.id}`;
            return (
              <tbody key={grup.id} id={panelId} className={`flood-status-grup flood-status-${grup.id}`}>
                <tr className="flood-status-head">
                  <th scope="rowgroup" colSpan={lebar}>
                    <button
                      type="button"
                      className="flood-status-toggle"
                      aria-expanded={terbuka}
                      aria-controls={panelId}
                      onClick={() => ubahGrup(grup.id)}
                    >
                      <span className="flood-status-tanda" aria-hidden="true">{terbuka ? "−" : "+"}</span>
                      <span className="flood-status-nama">{grup.label}</span>
                      <span className="flood-status-count">{grup.isi.length} kab/kota</span>
                    </button>
                  </th>
                </tr>
                {terbuka && !grup.isi.length ? (
                  <tr>
                    <td colSpan={lebar}>Tidak ada kab/kota.</td>
                  </tr>
                ) : null}
                {terbuka
                  ? grup.isi.map(({ row, nomor }) => {
                      const rinci = buka === row.kode;
                      const hujanTeks = hujanNilai ? hujanNilai.get(row.kode) || "belum tersedia" : "";
                      const rincian = rincianKab(row, hujanTeks);
                      return (
                        <Fragment key={row.kode}>
                          <tr>
                            <td>{nomor}</td>
                            <th scope="row">
                              <button
                                type="button"
                                className="row-detail-toggle"
                                aria-expanded={rinci}
                                onClick={() => setBuka(rinci ? "" : row.kode)}
                              >
                                {row.nama}
                                <small>{row.kode}</small>
                              </button>
                            </th>
                            {tampilProvinsi ? <td>{row.provinsi || "—"}</td> : null}
                            <td>{selStatusPeta(row)}</td>
                            <td>{penandaHistoris(row)}</td>
                            <td>{selIrbi(row)}</td>
                          </tr>
                          {rinci ? (
                            <tr className="flood-row-detail">
                              <td colSpan={lebar}>
                                {rincian.length ? rincian.map((baris) => <p key={baris}>{baris}</p>) : <p>Tidak ada rincian tambahan.</p>}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })
                  : null}
              </tbody>
            );
          })}
        </table>
      </div>
      <p className="fine">Tingkat kabupaten/kota. Kecamatan tidak ditampilkan. Rincian memuat masa berlaku, prakiraan, penduduk terdampak, rumah terdampak, dan potensi BPS. Hujan model hanya pada tab Hari ini, Besok, atau Lusa, bila lapisan itu nyala atau prakiraan BMKG untuk hari itu tidak ada.</p>
    </div>
  );
}

function masaBerlaku(row) {
  const alerts = [...(row.nowcastAlerts ?? []), ...(row.nowcastLampau ?? [])];
  return alerts.map((alert) => `Berlaku ${formatWib(alert.effective)} sampai ${formatWib(alert.expires)}`);
}

function selStatusPeta(row) {
  const peta = row.peta;
  if (peta?.kind === "kedaluwarsa") {
    const sampai = peta.berlakuSampai ? ` Masa berlaku sampai ${formatWib(peta.berlakuSampai)}.` : "";
    return (
      <span>
        {peta.kosongLabel || LABEL_KEDALUWARSA}.{sampai} {CAP_DATA_TERAKHIR}
      </span>
    );
  }
  if (peta?.kind === "status" && peta.status) {
    const warna = ANALISIS_WARNA[peta.status];
    return (
      <span className="analisis-pill" style={{ background: warna, color: peta.status === "Awas" ? "#fff" : "#1c1915" }}>
        {peta.status}
      </span>
    );
  }
  if (peta?.kind === "kosong" || peta?.kind === "tak-dikenal") return peta.kosongLabel || "Tidak ada peringatan";
  if (peta?.alasan === "irbi") return IRBI_TIDAK_TERSEDIA;
  if (row?.hujanFallback && peta?.alasan === "prakiraan") {
    return (
      <span className="hujan-fallback">
        {row.hujanFallback.teks}
        <small>
          {HUJAN_PEMBANDING_JENIS}. Diambil {row.hujanFallback.waktu}.
        </small>
      </span>
    );
  }
  return "Tanpa data";
}

function selIrbi(row) {
  if (!row.banjirKelas) return IRBI_TIDAK_TERSEDIA;
  const skor = row.banjirSkor === "" || row.banjirSkor == null ? "" : skorTeks(row.banjirSkor);
  return (
    <>
      {row.banjirKelas}
      {skor ? <small>Skor {skor}</small> : null}
    </>
  );
}

export function PrakiraanTigaHari({ titik, hari, periodeLabel }) {
  const shown = titik ?? [];
  return (
    <div className="table-wrap flood-table prakiraan-kab">
      <p className="period-label">{periodeLabel}</p>
      {!shown.length ? <p>Tidak ada titik prakiraan pada cakupan ini.</p> : null}
      {shown.length ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Titik sampel</th>
              {hari.map((tanggal) => (
                <th key={tanggal} scope="col">
                  {formatTanggalPendek(tanggal)}
                  <small>local_datetime</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((item) => (
              <tr key={item.adm4}>
                <th scope="row">{item.kotkab || item.kodeKab || item.provinsi}</th>
                {item.hari.map((slot) => {
                  const severity = keparahanTerburuk(slot.cuaca);
                  const label = !slot.ada ? "Tidak ada slot" : severity || "Di luar matriks";
                  return (
                    <td key={slot.tanggal}>
                      {label}
                      {slot.cuaca?.length ? <small>{slot.cuaca.join(", ")}</small> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
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

