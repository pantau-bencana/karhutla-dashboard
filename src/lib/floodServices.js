import { BIG_SERVICE } from "./bigWilayah.js";

export const RISIKO_SERVICE =
  "https://gis.bnpb.go.id/server/rest/services/inarisk/layer_risiko_banjir/ImageServer";
export const BAHAYA_SERVICE =
  "https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjir/ImageServer";
export const DAS_QUERY =
  "https://gis.bnpb.go.id/server/rest/services/inarisk/Klasifikasi_DAS_KLHK/MapServer/0/query";
export const LEGEND_IMAGE = "https://inarisk.bnpb.go.id/v4/peta/legenda_Indeks_risiko.jpg";

export function exportImageUrl(service, bbox, width, height) {
  const params = new URLSearchParams({
    bbox: bbox.join(","),
    bboxSR: "3857",
    imageSR: "3857",
    size: `${width},${height}`,
    format: "png32",
    transparent: "true",
    f: "image",
  });
  return `${service}/exportImage?${params}`;
}

export function identifyUrl(lng, lat) {
  const geometry = JSON.stringify({
    x: lng,
    y: lat,
    spatialReference: { wkid: 4326 },
  });
  const params = new URLSearchParams({
    geometry,
    geometryType: "esriGeometryPoint",
    returnGeometry: "false",
    f: "json",
  });
  return `${RISIKO_SERVICE}/identify?${params}`;
}

export function bigQueryUrl(layer, where, { geometry = true, offset = 0 } = {}) {
  const params = new URLSearchParams({
    where,
    outFields: layer === 0 ? "namobj,wapro1,wapro2" : "kdpkab,wadmkk,wadmpr",
    returnGeometry: geometry ? "true" : "false",
    outSR: "4326",
    maxAllowableOffset: "0.02",
    f: "geojson",
  });
  if (geometry) {
    params.set("resultOffset", String(offset));
    params.set("resultRecordCount", "1000");
  }
  return `${BIG_SERVICE}/${layer}/query?${params}`;
}

export function dasQueryUrl(envelope, offset) {
  const geometry = JSON.stringify({
    xmin: envelope.west,
    ymin: envelope.south,
    xmax: envelope.east,
    ymax: envelope.north,
    spatialReference: { wkid: 4326 },
  });
  const params = new URLSearchParams({
    where: "1=1",
    geometry,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "NAMA_DAS,KRITERIA,BPDASHL",
    returnGeometry: "true",
    outSR: "4326",
    maxAllowableOffset: "0.05",
    resultOffset: String(offset),
    resultRecordCount: "1000",
    f: "geojson",
  });
  return `${DAS_QUERY}?${params}`;
}
