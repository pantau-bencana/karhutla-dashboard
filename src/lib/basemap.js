// Peta dasar tanpa kunci API.
// OpenFreeMap (diperiksa 28 Oktober 2026): layanan publik gratis, tanpa kunci,
// pemakaian komersial diizinkan, atribusi wajib.
// https://openfreemap.org/tos/
// https://openfreemap.org/quick_start/
// CARTO basemap gratis kini mensyaratkan kunci API, jadi tidak dipakai.
// Jangan memakai ubin resmi OSMF. Kebijakan petak mereka tidak mengizinkan
// pemakaian aplikasi yang ramai.
//
// Ubah url dan attribution di BASEMAP. Semua peta Leaflet membaca konstanta ini.

import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);

export const BASEMAP = Object.freeze({
  provider: "OpenFreeMap",
  url: "https://tiles.openfreemap.org/styles/liberty",
  attribution:
    'OpenFreeMap &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  maxZoom: 19,
});

export function basemapLayer() {
  return maplibreGL({
    style: BASEMAP.url,
    attributionControl: { customAttribution: BASEMAP.attribution },
    maxZoom: BASEMAP.maxZoom,
  });
}
