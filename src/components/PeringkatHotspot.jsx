import { useState } from "react";
import { formatAngka, formatTanggal, formatWib } from "../lib/format.js";
import { hotspotSourceLabel } from "../lib/freshness.js";
import { CONFIDENCE_COLORS } from "../lib/bigWilayah.js";
import { keadaanHotspot, labelJendela, sepuluhPrioritas, susunPeringkatHotspot } from "../lib/peringkatHotspot.js";

const TANDA = [
  ["merah", "▲", "Merah, kepercayaan tinggi", CONFIDENCE_COLORS.tinggi],
  ["oranye", "■", "Oranye, kepercayaan sedang", CONFIDENCE_COLORS.nominal],
  ["kuning", "●", "Kuning, kepercayaan rendah", CONFIDENCE_COLORS.rendah],
  ["tidak", "?", "Tidak diketahui", CONFIDENCE_COLORS.tidak_diketahui],
];

function Tanda({ jenis }) {
  const item = TANDA.find(([id]) => id === jenis) || TANDA[3];
  const [, bentuk, label, warna] = item;
  return (
    <span className={`peringkat-tanda tanda-${item[0]}`} style={{ background: warna }}>
      <span aria-hidden="true">{bentuk}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function waktuSel(value) {
  if (!value) return "—";
  if (value.includes("T")) return formatWib(value);
  return formatTanggal(value);
}

export function PeringkatHotspot({
  points,
  feed,
  memuat = false,
  tertunda = false,
  from = "",
  to = "",
  periodeJam = 24,
  province = "",
  sumber = "",
}) {
  const [tingkat, setTingkat] = useState("provinsi");
  const keadaan = keadaanHotspot(feed, { memuat, tertunda });
  const hitung = keadaan.tampil ? susunPeringkatHotspot(points, { tingkat }) : null;
  const jendela = labelJendela(periodeJam);
  const cakupan = province || "seluruh Indonesia";
  const periodeTeks = from && to ? `${formatTanggal(from)}–${formatTanggal(to)}, jendela ${jendela}` : `jendela ${jendela}`;
  const namaPrioritas = new Set(sepuluhPrioritas(hitung?.baris).map((row) => row.nama));

  return (
    <section className="card peringkat-hotspot" aria-labelledby="peringkat-hotspot-judul">
      <header className="card-head">
        <div>
          <h2 id="peringkat-hotspot-judul">Peringkat deteksi hotspot</h2>
          <p>
            Urutan jumlah deteksi satelit menurut kepercayaan sensor, untuk prioritas pelaporan.
            Bukan bahaya kebakaran, bukan luas terbakar, dan bukan kebakaran terkonfirmasi.
          </p>
        </div>
        <p className={`status-pill status-${keadaan.status}`} role="status">
          {keadaan.status === "memuat" ? "Memuat" : keadaan.status === "berhasil" ? "Tersedia" : keadaan.status === "kedaluwarsa" ? "Kedaluwarsa" : keadaan.status === "sebagian" ? "Sebagian" : "Gagal dimuat"}
        </p>
      </header>
      <p>
        Periode {periodeTeks}. Cakupan {cakupan}.
        {feed?.fetchedAt ? ` Diperbarui ${formatWib(feed.fetchedAt)}.` : ""}
        {feed?.observedAt ? ` Observasi terbaru ${formatWib(feed.observedAt)}.` : ""}
        {feed && !feed.contoh ? ` Sumber: ${hotspotSourceLabel(feed, sumber)}.` : ""}
      </p>
      <p className="fine">
        Satu tabel untuk semua kelas. Tingkat wilayah tidak dicampur: pilih Provinsi atau Kabupaten/Kota.
        Urutan: merah menurun, lalu oranye, lalu kuning, lalu total, lalu nama.
        Total = merah + oranye + kuning. Tidak diketahui tidak dihitung sebagai kuning dan tidak masuk total.
      </p>
      <ul className="peringkat-legenda" aria-label="Legenda kepercayaan deteksi">
        {TANDA.map(([id, , label, warna]) => (
          <li key={id}>
            <Tanda jenis={id} />
            <span style={{ borderBottom: `3px solid ${warna}` }}>{label}</span>
          </li>
        ))}
      </ul>
      {keadaan.teks ? <p className={keadaan.status === "gagal" ? "empty" : "banner warn"} role="status">{keadaan.teks}</p> : null}
      {keadaan.status === "memuat" ? null : (
        <>
          <fieldset className="peringkat-tingkat">
            <legend>Tingkat wilayah</legend>
            <label>
              <input type="radio" name="tingkat-peringkat-hotspot" checked={tingkat === "provinsi"} onChange={() => setTingkat("provinsi")} />
              Provinsi
            </label>
            <label>
              <input type="radio" name="tingkat-peringkat-hotspot" checked={tingkat === "kabupaten"} onChange={() => setTingkat("kabupaten")} />
              Kabupaten/Kota
            </label>
          </fieldset>
          {hitung ? (
            <p className="fine">
              {formatAngka(hitung.jumlahTitik)} titik pada periode ini, sama dengan angka peta bila saringan kelas tidak diubah.
              Merah {formatAngka(hitung.merah)}, oranye {formatAngka(hitung.oranye)}, kuning {formatAngka(hitung.kuning)}, tidak diketahui {formatAngka(hitung.tidakDiketahui)}.
              Jumlah kolom Total {formatAngka(hitung.total)}.
            </p>
          ) : null}
          <p className="fine">
            <strong>10 Prioritas</strong> adalah sepuluh baris teratas pada tabel ini, ditandai latar dan lencana.
            Urutan seluruh tabel tetap merah menurun, lalu oranye, lalu kuning, lalu total, lalu nama.
            Tingkat wilayah dan periode mengikuti saringan yang aktif.
            Bila wilayah yang punya deteksi kurang dari sepuluh, tanda hanya pada wilayah itu.
            Tanda warna adalah kepercayaan deteksi satelit, bukan bahaya.
          </p>
          <div className="table-wrap peringkat-scroll" tabIndex={0} aria-label="Tabel peringkat hotspot. Sepuluh baris teratas adalah 10 Prioritas. Geser mendatar pada layar sempit.">
            <table>
              <caption>
                Peringkat {tingkat === "kabupaten" ? "kabupaten/kota" : "provinsi"} pada {periodeTeks}. Sepuluh baris pertama adalah 10 Prioritas. {keadaan.status === "berhasil" ? "Data periode aktif." : "Bukan data terkini."}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Peringkat</th>
                  <th scope="col">Nama Wilayah</th>
                  <th scope="col"><Tanda jenis="merah" /> Hotspot Merah (kepercayaan tinggi)</th>
                  <th scope="col"><Tanda jenis="oranye" /> Oranye (sedang)</th>
                  <th scope="col"><Tanda jenis="kuning" /> Kuning (rendah)</th>
                  <th scope="col"><Tanda jenis="tidak" /> Tidak diketahui</th>
                  <th scope="col">Total</th>
                  <th scope="col">Waktu Data</th>
                </tr>
              </thead>
              <tbody>
                {hitung?.baris.length ? (
                  hitung.baris.map((row) => {
                    const prioritas = namaPrioritas.has(row.nama);
                    return (
                      <tr key={`${row.tingkat}-${row.nama}`} className={prioritas ? "peringkat-prioritas" : undefined}>
                        <td>
                          {row.peringkat}
                          {prioritas ? <span className="peringkat-lencana">10 Prioritas</span> : null}
                        </td>
                        <th scope="row">{row.nama}</th>
                        <td>{formatAngka(row.merah)}</td>
                        <td>{formatAngka(row.oranye)}</td>
                        <td>{formatAngka(row.kuning)}</td>
                        <td>{formatAngka(row.tidakDiketahui)}</td>
                        <td>{formatAngka(row.total)}</td>
                        <td>{waktuSel(row.waktuData)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8}>{keadaan.tampil ? "Tidak ada deteksi pada periode ini." : "Tabel tidak diisi."}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
