import { useState } from "react";
import { Badge } from "./Badge.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { formatAngka, formatTanggal, formatWib } from "../lib/format.js";
import { PARAMETER_POTENSI, POTENSI_DISCLAIMER, POTENSI_JUDUL, susunPotensiTujuh, teksBobot } from "../lib/potensiTujuh.js";

function selAngka(value, digits = 0) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return formatAngka(value, digits);
}

export function PotensiTujuhHari({ fwi, hujan, hotspot, irbi, provinsi = [], now }) {
  const [saringan, setSaringan] = useState("");
  const hasil = susunPotensiTujuh({
    fwiRows: fwi?.contoh ? [] : fwi?.rows,
    hujanRows: hujan?.contoh ? [] : hujan?.rows,
    hotspotRows: hotspot && !hotspot.contoh ? hotspot.rows ?? [] : null,
    irbiRows: irbi?.contoh ? [] : irbi?.rows,
    provinsi,
    fwiFetchedAt: fwi?.fetchedAt || "",
    hujanFetchedAt: hujan?.fetchedAt || "",
    hotspotFetchedAt: hotspot?.fetchedAt || "",
    now: now ? new Date(now) : new Date(),
  });
  const tampil = saringan ? hasil.baris.filter((row) => row.provinsi === saringan) : hasil.baris;
  const hitung = tampil.reduce((map, row) => {
    map.set(row.kelas, (map.get(row.kelas) ?? 0) + 1);
    return map;
  }, new Map());

  return (
    <section className="card" id="potensi-7-hari">
      <header className="card-head">
        <div>
          <h2>{hasil.judul}</h2>
          <p>
            Kabupaten/kota pada enam provinsi prioritas. Horizon {formatTanggal(hasil.dari)}–{formatTanggal(hasil.sampai)}.
          </p>
        </div>
        <Badge kind="pem">{hasil.jenis}</Badge>
      </header>
      <p>{hasil.disclaimer}</p>
      <p className="fine method-note">
        {hasil.bobot} Kelas: Sangat tinggi bila skor ≥ 0,75, Tinggi bila ≥ 0,55, Sedang bila ≥ 0,35, Rendah di bawah itu.
        Skor adalah rata-rata peringkat di antara kabupaten yang datanya lengkap. FWI perlu minimal 5 dari 7 hari. Hari hujan model juga minimal 5.
        IRBI 2025 hanya konteks tahunan, bukan indeks bahaya inaRISK, dan tidak masuk skor.
        {" "}
        <a href="#/sumber-metode/potensi-7-hari">Cara hitung di Sumber & Metode</a>
      </p>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Ketersediaan tujuh parameter</caption>
          <thead>
            <tr>
              <th scope="col">Parameter</th>
              <th scope="col">Sumber pada materi</th>
              <th scope="col">Di dasbor</th>
              <th scope="col">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {hasil.parameter.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.nama}</th>
                <td>{row.resmi}</td>
                <td>
                  {row.ketersediaan === "pengganti" ? <Badge kind="pem">Pembanding (data terbuka, bukan resmi)</Badge> : null}
                  {row.ketersediaan === "belum terintegrasi" ? <Badge kind="tau">belum terintegrasi</Badge> : null}
                  {row.ketersediaan === "tersedia" ? <Badge kind="sta">cakupan tetap</Badge> : null}
                </td>
                <td>
                  {row.catatan}
                  {row.tautan ? (
                    <>
                      {" "}
                      <a href={row.tautan} target="_blank" rel="noopener noreferrer">Tautan resmi</a>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="logic-body">
        <DatasetTiming feed={fwi} />
        <DatasetTiming feed={hujan} />
        <DatasetTiming feed={hotspot} />
        <p className="fine">
          Jendela FWI dan hujan model {formatTanggal(hasil.dari)}–{formatTanggal(hasil.sampai)}.
          Deteksi FIRMS {formatTanggal(hasil.hotspotDari)}–{formatTanggal(hasil.hotspotSampai)}, dihitung mundur dari hari ini, bukan prakiraan titik api.
          {hasil.hotspotTertunda ? " Cuplikan hotspot lebih dari 18 jam: Data tertunda." : ""}
          {fwi?.fetchedAt ? ` FWI diambil ${formatWib(fwi.fetchedAt)}.` : ""}
          {hujan?.fetchedAt ? ` Hujan model diambil ${formatWib(hujan.fetchedAt)}.` : ""}
        </p>
      </div>
      {hasil.tersedia ? null : (
        <p>
          <Badge kind="tun">belum cukup data</Badge> Skor dan kelas tidak ditampilkan. {hasil.alasan.join("; ")}.
        </p>
      )}
      {hasil.tersedia ? (
        <>
          <div className="province-filter" role="group" aria-label="Saringan provinsi potensi 7 hari">
            <button type="button" aria-pressed={saringan === ""} onClick={() => setSaringan("")}>Enam provinsi</button>
            {(provinsi ?? []).map((nama) => (
              <button key={nama} type="button" aria-pressed={saringan === nama} onClick={() => setSaringan(nama)}>
                {nama}
              </button>
            ))}
          </div>
          <p className="fine">
            {[...hitung.entries()].map(([kelas, jumlah]) => `${kelas} ${formatAngka(jumlah)}`).join(" · ") || "Tidak ada baris."}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Kabupaten/kota</th>
                  <th scope="col">Provinsi</th>
                  <th scope="col">Kelas</th>
                  <th scope="col">Skor</th>
                  <th scope="col">FWI rata-rata</th>
                  <th scope="col">Hari hujan model &gt;20 mm</th>
                  <th scope="col">Hotspot FIRMS</th>
                  <th scope="col">IRBI 2025</th>
                  <th scope="col">Saran analisis</th>
                </tr>
              </thead>
              <tbody>
                {tampil.length ? tampil.map((row) => (
                  <tr key={row.kode}>
                    <th scope="row">{row.kabupaten}</th>
                    <td>{row.provinsi}</td>
                    <td>{row.kelas}</td>
                    <td>{selAngka(row.skor, 3)}</td>
                    <td>{row.fwiHari ? `${selAngka(row.fwiRata, 1)} (${formatAngka(row.fwiHari)} hari)` : "belum cukup data"}</td>
                    <td>{row.hujanHari ? `${formatAngka(row.hariBasah)} dari ${formatAngka(row.hujanHari)}` : "belum cukup data"}</td>
                    <td>{hasil.hotspotMasuk ? formatAngka(row.hotspot) : "belum cukup data"}</td>
                    <td>{row.irbi == null ? "—" : `${selAngka(row.irbi, 2)}${row.irbiKelas ? ` ${row.irbiKelas}` : ""}`}</td>
                    <td>{row.saran}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9}>Tidak ada kabupaten/kota pada saringan ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

export function PotensiTujuhMetode() {
  return (
    <section className="card" id="potensi-7-hari">
      <h2>{POTENSI_JUDUL}</h2>
      <p>{POTENSI_DISCLAIMER}</p>
      <p>
        Horizon yang ditulis adalah 7 hari ke depan, zona Asia/Jakarta. FWI pembanding pada cuplikan GWIS bisa memuat sekitar 9 hari; yang masuk skor hanya 7 tanggal itu, dan hanya bila minimal 5 hari terisi.
        Citra SPARTAN tetap hingga H+7 sesuai produk BMKG dan tidak dibaca angkanya.
      </p>
      <p>{teksBobot(true)} Bila cuplikan hotspot tidak ada, bobot dua komponen cuaca menjadi masing-masing setengah.</p>
      <p>
        Kelas Sangat tinggi: skor ≥ 0,75. Tinggi: ≥ 0,55. Sedang: ≥ 0,35. Rendah: di bawah 0,35.
        Baris yang FWI atau hari hujannya kurang dari 5 ditulis Belum cukup data dan tidak diberi skor.
        Cuplikan FWI atau hujan yang lebih lama dari 36 jam membuat seluruh kelas disembunyikan.
      </p>
      <p>
        Saran analisis, bukan perintah: Verifikasi lapangan bila kelas Sangat tinggi atau Tinggi dan ada deteksi FIRMS nominal atau tinggi pada 7 hari terakhir.
        Antisipasi bila kelas itu tanpa deteksi tersebut. Patroli untuk kelas Sedang. Pantau untuk kelas Rendah.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Parameter</th>
              <th scope="col">Sumber pada materi</th>
              <th scope="col">Di dasbor</th>
              <th scope="col">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {PARAMETER_POTENSI.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.nama}</th>
                <td>{row.resmi}</td>
                <td>{row.ketersediaan === "pengganti" ? "Pembanding (data terbuka, bukan resmi)" : row.ketersediaan}</td>
                <td>{row.catatan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <a href="#/karhutla/potensi">Tabel kabupaten/kota</a>
      </p>
    </section>
  );
}
