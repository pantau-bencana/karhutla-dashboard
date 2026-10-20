import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { feature as topoFeature } from "topojson-client";
import { BIG_SERVICE } from "../src/lib/bigWilayah.js";
import { BATAS_KAB_FILE } from "../src/lib/batasKab.js";
import { warningActive } from "../src/lib/capKab.js";
import { INDONESIA_FRAME } from "../src/lib/geo.js";
import { kodeWilayah } from "../src/lib/floodMatrix.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CAP_INDEX = "https://www.bmkg.go.id/alerts/nowcast/id";
const KAB_LAYER = 2;
const KAB_FIELDS = "kdpkab,wadmkk,wadmpr";

export const CAP_KAB_HEADERS = [
  "kode",
  "kabupaten",
  "provinsi",
  "cap_id",
  "event",
  "deskripsi",
  "onset",
  "effective",
  "expires",
  "severity",
  "urgency",
  "certainty",
  "url",
];

export const CAP_PROV_HEADERS = [
  "kode_prov",
  "provinsi",
  "cap_id",
  "event",
  "headline",
  "effective",
  "expires",
  "severity",
  "urgency",
  "certainty",
  "jumlah_kab",
  "url",
];

export const BMKG_REQUEST_GAP_MS = 1100;

const INDONESIA_BOX = {
  xmin: INDONESIA_FRAME.west,
  ymin: INDONESIA_FRAME.south,
  xmax: INDONESIA_FRAME.east,
  ymax: INDONESIA_FRAME.north,
};

