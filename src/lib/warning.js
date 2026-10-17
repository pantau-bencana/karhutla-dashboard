export const LEVELS = ["Normal", "Waspada", "Siaga", "Awas"];

export const LEVEL_RANK = {
  Normal: 0,
  Waspada: 1,
  Siaga: 2,
  Awas: 3,
};

export function levelFromThresholds(value, thresholds) {
  const number = Number(value);
  if (!Number.isFinite(number) || !thresholds) return "Normal";
  if (number >= Number(thresholds.awas)) return "Awas";
  if (number >= Number(thresholds.siaga)) return "Siaga";
  if (number >= Number(thresholds.waspada)) return "Waspada";
  return "Normal";
}

export function higherLevel(left, right) {
  return (LEVEL_RANK[left] ?? 0) >= (LEVEL_RANK[right] ?? 0) ? left : right;
}

export function kelasKepercayaan(value) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (text === "h" || text === "high" || text === "tinggi") return "tinggi";
  if (text === "n" || text === "nominal" || text === "sedang") return "nominal";
  if (text === "l" || text === "low" || text === "rendah") return "rendah";
  const number = Number(text);
  if (Number.isFinite(number)) {
    if (number >= 80) return "tinggi";
    if (number >= 30) return "nominal";
    return "rendah";
  }
  return "nominal";
}

export function statusProvinsi({ hotspotCount, fwiMax, thresholds }) {
  const dariHotspot = levelFromThresholds(hotspotCount ?? 0, thresholds?.hotspot);
  const adaFwi = fwiMax != null && Number.isFinite(Number(fwiMax));
  const dariFwi = adaFwi ? levelFromThresholds(fwiMax, thresholds?.fwi) : null;
  const status = higherLevel(dariHotspot, dariFwi ?? "Normal");
  let pemicu = "—";
  if (status !== "Normal") {
    const rankHotspot = LEVEL_RANK[dariHotspot] ?? 0;
    const rankFwi = dariFwi ? (LEVEL_RANK[dariFwi] ?? 0) : -1;
    if (rankHotspot > rankFwi) pemicu = "Titik panas";
    else if (rankFwi > rankHotspot) pemicu = "FDRS";
    else pemicu = "Titik panas dan FDRS";
  }
  return { status, dariHotspot, dariFwi, pemicu, fdrsTersedia: adaFwi };
}

export function kategoriIspu(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (number <= 50) return "Baik";
  if (number <= 100) return "Sedang";
  if (number <= 200) return "Tidak Sehat";
  if (number <= 300) return "Sangat Tidak Sehat";
  return "Berbahaya";
}
