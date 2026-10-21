import { useMemo, useState } from "react";
import { Badge } from "./Badge.jsx";
import { CatatanRingkas } from "./CatatanRingkas.jsx";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { formatAngka, formatTanggal, formatWib } from "../lib/format.js";
import { daftarKabkota } from "../lib/kabProvinsi.js";
import { PARAMETER_POTENSI, POTENSI_DISCLAIMER, POTENSI_JUDUL, ringkasHujanModel, susunPotensiTujuh, teksBobot } from "../lib/potensiTujuh.js";
import { PROVINSI, SEMUA_PROVINSI } from "../lib/provinsi.js";

function selAngka(value, digits = 0) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return formatAngka(value, digits);
}

function teksHujanCuplikan(ringkas) {
  if (!ringkas) return "";
  if (!ringkas.membedakan) {
    const satu = ringkas.kelompok[0];
    const dari = ringkas.hariJendela != null ? ` dari ${formatAngka(ringkas.hariJendela)}` : "";
    return `Pada cuplikan ini indikator hujan model tidak membedakan peringkat: ${formatAngka(ringkas.jumlah)} kabupaten/kota yang diskor sama-sama ${formatAngka(satu.hari)} hari${dari}. Nilai yang seri mendapat peringkat persentil yang sama, sehingga urutan ditentukan FWI rata-rata dan jumlah hotspot FIRMS.`;
  }
  const rinci = ringkas.kelompok
    .map((item) => `${formatAngka(item.jumlah)} kabupaten/kota ${formatAngka(item.hari)} hari`)
    .join(", ");
  const jendela = ringkas.hariJendela != null ? ` Tiap baris yang diskor memakai jendela ${formatAngka(ringkas.hariJendela)} hari.` : "";
  return `Pada cuplikan ini jumlah hari tidak sama untuk semua kabupaten: ${rinci}.${jendela} Tulisan 0 dari ${ringkas.hariJendela == null ? "jumlah hari yang ada" : formatAngka(ringkas.hariJendela)} berarti titik wakil kabupaten itu tidak punya hari dengan hujan model di atas 20 mm. Bukan kolom yang gagal terisi. Kabupaten dengan jumlah hari yang sama mendapat peringkat persentil yang sama, jadi di dalam kelompok itu urutan mengikuti FWI rata-rata dan hotspot FIRMS.`;
}

