// Titik di dalam poligon batas yang sudah tersimpan. Bukan centroid (bisa jatuh di laut)
// dan bukan berkas batas baru.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { feature as topoFeature } from "topojson-client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BATAS = resolve(root, "data/static/batas-kabkota.topojson");

export function pointInRing(x, y, ring) {
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

export function pointInGeometry(lon, lat, geometry) {
  const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
  for (const polygon of polygons ?? []) {
    const [outer, ...holes] = polygon ?? [];
    if (!outer || !pointInRing(lon, lat, outer)) continue;
    if (holes.some((hole) => hole && pointInRing(lon, lat, hole))) continue;
    return true;
  }
  return false;
}

function luasCincin(ring) {
  let luas = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    luas += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
  }
  return Math.abs(luas);
}

function kotak(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function cincinTerluas(geometry) {
  const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
  let terbaik = null;
  let luas = 0;
  for (const polygon of polygons ?? []) {
    const ring = polygon?.[0];
    if (!ring || ring.length < 4) continue;
    const nilai = luasCincin(ring);
    if (nilai > luas) {
      luas = nilai;
      terbaik = ring;
    }
  }
  return terbaik;
}

export function titikDiDalam(geometry) {
  if (!geometry) return null;
  if (pointInGeometry && geometry.type === "Point") {
    const [lon, lat] = geometry.coordinates ?? [];
    return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null;
  }
  const ring = cincinTerluas(geometry);
  if (!ring) return null;
  const box = kotak(ring);
  const lebar = box.maxX - box.minX;
  const tinggi = box.maxY - box.minY;
  if (!(lebar > 0) || !(tinggi > 0)) return null;
  for (const n of [9, 17, 33]) {
    let terbaik = null;
    let jarak = Infinity;
    for (let iy = 0; iy < n; iy += 1) {
      for (let ix = 0; ix < n; ix += 1) {
        const lon = box.minX + ((ix + 0.5) * lebar) / n;
        const lat = box.minY + ((iy + 0.5) * tinggi) / n;
        if (!pointInGeometry(lon, lat, geometry)) continue;
        const dx = ix + 0.5 - n / 2;
        const dy = iy + 0.5 - n / 2;
        const jauh = dx * dx + dy * dy;
        if (jauh < jarak) {
          jarak = jauh;
          terbaik = [lon, lat];
        }
      }
    }
    if (terbaik) return terbaik;
  }
  return null;
}

export function muatTitikBatas(path = BATAS) {
  const topo = JSON.parse(readFileSync(path, "utf8"));
  const geo = topoFeature(topo, topo.objects.kabupaten);
  const points = [];
  const gagal = [];
  for (const feature of geo.features ?? []) {
    const kode = String(feature.properties?.kode ?? "").trim();
    const kabupaten = String(feature.properties?.nama ?? "").trim();
    const provinsi = String(feature.properties?.provinsi ?? "").trim();
    const dalam = titikDiDalam(feature.geometry);
    if (!kode || !kabupaten || !dalam) {
      gagal.push(kode || kabupaten || "?");
      continue;
    }
    points.push({
      kode,
      provinsi,
      kabupaten,
      bujur: Number(dalam[0].toFixed(5)),
      lintang: Number(dalam[1].toFixed(5)),
      sumber: "Titik di dalam batas kabupaten/kota yang tersimpan. Bukan ibu kota, bukan centroid, dan bukan koordinat Satu Data BNPB.",
    });
  }
  points.sort((a, b) => a.kode.localeCompare(b.kode, "id"));
  return { points, gagal };
}
