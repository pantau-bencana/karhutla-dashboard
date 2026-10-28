import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { firmsAreaUrl, redactSecret } from "../src/lib/firms.js";
import { writeHotspotMap } from "./build-hotspot-map.mjs";
import { parseFirmsCoordinate } from "./indonesia-land.mjs";
import { BIG_EDITION_NOTE, BIG_SERVICE, BIG_SOURCE_LABEL, DESA_UNIDENTIFIED } from "../src/lib/bigWilayah.js";
import { muatTitikBatas } from "./titik-dalam-batas.mjs";
import { annotatePoints, rowsToHotspotCsv } from "./big-wilayah.mjs";
import { fetchGfwedKabupaten } from "./gfwed-kabupaten.mjs";
import { assignKabupaten, geomFromAlerts, loadCapAlerts, writeCapKabFiles } from "./cap-kab.mjs";
import { provinceCenters } from "../src/lib/geo.js";
import { REFRESH_CRON, REFRESH_CRON_CADANGAN, REFRESH_INTERVAL_HOURS, nextScheduledRun } from "../src/lib/schedule.js";
import { SMOKE_IMAGE_URL, SMOKE_URL, SOURCES } from "../src/lib/sourceCatalog.js";
import { ambilSiklon } from "./ambil-siklon.mjs";
import { gagalSiklonBerturut } from "../src/lib/siklonBmkg.js";
import { kodeWilayah } from "../src/lib/floodMatrix.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const liveDir = resolve(root, "data/live");
const manifestPath = resolve(liveDir, "manifest.json");
const nowIso = new Date().toISOString();
const firmsKey = String(process.env.FIRMS_MAP_KEY ?? "").trim();

function sha(text) {
  return createHash("sha256").update(text).digest("hex");
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvCell(row[header])).join(","));
  return `${lines.join("\n")}\n`;
}

