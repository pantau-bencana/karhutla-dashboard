import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { feature as topoFeature } from "topojson-client";
import { parseCsv } from "../src/lib/csv.js";
import { INDONESIA_FRAME } from "../src/lib/geo.js";
import {
  HUJAN_CHUNK,
  HUJAN_GAP_MS,
  HUJAN_GPM_CATATAN,
  HUJAN_PEMBANDING_JENIS,
  HUJAN_PEMBANDING_MODEL,
  HUJAN_PEMBANDING_SATUAN,
  HUJAN_PEMBANDING_SUMBER,
  HUJAN_PEMBANDING_VARIABEL,
  HUJAN_TITIK_BATAS,
  gabungHujan,
} from "../src/lib/hujanPembanding.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KOORDINAT = resolve(root, "data/static/prakiraan-adm4-koordinat.csv");
const SAMPEL = resolve(root, "data/static/prakiraan-sampel-adm4.csv");
const BATAS = resolve(root, "data/static/batas-kabkota.topojson");
const OUT = resolve(root, "data/live/hujan-pembanding-kab.csv");
const META = resolve(root, "data/live/hujan-pembanding-kab-meta.json");
const API = "https://api.open-meteo.com/v1/forecast";

const HEADERS = ["kode_kab", "provinsi", "nama", "adm4", "lintang", "bujur", "tanggal", "curah_hujan_mm", "asal_koordinat"];

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(rows) {
  const lines = [HEADERS.join(",")];
  for (const row of rows) lines.push(HEADERS.map((header) => csvCell(row[header])).join(","));
  return `${lines.join("\n")}\n`;
}

function readMeta() {
  if (!existsSync(META)) return null;
  try {
    return JSON.parse(readFileSync(META, "utf8"));
  } catch {
    return null;
  }
}

function previousRows() {
  if (!existsSync(OUT)) return [];
  try {
    return parseCsv(readFileSync(OUT, "utf8"));
  } catch {
    return [];
  }
}

function previousUsable() {
  const meta = readMeta();
  const rows = previousRows();
  return Boolean(meta?.status === "ok" && meta.fetched_at && rows.length);
}

function previousModelCocok() {
  return readMeta()?.model === HUJAN_PEMBANDING_MODEL;
}

function tulisMeta(meta) {
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);
  tulisManifes(meta);
}

function tulisManifes(meta) {
  const manifestPath = resolve(root, "data/live/manifest.json");
  if (!existsSync(manifestPath)) return;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const rows = existsSync(OUT) ? parseCsv(readFileSync(OUT, "utf8")) : [];
    manifest.datasets = manifest.datasets ?? {};
    manifest.datasets.hujan_pembanding_banjir = {
      id: "hujan_pembanding_banjir",
      nama: "Curah hujan model pada titik adm4",
      instansi: HUJAN_PEMBANDING_SUMBER,
      source: "Open-Meteo Forecast API",
      url: API,
      license: "CC BY 4.0. Cantumkan Open-Meteo.",
      mode: "pembanding",
      update_type: "Harian",
      access: "API",
      frequency: "Harian",
      limitation: `${HUJAN_PEMBANDING_JENIS}. ${HUJAN_GPM_CATATAN}`,
      fungsi: "Jumlah hujan harian pada titik adm4. Tidak masuk matriks Awas/Siaga/Waspada.",
      expected_max_age_hours: 36,
      fetched_at: meta.fetched_at ?? null,
      observed_at: meta.observed_at ?? null,
      observed_label: meta.jenis || HUJAN_PEMBANDING_JENIS,
      source_updated_at: meta.observed_at ?? null,
      record_count: rows.length,
      status: meta.status === "ok" ? "ok" : "failed",
      error: meta.error || meta.last_error || null,
      file: rows.length ? "data/live/hujan-pembanding-kab.csv" : null,
      kept_previous: Boolean(meta.kept_previous),
      content_hash: null,
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  } catch (error) {
    console.error(`Manifes hujan pembanding tidak ditulis: ${error.message || error}`);
  }
}

