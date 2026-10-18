import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { flattenBmkgForecast, bmkgForecastUrl, BMKG_LOCATIONS, BMKG_DOCS_URL } from "../src/lib/bmkgForecast.js";
import { firmsAreaUrl, redactSecret } from "../src/lib/firms.js";
import { writeHotspotMap } from "./build-hotspot-map.mjs";
import { BOUNDARY_CRS, BOUNDARY_SOURCE, insideIndonesia, parseFirmsCoordinate } from "./indonesia-land.mjs";
import { provinceCenters } from "../src/lib/geo.js";
import { ispuFromPm25 } from "../src/lib/ispuEstimate.js";
import { REFRESH_CRON, REFRESH_INTERVAL_HOURS, nextScheduledRun } from "../src/lib/schedule.js";
import { SMOKE_IMAGE_URL, SMOKE_URL, SOURCES } from "../src/lib/sourceCatalog.js";
import { kategoriIspu } from "../src/lib/warning.js";

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

async function fetchOpenMeteoAir(names) {
  const points = provinceCenters(names);
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", points.map((point) => point.lat).join(","));
  url.searchParams.set("longitude", points.map((point) => point.lon).join(","));
  url.searchParams.set("hourly", "pm2_5,pm10");
  url.searchParams.set("timezone", "Asia/Jakarta");
  url.searchParams.set("past_days", "7");
  url.searchParams.set("forecast_days", "1");
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
      if (!bucket.pm25.length) continue;
      const mean = bucket.pm25.reduce((sum, value) => sum + value, 0) / bucket.pm25.length;
      const ispu = ispuFromPm25(mean);
      rows.push({
        tanggal,
        provinsi: points[index].name,
        kota: "Titik tengah provinsi",
        ispu: ispu ?? "",
        kategori: kategoriIspu(ispu),
        parameter_dominan: "PM2.5 (perkiraan)",
        pm25: mean.toFixed(1),
        keterangan: `Rata-rata ${bucket.pm25.length} jam. Bukan ISPU stasiun KLH.`,
      });
    }
  }
  const headers = ["tanggal", "provinsi", "kota", "ispu", "kategori", "parameter_dominan", "pm25", "keterangan"];
  const dates = rows.map((row) => row.tanggal).sort();
  return {
    body: toCsv(headers, rows),
    observedAt: dates.at(-1) ? `${dates.at(-1)}T16:59:00.000Z` : null,
    observedLabel: dates.length ? `Rata-rata harian PM2.5 ${dates[0]}–${dates.at(-1)}` : "",
    sourceUpdatedAt: dates.at(-1) ? `${dates.at(-1)}T16:59:00.000Z` : null,
  };
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
  const rows = [];
  let newest = "";
  let before = 0;
  let invalid = 0;
  let outside = 0;
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
    if (!insideIndonesia(lon.value, lat.value)) {
      outside += 1;
      continue;
    }
    const tanggal = cells[index.acq_date] || "";
    const waktu = cells[index.acq_time] || "";
    const iso = tanggal && waktu ? `${tanggal}T${String(waktu).padStart(4, "0").slice(0, 2)}:${String(waktu).padStart(4, "0").slice(2, 4)}:00.000Z` : "";
    if (iso > newest) newest = iso;
    rows.push({
      tanggal,
      waktu,
      lintang: lat.text,
      bujur: lon.text,
      provinsi: "Belum terpetakan",
      kabupaten: "",
      satelit: cells[index.satellite] || "",
      kepercayaan: cells[index.confidence] || "",
      frp: cells[index.frp] || "",
      kecerahan: cells[index.bright_ti4] || "",
      keterangan: "NASA FIRMS VIIRS Suomi-NPP. Bukan kebakaran terkonfirmasi. Hanya titik di dalam poligon kabupaten Indonesia.",
    });
  }
  const headers = ["tanggal", "waktu", "lintang", "bujur", "provinsi", "kabupaten", "satelit", "kepercayaan", "frp", "kecerahan", "keterangan"];
  return {
    body: toCsv(headers, rows),
    observedAt: newest || null,
    observedLabel: newest ? `Lintasan terbaru di dalam poligon Indonesia ${newest} UTC` : "Tidak ada titik di dalam poligon Indonesia pada 5 hari terakhir",
    sourceUpdatedAt: newest || nowIso,
    url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
    recordsBeforeBoundary: before,
    recordsAfterBoundary: rows.length,
    droppedOutsideIndonesia: outside,
    invalidCoordinates: invalid,
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
      hotspotEntry.error = "FIRMS_MAP_KEY belum dipasang. Dasbor memakai data contoh dan tidak mengaku tersambung.";
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
      hotspotEntry.boundary = BOUNDARY_SOURCE;
      hotspotEntry.crs = BOUNDARY_CRS;
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
      interval_hours: REFRESH_INTERVAL_HOURS,
      timezone: "UTC",
      display_timezone: "Asia/Jakarta",
    },
    next_run: nextScheduledRun(new Date(), REFRESH_INTERVAL_HOURS),
    firms_key: firmsKey ? "used" : "absent",
    datasets,
  };

  const changed = !previous || Object.keys(next.datasets).some((id) => material(next.datasets[id]) !== material(previous.datasets?.[id]));
  if (!changed) {
    console.log("Data tidak berubah. Manifes tidak ditulis ulang.");
    return;
  }
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Manifes ditulis. Kunci FIRMS: ${firmsKey ? "dipakai" : "tidak ada"}.`);
}

main().catch((error) => {
  console.error(redactSecret(error?.stack || error?.message || error, firmsKey));
  process.exitCode = 1;
});
