import { useState } from "react";
import { formatWib } from "../lib/format.js";

const TOP = [
  ["ringkasan", "Ringkasan", "#/"],
  ["karhutla", "Karhutla", "#/karhutla/peta"],
  ["banjir", "Banjir", "#/banjir"],
  ["gunung-api", "Gunung Api", "#/gunung-api"],
  ["metode", "Sumber & Metode", "#/sumber-metode"],
  ["glosarium", "Glosarium", "#/sumber-metode/glosarium"],
];

const KARHUTLA_PAGES = [
  ["ringkasan", "Ringkasan", "#/"],
  ["peta", "Peta dan Data", "#/karhutla/peta"],
  ["potensi", "Potensi 7 hari", "#/karhutla/potensi"],
  ["ispu", "Kualitas Udara (ISPU)", "#/karhutla/ispu"],
  ["logika", "Logika Pemantauan", "#/karhutla/logika"],
  ["sumber", "Sumber Data", "#/karhutla/sumber"],
  ["glosarium", "Glosarium", "#/sumber-metode/glosarium"],
];

function topCurrent(id, page, hazard, anchor) {
  const glossary = page === "glosarium" || (page === "metode" && anchor === "glosarium");
  if (id === "glosarium") return glossary;
  if (id === "metode") return page === "metode" && !glossary;
  if (id === "ringkasan") return page === "ringkasan" && hazard === "karhutla";
  if (id === "karhutla") return hazard === "karhutla" && page !== "ringkasan" && page !== "metode" && page !== "glosarium";
  return hazard === id && page !== "metode" && page !== "glosarium";
}

export function SiteHeader({ manifest, onReload, loading, page, hazard, anchor = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showSub = hazard === "karhutla" && page !== "ringkasan" && page !== "metode";
  const loaded = manifest?.generated_at ? formatWib(manifest.generated_at) : "belum ada snapshot";

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="logo" aria-hidden="true"><span /></span>
          <span>
            <span className="bname">Pantau Bencana <span className="bver">v0.1</span></span>
            <span className="bsub">Proyek data terbuka komunitas · bukan sistem resmi pemerintah</span>
          </span>
        </a>
        <nav className="nav" aria-label="Bagian">
          {TOP.map(([id, label, href]) => (
            <a key={id} href={href} aria-current={topCurrent(id, page, hazard, anchor) ? "page" : undefined}>{label}</a>
          ))}
        </nav>
        <div className="tright">
          <p className="small">Pembaruan data {loaded}</p>
          <button type="button" className="btn" onClick={onReload} disabled={loading}>
            {loading ? "Memuat…" : "Muat ulang"}
          </button>
          <button type="button" className="btn menu-btn" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            Menu
          </button>
        </div>
      </header>
      {showSub ? (
        <nav className="subnav" aria-label="Halaman Karhutla">
          {KARHUTLA_PAGES.map(([id, label, href]) => (
            <a key={id} href={href} aria-current={page === id ? "page" : undefined}>{label}</a>
          ))}
        </nav>
      ) : null}
      {menuOpen ? (
        <nav className="menu-panel" aria-label="Menu">
          {TOP.map(([id, label, href]) => (
            <a key={id} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
        </nav>
      ) : null}
      <div className="notice">
        <p>
          <strong>Prototipe v0.1.</strong> Kompilasi data dari sumber publik. Bukan peringatan resmi — untuk keputusan operasional, rujuk BNPB, BMKG, PVMBG, dan KLH.
        </p>
      </div>
      <nav className="tabbar" aria-label="Bagian">
        {TOP.map(([id, label, href]) => (
          <a key={id} href={href} aria-current={topCurrent(id, page, hazard, anchor) ? "page" : undefined}>
            {id === "metode" ? "Sumber" : label}
          </a>
        ))}
      </nav>
    </>
  );
}
