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

export function kategoriIspu(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (number <= 50) return "Baik";
  if (number <= 100) return "Sedang";
  if (number <= 200) return "Tidak Sehat";
  if (number <= 300) return "Sangat Tidak Sehat";
  return "Berbahaya";
}
