// Penyusun URL API area FIRMS. Kunci tidak pernah ditulis di berkas ini.
// DAY_RANGE pada API area paling besar 5.

export function firmsAreaUrl(mapKey, { days = 5 } = {}) {
  const key = String(mapKey ?? "").trim();
  const span = Math.min(Math.max(Number(days) || 1, 1), 5);
  const area = "94.4,-11.5,141.6,6.5";
  return `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/VIIRS_SNPP_NRT/${area}/${span}`;
}

export function redactSecret(value, secret) {
  const text = String(value ?? "");
  const key = String(secret ?? "").trim();
  if (!key) return text;
  return text.split(key).join("***");
}
