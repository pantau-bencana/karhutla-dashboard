const COORDINATE = /^-?\d+(?:\.\d+)?$/;

export function parseFirmsCoordinate(raw) {
  const text = String(raw ?? "").trim();
  if (!COORDINATE.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return { text, value };
}
