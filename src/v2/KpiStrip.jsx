import { useEffect, useState } from "react";
import { FirmsAck } from "../components/Atribusi.jsx";
import { useCuplikanSiklon } from "../components/SiklonRingkas.jsx";
import { formatAngka, formatWib } from "../lib/format.js";
import { CATATAN_PENDUDUK, CATATAN_RUMAH, KPI_PENDUDUK, KPI_RUMAH } from "../lib/pendudukKab.js";

const BANJIR = "data/live/banjir-ringkasan.json";
const MANIFEST = "data/live/manifest.json";

function ambil(path, sinyal) {
  return fetch(new URL(path, document.baseURI).href, { cache: "no-store", signal: sinyal }).then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
}

function tingkat(total) {
  if (!total) return "";
  if (total.awas > 0) return "Awas";
  if (total.siaga > 0) return "Siaga";
  if (total.waspada > 0) return "Waspada";
  return "Tanpa status";
}

function Kartu({ tone = "", label, value, note, href }) {
  return (
    <article className={tone ? `v2-kpi ${tone}` : "v2-kpi"}>
      <p className="v2-kpi-label">{label}</p>
      <p className="v2-kpi-value">{value}</p>
      {note ? <p className="v2-kpi-note">{note}</p> : null}
      {href ? <a className="v2-more" href={href}>Lihat selengkapnya</a> : null}
    </article>
  );
}

