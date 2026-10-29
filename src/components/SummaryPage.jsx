import { useEffect, useState } from "react";
import { FirmsAck, OpenMeteoCredit } from "./Atribusi.jsx";
import { FilterProvinsi } from "./FilterProvinsi.jsx";
import { formatAngka, formatTanggal, formatWib } from "../lib/format.js";
import { hotspotSourceLabel } from "../lib/freshness.js";
import { CAMS_LABEL } from "../lib/ispuView.js";
import { daftarKabkota } from "../lib/kabProvinsi.js";
import {
  hitungStatusBanjir,
  puncakBanjir,
  saringProvinsiBanjir,
  sorotanCams,
  sorotanFwi,
  titikHariTerbaru,
} from "../lib/laporanHarian.js";
import { KELAS_BELUM, POTENSI_JENIS, susunPotensiTujuh } from "../lib/potensiTujuh.js";
import { SiklonRingkas } from "./SiklonRingkas.jsx";
import { RingkasGunung, useCuplikanGunung } from "./VolcanoPage.jsx";

const KELAS_URUT = ["Sangat tinggi", "Tinggi", "Sedang", "Rendah", KELAS_BELUM];
const RINGKASAN_BANJIR = "data/live/banjir-ringkasan.json";

export function SummaryPage({
  config,
  feeds,
  manifest = null,
  loading = false,
  province = "",
  setProvince,
}) {
  const hotspot = feeds.find((feed) => feed.id === "hotspot");
  const priority = config?.provinsiPrioritas ?? [];
  const irbi = feeds.find((feed) => feed.id === "irbi");
  const fwiGwis = feeds.find((feed) => feed.id === "fwi_gwis_pembanding");
  const hujan = feeds.find((feed) => feed.id === "hujan_14_pembanding");
  const camsFeed = feeds.find((feed) => feed.id === "ispu_pembanding");
  const bolehHotspot = hotspot && !hotspot.contoh && (hotspot.status === "berhasil" || hotspot.status === "usang");
  const titik = titikHariTerbaru(bolehHotspot ? hotspot.rows : [], province);
  const hasil = susunPotensiTujuh({
    fwiRows: fwiGwis?.contoh ? [] : fwiGwis?.rows,
    hujanRows: hujan?.contoh ? [] : hujan?.rows,
    hotspotRows: bolehHotspot ? hotspot.rows ?? [] : null,
    irbiRows: irbi?.contoh ? [] : irbi?.rows,
    provinsi: [],
    daftarWilayah: daftarKabkota(),
    nasional: true,
    fwiFetchedAt: fwiGwis?.fetchedAt || "",
    hujanFetchedAt: hujan?.fetchedAt || "",
    hotspotFetchedAt: hotspot?.fetchedAt || "",
  });
  const barisPotensi = province ? hasil.baris.filter((row) => row.provinsi === province) : hasil.baris;
  const fwi = sorotanFwi(fwiGwis?.contoh ? [] : fwiGwis?.rows, { province });
  const cams = sorotanCams(camsFeed?.contoh ? null : camsFeed, { province });
  const cakupan = province || "Seluruh Indonesia";

  return (
    <main className="wrap main laporan-teks">
      <header className="page-head">
        <div>
          <h1>Laporan singkat harian</h1>
          <p className="lead">
            hotspot = deteksi satelit, bukan kebakaran terkonfirmasi. Angka di bawah dibaca dari cuplikan yang tersimpan.
            Laporan ini bukan peringatan resmi BNPB, BMKG, PVMBG, atau KLH.
          </p>
        </div>
      </header>
      {setProvince ? (
        <FilterProvinsi
          province={province}
          setProvince={setProvince}
          points={bolehHotspot ? hotspot.rows : []}
          prioritas={priority}
        />
      ) : null}
      <section className="card" aria-label="Karhutla">
        <h2>Karhutla</h2>
        <p>Cakupan {cakupan}. Peta, tabel peringkat, dan saringan tanggal ada di <a href="#/karhutla/peta">Peta dan Data</a>.</p>
        {loading && !hotspot ? (
          <p role="status">Memuat cuplikan titik panas…</p>
        ) : !bolehHotspot ? (
          <p>{hotspot?.error || "Cuplikan titik panas tidak ditampilkan."} Tidak ada hitungan merah, oranye, atau kuning pada laporan ini.</p>
        ) : (
          <>
            <p>
              Hari cuplikan {titik.hari ? formatTanggal(titik.hari) : "tidak ada tanggal"}.
              {" "}
              {formatAngka(titik.hitung.merah)} merah (kepercayaan tinggi), {formatAngka(titik.hitung.oranye)} oranye (sedang), {formatAngka(titik.hitung.kuning)} kuning (rendah)
              {titik.hitung.tidakDiketahui ? `, ${formatAngka(titik.hitung.tidakDiketahui)} tidak diketahui` : ""}.
              {" "}
              Jumlah {formatAngka(titik.jumlah)} deteksi.
              {" "}
              Sumber: {hotspotSourceLabel(hotspot, config?.firms?.sumber)}.
              {" "}
              Waktu observasi {formatWib(hotspot.observedAt)}. Waktu ambil {formatWib(hotspot.fetchedAt)}.
              {hotspot.status === "usang" ? " Cuplikan tertunda." : ""}
            </p>
            {titik.puncak.length ? (
              <>
                <p>{province ? "Kabupaten/kota dengan deteksi terbanyak pada hari itu:" : "Provinsi dengan deteksi terbanyak pada hari itu:"}</p>
                <ol>
                  {titik.puncak.map((row) => (
                    <li key={row.nama}>
                      {row.nama}: {formatAngka(row.merah)} merah, {formatAngka(row.oranye)} oranye, {formatAngka(row.kuning)} kuning
                      {row.tidakDiketahui ? `, ${formatAngka(row.tidakDiketahui)} tidak diketahui` : ""}.
                    </li>
                  ))}
                </ol>
                {import.meta.env && import.meta.env.VITE_EDITION === "v2" ? (
                  <p className="v2-more"><a href="#/karhutla/peta">Lihat selengkapnya</a></p>
                ) : null}
              </>
            ) : (
              <p>Tidak ada deteksi pada hari cuplikan untuk cakupan ini.</p>
            )}
          </>
        )}
        <p>
          Potensi 7 hari ({POTENSI_JENIS}). Horizon {hasil.dari ? formatTanggal(hasil.dari) : "—"}–{hasil.sampai ? formatTanggal(hasil.sampai) : "—"}.
          {" "}
          <a href="#/karhutla/potensi">Tabel lengkap</a>.
        </p>
        {hasil.tersedia ? (
          <>
            <p>
              {KELAS_URUT.map((kelas) => `${kelas} ${formatAngka(barisPotensi.filter((row) => row.kelas === kelas).length)}`).join(", ")}
              {" "}
              kabupaten/kota pada {province || "batas yang tersimpan"}.
            </p>
            {barisPotensi.some((row) => row.kelas !== KELAS_BELUM) ? (
              <>
                <p>Lima kabupaten/kota teratas menurut kelas analisis:</p>
                <ol>
                  {barisPotensi.filter((row) => row.kelas !== KELAS_BELUM).slice(0, 5).map((row) => (
                    <li key={row.kode}>{row.kabupaten}, {row.provinsi}: {row.kelas}.</li>
                  ))}
                </ol>
                {import.meta.env && import.meta.env.VITE_EDITION === "v2" ? (
                  <p className="v2-more"><a href="#/karhutla/potensi">Lihat selengkapnya</a></p>
                ) : null}
              </>
            ) : (
              <p>Semua baris pada cakupan ini berstatus {KELAS_BELUM}.</p>
            )}
          </>
        ) : (
          <p>Potensi 7 hari belum disusun. {hasil.alasan.join(". ")}.</p>
        )}
        <p>
          Prakiraan kondisi (pembanding, bukan resmi).
          {" "}
          {fwi
            ? `FWI model ECMWF via GWIS pada ${formatTanggal(fwi.tanggal)}: nilai tertinggi ${formatAngka(fwi.fwi, 1)} di ${fwi.kabupaten}, ${fwi.provinsi}, dari ${formatAngka(fwi.jumlah)} titik di dalam batas pada tanggal itu. Pengganti berlabel untuk FDRS BMKG. Bukan SPARTAN.`
            : "Cuplikan FWI GWIS belum ada, jadi tidak ada sorotan FWI."}
          {" "}
          Waktu ambil FWI {formatWib(fwiGwis?.fetchedAt)}. Waktu ambil hujan model {formatWib(hujan?.fetchedAt)}.
        </p>
        <p>
          {cams.ada
            ? `PM2.5 ${cams.peran} ${formatAngka(cams.pm25, 1)} µg/m³${cams.pm10 != null ? `, PM10 ${formatAngka(cams.pm10, 1)} µg/m³` : ""} di titik tengah ${cams.provinsi} pada ${formatTanggal(cams.tanggal)}. ${CAMS_LABEL}.`
            : `Sorotan ISPU pembanding tidak ada. ${cams.alasan} ${CAMS_LABEL}.`}
          {" "}
          Waktu ambil model {formatWib(cams.fetchedAt)}.
          {" "}
          <a href="https://ispu.kemenlh.go.id/app/#/" target="_blank" rel="noopener noreferrer">Portal ISPU KLH</a>
          {" · "}
          <a href="#/karhutla/ispu">Kualitas Udara</a>.
        </p>
        <FirmsAck />
        <OpenMeteoCredit />
      </section>
      <BagianBanjir province={province} />
      <SiklonRingkas manifest={manifest} />
      <BagianGunung />
    </main>
  );
}

