import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BIG_SERVICE } from "../src/lib/bigWilayah.js";
import { warningActive } from "../src/lib/capKab.js";
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

export const TARGET_BOXES = [
  { xmin: 94.9, ymin: 1.6, xmax: 98.8, ymax: 6.4 },
  { xmin: 100.9, ymin: -5.8, xmax: 103.9, ymax: -2.2 },
];

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
  return (rings ?? []).filter((ring) => TARGET_BOXES.some((box) => boxesOverlap(ringBbox(ring), box)));
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
    if (!kode.startsWith("11.") && !kode.startsWith("17.")) continue;
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

export function capKabMeta(snapshot) {
  return `${JSON.stringify(
    {
      status: snapshot.status === "ok" ? "ok" : "gagal",
      fetched_at: snapshot.fetchedAt || new Date().toISOString(),
      rss_published: snapshot.rssPublished || "",
      sumber: "BMKG",
      dasar: "Nowcast BMKG, dasar waktu 0–3 jam.",
      baris: snapshot.status === "ok" ? (snapshot.rows ?? []).length : null,
      error: snapshot.error || null,
    },
    null,
    2,
  )}\n`;
}

export function writeCapKabFiles(directory, snapshot) {
  if (snapshot.status === "ok") writeFileSync(resolve(directory, "bmkg-cap-kab.csv"), capKabCsv(snapshot.rows));
  writeFileSync(resolve(directory, "bmkg-cap-kab-meta.json"), capKabMeta(snapshot));
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

async function queryReliable(rings) {
  try {
    return await queryOnce(rings);
  } catch {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    try {
      return await queryOnce(rings);
    } catch (error) {
      if (rings.length === 1) throw error;
      const features = [];
      for (const ring of rings) {
        try {
          features.push(...(await queryOnce([ring])));
        } catch {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
          features.push(...(await queryOnce([ring])));
        }
      }
      return features;
    }
  }
}

export async function assignKabupaten(alerts, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const query = options.query ?? queryReliable;
  const jobs = [];
  for (const alert of alerts ?? []) {
    if (!warningActive(alert, now)) continue;
    const rings = targetRings(alert.rings ?? []);
    if (!rings.length) continue;
    jobs.push({ alert, rings });
  }
  const lists = await mapPool(jobs, 4, async (job) => rowsFromFeatures(job.alert, await query(job.rings)));
  const merged = new Map();
  for (const list of lists) {
    for (const row of list) merged.set(`${row.kode}|${row.cap_id}`, row);
  }
  return [...merged.values()].sort(
    (left, right) => left.kode.localeCompare(right.kode, "id") || String(left.cap_id).localeCompare(String(right.cap_id), "id"),
  );
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
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  return { alerts, rssPublished };
}

async function main() {
  const live = resolve(root, "data/live");
  const loaded = await loadCapAlerts();
  try {
    const rows = await assignKabupaten(loaded.alerts);
    writeCapKabFiles(live, {
      status: "ok",
      rows,
      rssPublished: loaded.rssPublished,
      fetchedAt: new Date().toISOString(),
      error: null,
    });
    console.log(`CAP kabupaten ok: ${rows.length} baris. RSS ${loaded.rssPublished || "tanpa pubDate"}.`);
  } catch (error) {
    writeCapKabFiles(live, {
      status: "gagal",
      rows: [],
      rssPublished: loaded.rssPublished,
      fetchedAt: new Date().toISOString(),
      error: error.message,
    });
    console.log(`CAP kabupaten gagal: ${error.message}`);
    process.exitCode = 1;
  } finally {
    for (const alert of loaded.alerts) delete alert.rings;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
