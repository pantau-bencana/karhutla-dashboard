import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../src/lib/csv.js";
import { formatWib } from "../src/lib/format.js";
import { tanggalJakarta } from "../src/lib/gwisFwi.js";
import { daftarKabkota } from "../src/lib/kabProvinsi.js";
import {
  FWI_KELAS_CATATAN,
  HOTSPOT_CATATAN,
  HUJAN_CATATAN,
  PEMBANDING_LENCANA,
  REKAP_BELUM,
  SIPONGI_TEMUAN,
  SIPONGI_URL,
  gabungRekap,
  susunCuplikan,
} from "../src/lib/rekapHarian.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "data/live/rekap-harian.json");

function baca(rel) {
  const path = resolve(root, rel);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function json(rel) {
  const text = baca(rel);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function waktu(nilai) {
  return nilai ? formatWib(nilai) : "";
}

function materi(doc) {
  if (!doc) return "";
  const { generated_at: _generated, ...lain } = doc;
  return JSON.stringify(lain);
}

export function tulisRekapDariDisk(now = new Date()) {
  const manifest = json("data/live/manifest.json") || {};
  const datasets = manifest.datasets || {};
  const capMeta = json("data/live/bmkg-cap-kab-meta.json");
  const prakMeta = json("data/live/bmkg-prakiraan-kab-meta.json");
  const hotspotMeta = json("data/live/hotspot-peta-meta.json");
  const hotspotTeks = baca("data/live/hotspot-peta.csv");
  const fwiTeks = baca("data/live/fwi_gwis_pembanding.csv");
  const hujanTeks = baca("data/live/hujan_14_pembanding.csv");
  const prakTeks = baca("data/live/bmkg-prakiraan-kab.csv");
  const capTeks = baca("data/live/bmkg-cap-kab.csv");
  const irbiTeks = baca("data/static/irbi-2025-banjir.csv");
  const longsorTeks = baca("data/static/irbi-2025-longsor.csv");
  const hotspotFeed = datasets.hotspot || {};
  const fwiFeed = datasets.fwi_gwis_pembanding || {};
  const hujanFeed = datasets.hujan_14_pembanding || {};
  const capSiap = capMeta?.status === "ok" && Boolean(capTeks);
  const capNasional = capSiap && (capMeta.cakupan === "nasional" || capMeta.cakupan == null);
  const sumber = {
    hotspot: hotspotTeks
      ? {
          nama: "NASA FIRMS VIIRS NRT",
          status: hotspotFeed.status === "ok" ? "Snapshot/arsip" : hotspotFeed.kept_previous ? "Gagal/stale" : "Snapshot/arsip",
          diambil: hotspotFeed.fetched_at || "",
          observasi: hotspotFeed.observed_at || "",
          label: hotspotFeed.observed_label || `${hotspotMeta?.tanggal_mulai || ""}–${hotspotMeta?.tanggal_selesai || ""}`,
          catatan: `${HOTSPOT_CATATAN} ${hotspotFeed.error ? `Pengambilan terakhir: ${hotspotFeed.error}.` : ""}`,
        }
      : undefined,
    fwi: fwiTeks
      ? {
          nama: "FWI model ECMWF via Copernicus GWIS",
          status: PEMBANDING_LENCANA,
          diambil: fwiFeed.fetched_at || "",
          observasi: fwiFeed.observed_at || "",
          label: fwiFeed.observed_label || "",
          catatan: FWI_KELAS_CATATAN,
        }
      : undefined,
    hujan: hujanTeks
      ? {
          nama: "Curah hujan model ECMWF via Open-Meteo",
          status: PEMBANDING_LENCANA,
          diambil: hujanFeed.fetched_at || "",
          observasi: hujanFeed.observed_at || "",
          label: hujanFeed.observed_label || "",
          catatan: HUJAN_CATATAN,
        }
      : undefined,
    bmkg: prakTeks
      ? {
          nama: "Sumber: BMKG",
          status: prakMeta?.status === "ok" ? "Aktif" : "Gagal/stale",
          diambil: prakMeta?.fetched_at || "",
          observasi: prakMeta?.observed_at || "",
          label: prakMeta?.observed_label || "",
          catatan: "Prakiraan 3 hari, satu titik adm4 per kabupaten/kota. Bukan rata-rata wilayah.",
        }
      : undefined,
    cap: capSiap
      ? {
          nama: "Sumber: BMKG",
          status: "Aktif",
          diambil: capMeta.fetched_at || "",
          observasi: capMeta.rss_published || "",
          label: capMeta.dasar || "Nowcast 0–3 jam",
          catatan: capNasional ? "Cakupan nasional. Tanpa peringatan bukan nol." : "Cakupan belum nasional. Kabupaten yang tidak tercantum tidak diisi.",
        }
      : undefined,
    irbi: irbiTeks
      ? {
          nama: "IRBI banjir 2025",
          status: "Data statis",
          diambil: "",
          observasi: "",
          label: "Buku IRBI 2025, halaman 212–227",
          catatan: "Tahunan. Bukan prakiraan. Izin tertulis BNPB untuk publikasi belum ada.",
        }
      : undefined,
    longsor: longsorTeks
      ? {
          nama: "IRBI tanah longsor 2025",
          status: "Data statis",
          diambil: "",
          observasi: "",
          label: "Buku IRBI 2025, halaman 310–323",
          catatan: "Tahunan. 455 kabupaten/kota. Bukan prakiraan dan bukan peta PVMBG. Izin tertulis BNPB untuk publikasi belum ada.",
        }
      : undefined,
    sipongi: {
      nama: "SiPongi+",
      status: "Tautan saja",
      url: SIPONGI_URL,
      temuan: SIPONGI_TEMUAN,
      catatan: "Portal resmi. Angka hotspot pada rekap adalah NASA FIRMS, bukan counter SiPongi.",
    },
  };
  const baru = susunCuplikan({
    hariWib: tanggalJakarta(now),
    kab: daftarKabkota(),
    hotspot: hotspotTeks ? parseCsv(hotspotTeks) : undefined,
    fwi: fwiTeks ? parseCsv(fwiTeks) : undefined,
    hujan: hujanTeks ? parseCsv(hujanTeks) : undefined,
    prakiraan: prakTeks ? parseCsv(prakTeks) : undefined,
    cap: capTeks ? parseCsv(capTeks) : undefined,
    capSiap,
    capNasional,
    irbi: irbiTeks ? parseCsv(irbiTeks) : undefined,
    longsor: longsorTeks ? parseCsv(longsorTeks) : undefined,
    sumber,
  });
  const lama = json("data/live/rekap-harian.json");
  const gabung = gabungRekap(lama, baru);
  gabung.generated_at = now.toISOString();
  gabung.statis = {
    iki: REKAP_BELUM,
    ispu: REKAP_BELUM,
    pvmbg: REKAP_BELUM,
  };
  if (lama && materi(lama) === materi(gabung)) return { ditulis: false, kab: daftarKabkota().length, waktu: waktu(gabung.generated_at) };
  writeFileSync(OUT, `${JSON.stringify(gabung, null, 2)}\n`);
  return { ditulis: true, kab: daftarKabkota().length, waktu: waktu(gabung.generated_at) };
}

const dipanggil = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (dipanggil) {
  const hasil = tulisRekapDariDisk();
  console.log(hasil.ditulis ? `Rekap harian ditulis untuk ${hasil.kab} kab/kota.` : "Rekap harian tidak berubah.");
}
