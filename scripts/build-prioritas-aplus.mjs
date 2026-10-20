// Menyusun prioritas kesiapsiagaan Metode A+ sekali sehari.
// Geometri BIG hanya hidup di memori proses ini dan tidak ditulis ke repositori.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BIG_SERVICE, arcGisContains } from "../src/lib/bigWilayah.js";
import { parseCsv } from "../src/lib/csv.js";
import { normalizePlaceName } from "../src/lib/attentionPrototype.js";
import {
  CAKUPAN_PROVINSI,
  CATATAN_SATU_TITIK,
  GRID_DERAJAT,
  TITIK_MAKS,
  agregasiHotspot,
  farthestPointSample,
  gridNodesInRing,
  kodeKan,
  p75,
  susunPrioritas,
} from "../src/lib/aplus.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT = "karhutla-dashboard-refresh (https://github.com/pantau-bencana/karhutla-dashboard)";
const KAB_LAYER = 2;
const JSON_PATH = "data/live/prioritas_aplus.json";
const CSV_PATH = "data/live/prioritas_aplus.csv";
const smoke = process.argv.includes("--smoke");

function jakartaToday(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

const RETRY_STATUS = new Set([429, 502, 503, 504]);
const MAX_JEDA_MS = 120_000;
const OPEN_METEO_BATCH = 10;
const OPEN_METEO_JEDA_MS = 2000;
const GWIS_KONKURENSI = 2;
const GWIS_JEDA_MS = 250;

export function parseRetryAfter(header, nowMs = Date.now()) {
  if (header == null || String(header).trim() === "") return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const when = Date.parse(String(header));
  if (!Number.isFinite(when)) return null;
  return Math.max(0, when - nowMs);
}

export function jedaCobaLagi(attempt, retryAfterMs, random = Math.random) {
  const exp = Math.min(MAX_JEDA_MS, 1000 * 2 ** Math.max(0, attempt - 1));
  const header = Number.isFinite(retryAfterMs) ? retryAfterMs : 0;
  const jitter = Math.floor(Math.max(0, Number(random()) || 0) * 400);
  return Math.min(MAX_JEDA_MS, Math.max(exp, header) + jitter);
}

export async function ambilTeks(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30000;
  const maxAttempts = options.maxAttempts ?? 5;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleepImpl = options.sleepImpl ?? sleep;
  const random = options.random ?? Math.random;
  const target = String(url);
  const host = new URL(target).host;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(target, {
        headers: { accept: "*/*", "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      if (attempt === maxAttempts) throw new Error(`${host} tidak menjawab`);
      const wait = jedaCobaLagi(attempt, null, random);
      console.error(`${host} tidak menjawab, jeda ${Math.round(wait / 1000)} dtk, percobaan ${attempt}/${maxAttempts}`);
      await sleepImpl(wait);
      continue;
    }
    if (response.ok) return response.text();
    lastStatus = Number(response.status) || 0;
    const retryAfter = parseRetryAfter(response.headers?.get?.("retry-after") ?? null);
    if (!RETRY_STATUS.has(lastStatus) || attempt === maxAttempts) {
      throw new Error(`${host} HTTP ${lastStatus}`);
    }
    const wait = jedaCobaLagi(attempt, retryAfter, random);
    console.error(`${host} HTTP ${lastStatus}, jeda ${Math.round(wait / 1000)} dtk, percobaan ${attempt}/${maxAttempts}`);
    await sleepImpl(wait);
  }
  throw new Error(`${host} HTTP ${lastStatus || 429}`);
}

export function tandaiCuplikanUsang(snapshot, saat, alasan) {
  if (!snapshot || !Array.isArray(snapshot.baris) || snapshot.baris.length === 0) return null;
  const text = String(alasan || "pengambilan gagal").replace(/\s+/g, " ").slice(0, 300);
  return { ...snapshot, stale: true, stale_at: saat, stale_alasan: text };
}

async function mapPool(items, limit, task) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return output;
}

function gwisInfoUrl(lat, lon, time) {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetFeatureInfo",
    LAYERS: "ecmwf.query",
    QUERY_LAYERS: "ecmwf.query",
    STYLES: "",
    SRS: "EPSG:4326",
    BBOX: `${(lon - 0.02).toFixed(4)},${(lat - 0.02).toFixed(4)},${(lon + 0.02).toFixed(4)},${(lat + 0.02).toFixed(4)}`,
    WIDTH: "11",
    HEIGHT: "11",
    X: "5",
    Y: "5",
    INFO_FORMAT: "text/html",
    FEATURE_COUNT: "1",
    TIME: time,
  });
  return `https://maps.effis.emergency.copernicus.eu/gwis?${params}`;
}