export function KpiStrip({ location }) {
  const { page, hazard } = location;
  const [banjir, setBanjir] = useState(null);
  const [banjirGalat, setBanjirGalat] = useState("");
  const [manifest, setManifest] = useState(null);
  const { data: siklon, galat: siklonGalat } = useCuplikanSiklon();

  const ringkasKarhutla = page === "ringkasan" && hazard === "karhutla";
  const tampilBanjir = hazard === "banjir" || ringkasKarhutla;
  const tampilHotspot = ringkasKarhutla || (hazard === "karhutla" && (page === "peta" || page === "potensi"));
  const tampilSiklon = page === "siklon" || ringkasKarhutla;
  const tampilGunung = hazard === "gunung-api" && page !== "metode" && page !== "glosarium" && page !== "siklon" && page !== "irbi";
  const tampilIrbi = page === "irbi";
  const tampilIspu = page === "ispu";

  useEffect(() => {
    if (!tampilBanjir && !tampilHotspot) return undefined;
    const kontrol = new AbortController();
    if (tampilBanjir) {
      ambil(BANJIR, kontrol.signal)
        .then((json) => setBanjir(json))
        .catch((error) => {
          if (error.name !== "AbortError") setBanjirGalat(error.message || "Cuplikan banjir tidak termuat.");
        });
    }
    if (tampilHotspot) {
      ambil(MANIFEST, kontrol.signal)
        .then((json) => setManifest(json))
        .catch(() => setManifest(null));
    }
    return () => kontrol.abort();
  }, [tampilBanjir, tampilHotspot]);

  if (!tampilBanjir && !tampilHotspot && !tampilSiklon && !tampilGunung && !tampilIrbi && !tampilIspu) return null;

  const hariIni = banjir?.tabs?.find((tab) => tab.id === "hari-ini");
  const total = hariIni?.total;
  const kelas = tingkat(total);
  const hotspot = manifest?.datasets?.hotspot;
  const kartu = [];

  if (tampilHotspot) {
    if (hotspot?.status === "ok" && Number.isFinite(hotspot.record_count)) {
      kartu.push(
        <Kartu
          key="hotspot"
          label="Deteksi satelit"
          value={formatAngka(hotspot.record_count)}
          note={`Hotspot pada cuplikan, bukan kebakaran terkonfirmasi. Observasi ${formatWib(hotspot.observed_at)}. Diambil ${formatWib(hotspot.fetched_at)}.`}
          href="#/karhutla/peta"
        />,
      );
    } else if (tampilHotspot && manifest) {
      kartu.push(
        <Kartu
          key="hotspot-kosong"
          label="Deteksi satelit"
          value="Tidak ditampilkan"
          note="Cuplikan titik panas tidak berstatus siap. Tidak ada hitungan pada kartu ini."
          href="#/karhutla/peta"
        />,
      );
    }
  }

  if (tampilBanjir) {
    if (total) {
      kartu.push(
        <Kartu
          key="status"
          tone={kelas === "Awas" ? "awas" : kelas === "Siaga" ? "siaga" : kelas === "Waspada" ? "waspada" : ""}
          label="Status analisis"
          value={kelas}
          note={`Tab Hari ini. ${formatAngka(total.awas)} Awas, ${formatAngka(total.siaga)} Siaga, ${formatAngka(total.waspada)} Waspada, dari ${formatAngka(total.kab)} kab/kota. Analisis dasbor, bukan status resmi. Diambil ${formatWib(banjir.cap?.fetched_at || banjir.pembaruan_terakhir)}. Terbit RSS ${formatWib(banjir.cap?.rss_published)}.`}
          href="#/banjir"
        />,
      );
      kartu.push(
        <Kartu
          key="penduduk"
          label={KPI_PENDUDUK}
          value={total.potensi_penduduk == null ? "Belum dapat dijumlahkan" : formatAngka(total.potensi_penduduk)}
          note={CATATAN_PENDUDUK}
          href="#/banjir"
        />,
      );
      kartu.push(
        <Kartu
          key="rumah"
          label={KPI_RUMAH}
          value={total.potensi_rumah == null ? "Belum dapat dijumlahkan" : formatAngka(total.potensi_rumah)}
          note={CATATAN_RUMAH}
          href="#/banjir"
        />,
      );
    } else if (banjirGalat) {
      kartu.push(
        <Kartu
          key="banjir-galat"
          label="Status analisis"
          value="Tidak termuat"
          note={`${banjirGalat} Tidak ada hitungan kab/kota pada kartu ini.`}
          href="#/banjir"
        />,
      );
    }
  }

  if (tampilSiklon) {
    kartu.push(
      <Kartu
        key="siklon"
        label="Siklon tropis"
        value={siklonGalat ? "Tidak termuat" : (siklon?.status_teks || siklon?.status || "Memuat…")}
        note={siklonGalat
          ? `${siklonGalat} Status tidak diisi.`
          : `Sumber: BMKG. Bukan peringatan resmi. Diambil ${formatWib(siklon?.fetched_at)}.`}
        href="#/siklon"
      />,
    );
  }

  if (tampilGunung) {
    kartu.push(
      <Kartu
        key="gunung"
        label="Gunung api"
        value="Belum terhubung"
        note="Menunggu data resmi. Tidak ada angka tingkat aktivitas, penduduk terpapar, atau luas kawasan pada halaman ini."
        href="#/gunung-api"
      />,
    );
  }

  if (tampilIrbi) {
    kartu.push(
      <Kartu
        key="irbi"
        label="IRBI"
        value="Data statis"
        note="Buku IRBI 2025, tahunan. Bukan prakiraan harian dan bukan peta risiko resmi yang sedang berjalan."
        href="#/irbi"
      />,
    );
  }

  if (tampilIspu) {
    kartu.push(
      <Kartu
        key="ispu"
        label="ISPU stasiun"
        value="Tautan saja"
        note="Dasbor tidak mengambil angka ISPU otomatis dan tidak membuat prediksi ISPU."
        href="#/karhutla/ispu"
      />,
    );
  }

  if (!kartu.length) return null;

  return (
    <section className="v2-kpis" aria-label="Ringkasan angka">
      {kartu}
      {tampilHotspot ? <FirmsAck /> : null}
      {tampilBanjir ? (
        <p className="v2-kpi-batas">
          Intensitas hujan tidak diringkas menjadi satu angka nasional. Milimeter model per kab/kota ada di peta Banjir, berlabel pembanding, dan tidak menetapkan Awas, Siaga, atau Waspada. Luas genangan dan daftar kecamatan tidak ditampilkan.
        </p>
      ) : null}
    </section>
  );
}
