import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BIG_SERVICE } from "../src/lib/bigWilayah.js";
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

export function writeCapKabFiles(directory, snapshot) {
  const hasNew = snapshot.status === "ok" && (snapshot.rows ?? []).length > 0;
  if (!hasNew && previousCapUsable(directory)) return { kept_previous: true };
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
      error: null,
    });
    if (written.kept_previous) {
      console.log("Cuplikan CAP sebelumnya dipertahankan.");
      return;
    }
    console.log(
      `CAP kabupaten ok: ${rows.length} baris, ${provRows.length} baris provinsi. RSS ${loaded.rssPublished || "tanpa pubDate"}.`,
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