function parseGwisHtml(html) {
  if (String(html).includes("ServiceException")) throw new Error("GWIS menolak GetFeatureInfo.");
  const found = [...String(html).matchAll(/<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]*)<\/td>\s*<\/tr>/g)];
  const map = Object.fromEntries(found.map((item) => [item[1].trim(), item[2].trim()]));
  const fwi = Number(map["Fire Weather Index (FWI)"]);
  if (!Number.isFinite(fwi)) return null;
  const numOrNull = (label) => {
    const value = Number(map[label]);
    return Number.isFinite(value) ? value : null;
  };
  return {
    fwi,
    ffmc: numOrNull("Fine Fuel Moisture Code (FFMC)"),
    dc: numOrNull("Drought Code (DC)"),
  };
}

async function fetchBig(body) {
  const url = `${BIG_SERVICE}/${KAB_LAYER}/query`;
  const host = new URL(url).host;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      body,
      signal: AbortSignal.timeout(60000),
    });
    if (response.ok) return response;
    lastStatus = response.status;
    if (!RETRY_STATUS.has(response.status) || attempt === 5) break;
    const wait = jedaCobaLagi(attempt, parseRetryAfter(response.headers.get("retry-after")));
    console.error(`${host} HTTP ${response.status}, jeda ${Math.round(wait / 1000)} dtk, percobaan ${attempt}/5`);
    await sleep(wait);
  }
  throw new Error(`${host} HTTP ${lastStatus}`);
}

async function queryProvinsi(provinsi) {
  const features = [];
  let offset = 0;
  for (let page = 0; page < 20; page += 1) {
    const body = new URLSearchParams({
      f: "json",
      where: `wadmpr='${provinsi.replaceAll("'", "''")}'`,
      outFields: "kdpkab,wadmkk,wadmpr",
      returnGeometry: "true",
      maxAllowableOffset: "0.01",
      resultOffset: String(offset),
      resultRecordCount: "15",
    });
    const response = await fetchBig(body);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || "BIG menolak kueri");
    const batch = payload.features ?? [];
    features.push(...batch);
    if (!payload.exceededTransferLimit || !batch.length) break;
    offset += batch.length;
  }
  return features;
}

function bboxOf(geometry) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const ring of geometry?.rings ?? []) {
    for (const pair of ring) {
      minLon = Math.min(minLon, pair[0]);
      maxLon = Math.max(maxLon, pair[0]);
      minLat = Math.min(minLat, pair[1]);
      maxLat = Math.max(maxLat, pair[1]);
    }
  }
  if (!Number.isFinite(minLon)) return null;
  return { minLon, minLat, maxLon, maxLat };
}

function readTitikWakil() {
  const path = resolve(root, "data/live/titik_wakil.csv");
  if (!existsSync(path)) return new Map();
  const map = new Map();
  for (const row of parseCsv(readFileSync(path, "utf8"))) {
    const kode = kodeKan(row.kode);
    const lintang = Number(row.lintang);
    const bujur = Number(row.bujur);
    if (!kode || !Number.isFinite(lintang) || !Number.isFinite(bujur)) continue;
    map.set(kode, { kode, kab: row.kabupaten, prov: row.provinsi, lintang, bujur });
  }
  return map;
}

