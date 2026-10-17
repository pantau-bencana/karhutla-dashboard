export function parseCsv(text) {
  const src = String(text ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = (cells[index] ?? "").trim();
    });
    return record;
  });
}

export function looksLikeCsv(text) {
  const trimmed = String(text ?? "")
    .replace(/^\uFEFF/, "")
    .trim();
  if (!trimmed) return { ok: false, reason: "Berkas CSV kosong." };
  const head = trimmed.slice(0, 300).toLowerCase();
  if (
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.startsWith("<")
  ) {
    return {
      ok: false,
      reason:
        "Respons berupa halaman HTML, bukan CSV. Pastikan spreadsheet dipublikasikan ke web dan tautannya terbuka tanpa login.",
    };
  }
  if (head.startsWith("{") || head.startsWith("[")) {
    return { ok: false, reason: "Respons berupa JSON, bukan CSV." };
  }
  if (!trimmed.includes(",")) {
    const preview = trimmed.slice(0, 180);
    return { ok: false, reason: `Respons bukan CSV yang dikenali. Isi awal: ${preview}` };
  }
  return { ok: true };
}
