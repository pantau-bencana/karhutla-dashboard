// Rute hash (#/ dan #/logika) supaya halaman kedua tetap terbuka di GitHub Pages.
// base Vite adalah "./". Jalur seperti /logika akan memecah aset relatif saat
// halaman dimuat ulang, karena Pages menyajikan situs dari subfolder repositori.

const HAZARD_IDS = new Set(["karhutla", "banjir", "gunung-api", "gunungapi"]);

function hashPath(hash) {
  return String(hash ?? "")
    .replace(/^#/, "")
    .split("?")[0]
    .split("&")[0]
    .replace(/\/+$/, "")
    .trim()
    .toLowerCase();
}

export function parseLocation(hash) {
  const parts = hashPath(hash).split("/").filter(Boolean);
  if (parts[0] === "glosarium") {
    return { hazard: "karhutla", page: "glosarium", term: parts[1] || "", anchor: "" };
  }
  let hazard = "karhutla";
  let rest = parts;
  if (HAZARD_IDS.has(parts[0])) {
    hazard = parts[0] === "gunungapi" ? "gunung-api" : parts[0];
    rest = parts.slice(1);
  }
  const token = rest[0] || "";
  let page = "ringkasan";
  if (token === "logika" || token === "logika-pemantauan") page = "logika";
  else if (token === "peta" || token === "peta-dan-data" || token === "dashboard") page = "peta";
  else if (token === "ispu" || token === "kualitas-udara") page = "ispu";
  else if (token === "sumber-metode" || token === "metode") page = "metode";
  else if (token === "sumber" || token === "sumber-data") page = "sumber";
  else if (token === "potensi" || token === "potensi-7-hari") page = "potensi";
  else if (token === "ringkasan") page = "ringkasan";
  const anchor = token === "sumber-metode" || token === "metode" ? rest[1] || "" : "";
  const term = anchor === "glosarium" ? rest[2] || "" : "";
  return { hazard, page, term, anchor };
}

export function parseRoute(hash) {
  return parseLocation(hash).page;
}

export function pageHref(page, hazard = "karhutla") {
  if (page === "glosarium") return "#/sumber-metode/glosarium";
  if (page === "metode") return "#/sumber-metode";
  const safeHazard = hazard === "gunungapi" ? "gunung-api" : hazard || "karhutla";
  if (safeHazard === "karhutla") {
    if (!page || page === "ringkasan" || page === "dashboard") return "#/";
    return `#/karhutla/${page === "dashboard" ? "peta" : page}`;
  }
  if (!page || page === "ringkasan") return `#/${safeHazard}`;
  return `#/${safeHazard}/${page}`;
}

export function hazardHref(id) {
  return pageHref("ringkasan", id);
}

export function termHref(id) {
  return `#/sumber-metode/glosarium/${id}`;
}

export function glossaryTermFromHash(hash) {
  const path = String(hash ?? "")
    .replace(/^#/, "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .trim()
    .toLowerCase();
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "glosarium" && parts[1]) return parts[1];
  if ((parts[0] === "sumber-metode" || parts[0] === "metode") && parts[1] === "glosarium" && parts[2]) return parts[2];
  return "";
}
