import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../src/lib/csv.js";
import { parseFirmsCoordinate } from "./indonesia-land.mjs";
import {
  BIG_DESA_LAYER,
  BIG_EDITION_NOTE,
  BIG_KECAMATAN_LAYER,
  BIG_SERVICE,
  BIG_SOURCE_LABEL,
  DESA_UNIDENTIFIED,
  MATCH_OFFSET_DEGREES,
  arcGisContains,
  kabCodeFromKecamatan,
  provCodeFromKecamatan,
} from "../src/lib/bigWilayah.js";
import { writeHotspotMap } from "./build-hotspot-map.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CELL_DEGREES = 1;
const KECA_FIELDS = "namobj,wadmkc,wadmkk,wadmpr,kdcpum,kdppum";
const DESA_FIELDS = "namobj,kdpumdes,kdpumkec,kdpumkab,kdpumprov";

function blank(value) {
  const text = String(value ?? "").trim();
  return text && text !== "null" ? text : "";
}

function cellKey(longitude, latitude) {
  return `${Math.floor(longitude / CELL_DEGREES)}:${Math.floor(latitude / CELL_DEGREES)}`;
}

function cellEnvelope(key) {
  const [west, south] = key.split(":").map(Number);
  return {
    xmin: west * CELL_DEGREES,
    ymin: south * CELL_DEGREES,
    xmax: (west + 1) * CELL_DEGREES,
    ymax: (south + 1) * CELL_DEGREES,
    spatialReference: { wkid: 4326 },
  };
}

async function postQuery(layer, params, options) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${BIG_SERVICE}/${layer}/query`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        "user-agent": "karhutla-dashboard-refresh",
      },
      body: new URLSearchParams({ f: "json", ...params }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`BIG HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || "BIG menolak kueri");
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function queryFeatures(layer, params, options) {
  const features = [];
  let offset = 0;
  for (let page = 0; page < 20; page += 1) {
    const payload = await postQuery(layer, { ...params, resultOffset: String(offset), resultRecordCount: "1000" }, options);
    const batch = payload.features ?? [];
    features.push(...batch);
    if (!payload.exceededTransferLimit || !batch.length) break;
    offset += batch.length;
  }
  return features;
}

async function queryPoint(layer, longitude, latitude, outFields, options) {
  const geometry = JSON.stringify({ x: longitude, y: latitude, spatialReference: { wkid: 4326 } });
  const payload = await postQuery(layer, {
    geometry,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields,
    returnGeometry: "false",
  }, options);
  return payload.features?.[0]?.attributes ?? null;
}

function attributesFromKecamatan(attributes) {
  const kodeKecamatan = blank(attributes?.kdcpum);
  return {
    kecamatan: blank(attributes?.wadmkc) || blank(attributes?.namobj),
    kodeKecamatan,
    kabupaten: blank(attributes?.wadmkk),
    kodeKabupaten: kabCodeFromKecamatan(kodeKecamatan, ""),
    provinsi: blank(attributes?.wadmpr),
    kodeProvinsi: provCodeFromKecamatan(kodeKecamatan, blank(attributes?.kdppum)),
  };
}

function attributesFromDesa(attributes) {
  if (!attributes || !blank(attributes.namobj)) return null;
  const kodeKecamatan = blank(attributes.kdpumkec);
  return {
    desa: blank(attributes.namobj),
    kodeDesa: blank(attributes.kdpumdes),
    kodeKecamatan: kodeKecamatan,
    kodeKabupaten: kabCodeFromKecamatan(kodeKecamatan, blank(attributes.kdpumkab)),
    kodeProvinsi: provCodeFromKecamatan(kodeKecamatan, blank(attributes.kdpumprov)),
  };
}

function applyMatch(point, kecamatan, desa) {
  const next = {
    ...point,
    desa: desa?.desa || "",
    kodeDesa: desa?.kodeDesa || "",
    kecamatan: kecamatan?.kecamatan || "",
    kodeKecamatan: desa?.kodeKecamatan || kecamatan?.kodeKecamatan || "",
    kabupaten: kecamatan?.kabupaten || point.kabupaten || "",
    kodeKabupaten: desa?.kodeKabupaten || kecamatan?.kodeKabupaten || "",
    provinsi: kecamatan?.provinsi || point.provinsi || "",
    kodeProvinsi: desa?.kodeProvinsi || kecamatan?.kodeProvinsi || "",
    wilayahStatus: desa?.desa ? "desa" : "tanpa_desa",
  };
  if (!next.desa) next.desaTampilan = DESA_UNIDENTIFIED;
  return next;
}