async function getText(url, timeoutMs = 40000) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json,text/csv,text/plain,*/*", "User-Agent": "curl/8.5.0" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${text.slice(0, 140).replace(/\s+/g, " ")}`);
  }
  return { text, headers: response.headers };
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function previousEntry(manifest, id) {
  return manifest?.datasets?.[id] ?? null;
}

function baseEntry(source) {
  return {
    id: source.id,
    nama: source.nama,
    instansi: source.instansi,
    source: source.nama,
    url: source.officialUrl,
    license: source.license || "Lihat ketentuan pada tautan resmi.",
    mode: source.kind === "statis" ? "statis" : source.kind === "tautan" ? "tautan" : source.kind === "arsip" ? "arsip" : "snapshot",
    update_type: source.updateType || "",
    access: source.access,
    frequency: source.updateType || "—",
    limitation: source.limitation || "",
    fungsi: source.fungsi || "",
    expected_max_age_hours: source.expectedMaxAgeHours ?? null,
    schedule_interval_hours: REFRESH_INTERVAL_HOURS,
    fetched_at: null,
    observed_at: null,
    observed_label: "",
    source_updated_at: null,
    record_count: 0,
    status: "failed",
    error: null,
    file: null,
    content_hash: null,
    kept_previous: false,
  };
}

function keepPrevious(entry, previous, error) {
  if (previous?.file && previous.content_hash && existsSync(resolve(root, previous.file))) {
    return {
      ...previous,
      status: "failed",
      error: redactSecret(error, firmsKey),
      kept_previous: true,
      checked_at: nowIso,
    };
  }
  return {
    ...entry,
    status: "failed",
    error: redactSecret(error, firmsKey),
    file: null,
    kept_previous: false,
    record_count: 0,
  };
}

function writeIfChanged(relativePath, body, entry, previous) {
  const hash = sha(body);
  const full = resolve(root, relativePath);
  mkdirSync(dirname(full), { recursive: true });
  const rows = body.trim().split("\n").length - 1;
  if (previous?.content_hash === hash && existsSync(full)) {
    entry.file = relativePath;
    entry.content_hash = hash;
    entry.record_count = previous.record_count ?? rows;
    entry.fetched_at = previous.fetched_at || nowIso;
    entry.status = "ok";
    entry.error = null;
    entry.kept_previous = false;
    if (!entry.observed_at) entry.observed_at = previous.observed_at;
    if (!entry.observed_label) entry.observed_label = previous.observed_label;
    return false;
  }
  writeFileSync(full, body);
  entry.file = relativePath;
  entry.content_hash = hash;
  entry.record_count = Math.max(0, rows);
  entry.fetched_at = nowIso;
  entry.status = "ok";
  entry.error = null;
  entry.kept_previous = false;
  return true;
}

function lewatiBatas(deadlineAt, label) {
  if (deadlineAt && Date.now() > deadlineAt) {
    const error = new Error(`${label} melewati batas waktu.`);
    error.batasWaktu = true;
    throw error;
  }
}

async function jalankan(label, budgetMs, fn) {
  const started = Date.now();
  const deadlineAt = started + budgetMs;
  console.log(`sumber ${label}: mulai, batas ${Math.round(budgetMs / 1000)} detik`);
  try {
    const value = await fn(deadlineAt);
    console.log(`sumber ${label}: selesai ${Date.now() - started} ms`);
    return value;
  } catch (error) {
    console.log(`sumber ${label}: gagal ${Date.now() - started} ms — ${redactSecret(error?.message || String(error), firmsKey)}`);
    throw error;
  }
}

async function fetchOpenMeteoWeather(names) {
  const points = provinceCenters(names);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", points.map((point) => point.lat).join(","));
  url.searchParams.set("longitude", points.map((point) => point.lon).join(","));
  url.searchParams.set(
    "daily",
    "precipitation_sum,temperature_2m_max,relative_humidity_2m_mean,wind_speed_10m_max",
  );
  url.searchParams.set("timezone", "Asia/Jakarta");
  url.searchParams.set("past_days", "14");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("wind_speed_unit", "kmh");
  const { text } = await getText(url, 30000);
  const payload = JSON.parse(text);
  const blocks = Array.isArray(payload) ? payload : [payload];
  if (blocks.length !== points.length) throw new Error("Open-Meteo tidak mengembalikan satu blok per provinsi.");
  const rows = [];
  for (let index = 0; index < points.length; index += 1) {
    const daily = blocks[index].daily ?? {};
    const times = daily.time ?? [];
    let dry = 0;
    const built = times.map((time, dayIndex) => {
      const rain = Number(daily.precipitation_sum?.[dayIndex]);
      if (Number.isFinite(rain) && rain < 1) dry += 1;
      else dry = 0;
      return {
        tanggal: time,
        provinsi: points[index].name,
        curah_hujan_mm: Number.isFinite(rain) ? rain : "",
        suhu_c: daily.temperature_2m_max?.[dayIndex] ?? "",
        kelembapan_pct: daily.relative_humidity_2m_mean?.[dayIndex] ?? "",
        kec_angin_kmj: daily.wind_speed_10m_max?.[dayIndex] ?? "",
        hari_tanpa_hujan: dry,
      };
    });
    rows.push(...built);
  }
  const headers = ["tanggal", "provinsi", "curah_hujan_mm", "suhu_c", "kelembapan_pct", "kec_angin_kmj", "hari_tanpa_hujan"];
  const dates = rows.map((row) => row.tanggal).sort();
  return {
    body: toCsv(headers, rows),
    observedAt: dates.at(-1) ? `${dates.at(-1)}T16:59:00.000Z` : null,
    observedLabel: dates.length ? `Harian ${dates[0]}–${dates.at(-1)} (zona WIB), termasuk hari berjalan` : "",
    sourceUpdatedAt: dates.at(-1) ? `${dates.at(-1)}T16:59:00.000Z` : null,
  };
}

function jakartaToday(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

async function fetchOpenMeteoAir(names) {
  const points = provinceCenters(names);
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", points.map((point) => point.lat).join(","));
  url.searchParams.set("longitude", points.map((point) => point.lon).join(","));
  url.searchParams.set("hourly", "pm2_5,pm10");
  url.searchParams.set("timezone", "Asia/Jakarta");
  url.searchParams.set("past_days", "7");
  url.searchParams.set("forecast_days", "5");
  const { text } = await getText(url, 30000);
  const payload = JSON.parse(text);
  const blocks = Array.isArray(payload) ? payload : [payload];
  const rows = [];
  for (let index = 0; index < points.length; index += 1) {
    const hourly = blocks[index]?.hourly ?? {};
    const buckets = new Map();
    (hourly.time ?? []).forEach((time, hourIndex) => {
      const day = String(time).slice(0, 10);
      const current = buckets.get(day) ?? { pm25: [], pm10: [] };
      const pm25 = Number(hourly.pm2_5?.[hourIndex]);
      const pm10 = Number(hourly.pm10?.[hourIndex]);
      if (Number.isFinite(pm25)) current.pm25.push(pm25);
      if (Number.isFinite(pm10)) current.pm10.push(pm10);
      buckets.set(day, current);
    });
    for (const [tanggal, bucket] of buckets) {
      if (!bucket.pm25.length && !bucket.pm10.length) continue;
      const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
      rows.push({
        tanggal,
        provinsi: points[index].name,
        pm25_ugm3: bucket.pm25.length ? mean(bucket.pm25).toFixed(1) : "",
        pm10_ugm3: bucket.pm10.length ? mean(bucket.pm10).toFixed(1) : "",
        keterangan: "Konsentrasi model pada titik tengah provinsi. Bukan stasiun, bukan sel grid 0,4°, dan bukan ISPU.",
      });
    }
  }
  const headers = ["tanggal", "provinsi", "pm25_ugm3", "pm10_ugm3", "keterangan"];
  const dates = rows.map((row) => row.tanggal).sort();
  return {
    body: toCsv(headers, rows),
    observedAt: dates.at(-1) ? `${dates.at(-1)}T16:59:00.000Z` : null,
    observedLabel: dates.length ? `Rata-rata harian PM2.5 ${dates[0]}–${dates.at(-1)}. Hari ini dan sesudahnya prakiraan CAMS lewat Open-Meteo, bukan 14 hari.` : "",
    sourceUpdatedAt: dates.at(-1) ? `${dates.at(-1)}T16:59:00.000Z` : null,
  };
}

function inFrame(lat, lon) {
  return lat >= -11.5 && lat <= 6.5 && lon >= 94.4 && lon <= 141.6;
}

const TITIK_SUMBER =
  "Titik di dalam batas kabupaten/kota yang tersimpan. Bukan ibu kota, bukan centroid, dan bukan koordinat Satu Data BNPB.";
const TITIK_LISENSI =
  "Koordinat dihitung dari batas kabupaten/kota yang sudah tersimpan (layanan BIG). Bukan unduhan shapefile baru dan bukan ODC-BY BNPB.";

function fetchRepresentativePoints() {
  const { points: mentah, gagal } = muatTitikBatas();
  const points = mentah.filter((point) => inFrame(point.lintang, point.bujur));
  if (gagal.length || points.length !== 514) {
    throw new Error(`Titik dalam batas tidak lengkap: ${points.length} titik, gagal ${gagal.slice(0, 8).join(", ") || "—"}.`);
  }
  return {
    points,
    body: toCsv(["kode", "provinsi", "kabupaten", "lintang", "bujur", "sumber"], points),
    license: TITIK_LISENSI,
  };
}

async function fetchRain14(points) {
  const rows = [];
  let permintaan = 0;
  const mulai = Date.now();
  for (let start = 0; start < points.length; start += 25) {
    const chunk = points.slice(start, start + 25);
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", chunk.map((point) => point.lintang).join(","));
    url.searchParams.set("longitude", chunk.map((point) => point.bujur).join(","));
    url.searchParams.set("daily", "precipitation_sum,precipitation_probability_max,wind_speed_10m_max");
    url.searchParams.set("forecast_days", "14");
    url.searchParams.set("timezone", "Asia/Jakarta");
    url.searchParams.set("wind_speed_unit", "kmh");
    permintaan += 1;
    let text;
    try {
      text = (await getText(url, 30000)).text;
    } catch (error) {
      if (!String(error?.message || "").includes("HTTP 429")) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 15000));
      permintaan += 1;
      text = (await getText(url, 30000)).text;
    }
    const payload = JSON.parse(text);
    const blocks = Array.isArray(payload) ? payload : [payload];
    if (blocks.length !== chunk.length) throw new Error("Open-Meteo tidak mengembalikan satu blok per kabupaten.");
    blocks.forEach((block, index) => {
      const daily = block.daily ?? {};
      (daily.time ?? []).forEach((time, dayIndex) => {
        const rain = daily.precipitation_sum?.[dayIndex];
        const chance = daily.precipitation_probability_max?.[dayIndex];
        const wind = daily.wind_speed_10m_max?.[dayIndex];
        rows.push({
          tanggal: time,
          provinsi: chunk[index].provinsi,
          kabupaten: chunk[index].kabupaten,
          kode: chunk[index].kode,
          lintang: chunk[index].lintang,
          bujur: chunk[index].bujur,
          curah_hujan_mm: rain ?? "",
          peluang_hujan_maks: chance ?? "",
          angin_maks_kmj: wind ?? "",
        });
      });
    });
  }
  const dates = rows.map((row) => row.tanggal).filter(Boolean).sort();
  return {
    body: toCsv(
      ["tanggal", "provinsi", "kabupaten", "kode", "lintang", "bujur", "curah_hujan_mm", "peluang_hujan_maks", "angin_maks_kmj"],
      rows,
    ),
    observedAt: dates.at(-1) ? `${dates.at(-1)}T16:59:00.000Z` : null,
    observedLabel: dates.length ? `Prakiraan harian ${dates[0]}–${dates.at(-1)} (14 hari, zona Asia/Jakarta) pada titik di dalam batas kabupaten/kota` : "",
    sourceUpdatedAt: dates.at(-1) ? `${dates.at(-1)}T16:59:00.000Z` : null,
    statistik: { permintaan, detik: Math.round((Date.now() - mulai) / 100) / 10, kabupaten: points.length },
  };
}

function gwisInfoUrl(lat, lon, time) {
  const west = (lon - 0.02).toFixed(4);
  const south = (lat - 0.02).toFixed(4);
  const east = (lon + 0.02).toFixed(4);
  const north = (lat + 0.02).toFixed(4);
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetFeatureInfo",
    LAYERS: "ecmwf.query",
    QUERY_LAYERS: "ecmwf.query",
    STYLES: "",
    SRS: "EPSG:4326",
    BBOX: `${west},${south},${east},${north}`,
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
  const numOrEmpty = (label) => {
    const value = Number(map[label]);
    return Number.isFinite(value) ? value : "";
  };
  return {
    fwi,
    isi: numOrEmpty("Initial Spread Index (ISI)"),
    bui: numOrEmpty("Build Up Index (BUI)"),
    ffmc: numOrEmpty("Fine Fuel Moisture Code (FFMC)"),
    dmc: numOrEmpty("Duff Moisture Code (DMC)"),
    dc: numOrEmpty("Drought Code (DC)"),
  };
}

const FWI_CACHE_FILE = resolve(root, "data/live/fwi_gwis_cache.json");
const FWI_CACHE_MS = 18 * 60 * 60 * 1000;
const FWI_CONCURRENCY = 8;
// Isi dingin terukur: 4637 permintaan GWIS dalam 61,2 detik (4626 sel, 0 gagal)
// ditambah 21 permintaan Open-Meteo dalam 3,5 detik. Langkah kabupaten 65 detik,
// di bawah batas jalankan 10 menit. Angka ini cukup untuk menyegarkan seluruh
// sel basi pada satu jadwal; tidak perlu menaikkan batas waktu.
const FWI_MAKS_PERMINTAAN = 6000;

function bacaCacheFwi() {
  if (!existsSync(FWI_CACHE_FILE)) return {};
  try {
    const data = JSON.parse(readFileSync(FWI_CACHE_FILE, "utf8"));
    return data?.cells && typeof data.cells === "object" ? data.cells : {};
  } catch {
    return {};
  }
}

function tulisCacheFwi(cells) {
  mkdirSync(dirname(FWI_CACHE_FILE), { recursive: true });
  writeFileSync(FWI_CACHE_FILE, `${JSON.stringify({ updated_at: new Date().toISOString(), umur_jam: 18, cells })}\n`);
}

function kunciSelFwi(point, time) {
  return `${point.kode}|${time}|${Number(point.lintang).toFixed(3)}|${Number(point.bujur).toFixed(3)}`;
}

function selMasih(cell, now) {
  if (!cell || !Number.isFinite(Number(cell.fwi))) return false;
  const at = Date.parse(cell.at);
  return Number.isFinite(at) && now - at < FWI_CACHE_MS;
}

async function gwisAt(lat, lon, time) {
  const { text } = await getText(gwisInfoUrl(lat, lon, time), 30000);
  return parseGwisHtml(text);
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

async function fetchGwisFwi(points, deadlineAt = Infinity, { penuh = false } = {}) {
  const mulai = Date.now();
  const probe = points[0];
  const today = jakartaToday();
  const dates = [];
  let misses = 0;
  let permintaan = 0;
  for (let offset = 0; offset < 12; offset += 1) {
    lewatiBatas(deadlineAt, "fwi_gwis_pembanding");
    const time = addCalendarDays(today, offset);
    permintaan += 1;
    const value = await gwisAt(probe.lintang, probe.bujur, time);
    if (!value) {
      misses += 1;
      if (misses >= 2) break;
      continue;
    }
    misses = 0;
    dates.push(time);
  }
  if (!dates.length) throw new Error("GWIS tidak mengembalikan FWI pada titik uji.");
  const now = Date.now();
  const cells = bacaCacheFwi();
  const jobs = [];
  for (const point of points) {
    for (const time of dates) {
      const kunci = kunciSelFwi(point, time);
      const cell = cells[kunci];
      jobs.push({ point, time, kunci, cell, segar: selMasih(cell, now) });
    }
  }
  const perlu = jobs
    .filter((job) => !job.segar)
    .sort((a, b) => Date.parse(a.cell?.at || 0) - Date.parse(b.cell?.at || 0));
  const batasPermintaan = penuh ? perlu.length : Math.min(perlu.length, FWI_MAKS_PERMINTAAN);
  const antrian = perlu.slice(0, batasPermintaan);
  const ditunda = perlu.length - antrian.length;
  let failures = 0;
  await mapPool(antrian, FWI_CONCURRENCY, async (job) => {
    try {
      lewatiBatas(deadlineAt, "fwi_gwis_pembanding");
      permintaan += 1;
      const value = await gwisAt(job.point.lintang, job.point.bujur, job.time);
      if (!value) {
        failures += 1;
        return null;
      }
      cells[job.kunci] = {
        at: new Date().toISOString(),
        fwi: value.fwi,
        isi: value.isi,
        bui: value.bui,
        ffmc: value.ffmc,
        dmc: value.dmc,
        dc: value.dc,
      };
      return value;
    } catch {
      failures += 1;
      return null;
    }
  });
  tulisCacheFwi(cells);
  if (antrian.length && failures > antrian.length * 0.3) {
    throw new Error(`Sebagian besar permintaan GWIS gagal (${failures} dari ${antrian.length}). Cache yang berhasil tetap disimpan.`);
  }
  const rows = [];
  for (const job of jobs) {
    const cell = cells[job.kunci];
    if (!cell || !Number.isFinite(Number(cell.fwi))) continue;
    rows.push({
      tanggal: job.time,
      provinsi: job.point.provinsi,
      kabupaten: job.point.kabupaten,
      kode: job.point.kode,
      lintang: job.point.lintang,
      bujur: job.point.bujur,
      fwi: cell.fwi,
      isi: cell.isi,
      bui: cell.bui,
      ffmc: cell.ffmc,
      dmc: cell.dmc,
      dc: cell.dc,
    });
  }
  if (!rows.length) throw new Error("GWIS tidak menghasilkan baris FWI.");
  const statistik = {
    permintaan,
    dari_cache: jobs.filter((job) => job.segar).length,
    diambil: antrian.length - failures,
    gagal: failures,
    ditunda,
    sel: jobs.length,
    detik: Math.round((Date.now() - mulai) / 100) / 10,
    kabupaten: points.length,
    hari: dates.length,
  };
  console.log(`FWI GWIS: ${JSON.stringify(statistik)}`);
  return {
    body: toCsv(["tanggal", "provinsi", "kabupaten", "kode", "lintang", "bujur", "fwi", "isi", "bui", "ffmc", "dmc", "dc"], rows),
    observedAt: `${dates.at(-1)}T16:59:00.000Z`,
    observedLabel: `FWI ECMWF ${dates[0]}–${dates.at(-1)} (${dates.length} hari yang dikembalikan layanan) pada titik di dalam batas. Bukan 14 hari dan bukan FDRS BMKG.`,
    sourceUpdatedAt: `${dates.at(-1)}T16:59:00.000Z`,
    statistik,
  };
}

function comparisonEntry(item, id, comparesTo) {
  return {
    ...baseEntry({
      ...item,
      id,
      kind: "pembanding",
      officialUrl: item.officialUrl,
      access: "API",
      updateType: item.updateType,
      expectedMaxAgeHours: item.expectedMaxAgeHours,
      limitation: item.method,
    }),
    id,
    mode: "pembanding",
    provider: item.provider,
    method: item.method,
    license: item.license,
    compares_to: comparesTo,
    official_url: comparesTo === "fdrs" ? "https://spartan.bmkg.go.id/" : "https://www.bmkg.go.id/cuaca/prakiraan-cuaca",
  };
}

async function refreshKabupatenComparison(datasets, previous, deadlineAt = Infinity) {
  const rainSource = SOURCES.find((source) => source.id === "peluang_hujan").comparisons[0];
  const fwiSource = SOURCES.find((source) => source.id === "fdrs").comparisons.find((item) => item.id === "fwi_gwis_pembanding");
  const pointEntry = {
    ...baseEntry({
      id: "titik_wakil",
      nama: "Titik di dalam batas kabupaten/kota",
      instansi: "BIG",
      officialUrl: BIG_SERVICE,
      access: "Berkas tersimpan",
      kind: "statis",
      updateType: "Data statis",
      expectedMaxAgeHours: 24 * 30 * 18,
      limitation: TITIK_SUMBER,
      fungsi: "Titik sampel di dalam poligon untuk lapisan pembanding. Bukan batas administrasi dan bukan ibu kota.",
    }),
    mode: "statis",
    license: TITIK_LISENSI,
  };
  let points = [];
  try {
    const result = fetchRepresentativePoints();
    points = result.points;
    pointEntry.license = result.license;
    pointEntry.observed_at = new Date().toISOString();
    pointEntry.observed_label = `${points.length} titik di dalam batas kabupaten/kota. Bukan ibu kota dan bukan koordinat BNPB.`;
    pointEntry.source_updated_at = pointEntry.observed_at;
    writeIfChanged("data/live/titik_wakil.csv", result.body, pointEntry, previousEntry(previous, "titik_wakil"));
  } catch (error) {
    Object.assign(pointEntry, keepPrevious(pointEntry, previousEntry(previous, "titik_wakil"), error.message));
  }
  datasets.titik_wakil = pointEntry;

  const rainEntry = comparisonEntry(rainSource, "hujan_14_pembanding", "peluang_hujan");
  if (!points.length) {
    Object.assign(rainEntry, keepPrevious(rainEntry, previousEntry(previous, "hujan_14_pembanding"), "Titik wakil tidak tersedia."));
  } else {
    try {
      const result = await fetchRain14(points);
      rainEntry.observed_at = result.observedAt;
      rainEntry.observed_label = result.observedLabel;
      rainEntry.source_updated_at = result.sourceUpdatedAt;
      rainEntry.permintaan = result.statistik?.permintaan ?? null;
      rainEntry.detik = result.statistik?.detik ?? null;
      console.log(`Hujan Open-Meteo: ${JSON.stringify(result.statistik)}`);
      writeIfChanged("data/live/hujan_14_pembanding.csv", result.body, rainEntry, previousEntry(previous, "hujan_14_pembanding"));
    } catch (error) {
      Object.assign(rainEntry, keepPrevious(rainEntry, previousEntry(previous, "hujan_14_pembanding"), error.message));
    }
  }
  datasets.hujan_14_pembanding = rainEntry;

  const fwiEntry = comparisonEntry(fwiSource, "fwi_gwis_pembanding", "fdrs");
  fwiEntry.url = "https://maps.effis.emergency.copernicus.eu/gwis";
  if (!points.length) {
    Object.assign(fwiEntry, keepPrevious(fwiEntry, previousEntry(previous, "fwi_gwis_pembanding"), "Titik wakil tidak tersedia."));
  } else {
    try {
      lewatiBatas(deadlineAt, "fwi_gwis_pembanding");
      const result = await fetchGwisFwi(points, deadlineAt, { penuh: process.argv.includes("--isi-penuh") });
      fwiEntry.observed_at = result.observedAt;
      fwiEntry.observed_label = result.observedLabel;
      fwiEntry.source_updated_at = result.sourceUpdatedAt;
      fwiEntry.permintaan = result.statistik?.permintaan ?? null;
      fwiEntry.dari_cache = result.statistik?.dari_cache ?? null;
      fwiEntry.ditunda = result.statistik?.ditunda ?? null;
      fwiEntry.detik = result.statistik?.detik ?? null;
      writeIfChanged("data/live/fwi_gwis_pembanding.csv", result.body, fwiEntry, previousEntry(previous, "fwi_gwis_pembanding"));
    } catch (error) {
      Object.assign(fwiEntry, keepPrevious(fwiEntry, previousEntry(previous, "fwi_gwis_pembanding"), error.message));
    }
  }
  datasets.fwi_gwis_pembanding = fwiEntry;

  if (process.argv.includes("--isi-penuh")) return;

  const gfwedEntry = {
    ...baseEntry({
      id: "gfwed_kabupaten",
      nama: "FWI GFWED per kabupaten/kota",
      instansi: "NASA GFWED (GEOS-5)",
      officialUrl: "https://portal.nccs.nasa.gov/datashare/GlobalFWI/",
      access: "Berkas publik",
      kind: "pembanding",
      updateType: "Harian, tertunda",
      expectedMaxAgeHours: 24 * 6,
      limitation: "Pembanding model NASA GFWED (GEOS-5, analisis), bukan BMKG. Bukan kelas FDRS.",
      fungsi: "Rata-rata dan maksimum FWI sel yang pusatnya jatuh di dalam kabupaten/kota.",
    }),
    mode: "pembanding",
    provider: "NASA GFWED",
    license: "Berkas publik NASA NCCS Datashare, tanpa login. Kutipan Field et al. 2015, doi:10.5194/nhess-15-1407-2015.",
    compares_to: "fdrs",
    official_url: "https://portal.nccs.nasa.gov/datashare/GlobalFWI/",
  };
  try {
    lewatiBatas(deadlineAt, "gfwed_kabupaten");
    const result = await fetchGfwedKabupaten({ deadlineAt });
    gfwedEntry.observed_at = new Date().toISOString();
    gfwedEntry.observed_label = `Tanggal data ${result.tanggal}. ${result.rows.length} kabupaten/kota. Bukan kelas BMKG.`;
    gfwedEntry.source_updated_at = `${result.tanggal}T00:00:00.000Z`;
    gfwedEntry.url = result.url;
    gfwedEntry.method = "Rata-rata dan maksimum sel GEOS-5_FWI yang pusatnya jatuh di dalam kabupaten/kota. Geometri BIG tidak disimpan.";
    writeIfChanged("data/live/gfwed-kabupaten.csv", result.csv, gfwedEntry, previousEntry(previous, "gfwed_kabupaten"));
    writeFileSync(resolve(root, "data/live/gfwed-kabupaten.json"), result.json);
    console.log(`GFWED ${result.tanggal}: ${result.rows.length} kabupaten/kota, kueri BIG ${result.queries}, sel gagal ${result.failed}.`);
  } catch (error) {
    Object.assign(gfwedEntry, keepPrevious(gfwedEntry, previousEntry(previous, "gfwed_kabupaten"), error.message));
    console.log(`GFWED tidak tersedia: ${error.message}`);
  }
  datasets.gfwed_kabupaten = gfwedEntry;
}

async function fetchFirms(deadlineAt = Infinity) {
  const url = firmsAreaUrl(firmsKey, { days: 5 });
  let text;
  try {
    ({ text } = await getText(url, 60000));
  } catch (error) {
    throw new Error(redactSecret(error.message, firmsKey));
  }
  if (!text.includes("latitude") || text.trim().startsWith("<")) {
    throw new Error("Respons FIRMS bukan CSV.");
  }
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const index = Object.fromEntries(header.map((name, position) => [name.trim(), position]));
  const parsed = [];
  let newest = "";
  let before = 0;
  let invalid = 0;
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = line.split(",");
    before += 1;
    const lat = parseFirmsCoordinate(cells[index.latitude]);
    const lon = parseFirmsCoordinate(cells[index.longitude]);
    if (!lat || !lon || Math.abs(lat.value) > 90 || Math.abs(lon.value) > 180) {
      invalid += 1;
      continue;
    }
    const tanggal = cells[index.acq_date] || "";
    const waktu = cells[index.acq_time] || "";
    const iso = tanggal && waktu ? `${tanggal}T${String(waktu).padStart(4, "0").slice(0, 2)}:${String(waktu).padStart(4, "0").slice(2, 4)}:00.000Z` : "";
    if (iso > newest) newest = iso;
    parsed.push({
      tanggal,
      waktu,
      lat: lat.value,
      lon: lon.value,
      lintangTeks: lat.text,
      bujurTeks: lon.text,
      provinsi: "Belum terpetakan",
      kabupaten: "",
      satelit: cells[index.satellite] || "",
      kepercayaan: cells[index.confidence] || "",
      frp: cells[index.frp] || "",
      kecerahan: cells[index.bright_ti4] || "",
      keterangan: "NASA FIRMS VIIRS Suomi-NPP. Bukan kebakaran terkonfirmasi. Nama wilayah dari kueri BIG pada pembaruan ini bila layanan menjawab. Koordinat FIRMS tidak diubah.",
    });
  }
  lewatiBatas(deadlineAt, "hotspot");
  let annotated;
  try {
    annotated = await annotatePoints(parsed, { concurrency: 2, deadlineAt, log: true });
  } catch (error) {
    if (error?.batasWaktu) throw error;
    annotated = {
      rows: parsed.map((point) => ({ ...point, wilayahStatus: "gagal", desaTampilan: DESA_UNIDENTIFIED })),
      stats: { droppedOutside: 0, gagal: parsed.length, desa: 0, tanpaDesa: 0, queries: 0 },
    };
  }
  return {
    body: rowsToHotspotCsv(annotated.rows),
    observedAt: newest || null,
    observedLabel: newest ? `Lintasan terbaru ${newest} UTC. Wilayah dari kueri BIG, bukan berkas batas.` : "Tidak ada titik pada 5 hari terakhir",
    sourceUpdatedAt: newest || nowIso,
    url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
    recordsBeforeBoundary: before,
    recordsAfterBoundary: annotated.rows.length,
    droppedOutsideIndonesia: annotated.stats.droppedOutside,
    invalidCoordinates: invalid,
    wilayahGagal: annotated.stats.gagal,
    bigQueries: annotated.stats.queries,
    bigFilterIncomplete: annotated.stats.gagal > 0,
    wilayahDesa: annotated.stats.desa,
    wilayahTanpaDesa: annotated.stats.tanpaDesa,
  };
}

function staticIrbi(previous) {
  const relative = "data/static/irbi-2025-karhutla.csv";
  const full = resolve(root, relative);
  const body = readFileSync(full, "utf8");
  const entry = baseEntry(SOURCES.find((source) => source.id === "irbi"));
  entry.mode = "statis";
  entry.observed_at = "2025-12-31T17:00:00.000Z";
  entry.observed_label = "Tahun 2025, ancaman kebakaran hutan dan lahan, Buku IRBI halaman 294–307";
  entry.source_updated_at = "2025-12-31T17:00:00.000Z";
  entry.license = "Dikutip dari Buku IRBI 2025 yang diterbitkan BNPB. Skor tidak diubah.";
  writeIfChanged(relative, body, entry, previous);
  return entry;
}

function smokeDisabledEntry() {
  const relative = "data/live/asap-arsip.json";
  const full = resolve(root, relative);
  if (existsSync(full)) unlinkSync(full);
  const entry = baseEntry(SOURCES.find((source) => source.id === "asap"));
  entry.mode = "tautan";
  entry.status = "failed";
  entry.file = null;
  entry.record_count = 0;
  entry.error = "Arsip citra dimatikan. Menunggu izin tertulis BMKG. Citra tidak diunduh dan tidak dipotong.";
  return entry;
}

async function archiveSmoke(config, previousManifest) {
  if (config?.bmkg?.arsipCitra !== true) return smokeDisabledEntry();
  const relative = "data/live/asap-arsip.json";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  let bytes = null;
  let reason = "Berkas citra tidak tersimpan.";
  try {
    const response = await fetch(SMOKE_IMAGE_URL, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "curl/8.5.0" },
    });
    const type = response.headers.get("content-type") || "";
    if (!response.ok || !type.includes("image")) {
      reason = `Citra utuh tidak tersedia (HTTP ${response.status}, ${type || "tanpa tipe"}).`;
    } else {
      bytes = Buffer.from(await response.arrayBuffer());
      reason = "";
    }
  } catch (error) {
    reason = `Pengambilan citra gagal (${error.message}). Tidak ada gambar pengganti.`;
  }
  const entry = baseEntry(SOURCES.find((source) => source.id === "asap"));
  entry.mode = "arsip";
  if (!bytes) {
    const document = {
      sumber: SMOKE_URL,
      citra: SMOKE_IMAGE_URL,
      catatan: "Arsip hanya menyimpan citra utuh. Tanggal tanpa berkas tidak diisi gambar buatan.",
      entri: [{ tanggal: today, jam: "08:00", status: "belum ada", alasan: reason }],
    };
    writeIfChanged(relative, `${JSON.stringify(document, null, 2)}\n`, entry, previousEntry(previousManifest, "asap"));
    entry.record_count = 1;
    entry.observed_label = `Pemeriksaan ${today} pukul 08.00 WIB: belum ada berkas`;
    return entry;
  }
  const imagePath = `data/live/asap-${today}.png`;
  writeFileSync(resolve(root, imagePath), bytes);
  const document = {
    sumber: SMOKE_URL,
    citra: SMOKE_IMAGE_URL,
    catatan: "Citra disimpan utuh, tanpa dipotong. Sumber: BMKG.",
    entri: [{ tanggal: today, jam: "08:00", status: "tersimpan", berkas: imagePath }],
  };
  writeIfChanged(relative, `${JSON.stringify(document, null, 2)}\n`, entry, previousEntry(previousManifest, "asap"));
  entry.record_count = 1;
  entry.observed_at = `${today}T01:00:00.000Z`;
  entry.observed_label = `Citra utuh ${today} pukul 08.00 WIB`;
  entry.source_updated_at = `${today}T01:00:00.000Z`;
  return entry;
}

async function fetchCap() {
  const loaded = await loadCapAlerts();
  const rows = [];
  let newest = "";
  for (const alert of loaded.alerts) {
    if (alert.effective > newest) newest = alert.effective;
    rows.push({
      id: alert.id,
      judul: alert.headline,
      kejadian: alert.event,
      tingkat: alert.severity,
      mulai: alert.effective,
      berakhir: alert.expires,
      wilayah: alert.areaDesc || alert.deskripsi.slice(0, 240),
      url: alert.url,
    });
  }
  let kabupaten = { status: "gagal", rows: [], error: "Irisan kabupaten tidak dijalankan.", penempatan: "", bigError: null };
  let geom = [];
  try {
    const kabRows = await assignKabupaten(loaded.alerts);
    kabupaten = {
      status: "ok",
      rows: kabRows,
      error: null,
      penempatan: kabRows.penempatan || "kueri-big",
      bigError: kabRows.bigError || null,
    };
    geom = geomFromAlerts(loaded.alerts);
  } catch (error) {
    kabupaten = { status: "gagal", rows: [], error: error.message, penempatan: "", bigError: error.message };
  } finally {
    for (const alert of loaded.alerts) delete alert.rings;
  }
  const headers = ["id", "judul", "kejadian", "tingkat", "mulai", "berakhir", "wilayah", "url"];
  return {
    body: toCsv(headers, rows),
    observedAt: newest ? new Date(newest).toISOString() : nowIso,
    observedLabel: rows.length
      ? `${rows.length} peringatan pada RSS nowcast. Bukan peringatan karhutla.`
      : "RSS nowcast tidak memuat peringatan.",
    sourceUpdatedAt: newest ? new Date(newest).toISOString() : null,
    rssPublished: loaded.rssPublished,
    kabupaten,
    alerts: loaded.alerts,
    jumlahAlert: loaded.alerts.length,
    geom,
  };
}

async function fetchDibiBanjir2024() {
  const resource = "a4daec53-1119-43ef-b05e-00ec3a4c42a4";
  const searchUrl = `https://data.bnpb.go.id/api/3/action/datastore_search?resource_id=${resource}&limit=500`;
  const { text } = await getText(searchUrl, 30000);
  const payload = JSON.parse(text);
  if (!payload.success) throw new Error("CKAN menolak tabel kejadian kabupaten 2024.");
  const rows = [];
  for (const record of payload.result?.records ?? []) {
    const kode = kodeWilayah(record["Kode Wilayah Kabupaten / Kota"]);
    if (!kode.startsWith("11.") && !kode.startsWith("17.")) continue;
    if (record.BANJIR == null || record.BANJIR === "") continue;
    rows.push({
      kode_wilayah: kode,
      nama_dibi: record["Nama Kabupaten/Kota"] ?? "",
      banjir_2024: record.BANJIR,
    });
  }
  rows.sort((a, b) => a.kode_wilayah.localeCompare(b.kode_wilayah, "id"));
  if (rows.length < 20) throw new Error(`Tabel DIBI 2024 hanya mengembalikan ${rows.length} baris Aceh/Bengkulu.`);
  return {
    body: toCsv(["kode_wilayah", "nama_dibi", "banjir_2024"], rows),
    observedAt: "2024-12-31T17:00:00.000Z",
    observedLabel:
      "Jumlah kejadian BANJIR tahun 2024 untuk kabupaten/kota Aceh dan Bengkulu yang tercantum. ODC-BY, BNPB Satu Data. Baris yang tidak ada tidak diisi nol. Koordinat tidak disimpan.",
    sourceUpdatedAt: null,
    license: "ODC-BY. Cantumkan BNPB Satu Data.",
  };
}

async function fetchDibi() {
  const packageUrl = "https://data.bnpb.go.id/api/3/action/package_show?id=data-bencana-indonesia";
  const { text: packageText } = await getText(packageUrl, 30000);
  const pack = JSON.parse(packageText);
  if (!pack.success) throw new Error("CKAN menolak paket data-bencana-indonesia.");
  const jenis = (pack.result?.resources ?? []).find((resource) => /jenis bencana/i.test(resource.name || ""));
  if (!jenis?.id) throw new Error("Sumber jenis bencana tidak ada pada paket DIBI.");
  const searchUrl = `https://data.bnpb.go.id/api/3/action/datastore_search?resource_id=${encodeURIComponent(jenis.id)}&limit=30`;
  const { text } = await getText(searchUrl, 30000);
  const payload = JSON.parse(text);
  const records = payload.result?.records ?? [];
  const row = records.find((item) => String(item["JENIS BENCANA"] ?? "").toUpperCase() === "KEBAKARAN HUTAN DAN LAHAN");
  if (!row) throw new Error("Baris kebakaran hutan dan lahan tidak ada.");
  const years = Object.keys(row)
    .filter((key) => /^\d{4}/.test(key))
    .sort();
  const csvRows = years.map((year) => ({
    tahun: year.slice(0, 4),
    jenis: "Kebakaran hutan dan lahan",
    jumlah: row[year],
    cakupan: "Nasional",
    keterangan: "Satu Data BNPB. Bukan hitungan kabupaten atau provinsi.",
  }));
  const modified = pack.result?.metadata_modified || "";
  return {
    body: toCsv(["tahun", "jenis", "jumlah", "cakupan", "keterangan"], csvRows),
    observedAt: modified ? new Date(modified).toISOString() : "2024-12-31T17:00:00.000Z",
    observedLabel: years.length ? `Nasional ${years[0].slice(0, 4)}–${years.at(-1).slice(0, 4)}. Metadata paket ${modified || "tanpa cap"}.` : "Tidak ada tahun.",
    sourceUpdatedAt: modified ? new Date(modified).toISOString() : null,
    license: "ODC-BY. Cantumkan BNPB Satu Data.",
  };
}

function tautanEntry(source) {
  const entry = baseEntry(source);
  entry.status = "failed";
  entry.mode = "tautan";
  entry.error = "Tautan resmi. Data belum diintegrasikan.";
  entry.file = null;
  return entry;
}

let hotspotCountsLogged = false;

function countText(value) {
  return value == null || value === "" ? "tidak-ada" : String(value);
}

function logHotspotCounts(entry) {
  const line = `wilayah_gagal=${countText(entry?.wilayah_gagal)} big_queries=${countText(entry?.big_queries)}`;
  console.log(line);
  writeFileSync("/tmp/refresh-hotspot-counts.txt", `${line}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `wilayah_gagal=${countText(entry?.wilayah_gagal)}\nbig_queries=${countText(entry?.big_queries)}\n`);
  }
  hotspotCountsLogged = true;
}

function material(entry) {
  return JSON.stringify({
    status: entry?.status,
    content_hash: entry?.content_hash,
    record_count: entry?.record_count,
    error: entry?.error,
    observed_at: entry?.observed_at,
    file: entry?.file,
    kept_previous: entry?.kept_previous,
    mode: entry?.mode,
  });
}

async function catatRekap() {
  try {
    const { tulisRekapDariDisk } = await import("./tulis-rekap-harian.mjs");
    const hasil = tulisRekapDariDisk();
    console.log(hasil.ditulis ? "Rekap harian ditulis." : "Rekap harian tidak berubah.");
  } catch (error) {
    console.log(`Rekap harian tidak ditulis: ${error.message}`);
  }
}

async function main() {
  mkdirSync(liveDir, { recursive: true });
  const previous = readJson(manifestPath);
  const config = JSON.parse(readFileSync(resolve(root, "public/config.json"), "utf8"));
  const names = config.provinsiPrioritas ?? [];
  const datasets = {};

  const previousBmkg = previousEntry(previous, "bmkg_prakiraan");
  const previousAngin = previousEntry(previous, "angin");
  if (previousBmkg?.file && existsSync(resolve(root, previousBmkg.file))) {
    datasets.bmkg_prakiraan = { ...previousBmkg };
    datasets.angin = previousAngin?.file
      ? { ...previousAngin }
      : {
          ...previousBmkg,
          id: "angin",
          nama: "Arah dan kecepatan angin",
          source: "Arah dan kecepatan angin pada prakiraan cuaca BMKG",
          fungsi: SOURCES.find((source) => source.id === "angin").fungsi,
          limitation: SOURCES.find((source) => source.id === "angin").limitation,
        };
    console.log("sumber bmkg_prakiraan: cuplikan jadwal tetap, tidak diambil di pembaruan umum");
  } else {
    const bmkgEntry = baseEntry(SOURCES.find((source) => source.id === "bmkg_prakiraan"));
    bmkgEntry.status = "failed";
    bmkgEntry.error = "Cuplikan prakiraan mengikuti jadwal 07.00, 09.00, 19.00, dan 21.00 WIB.";
    bmkgEntry.record_count = 0;
    bmkgEntry.file = null;
    datasets.bmkg_prakiraan = bmkgEntry;
    datasets.angin = {
      ...bmkgEntry,
      id: "angin",
      nama: "Arah dan kecepatan angin",
      source: "Arah dan kecepatan angin pada prakiraan cuaca BMKG",
      fungsi: SOURCES.find((source) => source.id === "angin").fungsi,
      limitation: SOURCES.find((source) => source.id === "angin").limitation,
    };
  }

  const compareWeather = SOURCES.find((source) => source.id === "fdrs").comparisons[0];
  const weatherEntry = {
    ...baseEntry({ ...compareWeather, kind: "pembanding", officialUrl: compareWeather.officialUrl, access: "API", updateType: compareWeather.updateType, expectedMaxAgeHours: 36, limitation: compareWeather.method }),
    id: "fdrs_pembanding",
    mode: "pembanding",
    provider: compareWeather.provider,
    method: compareWeather.method,
    license: compareWeather.license,
    compares_to: "fdrs",
    official_url: "https://spartan.bmkg.go.id/",
  };
  try {
    const result = await jalankan("fdrs_pembanding", 2 * 60 * 1000, async (deadlineAt) => {
      lewatiBatas(deadlineAt, "fdrs_pembanding");
      return fetchOpenMeteoWeather(names);
    });
    weatherEntry.observed_at = result.observedAt;
    weatherEntry.observed_label = result.observedLabel;
    weatherEntry.source_updated_at = result.sourceUpdatedAt;
    writeIfChanged("data/live/fdrs_pembanding.csv", result.body, weatherEntry, previousEntry(previous, "fdrs_pembanding"));
  } catch (error) {
    Object.assign(weatherEntry, keepPrevious(weatherEntry, previousEntry(previous, "fdrs_pembanding"), error.message));
  }
  datasets.fdrs_pembanding = weatherEntry;

  const compareAir = SOURCES.find((source) => source.id === "ispu").comparisons[0];
  const airEntry = {
    ...baseEntry({ ...compareAir, kind: "pembanding", officialUrl: compareAir.officialUrl, access: "API", updateType: compareAir.updateType, expectedMaxAgeHours: 36, limitation: compareAir.method }),
    id: "ispu_pembanding",
    mode: "pembanding",
    provider: compareAir.provider,
    method: compareAir.method,
    license: compareAir.license,
    compares_to: "ispu",
    official_url: "https://ispu.kemenlh.go.id/app/#/",
    update_type: "Estimasi",
  };
  try {
    const result = await jalankan("ispu_pembanding", 2 * 60 * 1000, async (deadlineAt) => {
      lewatiBatas(deadlineAt, "ispu_pembanding");
      return fetchOpenMeteoAir(names);
    });
    airEntry.observed_at = result.observedAt;
    airEntry.observed_label = result.observedLabel;
    airEntry.source_updated_at = result.sourceUpdatedAt;
    writeIfChanged("data/live/ispu_pembanding.csv", result.body, airEntry, previousEntry(previous, "ispu_pembanding"));
  } catch (error) {
    Object.assign(airEntry, keepPrevious(airEntry, previousEntry(previous, "ispu_pembanding"), error.message));
  }
  datasets.ispu_pembanding = airEntry;
  try {
    await jalankan("kabupaten_pembanding", 10 * 60 * 1000, (deadlineAt) => refreshKabupatenComparison(datasets, previous, deadlineAt));
  } catch (error) {
    console.log(`sumber kabupaten_pembanding: berhenti. Cuplikan pembanding yang sudah ada tetap dipakai. ${redactSecret(error.message, firmsKey)}`);
  }

  const hotspotSource = SOURCES.find((source) => source.id === "hotspot");
  const hotspotEntry = baseEntry(hotspotSource);
  if (!firmsKey) {
    const previousHotspot = previousEntry(previous, "hotspot");
    if (previousHotspot?.content_hash && previousHotspot.file && existsSync(resolve(root, previousHotspot.file))) {
      datasets.hotspot = {
        ...previousHotspot,
        status: "failed",
        kept_previous: true,
        error: "FIRMS_MAP_KEY tidak ada pada proses ini. Snapshot terakhir dipertahankan dan tidak disebut tersambung.",
        checked_at: nowIso,
      };
    } else {
      hotspotEntry.error = "FIRMS_MAP_KEY belum dipasang. Cuplikan tidak ditulis. Dasbor tidak memakai data contoh.";
      hotspotEntry.status = "failed";
      datasets.hotspot = hotspotEntry;
    }
  } else {
    try {
      const result = await jalankan("hotspot", 40 * 60 * 1000, (deadlineAt) => fetchFirms(deadlineAt));
      hotspotEntry.url = result.url;
      hotspotEntry.license = "NASA FIRMS / LANCE. Kutip NASA FIRMS. Titik panas bukan kebakaran terkonfirmasi.";
      hotspotEntry.observed_at = result.observedAt;
      hotspotEntry.observed_label = result.observedLabel;
      hotspotEntry.source_updated_at = result.sourceUpdatedAt;
      writeIfChanged("data/live/hotspot.csv", result.body, hotspotEntry, previousEntry(previous, "hotspot"));
      hotspotEntry.records_before_boundary = result.recordsBeforeBoundary;
      hotspotEntry.records_after_boundary = result.recordsAfterBoundary;
      hotspotEntry.dropped_outside_indonesia = result.droppedOutsideIndonesia;
      hotspotEntry.invalid_coordinates = result.invalidCoordinates;
      hotspotEntry.wilayah_gagal = result.wilayahGagal;
      hotspotEntry.big_queries = result.bigQueries;
      hotspotEntry.big_filter_incomplete = result.bigFilterIncomplete;
      hotspotEntry.wilayah_desa = result.wilayahDesa;
      hotspotEntry.wilayah_tanpa_desa = result.wilayahTanpaDesa;
      hotspotEntry.boundary = BIG_SOURCE_LABEL;
      hotspotEntry.boundary_edition = "Mei 2021 untuk desa; layer kecamatan revisi 27 Desember 2022 menurut deskripsi layanan";
      hotspotEntry.boundary_note = BIG_EDITION_NOTE;
      hotspotEntry.crs = "EPSG:4326. Geometri batas tidak disimpan di repositori.";
      datasets.hotspot = hotspotEntry;
    } catch (error) {
      datasets.hotspot = keepPrevious(hotspotEntry, previousEntry(previous, "hotspot"), error.message);
    }
  }

  try {
    const mapMeta = writeHotspotMap();
    if (mapMeta) console.log(`Peta hotspot darat: ${mapMeta.di_darat} titik, 24 jam ${mapMeta.jam_24_jumlah}.`);
  } catch (error) {
    console.log(`Peta hotspot darat tidak diperbarui: ${redactSecret(error.message, firmsKey)}`);
  }

  datasets.irbi = staticIrbi(previousEntry(previous, "irbi"));
  datasets.asap = await archiveSmoke(config, previous);

  const capSource = SOURCES.find((source) => source.id === "bmkg_cap");
  const capEntry = baseEntry(capSource);
  capEntry.license = "Sumber: BMKG. RSS dan CAP nowcast.";
  try {
    const result = await jalankan("bmkg_cap", 4 * 60 * 1000, async (deadlineAt) => {
      lewatiBatas(deadlineAt, "bmkg_cap");
      return fetchCap();
    });
    capEntry.observed_at = result.observedAt;
    capEntry.observed_label = result.observedLabel;
    capEntry.source_updated_at = result.sourceUpdatedAt;
    if ((result.jumlahAlert ?? 0) > 0) {
      writeIfChanged("data/live/bmkg-cap.csv", result.body, capEntry, previousEntry(previous, "bmkg_cap"));
    } else {
      Object.assign(
        capEntry,
        keepPrevious(capEntry, previousEntry(previous, "bmkg_cap"), "RSS nowcast tidak memuat peringatan baru."),
      );
    }
    const kabTulis = writeCapKabFiles(liveDir, {
      status: result.kabupaten.rows.length ? result.kabupaten.status : "gagal",
      rows: result.kabupaten.rows,
      alerts: result.alerts,
      geom: result.geom,
      jumlahAlert: result.jumlahAlert,
      rssPublished: result.rssPublished,
      fetchedAt: nowIso,
      penempatan: result.kabupaten.penempatan,
      error: result.kabupaten.rows.length ? null : result.kabupaten.bigError || result.kabupaten.error,
    });
    const bigNote = result.kabupaten.bigError ? ` ${result.kabupaten.bigError}` : "";
    const via = result.kabupaten.penempatan === "batas-tersimpan" ? " Penempatan: batas tersimpan." : "";
    console.log(
      kabTulis.kept_previous
        ? `CAP kabupaten: cuplikan sebelumnya dipertahankan.${bigNote}`
        : `CAP kabupaten: ${result.kabupaten.status}, ${result.kabupaten.rows.length} baris.${via}${bigNote}`,
    );
  } catch (error) {
    Object.assign(capEntry, keepPrevious(capEntry, previousEntry(previous, "bmkg_cap"), error.message));
    const kabTulis = writeCapKabFiles(liveDir, {
      status: "gagal",
      rows: [],
      alerts: [],
      jumlahAlert: null,
      rssPublished: "",
      fetchedAt: nowIso,
      error: error.message,
    });
    if (kabTulis.kept_previous) console.log("CAP kabupaten gagal. Cuplikan sebelumnya dipertahankan.");
  }
  datasets.bmkg_cap = capEntry;

  const dibiSource = SOURCES.find((source) => source.id === "dibi_karhutla");
  const dibiEntry = baseEntry(dibiSource);
  dibiEntry.mode = "statis";
  try {
    const result = await jalankan("dibi_karhutla", 3 * 60 * 1000, async (deadlineAt) => {
      lewatiBatas(deadlineAt, "dibi_karhutla");
      return fetchDibi();
    });
    dibiEntry.license = result.license;
    dibiEntry.observed_at = result.observedAt;
    dibiEntry.observed_label = result.observedLabel;
    dibiEntry.source_updated_at = result.sourceUpdatedAt;
    writeIfChanged("data/live/dibi-karhutla.csv", result.body, dibiEntry, previousEntry(previous, "dibi_karhutla"));
  } catch (error) {
    Object.assign(dibiEntry, keepPrevious(dibiEntry, previousEntry(previous, "dibi_karhutla"), error.message));
  }
  datasets.dibi_karhutla = dibiEntry;

  const dibiBanjirSource = SOURCES.find((source) => source.id === "dibi_banjir_2024");
  const dibiBanjirEntry = baseEntry(dibiBanjirSource);
  dibiBanjirEntry.mode = "statis";
  try {
    const result = await jalankan("dibi_banjir_2024", 3 * 60 * 1000, async (deadlineAt) => {
      lewatiBatas(deadlineAt, "dibi_banjir_2024");
      return fetchDibiBanjir2024();
    });
    dibiBanjirEntry.license = result.license;
    dibiBanjirEntry.observed_at = result.observedAt;
    dibiBanjirEntry.observed_label = result.observedLabel;
    dibiBanjirEntry.source_updated_at = result.sourceUpdatedAt;
    writeIfChanged("data/live/dibi-banjir-2024.csv", result.body, dibiBanjirEntry, previousEntry(previous, "dibi_banjir_2024"));
  } catch (error) {
    Object.assign(dibiBanjirEntry, keepPrevious(dibiBanjirEntry, previousEntry(previous, "dibi_banjir_2024"), error.message));
  }
  datasets.dibi_banjir_2024 = dibiBanjirEntry;

  if (previous.datasets?.prioritas_aplus) {
    datasets.prioritas_aplus = previous.datasets.prioritas_aplus;
  }

  const sumberSipongi = SOURCES.find((source) => source.id === "sipongi");
  const entriSipongi = baseEntry(sumberSipongi);
  entriSipongi.mode = "tautan";
  entriSipongi.status = "failed";
  entriSipongi.file = null;
  entriSipongi.record_count = 0;
  entriSipongi.kept_previous = false;
  entriSipongi.content_hash = null;
  entriSipongi.error = "Tautan saja. Portal resmi tidak diambil sebagai angka hotspot.";
  for (const rel of ["data/live/sipongi-hotspot.csv", "data/live/sipongi-hotspot-meta.json"]) {
    const penuh = resolve(root, rel);
    if (existsSync(penuh)) unlinkSync(penuh);
  }
  datasets.sipongi = entriSipongi;

  const siklonSource = SOURCES.find((source) => source.id === "bmkg_siklon");
  const siklonEntry = baseEntry(siklonSource);
  siklonEntry.license = "Sumber: BMKG.";
  try {
    const hasil = await jalankan("bmkg_siklon", 2 * 60 * 1000, async (deadlineAt) => {
      lewatiBatas(deadlineAt, "bmkg_siklon");
      return ambilSiklon();
    });
    const hash = sha(hasil.badan);
    const sebelumnya = previousEntry(previous, "bmkg_siklon");
    siklonEntry.observed_at = hasil.observedAt;
    siklonEntry.observed_label = hasil.observedLabel;
    siklonEntry.source_updated_at = hasil.sourceUpdatedAt;
    siklonEntry.file = "data/live/siklon-bmkg.json";
    siklonEntry.content_hash = hash;
    siklonEntry.record_count = hasil.recordCount;
    siklonEntry.status = "ok";
    siklonEntry.error = null;
    siklonEntry.kept_previous = false;
    siklonEntry.gagal_berturut = 0;
    if (sebelumnya?.content_hash === hash && existsSync(resolve(root, siklonEntry.file))) {
      siklonEntry.fetched_at = sebelumnya.fetched_at || nowIso;
      if (!siklonEntry.observed_at) siklonEntry.observed_at = sebelumnya.observed_at;
    } else {
      writeFileSync(resolve(root, siklonEntry.file), hasil.badan);
      siklonEntry.fetched_at = nowIso;
    }
  } catch (error) {
    const sebelumnya = previousEntry(previous, "bmkg_siklon");
    Object.assign(siklonEntry, keepPrevious(siklonEntry, sebelumnya, error.message));
    siklonEntry.gagal_berturut = gagalSiklonBerturut(sebelumnya);
    if (siklonEntry.gagal_berturut > 1) {
      console.log(`siklon: gagal ${siklonEntry.gagal_berturut} siklus berturut-turut. Cuplikan sebelumnya tetap dipakai.`);
    }
  }
  datasets.bmkg_siklon = siklonEntry;

  for (const source of SOURCES) {
    if (source.id === "prioritas_aplus") continue;
    if (datasets[source.id]) continue;
    datasets[source.id] = tautanEntry(source);
  }

  const next = {
    generated_at: nowIso,
    schedule: {
      cron: REFRESH_CRON,
      cron_cadangan: REFRESH_CRON_CADANGAN,
      interval_hours: REFRESH_INTERVAL_HOURS,
      timezone: "UTC",
      display_timezone: "Asia/Jakarta",
    },
    next_run: nextScheduledRun(new Date()),
    firms_key: firmsKey ? "used" : "absent",
    datasets,
  };

  logHotspotCounts(datasets.hotspot);
  const changed = !previous || Object.keys(next.datasets).some((id) => material(next.datasets[id]) !== material(previous.datasets?.[id]));
  if (!changed) {
    console.log("Data tidak berubah. Manifes tidak ditulis ulang.");
  } else {
    writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`Manifes ditulis. Kunci FIRMS: ${firmsKey ? "dipakai" : "tidak ada"}.`);
  }
  await catatRekap();
}

async function comparisonOnly() {
  const previous = readJson(manifestPath) ?? { datasets: {} };
  const config = JSON.parse(readFileSync(resolve(root, "public/config.json"), "utf8"));
  const names = config.provinsiPrioritas ?? [];
  const datasets = { ...(previous.datasets ?? {}) };
  const compareAir = SOURCES.find((source) => source.id === "ispu").comparisons[0];
  const airEntry = {
    ...baseEntry({ ...compareAir, kind: "pembanding", officialUrl: compareAir.officialUrl, access: "API", updateType: compareAir.updateType, expectedMaxAgeHours: 36, limitation: compareAir.method }),
    id: "ispu_pembanding",
    mode: "pembanding",
    provider: compareAir.provider,
    method: compareAir.method,
    license: compareAir.license,
    compares_to: "ispu",
    official_url: "https://ispu.kemenlh.go.id/app/#/",
    update_type: "Estimasi",
  };
  try {
    const result = await jalankan("ispu_pembanding", 2 * 60 * 1000, async (deadlineAt) => {
      lewatiBatas(deadlineAt, "ispu_pembanding");
      return fetchOpenMeteoAir(names);
    });
    airEntry.observed_at = result.observedAt;
    airEntry.observed_label = result.observedLabel;
    airEntry.source_updated_at = result.sourceUpdatedAt;
    writeIfChanged("data/live/ispu_pembanding.csv", result.body, airEntry, previousEntry(previous, "ispu_pembanding"));
  } catch (error) {
    Object.assign(airEntry, keepPrevious(airEntry, previousEntry(previous, "ispu_pembanding"), error.message));
  }
  datasets.ispu_pembanding = airEntry;
  try {
    await jalankan("kabupaten_pembanding", 10 * 60 * 1000, (deadlineAt) => refreshKabupatenComparison(datasets, previous, deadlineAt));
  } catch (error) {
    console.log(`sumber kabupaten_pembanding: berhenti. Cuplikan pembanding yang sudah ada tetap dipakai. ${redactSecret(error.message, firmsKey)}`);
  }
  const next = {
    generated_at: nowIso,
    schedule: previous.schedule ?? {
      cron: REFRESH_CRON,
      cron_cadangan: REFRESH_CRON_CADANGAN,
      interval_hours: REFRESH_INTERVAL_HOURS,
      timezone: "UTC",
      display_timezone: "Asia/Jakarta",
    },
    next_run: nextScheduledRun(new Date()),
    firms_key: previous.firms_key === "used" ? "used" : "absent",
    datasets,
  };
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log("Cuplikan pembanding ditulis. Status kunci FIRMS tidak diubah.");
  await catatRekap();
}

async function kabupatenOnly() {
  const previous = readJson(manifestPath) ?? { datasets: {} };
  const datasets = { ...(previous.datasets ?? {}) };
  const budgetMs = process.argv.includes("--isi-penuh") ? 25 * 60 * 1000 : 10 * 60 * 1000;
  await jalankan("kabupaten_pembanding", budgetMs, (deadlineAt) => refreshKabupatenComparison(datasets, previous, deadlineAt));
  const next = {
    generated_at: nowIso,
    schedule: previous.schedule ?? {
      cron: REFRESH_CRON,
      cron_cadangan: REFRESH_CRON_CADANGAN,
      interval_hours: REFRESH_INTERVAL_HOURS,
      timezone: "UTC",
      display_timezone: "Asia/Jakarta",
    },
    next_run: nextScheduledRun(new Date()),
    firms_key: previous.firms_key === "used" ? "used" : "absent",
    datasets,
  };
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log("Cuplikan kabupaten pembanding ditulis. Status kunci FIRMS tidak diubah.");
  await catatRekap();
}

const comparisonOnlyRun = process.argv.includes("--comparison-only");
const kabupatenOnlyRun = process.argv.includes("--kabupaten-only");
const run = kabupatenOnlyRun ? kabupatenOnly : comparisonOnlyRun ? comparisonOnly : main;
run().catch((error) => {
  console.error(redactSecret(error?.stack || error?.message || error, firmsKey));
  if (!comparisonOnlyRun && !hotspotCountsLogged) logHotspotCounts(null);
  process.exitCode = 1;
});