function PetunjukSkoring({ hasil }) {
  const hujan = teksHujanCuplikan(ringkasHujanModel(hasil.baris));
  return (
    <>
      <p>
        Skor berjalan dari 0 sampai 1. Angka itu rata-rata peringkat kabupaten/kota yang datanya lengkap pada cakupan nasional, bukan kadar bahaya yang sama di semua tempat.
        Tiga bagian berbobot sama, masing-masing sepertiga: FWI rata-rata, bagian hari tanpa hujan model di atas 20 mm, dan jumlah hotspot FIRMS.
        Makin tinggi FWI, makin sedikit hari hujan lebat pada model, atau makin banyak deteksi, makin tinggi peringkat bagian itu.
      </p>
      <p>
        Ini peringkat relatif. Kabupaten dengan angka yang persis sama pada satu bagian berbagi rata-rata posisi seri, jadi tidak ada yang diunggulkan hanya karena urutan baris.
        Yang paling rendah pada bagian itu mendekati 0, yang paling tinggi mendekati 1. Skor 0,8 berarti relatif tinggi di antara kabupaten yang diskor, bukan ambang bahaya resmi.
      </p>
      <p>
        Kelas: Sangat tinggi bila skor ≥ 0,75. Tinggi bila ≥ 0,55. Sedang bila ≥ 0,35. Rendah di bawah 0,35.
      </p>
      <ul>
        <li>FWI rata-rata: rata-rata FWI harian pada titik wakil untuk tanggal yang terisi di 7 hari ke depan. Angka dalam kurung adalah jumlah hari yang terisi. Pengganti ECMWF lewat GWIS, bukan kelas FDRS SPARTAN.</li>
        <li>Hari hujan model &gt;20 mm: berapa hari pada jendela yang sama curah hujan model di titik wakil melebihi 20 mm. Pengganti Open-Meteo, bukan peluang persen BMKG dan bukan peluang hujan di atas 0,1 mm.</li>
        <li>Hotspot FIRMS: jumlah deteksi satelit kelas nominal dan tinggi pada 7 hari terakhir sampai hari ini. Bukan prakiraan, bukan jumlah SiPongi, dan bukan kebakaran terkonfirmasi. Kelas rendah dan tidak diketahui tidak dihitung.</li>
        <li>IRBI 2025: indeks risiko tahunan. Konteks saja, tidak masuk skor, dan bukan indeks bahaya inaRISK.</li>
      </ul>
      {hujan ? <p>{hujan}</p> : null}
      <p>
        Saran analisis, bukan perintah. Verifikasi lapangan bila kelas Sangat tinggi atau Tinggi dan ada deteksi nominal atau tinggi. Antisipasi bila kelas itu tanpa deteksi tersebut. Patroli untuk kelas Sedang. Pantau untuk kelas Rendah.
      </p>
      <p>
        Syarat skor: FWI dan hujan model masing-masing minimal 5 dari 7 hari. Kurang dari itu, barisnya Belum cukup data dan tidak diberi skor.
        Bila cuplikan FWI atau hujan lebih lama dari 36 jam, seluruh kelas disembunyikan.
        Hotspot yang lebih lama dari 18 jam tetap dihitung, dengan catatan data tertunda.
      </p>
      <p>
        Indeks risiko inaRISK, kategori ISPU, dan indeks kesesuaian iklim BMKG belum terintegrasi. Angka lain tidak diisi sebagai pengganti diam-diam.
      </p>
    </>
  );
}

