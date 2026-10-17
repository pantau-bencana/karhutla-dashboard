// Rute hash (#/ dan #/logika) supaya halaman kedua tetap terbuka di GitHub Pages.
// base Vite adalah "./". Jalur seperti /logika akan memecah aset relatif saat
// halaman dimuat ulang, karena Pages menyajikan situs dari subfolder repositori.

export function parseRoute(hash) {
  const path = String(hash ?? "")
    .replace(/^#/, "")
    .split("?")[0]
    .split("&")[0]
    .replace(/\/+$/, "")
    .trim()
    .toLowerCase();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/logika" || normalized === "/logika-pemantauan") return "logika";
  return "dashboard";
}

export function pageHref(page) {
  return page === "logika" ? "#/logika" : "#/";
}
