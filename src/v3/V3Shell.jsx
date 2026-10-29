import { useEffect, useState } from "react";
import { topCurrent } from "../components/SiteHeader.jsx";
import { parseLocation } from "../lib/route.js";

const NAV = [
  ["Pantau", [
    ["ringkasan", "Ringkasan", "#/"],
    ["karhutla", "Karhutla", "#/karhutla/peta"],
    ["banjir", "Banjir", "#/banjir"],
    ["gunung-api", "Gunung Api", "#/gunung-api"],
    ["siklon", "Siklon", "#/siklon"],
  ]],
  ["Rujukan", [
    ["sumber", "Sumber data", "#/sumber"],
    ["glosarium", "Glosarium", "#/sumber-metode/glosarium"],
    ["rekap", "Rekap harian", "#/rekap-harian"],
  ]],
];

function aktif(id, location) {
  if (id === "sumber") return location.page === "sumber";
  if (id === "glosarium") return location.page === "glosarium" || location.anchor === "glosarium";
  return topCurrent(id, location.page, location.hazard);
}

function tautanEdisi(edisi) {
  const url = new URL(window.location.href);
  if (url.port === "5175") {
    url.port = edisi === "v2" ? "5174" : "5173";
    url.hash = "";
    url.pathname = "/";
    return url.toString();
  }
  const path = url.pathname.replace(/\/v3\/index\.html$/, "/").replace(/\/v3\/?$/, "/");
  const tujuan = edisi === "v2" ? `${path.replace(/\/$/, "")}/v2/` : path;
  return `${url.origin}${tujuan}`;
}

export function V3Shell({ children, location, onMuat, ringkas }) {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    setMenu(false);
  }, [location.page, location.hazard, location.anchor]);

  useEffect(() => {
    const terapkan = () => {
      if (ringkas) {
        document.title = "Ringkasan — Pantau Bencana v0.3";
        return;
      }
      if (document.title.includes("v0.1")) document.title = document.title.replaceAll("v0.1", "v0.3");
    };
    terapkan();
    const node = document.querySelector("title");
    if (!node) return undefined;
    const pengamat = new MutationObserver(terapkan);
    pengamat.observe(node, { childList: true, characterData: true, subtree: true });
    return () => pengamat.disconnect();
  }, [ringkas, location.page, location.hazard]);

  return (
    <div className="v3-app">
      <button type="button" className="v3-menu" aria-expanded={menu} onClick={() => setMenu((buka) => !buka)}>
        Menu
      </button>
      <aside className={menu ? "v3-sidebar terbuka" : "v3-sidebar"} aria-label="Navigasi v0.3">
        <a className="v3-merek" href="#/">
          <span className="v3-tanda" aria-hidden="true">PB</span>
          <span>
            <strong>Pantau Bencana</strong>
            <small>v0.3</small>
          </span>
        </a>
        {NAV.map(([grup, daftar]) => (
          <nav key={grup} className="v3-nav" aria-label={grup}>
            <p>{grup}</p>
            {daftar.map(([id, label, href]) => (
              <a key={id} href={href} aria-current={aktif(id, location) ? "page" : undefined}>{label}</a>
            ))}
          </nav>
        ))}
        <div className="v3-kaki">
          <a href={tautanEdisi("v1")}>Buka edisi v0.1</a>
          <a href={tautanEdisi("v2")}>Buka edisi v0.2</a>
          <p>Pantau Bencana v0.3 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.</p>
        </div>
      </aside>
      {menu ? <button type="button" className="v3-scrim" aria-label="Tutup menu" onClick={() => setMenu(false)} /> : null}
      <div className="v3-kolom">
        {ringkas ? null : (
          <header className="v3-judul-bar v3-judul-dalam">
            <h1>{judulDalam(location)}</h1>
            <button type="button" className="v3-muat" onClick={onMuat}>Muat ulang</button>
          </header>
        )}
        <div className="v3-body">{children}</div>
      </div>
    </div>
  );
}

function judulDalam(location) {
  if (location.page === "glosarium" || location.anchor === "glosarium") return "Glosarium";
  const nama = {
    peta: "Peta dan Data",
    potensi: "Potensi 7 hari",
    ispu: "Kualitas Udara",
    logika: "Logika Pemantauan",
    sumber: "Sumber data",
    metode: "Info",
    siklon: "Siklon",
    irbi: "IRBI",
    rekap: "Rekap harian",
    ringkasan: location.hazard === "banjir" ? "Banjir" : location.hazard === "gunung-api" ? "Gunung Api" : "Ringkasan",
  }[location.page];
  return nama || "Pantau Bencana";
}

export function lokasiDariHash(hash) {
  return parseLocation(hash);
}