function readIrbi() {
  const path = resolve(root, "data/static/irbi-2025-karhutla.csv");
  const map = new Map();
  for (const row of parseCsv(readFileSync(path, "utf8"))) {
    const key = `${normalizePlaceName(row.provinsi)}|${normalizePlaceName(row.kabupaten)}`;
    const indeks = Number(row.indeks_risiko);
    if (!Number.isFinite(indeks)) continue;
    map.set(key, { I3: indeks, irbi_kelas: row.kelas_risiko || "" });
  }
  return map;
}

async function pilihTitik() {
  const wakil = readTitikWakil();
  const chosen = [];
  for (const provinsi of CAKUPAN_PROVINSI) {
    let features = [];
    try {
      features = await queryProvinsi(provinsi);
      console.log(`BIG ${provinsi}: ${features.length} kab/kota`);
    } catch (error) {
      console.log(`BIG ${provinsi} gagal: ${error.message}`);
    }
    const seen = new Set();
    for (const feature of features) {
      const kode = kodeKan(feature.attributes?.kdpkab);
      const kab = String(feature.attributes?.wadmkk ?? "").trim();
      if (!kode || seen.has(kode)) continue;
      seen.add(kode);
      const box = bboxOf(feature.geometry);
      let titik = [];
      if (box) {
        const inside = gridNodesInRing(box.minLon, box.minLat, box.maxLon, box.maxLat, GRID_DERAJAT).filter((node) =>
          arcGisContains(feature.geometry, node.bujur, node.lintang),
        );
        titik = farthestPointSample(inside, TITIK_MAKS).map((node) => ({ ...node, src: "grid" }));
      }
      if (!titik.length && wakil.has(kode)) {
        const point = wakil.get(kode);
        titik = [{ lintang: point.lintang, bujur: point.bujur, src: "titik_wakil" }];
      }
      if (!titik.length) continue;
      const src = titik.some((point) => point.src === "titik_wakil") && titik.length === 1 ? "titik_wakil" : "grid";
      chosen.push({ kode, kab, prov: provinsi, src, titik });
    }
    for (const point of wakil.values()) {
      if (normalizePlaceName(point.prov) !== normalizePlaceName(provinsi)) continue;
      if (chosen.some((item) => item.kode === point.kode)) continue;
      chosen.push({
        kode: point.kode,
        kab: point.kab,
        prov: provinsi,
        src: "titik_wakil",
        titik: [{ lintang: point.lintang, bujur: point.bujur, src: "titik_wakil" }],
      });
    }
  }
  return chosen;
}

async function tanggalGwis(point) {
  const today = jakartaToday();
  const dates = [];
  let misses = 0;
  for (let offset = 0; offset < 12 && dates.length < 9; offset += 1) {
    const time = addDays(today, offset);
    const html = await ambilTeks(gwisInfoUrl(point.lintang, point.bujur, time), { timeoutMs: 30000 });
    const value = parseGwisHtml(html);
    if (!value) {
      misses += 1;
      if (misses >= 2) break;
      continue;
    }
    misses = 0;
    dates.push(time);
    await sleep(120);
  }
  return dates;
}

async function ambilGwis(wilayah, dates) {
  const jobs = [];
  for (const item of wilayah) {
    for (const point of item.titik) {
      for (const time of dates) jobs.push({ kode: item.kode, point, time });
    }
  }
  let failures = 0;
  const found = await mapPool(jobs, GWIS_KONKURENSI, async (job) => {
    try {
      const html = await ambilTeks(gwisInfoUrl(job.point.lintang, job.point.bujur, job.time), { timeoutMs: 30000 });
      await sleep(GWIS_JEDA_MS);
      return { ...job, value: parseGwisHtml(html) };
    } catch {
      failures += 1;
      return { ...job, value: null };
    }
  });
  if (jobs.length && failures > jobs.length * 0.3) throw new Error("Sebagian besar permintaan GWIS gagal.");
  return found.filter((item) => item.value);
}

