// Batas PM2.5 pada Lampiran Permen LHK No. 14 Tahun 2020.
// Contoh di peraturan: 31,4 µg/m³ → ISPU 70 (Sedang).
const PM25_BREAKS = [
  [0, 15.5, 0, 50],
  [15.5, 55.4, 50, 100],
  [55.4, 150.4, 100, 200],
  [150.4, 250.4, 200, 300],
  [250.4, 500, 300, 500],
];

export function ispuFromPm25(pm25) {
  const concentration = Number(pm25);
  if (!Number.isFinite(concentration) || concentration < 0) return null;
  const value = Math.min(concentration, 500);
  for (const [low, high, indexLow, indexHigh] of PM25_BREAKS) {
    if (value <= high || high === 500) {
      const span = high - low || 1;
      return Math.round(((indexHigh - indexLow) / span) * (value - low) + indexLow);
    }
  }
  return 500;
}