export function PotensiTujuhHari({ fwi, hujan, hotspot, irbi, provinsi = [], nasional = false, now }) {
  const [saringan, setSaringan] = useState("");
  const hasil = susunPotensiTujuh({
    fwiRows: fwi?.contoh ? [] : fwi?.rows,
    hujanRows: hujan?.contoh ? [] : hujan?.rows,
    hotspotRows: hotspot && !hotspot.contoh ? hotspot.rows ?? [] : null,
    irbiRows: irbi?.contoh ? [] : irbi?.rows,
    provinsi: nasional ? [] : provinsi,
    daftarWilayah: nasional ? daftarKabkota() : null,
    nasional,
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
  const chip = useMemo(() => {
    const nama = [];
    const ada = new Set();
    for (const row of hasil.baris) {
      if (row.skor == null || !row.provinsi || ada.has(row.provinsi)) continue;
      ada.add(row.provinsi);
      nama.push(row.provinsi);
    }
    return nama;
  }, [hasil.baris]);
  const pilihan = useMemo(() => PROVINSI.map((item) => item.nama), []);

  return (
    <section className="card" id="potensi-7-hari">
      <header className="card-head">
        <div>
          <h2>{hasil.judul}</h2>
          <p>
            Horizon {formatTanggal(hasil.dari)}–{formatTanggal(hasil.sampai)}, zona Asia/Jakarta. {hasil.jenis}.
          </p>
        </div>
        <Badge kind="pem">{hasil.jenis}</Badge>
      </header>
      <p className="fine">{hasil.disclaimer}</p>
      <div className="logic-body">
        <DatasetTiming feed={fwi} />
        <DatasetTiming feed={hujan} />
        <DatasetTiming feed={hotspot} />
        <p className="fine">
          Jendela FWI dan hujan model {formatTanggal(hasil.dari)}–{formatTanggal(hasil.sampai)}.
          {hasil.hotspotTertunda ? " Data tertunda: cuplikan hotspot lebih dari 18 jam." : ""}
          {fwi?.fetchedAt ? ` FWI diambil ${formatWib(fwi.fetchedAt)}.` : ""}
          {hujan?.fetchedAt ? ` Hujan model diambil ${formatWib(hujan.fetchedAt)}.` : ""}
          {hotspot?.observedAt ? ` Observasi hotspot ${formatWib(hotspot.observedAt)}.` : ""}
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
            <button type="button" aria-pressed={saringan === ""} onClick={() => setSaringan("")}>Seluruh Indonesia</button>
            {chip.map((nama) => (
              <button key={nama} type="button" aria-pressed={saringan === nama} onClick={() => setSaringan(nama)}>
                {nama}
              </button>
            ))}
            <label className="filter-field province-semua">
              <span className="sr-only">{SEMUA_PROVINSI}</span>
              <select aria-label={SEMUA_PROVINSI} value={pilihan.includes(saringan) ? saringan : ""} onChange={(event) => setSaringan(event.target.value)}>
                <option value="">{SEMUA_PROVINSI}</option>
                {pilihan.map((nama) => (
                  <option key={nama} value={nama}>{nama}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="fine">
            Horizon 7 hari ke depan. Bukan saringan tanggal hotspot.
            {" "}
            {tampil.length} kab/kota
            {hitung.size ? ` · ${[...hitung.entries()].map(([kelas, jumlah]) => `${kelas} ${formatAngka(jumlah)}`).join(" · ")}` : ""}.
          </p>
          <div className="table-wrap">
            <table>
              <caption>
                Peringkat kabupaten/kota pada horizon 7 hari. Analisis model, bukan prakiraan resmi. Baris Belum cukup data tidak diskor.
              </caption>
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
      <CatatanRingkas judul="Petunjuk skoring">
        <p className="fine method-note">
          {hasil.bobot} Kelas: Sangat tinggi bila skor ≥ 0,75, Tinggi bila ≥ 0,55, Sedang bila ≥ 0,35, Rendah di bawah itu.
          Skor adalah rata-rata peringkat di antara kabupaten yang datanya lengkap. FWI perlu minimal 5 dari 7 hari. Hari hujan model juga minimal 5.
          IRBI 2025 hanya konteks tahunan, bukan indeks bahaya inaRISK, dan tidak masuk skor.
        </p>
        <PetunjukSkoring hasil={hasil} />
        <p>
          Deteksi FIRMS {formatTanggal(hasil.hotspotDari)}–{formatTanggal(hasil.hotspotSampai)}, dihitung mundur dari hari ini, bukan prakiraan titik api.
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
        <p>
          <a href="#/sumber-metode/potensi-7-hari">Cara hitung di Sumber &amp; Metode</a>
        </p>
      </CatatanRingkas>
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
        Daftar kabupaten/kota mengikuti batas yang tersimpan. Skor hanya untuk baris yang datanya lengkap. Yang lain ditulis Belum cukup data.
      </p>
      <p>{teksBobot(true)} Bila cuplikan hotspot tidak ada, bobot dua komponen cuaca menjadi masing-masing setengah.</p>
      <p>
        Kelas Sangat tinggi: skor ≥ 0,75. Tinggi: ≥ 0,55. Sedang: ≥ 0,35. Rendah: di bawah 0,35.
        Baris yang FWI atau hari hujannya kurang dari 5 ditulis Belum cukup data dan tidak diberi skor.
        Cuplikan FWI atau hujan yang lebih lama dari 36 jam membuat seluruh kelas disembunyikan.
        Nilai yang sama pada satu indikator diberi peringkat persentil rata-rata yang sama. Bila semua kabupaten punya jumlah hari hujan model yang sama, bagian itu tidak mengubah urutan: yang membedakan adalah FWI rata-rata dan, bila ada, hotspot FIRMS.
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