function decodeXml(value) {
  return String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlTag(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return decodeXml(
    match[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function ringsFromXml(xml) {
  const rings = [];
  for (const match of String(xml).matchAll(/<polygon[^>]*>([\s\S]*?)<\/polygon>/gi)) {
    const ring = [];
    for (const pair of match[1].trim().split(/\s+/)) {
      const [lat, lon] = pair.split(",").map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      ring.push([lon, lat]);
    }
    if (ring.length < 3) continue;
    const [firstLon, firstLat] = ring[0];
    const [lastLon, lastLat] = ring[ring.length - 1];
    if (firstLon !== lastLon || firstLat !== lastLat) ring.push([firstLon, firstLat]);
    rings.push(ring);
  }
  return rings;
}

export function ringBbox(ring) {
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;
  for (const [lon, lat] of ring) {
    xmin = Math.min(xmin, lon);
    xmax = Math.max(xmax, lon);
    ymin = Math.min(ymin, lat);
    ymax = Math.max(ymax, lat);
  }
  return { xmin, ymin, xmax, ymax };
}

function boxesOverlap(left, right) {
  return left.xmin <= right.xmax && left.xmax >= right.xmin && left.ymin <= right.ymax && left.ymax >= right.ymin;
}

export function targetRings(rings) {
  return (rings ?? []).filter((ring) => boxesOverlap(ringBbox(ring), INDONESIA_BOX));
}

export function parseCapAlert(xml, url = "") {
  return {
    id: xmlTag(xml, "identifier"),
    headline: xmlTag(xml, "headline"),
    event: xmlTag(xml, "event"),
    deskripsi: xmlTag(xml, "description"),
    onset: xmlTag(xml, "onset"),
    effective: xmlTag(xml, "effective"),
    expires: xmlTag(xml, "expires"),
    severity: xmlTag(xml, "severity"),
    urgency: xmlTag(xml, "urgency"),
    certainty: xmlTag(xml, "certainty"),
    areaDesc: xmlTag(xml, "areaDesc"),
    url,
    rings: ringsFromXml(xml),
  };
}

export function channelPublished(rss) {
  const channel = String(rss).match(/<channel>([\s\S]*?)<item>/i);
  const block = channel ? channel[1] : String(rss);
  const pub = block.match(/<pubDate>([^<]+)<\/pubDate>/i);
  if (!pub) return "";
  const date = new Date(pub[1].trim());
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function rowsFromFeatures(alert, features) {
  const seen = new Set();
  const rows = [];
  for (const feature of features ?? []) {
    const attributes = feature?.attributes ?? feature ?? {};
    const kode = kodeWilayah(attributes.kdpkab);
    if (!/^\d{2}\.\d{2}$/.test(kode)) continue;
    const key = `${kode}|${alert.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      kode,
      kabupaten: String(attributes.wadmkk ?? "").trim(),
      provinsi: String(attributes.wadmpr ?? "").trim(),
      cap_id: alert.id,
      event: alert.event,
      deskripsi: alert.deskripsi,
      onset: alert.onset,
      effective: alert.effective,
      expires: alert.expires,
      severity: alert.severity,
      urgency: alert.urgency,
      certainty: alert.certainty,
      url: alert.url,
    });
  }
  return rows;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function capKabCsv(rows) {
  const lines = [CAP_KAB_HEADERS.join(",")];
  for (const row of rows ?? []) lines.push(CAP_KAB_HEADERS.map((header) => csvCell(row[header])).join(","));
  return `${lines.join("\n")}\n`;
}

export function aggregateProvinsi(kabRows, alerts = []) {
  const byId = new Map((alerts ?? []).map((alert) => [alert.id || alert.cap_id, alert]));
  const groups = new Map();
  for (const row of kabRows ?? []) {
    const kodeProv = String(row.kode ?? "").split(".")[0];
    if (!kodeProv) continue;
    const key = `${kodeProv}|${row.cap_id}`;
    const current = groups.get(key) ?? {
      kode_prov: kodeProv,
      provinsi: row.provinsi,
      cap_id: row.cap_id,
      event: row.event,
      headline: byId.get(row.cap_id)?.headline || "",
      effective: row.effective,
      expires: row.expires,
      severity: row.severity,
      urgency: row.urgency,
      certainty: row.certainty,
      kab: new Set(),
      url: row.url,
    };
    if (row.kode) current.kab.add(row.kode);
    groups.set(key, current);
  }
  return [...groups.values()]
    .map(({ kab, ...rest }) => ({ ...rest, jumlah_kab: kab.size }))
    .sort(
      (left, right) =>
        left.kode_prov.localeCompare(right.kode_prov, "id") || String(left.cap_id).localeCompare(String(right.cap_id), "id"),
    );
}

export function capProvCsv(rows) {
  const lines = [CAP_PROV_HEADERS.join(",")];
  for (const row of rows ?? []) lines.push(CAP_PROV_HEADERS.map((header) => csvCell(row[header])).join(","));
  return `${lines.join("\n")}\n`;
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function simplifyRing(ring, maxPoints = 40) {
  const source = ring ?? [];
  if (source.length < 3) return [];
  const step = Math.max(1, Math.ceil((source.length - 1) / Math.max(2, maxPoints - 1)));
  const points = [];
  for (let index = 0; index < source.length - 1; index += step) {
    points.push([round2(source[index][0]), round2(source[index][1])]);
  }
  const last = source[source.length - 1];
  const end = [round2(last[0]), round2(last[1])];
  const prev = points[points.length - 1];
  if (!prev || prev[0] !== end[0] || prev[1] !== end[1]) points.push(end);
  return points.length >= 3 ? points : [];
}

export function geomFromAlerts(alerts) {
  return (alerts ?? [])
    .map((alert) => ({
      cap_id: alert.id,
      event: alert.event,
      severity: alert.severity,
      rings: targetRings(alert.rings).map((ring) => simplifyRing(ring)).filter((ring) => ring.length >= 3),
    }))
    .filter((alert) => alert.rings.length);
}

export function capKabMeta(snapshot) {
  const provRows = snapshot.provRows ?? aggregateProvinsi(snapshot.rows, snapshot.alerts);
  const provinsi = new Set((provRows ?? []).map((row) => row.kode_prov).filter(Boolean));
  return `${JSON.stringify(
    {
      status: snapshot.status === "ok" ? "ok" : "gagal",
      fetched_at: snapshot.fetchedAt || new Date().toISOString(),
      rss_published: snapshot.rssPublished || "",
      sumber: "BMKG",
      dasar: "Nowcast BMKG, dasar waktu 0–3 jam.",
      cakupan: snapshot.status === "ok" ? "nasional" : "",
      jumlah_alert: snapshot.jumlahAlert ?? null,
      jumlah_prov: snapshot.status === "ok" ? provinsi.size : null,
      baris: snapshot.status === "ok" ? (snapshot.rows ?? []).length : null,
      penempatan: snapshot.status === "ok" ? snapshot.penempatan || "kueri-big" : "",
      catatan:
        snapshot.status === "ok" && snapshot.penempatan === "batas-tersimpan"
          ? "Kueri BIG gagal. Kabupaten/kota dipadankan pada batas tersimpan, bukan kotak koordinat."
          : undefined,
      error: snapshot.error || null,
    },
    null,
    2,
  )}\n`;
}

export function capCsvUsable(csvText) {
  const lines = String(csvText ?? "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  return lines.length > 1;
}

export function previousCapUsable(directory) {
  const csvPath = resolve(directory, "bmkg-cap-kab.csv");
  if (!existsSync(csvPath)) return false;
  try {
    return capCsvUsable(readFileSync(csvPath, "utf8"));
  } catch {
    return false;
  }
}

export function lengkapiCakupanMeta(directory) {
  const metaPath = resolve(directory, "bmkg-cap-kab-meta.json");
  if (!existsSync(metaPath)) return false;
  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, "utf8"));
  } catch {
    return false;
  }
  if (meta?.status !== "ok" || meta.cakupan) return false;
  meta.cakupan = "nasional";
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  return true;
}

export function writeCapKabFiles(directory, snapshot) {
  const hasNew = snapshot.status === "ok" && (snapshot.rows ?? []).length > 0;
  if (!hasNew && previousCapUsable(directory)) {
    lengkapiCakupanMeta(directory);
    return { kept_previous: true };
  }
  if (snapshot.status === "ok") {
    const provRows = snapshot.provRows ?? aggregateProvinsi(snapshot.rows, snapshot.alerts);
    writeFileSync(resolve(directory, "bmkg-cap-kab.csv"), capKabCsv(snapshot.rows));
    writeFileSync(resolve(directory, "bmkg-cap-prov.csv"), capProvCsv(provRows));
    if (snapshot.geom) {
      writeFileSync(resolve(directory, "bmkg-cap-geom.json"), `${JSON.stringify({ caps: snapshot.geom })}\n`);
    }
  }
  writeFileSync(resolve(directory, "bmkg-cap-kab-meta.json"), capKabMeta(snapshot));
  return { kept_previous: false };
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function fetchText(url, timeoutMs) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/xml,text/xml,text/plain,*/*", "User-Agent": "curl/8.5.0" },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status} ${text.slice(0, 140).replace(/\s+/g, " ")}`);
  return text;
}

const QUERY_BACKOFF_MS = [1000, 3000];

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const xi = ring[index][0];
    const yi = ring[index][1];
    const xj = ring[previous][0];
    const yj = ring[previous][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function segmentsIntersect(a, b, c, d) {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const denom = rx * sy - ry * sx;
  if (denom === 0) return false;
  const qpx = c[0] - a[0];
  const qpy = c[1] - a[1];
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * ry - qpy * rx) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function ringsIntersect(left, right) {
  if (!left?.length || !right?.length) return false;
  if (!boxesOverlap(ringBbox(left), ringBbox(right))) return false;
  for (const point of left) {
    if (pointInRing(point[0], point[1], right)) return true;
  }
  for (const point of right) {
    if (pointInRing(point[0], point[1], left)) return true;
  }
  for (let i = 0; i < left.length - 1; i += 1) {
    for (let j = 0; j < right.length - 1; j += 1) {
      if (segmentsIntersect(left[i], left[i + 1], right[j], right[j + 1])) return true;
    }
  }
  return false;
}

export function exteriorRings(geometry) {
  if (geometry?.type === "Polygon") return geometry.coordinates?.[0] ? [geometry.coordinates[0]] : [];
  if (geometry?.type === "MultiPolygon") {
    return (geometry.coordinates ?? []).map((polygon) => polygon?.[0]).filter((ring) => ring?.length);
  }
  return [];
}

let storedKabCache;

export function loadStoredKabFeatures() {
  if (storedKabCache) return storedKabCache;
  const topology = JSON.parse(readFileSync(resolve(root, BATAS_KAB_FILE), "utf8"));
  storedKabCache = topoFeature(topology, topology.objects.kabupaten).features ?? [];
  return storedKabCache;
}

export function rowsFromStoredBoundaries(alert, rings, features) {
  const targets = targetRings(rings)
    .map((ring) => (ring.length > 180 ? simplifyRing(ring, 80) : ring))
    .filter((ring) => ring.length >= 3);
  if (!targets.length) return [];
  const hits = [];
  for (const feature of features ?? []) {
    const props = feature?.properties ?? {};
    const kode = kodeWilayah(props.kode);
    if (!/^\d{2}\.\d{2}$/.test(kode)) continue;
    const kabRings = exteriorRings(feature.geometry);
    const hit = targets.some((ring) => kabRings.some((kabRing) => ringsIntersect(ring, kabRing)));
    if (!hit) continue;
    hits.push({ attributes: { kdpkab: props.kode, wadmkk: props.nama, wadmpr: props.provinsi } });
  }
  return rowsFromFeatures(alert, hits);
}

async function queryOnce(rings) {
  const body = new URLSearchParams({
    f: "json",
    geometry: JSON.stringify({ rings, spatialReference: { wkid: 4326 } }),
    geometryType: "esriGeometryPolygon",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326",
    outFields: KAB_FIELDS,
    returnGeometry: "false",
  });
  const response = await fetch(`${BIG_SERVICE}/${KAB_LAYER}/query`, {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      "user-agent": "karhutla-dashboard-refresh",
    },
    body,
  });
  if (!response.ok) throw new Error(`BIG HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "BIG menolak kueri poligon CAP");
  return payload.features ?? [];
}

async function tryQuery(query, rings) {
  try {
    return { ok: true, features: (await query(rings)) ?? [] };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function queryReliable(rings, options = {}) {
  const query = options.query ?? queryOnce;
  const wait = options.wait ?? delay;
  const source = rings ?? [];
  let lastError = null;
  const first = await tryQuery(query, source);
  if (first.ok) return first.features;
  lastError = first.error;
  await wait(QUERY_BACKOFF_MS[0]);
  const second = await tryQuery(query, source);
  if (second.ok) return second.features;
  lastError = second.error;
  await wait(QUERY_BACKOFF_MS[1]);

  const collected = [];
  let any = false;
  const candidates = source.length > 1 ? source.map((ring) => [ring]) : [];
  for (const candidate of candidates) {
    let attempt = await tryQuery(query, candidate);
    if (!attempt.ok) {
      lastError = attempt.error;
      await wait(QUERY_BACKOFF_MS[0]);
      attempt = await tryQuery(query, candidate);
    }
    if (attempt.ok) {
      any = true;
      collected.push(...attempt.features);
    } else {
      lastError = attempt.error;
    }
  }
  if (any) return collected;

  for (const ring of source) {
    const simple = simplifyRing(ring, 24);
    if (simple.length < 3 || simple.length === ring.length) continue;
    let attempt = await tryQuery(query, [simple]);
    if (!attempt.ok) {
      lastError = attempt.error;
      await wait(QUERY_BACKOFF_MS[0]);
      attempt = await tryQuery(query, [simple]);
    }
    if (attempt.ok) {
      any = true;
      collected.push(...attempt.features);
    } else {
      lastError = attempt.error;
    }
  }
  if (any) return collected;
  throw lastError ?? new Error("BIG menolak kueri poligon CAP");
}

export async function assignKabupaten(alerts, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const query = options.query ?? ((rings) => queryReliable(rings));
  const jobs = [];
  for (const alert of alerts ?? []) {
    if (!warningActive(alert, now)) continue;
    const rings = targetRings(alert.rings ?? []);
    if (!rings.length) continue;
    jobs.push({ alert, rings });
  }
  let storedPromise;
  const storedFeatures = () => {
    if (options.storedFeatures) return Promise.resolve(options.storedFeatures);
    if (!storedPromise) {
      storedPromise = Promise.resolve().then(() => {
        try {
          return loadStoredKabFeatures();
        } catch {
          return [];
        }
      });
    }
    return storedPromise;
  };
  const lists = await mapPool(jobs, 4, async (job) => {
    try {
      return { rows: rowsFromFeatures(job.alert, await query(job.rings)), via: "kueri-big", error: null };
    } catch (error) {
      const rows = rowsFromStoredBoundaries(job.alert, job.rings, await storedFeatures());
      if (rows.length) return { rows, via: "batas-tersimpan", error };
      return { rows: [], via: "gagal", error };
    }
  });
  const merged = new Map();
  let penempatan = "kueri-big";
  let bigError = null;
  let failedJobs = 0;
  for (const list of lists) {
    if (list.via === "batas-tersimpan") penempatan = "batas-tersimpan";
    if (list.error) bigError = list.error;
    if (list.via === "gagal") {
      failedJobs += 1;
      continue;
    }
    for (const row of list.rows) merged.set(`${row.kode}|${row.cap_id}`, row);
  }
  if (!merged.size && failedJobs > 0) throw bigError ?? new Error("Failed to execute query.");
  const rows = [...merged.values()].sort(
    (left, right) => left.kode.localeCompare(right.kode, "id") || String(left.cap_id).localeCompare(String(right.cap_id), "id"),
  );
  rows.penempatan = penempatan;
  rows.bigError = bigError ? String(bigError.message || bigError) : null;
  return rows;
}

export async function loadCapAlerts() {
  const rss = await fetchText(CAP_INDEX, 25000);
  const rssPublished = channelPublished(rss);
  const links = [
    ...new Set(
      [...rss.matchAll(/<link>(https:\/\/www\.bmkg\.go\.id\/alerts\/nowcast\/id\/[^<\s]+_alert\.xml)<\/link>/g)].map(
        (match) => match[1],
      ),
    ),
  ];
  const alerts = [];
  for (const link of links) {
    const xml = await fetchText(link, 20000);
    alerts.push(parseCapAlert(xml, link));
    await new Promise((resolveDelay) => setTimeout(resolveDelay, BMKG_REQUEST_GAP_MS));
  }
  return { alerts, rssPublished };
}

async function main() {
  const live = resolve(root, "data/live");
  let loaded = { alerts: [], rssPublished: "" };
  try {
    loaded = await loadCapAlerts();
    if (!(loaded.alerts ?? []).length && previousCapUsable(live)) {
      console.log("RSS nowcast kosong. Cuplikan CAP sebelumnya dipertahankan.");
      return;
    }
    const rows = await assignKabupaten(loaded.alerts);
    if (!rows.length && previousCapUsable(live)) {
      console.log("Tidak ada kabupaten/kota baru pada CAP. Cuplikan sebelumnya dipertahankan.");
      return;
    }
    const provRows = aggregateProvinsi(rows, loaded.alerts);
    const written = writeCapKabFiles(live, {
      status: "ok",
      rows,
      provRows,
      alerts: loaded.alerts,
      geom: geomFromAlerts(loaded.alerts),
      jumlahAlert: loaded.alerts.length,
      rssPublished: loaded.rssPublished,
      fetchedAt: new Date().toISOString(),
      penempatan: rows.penempatan,
      error: null,
    });
    if (written.kept_previous) {
      console.log("Cuplikan CAP sebelumnya dipertahankan.");
      return;
    }
    const via = rows.penempatan === "batas-tersimpan" ? " Penempatan: batas tersimpan." : "";
    const bigNote = rows.bigError ? ` ${rows.bigError}` : "";
    console.log(
      `CAP kabupaten ok: ${rows.length} baris, ${provRows.length} baris provinsi.${via}${bigNote} RSS ${loaded.rssPublished || "tanpa pubDate"}.`,
    );
  } catch (error) {
    if (previousCapUsable(live)) {
      console.log(`CAP gagal: ${error.message}. Cuplikan sebelumnya dipertahankan.`);
      return;
    }
    writeCapKabFiles(live, {
      status: "gagal",
      rows: [],
      alerts: loaded.alerts,
      jumlahAlert: loaded.alerts?.length ?? null,
      rssPublished: loaded.rssPublished,
      fetchedAt: new Date().toISOString(),
      error: error.message,
    });
    console.log(`CAP kabupaten gagal: ${error.message}`);
    process.exitCode = 1;
  } finally {
    for (const alert of loaded.alerts ?? []) delete alert.rings;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