function ringkasGwis(wilayah, found, dates) {
  const byKode = new Map();
  for (const item of found) {
    const bag = byKode.get(item.kode) ?? new Map();
    const day = bag.get(item.time) ?? { fwi: [], ffmc: [], dc: [] };
    day.fwi.push(item.value.fwi);
    if (item.value.ffmc != null) day.ffmc.push(item.value.ffmc);
    if (item.value.dc != null) day.dc.push(item.value.dc);
    bag.set(item.time, day);
    byKode.set(item.kode, bag);
  }
  return wilayah.map((item) => {
    const bag = byKode.get(item.kode) ?? new Map();
    const fwiHarian = [];
    const ffmcHarian = [];
    const dcHarian = [];
    let fwiMaks = null;
    for (const time of dates) {
      const day = bag.get(time);
      if (!day?.fwi.length) continue;
      fwiHarian.push(p75(day.fwi));
      if (day.ffmc.length) ffmcHarian.push(p75(day.ffmc));
      if (day.dc.length) dcHarian.push(p75(day.dc));
      for (const value of day.fwi) fwiMaks = fwiMaks == null ? value : Math.max(fwiMaks, value);
    }
    const i1 = fwiHarian.length ? fwiHarian.reduce((sum, value) => sum + value, 0) / fwiHarian.length : null;
    return {
      kode: item.kode,
      kab: item.kab,
      prov: item.prov,
      n_titik: item.titik.length,
      src: item.src,
      I1: i1,
      fwi_titik_maks: fwiMaks,
      ffmc78_hari: ffmcHarian.filter((value) => value >= 78).length,
      dc_maks: dcHarian.length ? Math.max(...dcHarian) : null,
      gwis_hari: fwiHarian.length,
    };
  });
}

async function ambilEnsemble(wilayah) {
  const points = [];
  for (const item of wilayah) {
    for (const point of item.titik) points.push({ ...point, kode: item.kode });
  }
  const peluang = new Map();
  for (let start = 0; start < points.length; start += OPEN_METEO_BATCH) {
    const chunk = points.slice(start, start + OPEN_METEO_BATCH);
    const url = new URL("https://ensemble-api.open-meteo.com/v1/ensemble");
    url.searchParams.set("latitude", chunk.map((point) => point.lintang).join(","));
    url.searchParams.set("longitude", chunk.map((point) => point.bujur).join(","));
    url.searchParams.set("daily", "precipitation_sum");
    url.searchParams.set("models", "ecmwf_ifs025");
    url.searchParams.set("forecast_days", "14");
    url.searchParams.set("timezone", "Asia/Jakarta");
    const text = await ambilTeks(url, { timeoutMs: 60000 });
    const payload = JSON.parse(text);
    const blocks = Array.isArray(payload) ? payload : [payload];
    blocks.forEach((block, index) => {
      const daily = block.daily ?? {};
      const days = daily.time ?? [];
      const keys = Object.keys(daily).filter((key) => key === "precipitation_sum" || /^precipitation_sum_member\d+$/.test(key));
      if (days.length < 14 || keys.length < 51) return;
      let dry = 0;
      for (const key of keys) {
        const series = daily[key] ?? [];
        let wet = false;
        for (let day = 0; day < 14; day += 1) {
          const value = Number(series[day]);
          if (!Number.isFinite(value)) return;
          if (value > 20) wet = true;
        }
        if (!wet) dry += 1;
      }
      const list = peluang.get(chunk[index].kode) ?? [];
      list.push(dry / keys.length);
      peluang.set(chunk[index].kode, list);
    });
    if (start + OPEN_METEO_BATCH < points.length) await sleep(OPEN_METEO_JEDA_MS);
  }
  return peluang;
}

