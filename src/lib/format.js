const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function formatTanggal(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "—";
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${Number(day)} ${BULAN[Number(month) - 1]} ${iso.slice(0, 4)}`;
}

export function formatTanggalPendek(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "—";
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${Number(day)} ${BULAN_PENDEK[Number(month) - 1]}`;
}

export function formatAngka(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number);
}

export function formatWaktu(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "—";
  if (/^\d{3,4}$/.test(text)) {
    const digits = text.padStart(4, "0");
    return `${digits.slice(0, 2)}:${digits.slice(2)} UTC`;
  }
  return text;
}

export function formatAmbang(thresholds) {
  if (!thresholds) return "";
  const part = (label, rule) =>
    `${label}: Waspada ≥ ${rule.waspada}, Siaga ≥ ${rule.siaga}, Awas ≥ ${rule.awas}`;
  return `${part("Titik panas pada rentang ini", thresholds.hotspot)}. ${part("FWI maksimum", thresholds.fwi)}.`;
}