function simpanGagal(error) {
  const message = error?.message || String(error);
  if (previousUsable()) {
    const meta = readMeta();
    tulisMeta({
      ...meta,
      kept_previous: true,
      last_error: message,
      last_attempt_at: new Date().toISOString(),
      gpm: HUJAN_GPM_CATATAN,
    });
    console.log(`Hujan pembanding: cuplikan terakhir dipertahankan. ${message}`);
    return;
  }
  tulisMeta({
    status: "gagal",
    fetched_at: null,
    observed_at: null,
    kept_previous: false,
    record_count: 0,
    error: message,
    last_attempt_at: new Date().toISOString(),
    jenis: HUJAN_PEMBANDING_JENIS,
    sumber: HUJAN_PEMBANDING_SUMBER,
    gpm: HUJAN_GPM_CATATAN,
  });
  console.error(`Hujan pembanding gagal dan tidak ada cuplikan. ${message}`);
}

function angkaAtauKosong(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

async function ambilKelompok(chunk) {
  const url = new URL(API);
  url.searchParams.set("latitude", chunk.map((point) => point.lintang).join(","));
  url.searchParams.set("longitude", chunk.map((point) => point.bujur).join(","));
  url.searchParams.set("daily", HUJAN_PEMBANDING_VARIABEL);
  url.searchParams.set("timezone", "Asia/Jakarta");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("models", HUJAN_PEMBANDING_MODEL);
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "karhutla-dashboard/0.1 (non-commercial)" },
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw new Error(error.message || "Open-Meteo tidak menjawab");
  }
  if (response.status === 429) {
    await sleep(60000);
    response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "karhutla-dashboard/0.1 (non-commercial)" },
      signal: AbortSignal.timeout(30000),
    });
  }
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.error) throw new Error(payload.reason || "Open-Meteo menolak permintaan");
  const blocks = Array.isArray(payload) ? payload : [payload];
  if (blocks.length !== chunk.length) throw new Error("Open-Meteo tidak mengembalikan satu blok per titik");
  const rows = [];
  const tanggal = new Set();
  blocks.forEach((block, index) => {
    const daily = block?.daily ?? {};
    const unit = block?.daily_units?.precipitation_sum;
    if (unit && unit !== HUJAN_PEMBANDING_SATUAN) throw new Error(`Satuan Open-Meteo ${unit}, bukan mm`);
    const times = daily.time ?? [];
    const sums = daily.precipitation_sum ?? [];
    if (!times.length) throw new Error(`Open-Meteo kosong untuk ${chunk[index].kode_kab}`);
    times.forEach((time, dayIndex) => {
      tanggal.add(time);
      rows.push({
        kode_kab: chunk[index].kode_kab,
        provinsi: chunk[index].provinsi,
        nama: chunk[index].kotkab || chunk[index].nama || "",
        adm4: chunk[index].adm4,
        lintang: chunk[index].lintang,
        bujur: chunk[index].bujur,
        tanggal: time,
        curah_hujan_mm: angkaAtauKosong(sums[dayIndex]),
        asal_koordinat: chunk[index].asal || "adm4-bmkg",
      });
    });
  });
  return { rows, tanggal: [...tanggal].sort() };
}

function pusatCincin(ring) {
  let luas = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const silang = ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
    luas += silang;
    x += (ring[index][0] + ring[index + 1][0]) * silang;
    y += (ring[index][1] + ring[index + 1][1]) * silang;
  }
  if (!luas) return null;
  return [x / (3 * luas), y / (3 * luas)];
}

function pusatGeometri(geometry) {
  const cincin = [];
  if (geometry?.type === "Polygon") cincin.push(geometry.coordinates?.[0]);
  if (geometry?.type === "MultiPolygon") {
    for (const bagian of geometry.coordinates ?? []) cincin.push(bagian?.[0]);
  }
  let terbaik = null;
  let luasTerbaik = 0;
  for (const ring of cincin) {
    if (!ring || ring.length < 4) continue;
    let luas = 0;
    for (let index = 0; index < ring.length - 1; index += 1) {
      luas += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
    }
    luas = Math.abs(luas);
    if (luas <= luasTerbaik) continue;
    const pusat = pusatCincin(ring);
    if (!pusat) continue;
    luasTerbaik = luas;
    terbaik = pusat;
  }
  return terbaik;
}

function dalamIndonesia(lintang, bujur) {
  return lintang >= INDONESIA_FRAME.south && lintang <= INDONESIA_FRAME.north && bujur >= INDONESIA_FRAME.west && bujur <= INDONESIA_FRAME.east;
}