function bacaHotspot() {
  const path = resolve(root, "data/live/hotspot.csv");
  if (!existsSync(path)) return { nasional: [], observedAt: null };
  const rows = parseCsv(readFileSync(path, "utf8"));
  let newest = "";
  for (const row of rows) {
    const tanggal = String(row.tanggal ?? "").slice(0, 10);
    const waktu = String(row.waktu ?? "").padStart(4, "0");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !/^\d{4}$/.test(waktu)) continue;
    const iso = `${tanggal}T${waktu.slice(0, 2)}:${waktu.slice(2, 4)}:00.000Z`;
    if (iso > newest) newest = iso;
  }
  return { nasional: agregasiHotspot(rows), observedAt: newest || null };
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function tulisCsv(baris) {
  const header = [
    "kode", "kab", "prov", "n_titik", "src", "skor", "lolos", "data_ok", "G_kering", "G_cuaca",
    "I1", "fwi_titik_maks", "ffmc78_hari", "dc_maks", "gwis_hari", "I2", "I3", "irbi_kelas", "I4",
    "hs_hari", "rI1", "rI2", "rI3", "rI4", "peringkat_semua", "peringkat_daftar", "satu_titik",
  ];
  const lines = baris.map((row) => header.map((key) => {
    const value = row[key];
    if (typeof value === "boolean") return value ? "True" : "False";
    if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(3);
    return csvCell(value ?? "");
  }).join(","));
  return `${header.join(",")}\n${lines.join("\n")}\n`;
}

