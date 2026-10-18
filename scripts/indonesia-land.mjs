import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const BOUNDARY_SOURCE =
  "geoBoundaries gbOpen Indonesia ADM2 simplified, 2020, 519 kabupaten/kota. Lisensi CC BY 3.0 IGO. Sumber data BPS, World Food Programme, dan OCHA. Bukan batas resmi BIG/Kemendagri.";

export const BOUNDARY_CRS =
  "GeoJSON CRS84 (bujur, lintang), setara EPSG:4326 untuk urutan sumbu ini. Ubin peta Leaflet adalah Web Mercator. Marker memakai [lintang, bujur].";

const COORDINATE = /^-?\d+(?:\.\d+)?$/;

export function parseFirmsCoordinate(raw) {
  const text = String(raw ?? "").trim();
  if (!COORDINATE.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return { text, value };
}

function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function prepare(feature) {
  const polygons = polygonsOf(feature.geometry);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const pair of ring) {
        const x = pair[0];
        const y = pair[1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { name: feature.properties?.shapeName || "", polygons, minX, minY, maxX, maxY };
}

function contains(feature, x, y) {
  if (x < feature.minX || x > feature.maxX || y < feature.minY || y > feature.maxY) return false;
  return feature.polygons.some((polygon) => {
    if (!pointInRing(x, y, polygon[0])) return false;
    for (let hole = 1; hole < polygon.length; hole += 1) {
      if (pointInRing(x, y, polygon[hole])) return false;
    }
    return true;
  });
}

export function locateFeature(features, longitude, latitude) {
  for (const feature of features) {
    if (contains(feature, longitude, latitude)) return feature;
  }
  return null;
}

let adm2Cache = null;
let adm1Cache = null;

export function loadAdm2() {
  if (!adm2Cache) {
    const file = JSON.parse(readFileSync(resolve(root, "data/boundaries/idn-adm2.geojson"), "utf8"));
    adm2Cache = file.features.map(prepare);
  }
  return adm2Cache;
}

export function loadAdm1() {
  if (!adm1Cache) {
    const file = JSON.parse(readFileSync(resolve(root, "data/boundaries/idn-adm1.geojson"), "utf8"));
    adm1Cache = file.features.map(prepare);
  }
  return adm1Cache;
}

export function insideIndonesia(longitude, latitude) {
  return locateFeature(loadAdm2(), longitude, latitude) != null;
}
