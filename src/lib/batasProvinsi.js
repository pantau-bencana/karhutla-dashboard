import { feature as topoFeature } from "topojson-client";
import { BATAS_KAB_FILE } from "./batasKab.js";

let janji = null;

export function muatFiturKab() {
  if (!janji) {
    const url = new URL(BATAS_KAB_FILE, document.baseURI).href;
    janji = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((topo) => topoFeature(topo, topo.objects.kabupaten).features)
      .catch((error) => {
        janji = null;
        throw error;
      });
  }
  return janji;
}

export function kotakProvinsi(features, nama) {
  const milik = (features ?? []).filter((item) => item?.properties?.provinsi === nama);
  if (!milik.length) return null;
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  const jalan = (coords) => {
    if (!coords) return;
    if (typeof coords[0] === "number") {
      const lon = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      south = Math.min(south, lat);
      north = Math.max(north, lat);
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      return;
    }
    for (const anak of coords) jalan(anak);
  };
  for (const item of milik) jalan(item.geometry?.coordinates);
  if (!(south < north && west < east)) return null;
  return { south, west, north, east };
}