function failedPoint(point) {
  return {
    ...point,
    desa: "",
    kodeDesa: "",
    wilayahStatus: "gagal",
    desaTampilan: DESA_UNIDENTIFIED,
  };
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

export async function annotatePoints(points, options = {}) {
  const groups = new Map();
  for (const point of points ?? []) {
    const key = cellKey(point.lon, point.lat);
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }
  const kept = [];
  const stats = { cells: groups.size, droppedOutside: 0, gagal: 0, desa: 0, tanpaDesa: 0, queries: 0 };
  const concurrency = options.concurrency ?? 2;
  let finished = 0;
  await mapPool([...groups.entries()], concurrency, async ([key, group]) => {
    const envelope = JSON.stringify(cellEnvelope(key));
    let features;
    try {
      features = await queryFeatures(BIG_KECAMATAN_LAYER, {
        geometry: envelope,
        geometryType: "esriGeometryEnvelope",
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        outFields: KECA_FIELDS,
        returnGeometry: "true",
        maxAllowableOffset: String(MATCH_OFFSET_DEGREES),
      }, options);
      stats.queries += 1;
    } catch {
      for (const point of group) {
        kept.push(failedPoint(point));
        stats.gagal += 1;
      }
      return;
    }
    const polygons = features.filter((feature) => feature.geometry?.rings?.length);
    if (!polygons.length && features.length) {
      for (const point of group) {
        kept.push(failedPoint(point));
        stats.gagal += 1;
      }
      return;
    }
    let desaPresent = false;
    if (polygons.length) {
      try {
        const desaFeatures = await queryFeatures(BIG_DESA_LAYER, {
          geometry: envelope,
          geometryType: "esriGeometryEnvelope",
          inSR: "4326",
          spatialRel: "esriSpatialRelIntersects",
          outFields: "namobj",
          returnGeometry: "false",
        }, options);
        stats.queries += 1;
        desaPresent = desaFeatures.some((feature) => blank(feature.attributes?.namobj));
      } catch {
        desaPresent = false;
      }
    }
    for (const point of group) {
      const hit = polygons.find((feature) => arcGisContains(feature.geometry, point.lon, point.lat));
      let kecamatan = hit ? attributesFromKecamatan(hit.attributes) : null;
      if (!kecamatan) {
        if (!polygons.length) {
          stats.droppedOutside += 1;
          continue;
        }
        try {
          const confirmed = await queryPoint(BIG_KECAMATAN_LAYER, point.lon, point.lat, KECA_FIELDS, options);
          stats.queries += 1;
          kecamatan = confirmed ? attributesFromKecamatan(confirmed) : null;
        } catch {
          kept.push(failedPoint(point));
          stats.gagal += 1;
          continue;
        }
        if (!kecamatan?.kecamatan && !kecamatan?.kabupaten && !kecamatan?.provinsi) {
          stats.droppedOutside += 1;
          continue;
        }
      }
      let desa = null;
      if (desaPresent) {
        try {
          const raw = await queryPoint(BIG_DESA_LAYER, point.lon, point.lat, DESA_FIELDS, options);
          stats.queries += 1;
          desa = attributesFromDesa(raw);
        } catch {
          desa = null;
        }
      }
      const next = applyMatch(point, kecamatan, desa);
      if (next.wilayahStatus === "desa") stats.desa += 1;
      else stats.tanpaDesa += 1;
      kept.push(next);
    }
    finished += 1;
    if (options.log && finished % 25 === 0) console.log(`sel ${finished}/${groups.size}`);
  });
  return { rows: kept, stats, source: BIG_SOURCE_LABEL, edition: BIG_EDITION_NOTE };
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const WILAYAH_HEADER = ["desa", "kode_desa", "kecamatan", "kode_kecamatan", "kode_kabupaten", "kode_provinsi", "wilayah_status"];

export function rowsToHotspotCsv(rows) {
  const header = ["tanggal", "waktu", "lintang", "bujur", "provinsi", "kabupaten", "satelit", "kepercayaan", "frp", "kecerahan", "keterangan", ...WILAYAH_HEADER];
  const lines = [header.join(",")];
  for (const row of rows) {
    const record = {
      tanggal: row.tanggal,
      waktu: row.waktu,
      lintang: row.lintangTeks || row.lintang,
      bujur: row.bujurTeks || row.bujur,
      provinsi: row.provinsi || "Belum terpetakan",
      kabupaten: row.kabupaten || "",
      satelit: row.satelit || "",
      kepercayaan: row.kepercayaan || "",
      frp: row.frp || "",
      kecerahan: row.kecerahan || "",
      keterangan: row.keterangan || "",
      desa: row.desa || "",
      kode_desa: row.kodeDesa || "",
      kecamatan: row.kecamatan || "",
      kode_kecamatan: row.kodeKecamatan || "",
      kode_kabupaten: row.kodeKabupaten || "",
      kode_provinsi: row.kodeProvinsi || "",
      wilayah_status: row.wilayahStatus || "",
    };
    lines.push(header.map((name) => csvCell(record[name])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function pointsFromHotspotCsv(text) {
  const points = [];
  for (const row of parseCsv(text)) {
    const lat = parseFirmsCoordinate(row.lintang);
    const lon = parseFirmsCoordinate(row.bujur);
    if (!lat || !lon) continue;
    points.push({
      ...row,
      lat: lat.value,
      lon: lon.value,
      lintangTeks: lat.text,
      bujurTeks: lon.text,
    });
  }
  return points;
}

async function probe() {
  const samples = [
    ["jakarta", 106.8456, -6.2088],
    ["hangtuah", 101.3780272725, 0.3168469715],
    ["singapore", 103.8198, 1.3521],
    ["laut", 106.2, -4.5],
    ["hotspot-papua", 140.7048, -7.46438],
  ];
  for (const [name, lon, lat] of samples) {
    const started = Date.now();
    try {
      const result = await annotatePoints([{ lon, lat, lintangTeks: String(lat), bujurTeks: String(lon), tanggal: "", waktu: "", satelit: "", kepercayaan: "", provinsi: "", kabupaten: "" }], { concurrency: 1 });
      const row = result.rows[0];
      console.log(JSON.stringify({ name, ms: Date.now() - started, kept: Boolean(row), row: row ? {
        desa: row.desa, kodeDesa: row.kodeDesa, kecamatan: row.kecamatan, kodeKecamatan: row.kodeKecamatan,
        kabupaten: row.kabupaten, kodeKabupaten: row.kodeKabupaten, provinsi: row.provinsi, kodeProvinsi: row.kodeProvinsi,
        wilayahStatus: row.wilayahStatus,
      } : null, stats: result.stats }));
    } catch (error) {
      console.log(JSON.stringify({ name, error: error.message }));
    }
  }
}

async function annotateFile() {
  const sourcePath = resolve(root, "data/live/hotspot.csv");
  const points = pointsFromHotspotCsv(readFileSync(sourcePath, "utf8"));
  const started = Date.now();
  const result = await annotatePoints(points, { concurrency: 2, log: true });
  const body = rowsToHotspotCsv(result.rows);
  writeFileSync(sourcePath, body);
  const manifestPath = resolve(root, "data/live/manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const entry = manifest.datasets?.hotspot;
    if (entry) {
      entry.record_count = result.rows.length;
      entry.content_hash = createHash("sha256").update(body).digest("hex");
      entry.boundary = BIG_SOURCE_LABEL;
      entry.boundary_edition = "Mei 2021 untuk desa; layer kecamatan revisi 27 Desember 2022 menurut deskripsi layanan";
      entry.boundary_note = BIG_EDITION_NOTE;
      entry.records_before_big = points.length;
      entry.records_after_big = result.rows.length;
      entry.dropped_outside_indonesia = result.stats.droppedOutside;
      entry.wilayah_gagal = result.stats.gagal;
      entry.wilayah_desa = result.stats.desa;
      entry.wilayah_tanpa_desa = result.stats.tanpaDesa;
      entry.big_queries = result.stats.queries;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }
  writeHotspotMap();
  console.log(JSON.stringify({ ...result.stats, ms: Date.now() - started, written: result.rows.length }));
}

if (process.argv[1] && process.argv[1].endsWith("big-wilayah.mjs")) {
  const mode = process.argv[2];
  const run = mode === "--annotate" ? annotateFile : probe;
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
