import { useState } from "react";
import { formatWib } from "../lib/format.js";
import { InfoTip } from "./InfoTip.jsx";
import { potensiDekatIndonesia, SIKLON_JEJAK } from "../lib/siklonBmkg.js";
import { useCuplikanSiklon } from "./SiklonRingkas.jsx";

const TOP = [
  ["karhutla", "Karhutla", "#/karhutla/peta"],
  ["banjir", "Banjir", "#/banjir"],
  ["irbi", "IRBI", "#/irbi"],
  ["gunung-api", "Gunung Api", "#/gunung-api"],
  ["siklon", "Siklon", "#/siklon"],
  ["info", "Info", "#/sumber-metode"],
  ["rekap", "Rekap Harian", "#/rekap-harian"],
  ["ringkasan", "Ringkasan", "#/"],
];

const KARHUTLA_PAGES = [
  ["peta", "Peta dan Data", "#/karhutla/peta"],
  ["potensi", "Potensi 7 hari", "#/karhutla/potensi"],
  ["ispu", "Kualitas Udara (ISPU)", "#/karhutla/ispu"],
  ["logika", "Logika Pemantauan", "#/karhutla/logika"],
];

const HALAMAN_INFO = new Set(["metode", "glosarium", "sumber"]);

function topCurrent(id, page, hazard) {
  if (id === "info") return HALAMAN_INFO.has(page);
  if (id === "siklon") return page === "siklon";
  if (id === "irbi") return page === "irbi";
  if (id === "rekap") return page === "rekap";
  if (id === "ringkasan") return page === "ringkasan" && hazard === "karhutla";
  if (id === "karhutla") return hazard === "karhutla" && page !== "ringkasan" && page !== "siklon" && page !== "irbi" && !HALAMAN_INFO.has(page) && page !== "rekap";
  return hazard === id && page !== "siklon" && page !== "irbi" && !HALAMAN_INFO.has(page);
}

function PenjelasanSiklon({ cuplikan }) {
  const sinyal = potensiDekatIndonesia(cuplikan);
  const statusHalaman = cuplikan?.status_teks || cuplikan?.status || "Tidak Ada Siklon";
  return (
    <>
      <p>Halaman Siklon Tropis BMKG: {statusHalaman}. Sumber: BMKG. Bukan peringatan resmi.</p>
      {sinyal.sistem.map((item) => (
        <p key={item.nama}>
          Ikhtisar menulis {item.tahap ? `${item.tahap} ` : ""}{item.nama}{item.lokasi ? ` di ${item.lokasi}` : ""}. Dampak yang ditulis dokumen: {item.dampak} Tanda pada tab memakai kalimat itu. Halaman Siklon Tropis {sinyal.halamanAda ? "berstatus Ada." : "tetap bukan status Ada."} Bukan jejak, bukan kerucut, dan bukan peringatan resmi.
        </p>
      ))}
      {sinyal.halamanAda ? <p>{SIKLON_JEJAK}</p> : null}
    </>
  );
}

function ItemNav({ id, label, href, current, pendek = false, dekat = false, cuplikan = null, onPilih }) {
  const teks = pendek && id === "rekap" ? "Rekap" : label;
  const tautan = (
    <a href={href} aria-current={current ? "page" : undefined} className={dekat ? "siklon-dekat" : undefined} onClick={onPilih}>
      {teks}
    </a>
  );
  if (!dekat) return tautan;
  return (
    <span className="tab-siklon tab-siklon-dekat">
      {tautan}
      <InfoTip label="Potensi siklon dekat Indonesia">
        <PenjelasanSiklon cuplikan={cuplikan} />
      </InfoTip>
    </span>
  );
}

export function SiteHeader({ manifest, onReload, loading, page, hazard }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: cuplikanSiklon } = useCuplikanSiklon();
  const siklonDekat = potensiDekatIndonesia(cuplikanSiklon).dekat;
  const showSub = hazard === "karhutla" && page !== "ringkasan" && page !== "metode" && page !== "rekap" && page !== "siklon" && page !== "irbi" && page !== "glosarium" && page !== "sumber";
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
            <ItemNav
              key={id}
              id={id}
              label={label}
              href={href}
              current={topCurrent(id, page, hazard)}
              dekat={id === "siklon" && siklonDekat}
              cuplikan={cuplikanSiklon}
            />
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
            <ItemNav
              key={id}
              id={id}
              label={label}
              href={href}
              current={topCurrent(id, page, hazard)}
              dekat={id === "siklon" && siklonDekat}
              cuplikan={cuplikanSiklon}
              onPilih={() => setMenuOpen(false)}
            />
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
          <ItemNav
            key={id}
            id={id}
            label={label}
            href={href}
            pendek
            current={topCurrent(id, page, hazard)}
            dekat={id === "siklon" && siklonDekat}
            cuplikan={cuplikanSiklon}
          />
        ))}
      </nav>
    </>
  );
}
