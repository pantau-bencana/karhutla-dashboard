import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { flattenBmkgForecast, bmkgForecastUrl, BMKG_LOCATIONS, BMKG_DOCS_URL } from "../src/lib/bmkgForecast.js";
import { firmsAreaUrl, redactSecret } from "../src/lib/firms.js";
import { writeHotspotMap } from "./build-hotspot-map.mjs";
import { parseFirmsCoordinate } from "./indonesia-land.mjs";
import { BIG_EDITION_NOTE, BIG_SOURCE_LABEL, DESA_UNIDENTIFIED } from "../src/lib/bigWilayah.js";
import { annotatePoints, rowsToHotspotCsv } from "./big-wilayah.mjs";
import { provinceCenters } from "../src/lib/geo.js";
import { REFRESH_CRON, REFRESH_CRON_CADANGAN, REFRESH_INTERVAL_HOURS, nextScheduledRun } from "../src/lib/schedule.js";
import { SMOKE_IMAGE_URL, SMOKE_URL, SOURCES } from "../src/lib/sourceCatalog.js";

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

async function fetchBmkg() {
  const slots = [];
  let analysis = "";
  for (const location of BMKG_LOCATIONS) {
    const { text } = await getText(bmkgForecastUrl(location.adm4), 25000);
    const payload = JSON.parse(text);
    const flat = flattenBmkgForecast(payload);
    if (!flat.length) throw new Error(`BMKG tidak mengembalikan slot untuk ${location.adm4}`);
    slots.push(...flat);
    analysis = flat.find((slot) => slot.analysisUtc)?.analysisUtc || analysis;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  const headers = [
    "tanggal",
    "waktu_lokal",
    "provinsi",
    "kotkab",
    "kecamatan",
    "desa",
    "adm4",
    "suhu_c",
    "kelembapan_pct",
    "curah_hujan_tp",
    "kec_angin_kmj",
    "arah_angin",
    "cuaca",
    "analysis_utc",
  ];
  const body = toCsv(
    headers,
    slots.map((slot) => ({
      tanggal: slot.tanggal,
      waktu_lokal: slot.waktuLokal,
      provinsi: slot.provinsi,
      kotkab: slot.kotkab,
      kecamatan: slot.kecamatan,
      desa: slot.desa,
      adm4: slot.adm4,
      suhu_c: slot.suhu,
      kelembapan_pct: slot.kelembapan,
      curah_hujan_tp: slot.hujan,
      kec_angin_kmj: slot.anginKmj,
      arah_angin: slot.arahAngin,
      cuaca: slot.cuaca,
      analysis_utc: slot.analysisUtc,
    })),
  );
  const dates = [...new Set(slots.map((slot) => slot.tanggal).filter(Boolean))].sort();
  return {
    body,
    observedAt: analysis || null,
    observedLabel: analysis
      ? `Dikeluarkan ${analysis}. Berlaku ${dates[0]}–${dates.at(-1)} (3 hari, per 3 jam).`
      : `Berlaku ${dates[0] ?? "—"}–${dates.at(-1) ?? "—"}`,
    sourceUpdatedAt: analysis || null,
  };
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
        keterangan: "Konsentrasi model pada titik tengah provinsi. Bukan ISPU dan tidak ditampilkan pada lapisan Kualitas Udara (ISPU).",
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

const PRIORITY_PREFIX = {
  14: "Riau",
  15: "Jambi",
  16: "Sumatera Selatan",
  61: "Kalimantan Barat",
  62: "Kalimantan Tengah",
  63: "Kalimantan Selatan",
};

function inFrame(lat, lon) {
  return lat >= -11.5 && lat <= 6.5 && lon >= 94.4 && lon <= 141.6;
}

async function fetchRepresentativePoints() {
  const resource = "21044ffd-c397-4b3c-acbd-5adaa03d79e3";
  const url = `https://data.bnpb.go.id/api/3/action/datastore_search?resource_id=${resource}&limit=600`;
  const { text } = await getText(url, 30000);
  const payload = JSON.parse(text);
  if (!payload.success) throw new Error("CKAN menolak tabel kabupaten.");
  const points = [];
  for (const record of payload.result?.records ?? []) {
    const rawCode = Number(record["Kode Wilayah Kabupaten / Kota"]);
    if (!Number.isFinite(rawCode)) continue;
    const kode = String(Math.trunc(rawCode)).padStart(4, "0");
    const provinsi = PRIORITY_PREFIX[kode.slice(0, 2)];
    if (!provinsi) continue;
    const lintang = Number(record.Latitude);
    const bujur = Number(record.Longitude);
    const kabupaten = String(record["Nama Kabupaten/Kota"] ?? "").trim();
    if (!kabupaten || !inFrame(lintang, bujur)) continue;
    points.push({
      kode,
      provinsi,
      kabupaten,
      lintang,
      bujur,
      sumber: "Titik wakil pada baris kabupaten Satu Data BNPB. Bukan batas administrasi. Jumlah kejadian tidak dipakai.",
    });
  }
  points.sort((a, b) => a.provinsi.localeCompare(b.provinsi, "id") || a.kabupaten.localeCompare(b.kabupaten, "id"));
  if (points.length < 15) throw new Error("Titik wakil kabupaten prioritas kurang dari 15.");
  return {
    points,
    body: toCsv(["kode", "provinsi", "kabupaten", "lintang", "bujur", "sumber"], points),
    license: "ODC-BY. Cantumkan BNPB Satu Data. Hanya koordinat, bukan jumlah bencana.",
  };
}

async function fetchRain14(points) {
  const rows = [];
  for (let start = 0; start < points.length; start += 25) {
    const chunk = points.slice(start, start + 25);
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", chunk.map((point) => point.lintang).join(","));
    url.searchParams.set("longitude", chunk.map((point) => point.bujur).join(","));
    url.searchParams.set("daily", "precipitation_sum,precipitation_probability_max,wind_speed_10m_max");
    url.searchParams.set("forecast_days", "14");
    url.searchParams.set("timezone", "Asia/Jakarta");
    url.searchParams.set("wind_speed_unit", "kmh");
    const { text } = await getText(url, 30000);
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
    observedLabel: dates.length ? `Prakiraan harian ${dates[0]}–${dates.at(-1)} (14 hari, zona Asia/Jakarta) pada titik wakil kabupaten` : "",
    sourceUpdatedAt: dates.at(-1) ? `${dates.at(-1)}T16:59:00.000Z` : null,
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

async function fetchGwisFwi(points) {
  const probe = points[0];
  const today = jakartaToday();
  const dates = [];
  let misses = 0;
  for (let offset = 0; offset < 12; offset += 1) {
    const time = addCalendarDays(today, offset);
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
  const jobs = [];
  for (const point of points) {
    for (const time of dates) jobs.push({ point, time });
  }
  let failures = 0;
  const found = await mapPool(jobs, 4, async (job) => {
    try {
      const value = await gwisAt(job.point.lintang, job.point.bujur, job.time);
      return { ...job, value };
    } catch {
      failures += 1;
      return { ...job, value: null };
    }
  });
  if (failures > jobs.length * 0.3) throw new Error("Sebagian besar permintaan GWIS gagal.");
  const rows = found
    .filter((item) => item.value)
    .map((item) => ({
      tanggal: item.time,
      provinsi: item.point.provinsi,
      kabupaten: item.point.kabupaten,
      kode: item.point.kode,
      lintang: item.point.lintang,
      bujur: item.point.bujur,
      fwi: item.value.fwi,
      isi: item.value.isi,
      bui: item.value.bui,
      ffmc: item.value.ffmc,
      dmc: item.value.dmc,
      dc: item.value.dc,
    }));
  if (!rows.length) throw new Error("GWIS tidak menghasilkan baris FWI.");
  return {
    body: toCsv(["tanggal", "provinsi", "kabupaten", "kode", "lintang", "bujur", "fwi", "isi", "bui", "ffmc", "dmc", "dc"], rows),
    observedAt: `${dates.at(-1)}T16:59:00.000Z`,
    observedLabel: `FWI ECMWF ${dates[0]}–${dates.at(-1)} (${dates.length} hari yang dikembalikan layanan). Bukan 14 hari dan bukan FDRS BMKG.`,
    sourceUpdatedAt: `${dates.at(-1)}T16:59:00.000Z`,
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

async function refreshKabupatenComparison(datasets, previous) {
  const rainSource = SOURCES.find((source) => source.id === "peluang_hujan").comparisons[0];
  const fwiSource = SOURCES.find((source) => source.id === "fdrs").comparisons.find((item) => item.id === "fwi_gwis_pembanding");
  const pointEntry = {
    ...baseEntry({
      id: "titik_wakil",
      nama: "Titik wakil kabupaten",
      instansi: "BNPB Satu Data",
      officialUrl: "https://data.bnpb.go.id/api/3/action/package_show?id=data-bencana-indonesia",
      access: "API",
      kind: "statis",
      updateType: "Tahunan / statis",
      expectedMaxAgeHours: 24 * 30 * 18,
      limitation: "Hanya koordinat kabupaten pada enam provinsi prioritas. Jumlah kejadian semua jenis bencana tidak disimpan.",
      fungsi: "Titik wakil untuk lapisan pembanding. Bukan batas administrasi.",
    }),
    mode: "statis",
    license: "ODC-BY. Cantumkan BNPB Satu Data.",
  };
  let points = [];
  try {
    const result = await fetchRepresentativePoints();
    points = result.points;
    pointEntry.license = result.license;
    pointEntry.observed_at = new Date().toISOString();
    pointEntry.observed_label = `${points.length} titik wakil kabupaten pada enam provinsi prioritas. Bukan batas administrasi.`;
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
      const result = await fetchGwisFwi(points);
      fwiEntry.observed_at = result.observedAt;
      fwiEntry.observed_label = result.observedLabel;
      fwiEntry.source_updated_at = result.sourceUpdatedAt;
      writeIfChanged("data/live/fwi_gwis_pembanding.csv", result.body, fwiEntry, previousEntry(previous, "fwi_gwis_pembanding"));
    } catch (error) {
      Object.assign(fwiEntry, keepPrevious(fwiEntry, previousEntry(previous, "fwi_gwis_pembanding"), error.message));
    }
  }
  datasets.fwi_gwis_pembanding = fwiEntry;
}

async function fetchFirms() {
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
  let annotated;
  try {
    annotated = await annotatePoints(parsed, { concurrency: 2 });
  } catch {
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

function tagText(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
  const indexUrl = "https://www.bmkg.go.id/alerts/nowcast/id";
  const { text } = await getText(indexUrl, 25000);
  const links = [
    ...new Set(
      [...text.matchAll(/<link>(https:\/\/www\.bmkg\.go\.id\/alerts\/nowcast\/id\/[^<\s]+_alert\.xml)<\/link>/g)].map(
        (match) => match[1],
      ),
    ),
  ];
  const rows = [];
  let newest = "";
  for (const link of links) {
    const { text: xml } = await getText(link, 20000);
    const mulai = tagText(xml, "effective");
    if (mulai > newest) newest = mulai;
    const deskripsi = tagText(xml, "description");
    rows.push({
      id: tagText(xml, "identifier"),
      judul: tagText(xml, "headline"),
      kejadian: tagText(xml, "event"),
      tingkat: tagText(xml, "severity"),
      mulai,
      berakhir: tagText(xml, "expires"),
      wilayah: tagText(xml, "areaDesc") || deskripsi.slice(0, 240),
      url: link,
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  const headers = ["id", "judul", "kejadian", "tingkat", "mulai", "berakhir", "wilayah", "url"];
  return {
    body: toCsv(headers, rows),
    observedAt: newest ? new Date(newest).toISOString() : nowIso,
    observedLabel: rows.length
      ? `${rows.length} peringatan pada RSS nowcast. Bukan peringatan karhutla.`
      : "RSS nowcast tidak memuat peringatan.",
    sourceUpdatedAt: newest ? new Date(newest).toISOString() : null,
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

async function main() {
  mkdirSync(liveDir, { recursive: true });
  const previous = readJson(manifestPath);
  const config = JSON.parse(readFileSync(resolve(root, "public/config.json"), "utf8"));
  const names = config.provinsiPrioritas ?? [];
  const datasets = {};

  const bmkgSource = SOURCES.find((source) => source.id === "bmkg_prakiraan");
  const bmkgEntry = baseEntry(bmkgSource);
  bmkgEntry.url = BMKG_DOCS_URL;
  bmkgEntry.license = "Wajib mencantumkan BMKG sebagai sumber. Data Prakiraan Cuaca Terbuka.";
  try {
    const result = await fetchBmkg();
    bmkgEntry.observed_at = result.observedAt;
    bmkgEntry.observed_label = result.observedLabel;
    bmkgEntry.source_updated_at = result.sourceUpdatedAt;
    writeIfChanged("data/live/bmkg_prakiraan.csv", result.body, bmkgEntry, previousEntry(previous, "bmkg_prakiraan"));
  } catch (error) {
    Object.assign(bmkgEntry, keepPrevious(bmkgEntry, previousEntry(previous, "bmkg_prakiraan"), error.message));
  }
  datasets.bmkg_prakiraan = bmkgEntry;
  datasets.angin = {
    ...bmkgEntry,
    id: "angin",
    nama: "Arah dan kecepatan angin",
    source: "Arah dan kecepatan angin pada prakiraan cuaca BMKG",
    fungsi: SOURCES.find((source) => source.id === "angin").fungsi,
    limitation: SOURCES.find((source) => source.id === "angin").limitation,
    url: "https://data.bmkg.go.id/prakiraan-cuaca/",
  };

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
    const result = await fetchOpenMeteoWeather(names);
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
    const result = await fetchOpenMeteoAir(names);
    airEntry.observed_at = result.observedAt;
    airEntry.observed_label = result.observedLabel;
    airEntry.source_updated_at = result.sourceUpdatedAt;
    writeIfChanged("data/live/ispu_pembanding.csv", result.body, airEntry, previousEntry(previous, "ispu_pembanding"));
  } catch (error) {
    Object.assign(airEntry, keepPrevious(airEntry, previousEntry(previous, "ispu_pembanding"), error.message));
  }
  datasets.ispu_pembanding = airEntry;
  await refreshKabupatenComparison(datasets, previous);

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
      const result = await fetchFirms();
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
    const result = await fetchCap();
    capEntry.observed_at = result.observedAt;
    capEntry.observed_label = result.observedLabel;
    capEntry.source_updated_at = result.sourceUpdatedAt;
    writeIfChanged("data/live/bmkg-cap.csv", result.body, capEntry, previousEntry(previous, "bmkg_cap"));
  } catch (error) {
    Object.assign(capEntry, keepPrevious(capEntry, previousEntry(previous, "bmkg_cap"), error.message));
  }
  datasets.bmkg_cap = capEntry;

  const dibiSource = SOURCES.find((source) => source.id === "dibi_karhutla");
  const dibiEntry = baseEntry(dibiSource);
  dibiEntry.mode = "statis";
  try {
    const result = await fetchDibi();
    dibiEntry.license = result.license;
    dibiEntry.observed_at = result.observedAt;
    dibiEntry.observed_label = result.observedLabel;
    dibiEntry.source_updated_at = result.sourceUpdatedAt;
    writeIfChanged("data/live/dibi-karhutla.csv", result.body, dibiEntry, previousEntry(previous, "dibi_karhutla"));
  } catch (error) {
    Object.assign(dibiEntry, keepPrevious(dibiEntry, previousEntry(previous, "dibi_karhutla"), error.message));
  }
  datasets.dibi_karhutla = dibiEntry;

  for (const source of SOURCES) {
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
    return;
  }
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Manifes ditulis. Kunci FIRMS: ${firmsKey ? "dipakai" : "tidak ada"}.`);
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
    const result = await fetchOpenMeteoAir(names);
    airEntry.observed_at = result.observedAt;
    airEntry.observed_label = result.observedLabel;
    airEntry.source_updated_at = result.sourceUpdatedAt;
    writeIfChanged("data/live/ispu_pembanding.csv", result.body, airEntry, previousEntry(previous, "ispu_pembanding"));
  } catch (error) {
    Object.assign(airEntry, keepPrevious(airEntry, previousEntry(previous, "ispu_pembanding"), error.message));
  }
  datasets.ispu_pembanding = airEntry;
  await refreshKabupatenComparison(datasets, previous);
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
}

const comparisonOnlyRun = process.argv.includes("--comparison-only");
const run = comparisonOnlyRun ? comparisonOnly : main;
run().catch((error) => {
  console.error(redactSecret(error?.stack || error?.message || error, firmsKey));
  if (!comparisonOnlyRun && !hotspotCountsLogged) logHotspotCounts(null);
  process.exitCode = 1;
});