function titikPusatYangHilang(ada) {
  if (!existsSync(SAMPEL) || !existsSync(BATAS)) return [];
  const hilang = parseCsv(readFileSync(SAMPEL, "utf8")).filter((row) => row.kode_kab && !ada.has(row.kode_kab));
  if (!hilang.length) return [];
  const topo = JSON.parse(readFileSync(BATAS, "utf8"));
  const geo = topoFeature(topo, topo.objects.kabupaten);
  const batas = new Map((geo.features ?? []).map((item) => [String(item.properties?.kode || ""), item]));
  const tambahan = [];
  for (const row of hilang) {
    const fitur = batas.get(row.kode_kab);
    const pusat = pusatGeometri(fitur?.geometry);
    if (!pusat) continue;
    const [bujur, lintang] = pusat;
    if (!dalamIndonesia(lintang, bujur)) continue;
    tambahan.push({
      kode_kab: row.kode_kab,
      adm4: row.adm4 || "",
      lintang: String(lintang),
      bujur: String(bujur),
      provinsi: fitur?.properties?.provinsi || "",
      kotkab: row.nama_kab || fitur?.properties?.nama || "",
      asal: "pusat-batas",
    });
  }
  return tambahan;
}

async function main() {
  if (!existsSync(KOORDINAT)) throw new Error("Berkas koordinat titik adm4 belum ada.");
  const points = parseCsv(readFileSync(KOORDINAT, "utf8")).filter((row) => {
    const lat = Number(row.lintang);
    const lon = Number(row.bujur);
    return row.kode_kab && row.adm4 && Number.isFinite(lat) && Number.isFinite(lon);
  });
  for (const point of points) point.asal = "adm4-bmkg";
  points.push(...titikPusatYangHilang(new Set(points.map((point) => point.kode_kab))));
  if (!points.length) throw new Error("Tidak ada koordinat titik adm4.");
  const baru = [];
  const gagal = [];
  const tanggal = new Set();
  for (let start = 0; start < points.length; start += HUJAN_CHUNK) {
    const chunk = points.slice(start, start + HUJAN_CHUNK);
    try {
      const part = await ambilKelompok(chunk);
      baru.push(...part.rows);
      for (const hari of part.tanggal) tanggal.add(hari);
    } catch (error) {
      for (const point of chunk) gagal.push(point.kode_kab);
      console.error(`Kelompok ${start}: ${error.message || error}`);
    }
    if (start + HUJAN_CHUNK < points.length) await sleep(HUJAN_GAP_MS);
  }
  const sebelum = previousModelCocok() ? previousRows() : [];
  if (!baru.length) throw new Error(gagal.length ? `${gagal.length} kelompok gagal dan tidak ada baris baru.` : "Open-Meteo tidak mengembalikan hujan.");
  const merged = gabungHujan(sebelum, baru, gagal);
  const hari = [...tanggal].sort();
  const fetchedAt = new Date().toISOString();
  writeFileSync(OUT, toCsv(merged.rows));
  tulisMeta({
    status: "ok",
    fetched_at: fetchedAt,
    observed_at: hari[0] ? `${hari[0]}T00:00:00+07:00` : null,
    tanggal: hari,
    kept_previous: merged.kept > 0,
    diminta: points.length,
    berhasil: new Set(baru.map((row) => row.kode_kab)).size,
    gagal: gagal.length,
    record_count: merged.rows.length,
    jenis: HUJAN_PEMBANDING_JENIS,
    sumber: HUJAN_PEMBANDING_SUMBER,
    model: HUJAN_PEMBANDING_MODEL,
    variabel: HUJAN_PEMBANDING_VARIABEL,
    satuan: HUJAN_PEMBANDING_SATUAN,
    timezone: "Asia/Jakarta",
    lisensi: "CC BY 4.0",
    lisensi_url: "https://open-meteo.com/en/licence",
    url: API,
    titik: "koordinat lokasi API prakiraan BMKG pada adm4 yang sama, bukan rata-rata kabupaten",
    titik_batas: points
      .filter((point) => point.asal === "pusat-batas")
      .map((point) => point.kode_kab)
      .sort(),
    titik_batas_catatan: HUJAN_TITIK_BATAS,
    error: gagal.length ? `${gagal.length} kab/kota gagal; cuplikan sebelumnya dipertahankan bila ada.` : null,
    gpm: HUJAN_GPM_CATATAN,
  });
  console.log(`Hujan pembanding: ${new Set(baru.map((row) => row.kode_kab)).size} titik baru, ${gagal.length} gagal, ${merged.rows.length} baris.`);
}

try {
  await main();
} catch (error) {
  simpanGagal(error);
  process.exit(0);
}
