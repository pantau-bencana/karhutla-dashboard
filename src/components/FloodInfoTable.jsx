import { Fragment, useMemo, useState } from "react";
import { OpenMeteoCredit } from "./Atribusi.jsx";
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
  CATATAN_PENDUDUK,
  CATATAN_RUMAH,
  POTENSI_PENDUDUK,
  POTENSI_RUMAH,
  labelPenduduk,
  labelRumahTangga,
  teksAngkaPenduduk,
  teksRumahTangga,
} from "../lib/pendudukKab.js";
import { HISTORIS_DISCLAIMER, barisDampakHistoris } from "../lib/bnpbBanjir.js";
import { HUJAN_PEMBANDING_JENIS, barisHujanModel } from "../lib/hujanPembanding.js";
import { InfoTip } from "./InfoTip.jsx";
import { DIBI_UNAVAILABLE, FLOOD_INFO_COLUMNS, IRBI_TIDAK_TERSEDIA, RAIN_RISK_MATRIX, krbLinksFor, skorTeks, sortFloodRows } from "../lib/floodMatrix.js";

function selPenduduk(row, jenis) {
  if (!row.pendudukTampil) return "—";
  if (row.pendudukStatus === "memuat") return "Memuat angka penduduk…";
  const item = row.pendudukItem;
  const catatan = jenis === "penduduk" ? CATATAN_PENDUDUK : CATATAN_RUMAH;
  if (jenis === "rumah" && item?.rumahTangga == null) {
    return (
      <>
        {teksRumahTangga(item)}
        <small>{catatan}</small>
      </>
    );
  }
  const angka = jenis === "penduduk" ? teksAngkaPenduduk(item?.penduduk ?? null) : teksRumahTangga(item);
  const label = jenis === "penduduk" ? labelPenduduk(item) : labelRumahTangga(item);
  return (
    <>
      {angka}
      <small>{label}</small>
      <small>{catatan}</small>
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
      `${POTENSI_PENDUDUK}: ${teksAngkaPenduduk(row.pendudukItem?.penduduk)}. ${CATATAN_PENDUDUK} ${POTENSI_RUMAH}: ${teksRumahTangga(row.pendudukItem)}. ${CATATAN_RUMAH}`,
    );
  }
  if (row?.hujanFallback) lines.push(...barisHujanModel(row.hujanFallback.teks, row.hujanFallback.waktu));
  else if (hujanTeks) lines.push(`Hujan model: ${hujanTeks}. ${HUJAN_PEMBANDING_JENIS}.`);
  return lines;
}

export function FloodKabDaftar({ rows, tampilProvinsi = false, hujanNilai = null }) {
  const ordered = rows ?? [];
  const [buka, setBuka] = useState("");
  // v0.2 saja menyingkat daftar. v0.1 tetap seluruh baris. Kelompok provinsi di FloodInfoTable tidak diubah.
  const edisiV2 = Boolean(import.meta.env && import.meta.env.VITE_EDITION === "v2");
  const [tampilSemua, setTampilSemua] = useState(!edisiV2);
  const batasRingkas = 8;
  const terlihat = edisiV2 && !tampilSemua ? ordered.slice(0, batasRingkas) : ordered;
  return (
    <div className="table-wrap flood-side wrap-cells">
      <p className="fine">{DIBI_UNAVAILABLE}. Tanda — pada kolom Historis bukan nol kejadian. Klasifikasi DAS belum terintegrasi.</p>
      {hujanNilai ? <OpenMeteoCredit /> : null}
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
          Bukan peringkat prioritas. Ketuk nama untuk rincian.
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
        <tbody>
          {terlihat.map((row, index) => {
            const terbuka = buka === row.kode;
            const hujanTeks = hujanNilai ? hujanNilai.get(row.kode) || "belum tersedia" : "";
            const rincian = rincianKab(row, hujanTeks);
            return (
              <Fragment key={row.kode}>
                <tr>
                  <td>{index + 1}</td>
                  <th scope="row">
                    <button
                      type="button"
                      className="row-detail-toggle"
                      aria-expanded={terbuka}
                      onClick={() => setBuka(terbuka ? "" : row.kode)}
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
                {terbuka ? (
                  <tr className="flood-row-detail">
                    <td colSpan={tampilProvinsi ? 6 : 5}>
                      {rincian.length ? rincian.map((baris) => <p key={baris}>{baris}</p>) : <p>Tidak ada rincian tambahan.</p>}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {edisiV2 && ordered.length > batasRingkas ? (
        <p className="v2-more">
          <button type="button" onClick={() => setTampilSemua((nilai) => !nilai)}>
            {tampilSemua ? "Tampilkan lebih sedikit" : `Lihat selengkapnya (${ordered.length - batasRingkas} kab/kota)`}
          </button>
        </p>
      ) : null}
      <p className="fine">Tingkat kabupaten/kota. Kecamatan tidak ditampilkan. Rincian memuat masa berlaku, prakiraan, data dampak riil (belum tersedia), serta jumlah penduduk dan rumah tangga di wilayah berstatus (BPS). Hujan model hanya pada tab Hari ini, Besok, atau Lusa, bila lapisan itu nyala atau prakiraan BMKG untuk hari itu tidak ada.</p>
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
          {HUJAN_PEMBANDING_JENIS}. Diambil {row.hujanFallback.waktu}.{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather data by Open-Meteo.com</a>
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