function BagianGunung() {
  const { data, galat } = useCuplikanGunung();
  return (
    <section className="card" aria-label="Gunung Api">
      <h2>Gunung Api</h2>
      <RingkasGunung data={data} galat={galat} />
      <p>
        <a href="#/gunung-api">Halaman Gunung Api</a>.
      </p>
      {import.meta.env && import.meta.env.VITE_EDITION === "v2" ? (
        <p className="v2-more"><a href="#/gunung-api">Lihat selengkapnya</a></p>
      ) : null}
    </section>
  );
}

function BagianBanjir({ province = "" }) {
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    let batal = false;
    fetch(new URL(RINGKASAN_BANJIR, document.baseURI).href, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((json) => {
        if (!batal) setData(json);
      })
      .catch((error) => {
        if (!batal) setGalat(error.message || "Cuplikan banjir tidak termuat.");
      });
    return () => {
      batal = true;
    };
  }, []);

  const hariIni = data?.tabs?.find((tab) => tab.id === "hari-ini");
  const nowcast = data?.tabs?.find((tab) => tab.id === "0-3-jam");
  const barisHari = saringProvinsiBanjir(hariIni?.rows, province);
  const barisNowcast = saringProvinsiBanjir(nowcast?.rows, province);
  const hitungHari = hitungStatusBanjir(barisHari);
  const hitungNowcast = hitungStatusBanjir(barisNowcast);
  const puncak = puncakBanjir(barisHari);

  return (
    <section className="card" aria-label="Banjir">
      <h2>Banjir</h2>
      <p>
        Cakupan {province || "Seluruh Indonesia"}. Awas, Siaga, dan Waspada adalah analisis dasbor, bukan status resmi BMKG atau BNPB.
        {" "}
        <a href="#/banjir">Peta dan tabel Banjir</a>.
      </p>
      {galat ? <p role="alert">{galat} Tidak ada hitungan kab/kota pada laporan ini.</p> : null}
      {!data && !galat ? <p role="status">Memuat cuplikan banjir…</p> : null}
      {data && !hariIni ? <p>Cuplikan banjir tidak memuat tab Hari ini.</p> : null}
      {hariIni ? (
        <>
          <p>
            Hari ini {hariIni.tanggal ? formatTanggal(hariIni.tanggal) : ""}.
            {" "}
            {formatAngka(hitungHari.Awas)} kabupaten/kota Awas, {formatAngka(hitungHari.Siaga)} Siaga, {formatAngka(hitungHari.Waspada)} Waspada.
            {nowcast ? ` Nowcast 0–3 jam: ${formatAngka(hitungNowcast.Awas)} Awas, ${formatAngka(hitungNowcast.Siaga)} Siaga, ${formatAngka(hitungNowcast.Waspada)} Waspada.` : ""}
          </p>
          {puncak.length ? (
            <>
              <p>Kabupaten/kota teratas pada tab Hari ini, urut Awas, Siaga, Waspada:</p>
              <ol>
                {puncak.map((row) => (
                  <li key={row.kode || `${row.provinsi}-${row.kab_kota}`}>{row.kab_kota}, {row.provinsi}: {row.status}.</li>
                ))}
              </ol>
              {import.meta.env && import.meta.env.VITE_EDITION === "v2" ? (
                <p className="v2-more"><a href="#/banjir">Lihat selengkapnya</a></p>
              ) : null}
            </>
          ) : (
            <p>Tidak ada kabupaten/kota berstatus Awas, Siaga, atau Waspada pada cakupan ini.</p>
          )}
          <p>
            {data.pembaruan_label || "Pembaruan terakhir"} {formatWib(data.cap?.fetched_at || data.pembaruan_terakhir)}.
            {" "}
            Waktu terbit RSS {formatWib(data.cap?.rss_published)}.
            {" "}
            Prakiraan cuaca diambil {formatWib(data.prakiraan?.fetched_at)}.
            {" "}
            Cuplikan laporan {formatWib(data.generated_at)}.
            {data.cap?.catatan ? ` ${data.cap.catatan}` : ""}
          </p>
        </>
      ) : null}
    </section>
  );
}
