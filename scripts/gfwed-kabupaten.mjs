import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BIG_SERVICE, arcGisContains } from "../src/lib/bigWilayah.js";
import { INDONESIA_FRAME } from "../src/lib/geo.js";
import { GFWED_CITATION, GFWED_LABEL, GFWED_VARIABLE } from "../src/lib/gfwed.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const GFWED_ROOT = "https://portal.nccs.nasa.gov/datashare/GlobalFWI/v2.0/fwiCalcs.GEOS-5/Default/GEOS-5/";
const KAB_LAYER = 2;
const KAB_FIELDS = "kdpkab,wadmkk,wadmpr,kdppum";
const CELL_DEGREES = 1;

export function latestDailyStamp(html) {
  const stamps = [...String(html).matchAll(/FWI\.GEOS-5\.Daily\.Default\.(\d{8})\.nc/g)].map((match) => match[1]);
  return stamps.sort().at(-1) || "";
}

export function stampToDate(stamp) {
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
}

export function aggregateCells(cells) {
  const groups = new Map();
  for (const cell of cells) {
    if (!cell?.kode || !Number.isFinite(cell.fwi)) continue;
    const group = groups.get(cell.kode) ?? {
      kode: cell.kode,
      kabupaten: cell.kabupaten || "",
      provinsi: cell.provinsi || "",
      sum: 0,
      max: Number.NEGATIVE_INFINITY,
      n: 0,
    };
    group.sum += cell.fwi;
    group.max = Math.max(group.max, cell.fwi);
    group.n += 1;
    groups.set(cell.kode, group);
  }
  return [...groups.values()]
    .map((group) => ({
      kode: group.kode,
      kabupaten: group.kabupaten,
      provinsi: group.provinsi,
      fwi_rata: Math.round((group.sum / group.n) * 100) / 100,
      fwi_maks: Math.round(group.max * 100) / 100,
      n_sel: group.n,
    }))
    .sort((a, b) => a.kode.localeCompare(b.kode, "en"));
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function gfwedCsv(rows, tanggal, sumber) {
  const header = "kode,kabupaten,provinsi,fwi_rata,fwi_maks,n_sel,tanggal,sumber";
  const lines = rows.map((row) =>
    [row.kode, row.kabupaten, row.provinsi, row.fwi_rata, row.fwi_maks, row.n_sel, tanggal, sumber].map(csvCell).join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

async function readText(url) {
  const response = await fetch(url, { headers: { "user-agent": "karhutla-dashboard-refresh" } });
  if (!response.ok) throw new Error(`GFWED HTTP ${response.status}`);
  return response.text();
}

async function latestFile() {
  const index = await readText(GFWED_ROOT);
  const years = [...index.matchAll(/href="(20\d{2})\//g)].map((match) => match[1]);
  const year = years.sort().at(-1);
  if (!year) throw new Error("Daftar tahun GFWED kosong.");
  const page = await readText(`${GFWED_ROOT}${year}/`);
  const stamp = latestDailyStamp(page);
  if (!stamp) throw new Error(`Tidak ada berkas harian GEOS-5 pada ${year}.`);
  return {
    stamp,
    tanggal: stampToDate(stamp),
    url: `${GFWED_ROOT}${year}/FWI.GEOS-5.Daily.Default.${stamp}.nc`,
  };
}

function clipNetcdf(ncPath, jsonPath) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      "python3",
      [
        resolve(root, "scripts/gfwed_clip.py"),
        ncPath,
        String(INDONESIA_FRAME.south),
        String(INDONESIA_FRAME.west),
        String(INDONESIA_FRAME.north),
        String(INDONESIA_FRAME.east),
        jsonPath,
      ],
      { cwd: root },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(stderr.trim() || `gfwed_clip.py keluar ${code}`));
    });
  });
}

async function queryKabupaten(envelope) {
  const body = new URLSearchParams({
    f: "json",
    geometry: JSON.stringify(envelope),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: KAB_FIELDS,
    returnGeometry: "true",
    maxAllowableOffset: "0.01",
  });
  const response = await fetch(`${BIG_SERVICE}/${KAB_LAYER}/query`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      "user-agent": "karhutla-dashboard-refresh",
    },
    body,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`BIG HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "BIG menolak kueri");
  return payload.features ?? [];
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

export async function fetchGfwedKabupaten({ deadlineAt = Infinity } = {}) {
  const file = await latestFile();
  const scratch = mkdtempSync(join(tmpdir(), "gfwed-"));
  const ncPath = join(scratch, "daily.nc");
  const jsonPath = join(scratch, "points.json");
  try {
    const response = await fetch(file.url, {
      headers: { "user-agent": "karhutla-dashboard-refresh" },
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`Unduh GFWED HTTP ${response.status}`);
    writeFileSync(ncPath, Buffer.from(await response.arrayBuffer()));
    await clipNetcdf(ncPath, jsonPath);
    const clipped = JSON.parse(readFileSync(jsonPath, "utf8"));
    if (clipped.variable !== GFWED_VARIABLE || !clipped.points?.length) {
      throw new Error("Potongan GFWED kosong.");
    }
    const groups = new Map();
    for (const point of clipped.points) {
      const key = cellKey(point.lon, point.lat);
      const group = groups.get(key) ?? [];
      group.push(point);
      groups.set(key, group);
    }
    const assigned = [];
    let queries = 0;
    let failed = 0;
    await mapPool([...groups.entries()], 4, async ([key, points]) => {
      if (Date.now() > deadlineAt) {
        const error = new Error("gfwed_kabupaten melewati batas waktu.");
        error.batasWaktu = true;
        throw error;
      }
      let features;
      try {
        features = await queryKabupaten(cellEnvelope(key));
        queries += 1;
        if (queries % 25 === 0) console.log(`GFWED kueri BIG ${queries}`);
      } catch {
        failed += points.length;
        return;
      }
      const polygons = features.filter((feature) => feature.geometry?.rings?.length);
      for (const point of points) {
        const hit = polygons.find((feature) => arcGisContains(feature.geometry, point.lon, point.lat));
        const attributes = hit?.attributes;
        const kode = String(attributes?.kdpkab ?? "").trim();
        if (!kode) continue;
        assigned.push({
          kode,
          kabupaten: String(attributes.wadmkk ?? "").trim(),
          provinsi: String(attributes.wadmpr ?? "").trim(),
          fwi: point.fwi,
        });
      }
    });
    const rows = aggregateCells(assigned);
    if (rows.length < 100) {
      throw new Error(`GFWED hanya tertaut ke ${rows.length} kabupaten/kota. Kueri BIG gagal untuk ${failed} sel.`);
    }
    const sumber = `${file.url} variabel ${GFWED_VARIABLE}. ${GFWED_CITATION}`;
    return {
      tanggal: file.tanggal,
      sumber,
      url: file.url,
      rows,
      csv: gfwedCsv(rows, file.tanggal, sumber),
      json: `${JSON.stringify({ tanggal: file.tanggal, sumber, variabel: GFWED_VARIABLE, label: GFWED_LABEL, metode: "Rata-rata dan maksimum sel yang pusatnya jatuh di dalam kabupaten/kota.", rows }, null, 2)}\n`,
      queries,
      failed,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
