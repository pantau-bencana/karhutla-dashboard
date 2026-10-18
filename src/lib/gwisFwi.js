export const GWIS_WMS = "https://maps.effis.emergency.copernicus.eu/gwis";
export const GWIS_FWI_LAYER = "ecmwf.fwi";

export const GWIS_LABEL =
  "FWI pembanding (model ECMWF via Copernicus EMS/JRC GWIS) — Pembanding, bukan produk BMKG/KLHK";

export const GWIS_CLASS_NOTE =
  "Kelas FWI GWIS/EFFIS memakai skala Canadian FWI. Kelas itu tidak boleh dibandingkan dengan kelas FWI/FDRS BMKG.";

export const GWIS_UNAVAILABLE = "data belum tersedia";

// Teks elemen Attribution pada GetCapabilities WMS 1.3.0, lapisan induk GWIS.
export const GWIS_ATTRIBUTION =
  "The geodata are released under the terms and conditions of the EU Data License, available at http://ec.europa.eu/geninfo/legal_notices_en.htm";

export const GWIS_CREDIT = "© European Union, Copernicus EMS / JRC GWIS";

export const GWIS_LEGEND_URL =
  "https://maps.effis.emergency.copernicus.eu/gwis?language=eng&version=1.3.0&service=WMS&request=GetLegendGraphic&sld_version=1.1.0&layer=ecmwf.fwi&format=image/png&STYLE=default";

// Kotak kecil Sumatera–Kalimantan (EPSG:3857) untuk memastikan tanggal itu punya piksel.
const PROBE_BBOX = "11131949.1,-222684.2,13135699.9,445640.1";

export function tanggalJakarta(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function gwisProbeUrl(day) {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: GWIS_FWI_LAYER,
    STYLES: "default",
    CRS: "EPSG:3857",
    BBOX: PROBE_BBOX,
    WIDTH: "48",
    HEIGHT: "24",
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
    TIME: day,
  });
  return `${GWIS_WMS}?${params.toString()}`;
}

export function gwisLayerReady({ contentType = "", opaque = 0 } = {}) {
  return String(contentType).includes("image/png") && opaque > 0;
}

async function countOpaquePixels(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    for (let index = 3; index < pixels.length; index += 16) {
      if (pixels[index] > 10) opaque += 1;
    }
    return opaque;
  } finally {
    bitmap.close?.();
  }
}

export async function gwisDateAvailable(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day))) return false;
  const response = await fetch(gwisProbeUrl(day));
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("image/png")) return false;
  const opaque = await countOpaquePixels(await response.blob());
  return gwisLayerReady({ contentType, opaque });
}