function tulisManifest(recordCount, hash) {
  const path = resolve(root, "data/live/manifest.json");
  if (!existsSync(path)) return;
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const now = new Date().toISOString();
  manifest.datasets = manifest.datasets ?? {};
  manifest.datasets.prioritas_aplus = {
    id: "prioritas_aplus",
    nama: "Prioritas kesiapsiagaan 14 hari (FWI hanya 9 hari)",
    instansi: "Pemodelan pihak ketiga",
    source: "Metode A+",
    url: "https://github.com/pantau-bencana/karhutla-dashboard",
    license: "Open-Meteo CC BY 4.0, nonkomersial. GWIS © EU Copernicus. FIRMS NASA. IRBI 2025 BNPB.",
    mode: "snapshot",
    update_type: "Harian",
    access: "API",
    frequency: "Harian, sekitar 19.32 WIB",
    limitation: "Bukan prakiraan resmi BMKG/BNPB. FWI hanya 9 hari.",
    fungsi: "Daftar prioritas kesiapsiagaan dan blok hotspot nasional.",
    expected_max_age_hours: 36,
    fetched_at: now,
    observed_at: now,
    observed_label: "Metode A+, pemodelan pihak ketiga.",
    source_updated_at: now,
    record_count: recordCount,
    status: "ok",
    error: null,
    file: JSON_PATH,
    content_hash: hash,
    kept_previous: false,
  };
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function smokeRun() {
  const features = await queryProvinsi("Kalimantan Tengah");
  const feature = features.find((item) => item.attributes?.kdpkab === "62.03") ?? features[0];
  const box = bboxOf(feature?.geometry);
  const inside = box
    ? gridNodesInRing(box.minLon, box.minLat, box.maxLon, box.maxLat).filter((node) => arcGisContains(feature.geometry, node.bujur, node.lintang))
    : [];
  const titik = farthestPointSample(inside, TITIK_MAKS);
  if (!titik.length) throw new Error("Uji asap tidak menemukan titik grid.");
  const dates = await tanggalGwis(titik[0]);
  const html = await ambilTeks(gwisInfoUrl(titik[0].lintang, titik[0].bujur, dates[0] || jakartaToday()), { timeoutMs: 30000 });
  const gwis = parseGwisHtml(html);
  const url = new URL("https://ensemble-api.open-meteo.com/v1/ensemble");
  url.searchParams.set("latitude", String(titik[0].lintang));
  url.searchParams.set("longitude", String(titik[0].bujur));
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("models", "ecmwf_ifs025");
  url.searchParams.set("forecast_days", "14");
  url.searchParams.set("timezone", "Asia/Jakarta");
  const payload = JSON.parse(await ambilTeks(url, { timeoutMs: 60000 }));
  const members = Object.keys(payload.daily ?? {}).filter((key) => key.startsWith("precipitation_sum")).length;
  console.log(`Uji asap ${feature.attributes?.wadmkk}: titik grid ${titik.length}/${inside.length}, hari GWIS ${dates.length}, FWI ${gwis?.fwi}, anggota hujan ${members}.`);
  if (!gwis || members < 51) throw new Error("Uji asap tidak lengkap.");
}

function simpanCuplikanUsang(alasan) {
  const path = resolve(root, JSON_PATH);
  if (!existsSync(path)) return false;
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return false;
  }
  const saat = new Date().toISOString();
  const next = tandaiCuplikanUsang(snapshot, saat, alasan);
  if (!next) return false;
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
  const manifestPath = resolve(root, "data/live/manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const previous = manifest.datasets?.prioritas_aplus ?? {};
    manifest.datasets = manifest.datasets ?? {};
    manifest.datasets.prioritas_aplus = {
      ...previous,
      id: "prioritas_aplus",
      nama: previous.nama || "Prioritas kesiapsiagaan 14 hari (FWI hanya 9 hari)",
      file: JSON_PATH,
      status: "failed",
      error: next.stale_alasan,
      kept_previous: true,
      fetched_at: saat,
      observed_at: previous.observed_at || snapshot.generated_at || null,
      source_updated_at: previous.source_updated_at || snapshot.generated_at || null,
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  return true;
}

async function susunDanTulis() {
  const now = new Date().toISOString();
  const wilayah = await pilihTitik();
  if (wilayah.length < 15) throw new Error(`Titik kab/kota hanya ${wilayah.length}.`);
  const nTitik = wilayah.reduce((sum, item) => sum + item.titik.length, 0);
  console.log(`Kab/kota ${wilayah.length}, titik ${nTitik}.`);
  const dates = await tanggalGwis(wilayah[0].titik[0]);
  if (!dates.length) throw new Error("GWIS tidak mengembalikan hari prakiraan.");
  console.log(`Hari GWIS ${dates.join(", ")}`);
  const gwis = await ambilGwis(wilayah, dates);
  const ringkas = ringkasGwis(wilayah, gwis, dates);
  const peluang = await ambilEnsemble(wilayah);
  const irbi = readIrbi();
  const hotspot = bacaHotspot();
  const byHotspot = new Map(hotspot.nasional.map((row) => [row.kode, row]));
  const kab = ringkas.map((row) => {
    const hujan = peluang.get(row.kode) ?? [];
    const iklim = irbi.get(`${normalizePlaceName(row.prov)}|${normalizePlaceName(row.kab)}`);
    const panas = byHotspot.get(row.kode);
    return {
      ...row,
      I2: hujan.length ? p75(hujan) : null,
      ens_hari: hujan.length ? 14 : 0,
      I3: iklim?.I3 ?? null,
      irbi_kelas: iklim?.irbi_kelas ?? "",
      I4: panas ? panas.jumlah : hotspot.nasional.length ? 0 : null,
      hs_hari: panas ? panas.hari : hotspot.nasional.length ? 0 : null,
    };
  });
  const hasil = susunPrioritas({
    kab,
    nasional: hotspot.nasional,
    firmsObservedAt: hotspot.observedAt,
    ensembleFetchedAt: now,
    gwisFetchedAt: now,
    gwisHari: dates.length,
    gwisTanggal: dates,
  });
  hasil.generated_at = now;
  hasil.lisensi_open_meteo = "CC BY 4.0, nonkomersial. Wajib menyebut Open-Meteo.";
  hasil.catatan_satu_titik = CATATAN_SATU_TITIK;
  const csv = tulisCsv(hasil.baris);
  writeFileSync(resolve(root, CSV_PATH), csv);
  writeFileSync(resolve(root, JSON_PATH), `${JSON.stringify(hasil, null, 2)}\n`);
  tulisManifest(hasil.baris.length, createHash("sha256").update(csv).digest("hex"));
  console.log(`Prioritas tertulis. Lengkap ${hasil.kab_lengkap}, lolos ${hasil.lolos}, daftar ${hasil.daftar.length}, blok ${hasil.blok.length}.`);
}

async function main() {
  try {
    if (smoke) {
      await smokeRun();
      return;
    }
    await susunDanTulis();
  } catch (error) {
    const message = error?.message || String(error);
    console.error(message);
    if (simpanCuplikanUsang(message)) {
      console.error("Cuplikan sebelumnya dipertahankan dan ditandai usang.");
      return;
    }
    process.exitCode = 1;
  }
}

const executedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executedDirectly) main();
