import { useEffect, useState } from "react";
import { InfoTip } from "../components/InfoTip.jsx";
import { PenjelasanSiklon, KARHUTLA_PAGES, TOP, topCurrent } from "../components/SiteHeader.jsx";
import { useCuplikanSiklon } from "../components/SiklonRingkas.jsx";
import { parseLocation } from "../lib/route.js";
import { potensiDekatIndonesia } from "../lib/siklonBmkg.js";
import { KpiStrip } from "./KpiStrip.jsx";

const IKON = {
  karhutla: "M8 13.4s3.1-2 3.1-4.7A3.1 3.1 0 0 0 8 5.6a3.1 3.1 0 0 0-3.1 3.1c0 2.7 3.1 4.7 3.1 4.7z",
  banjir: "M2.2 9.2c1.3-1.1 2.4-1.1 3.7 0s2.4 1.1 3.7 0 2.4-1.1 3.7 0M2.2 12.4c1.3-1.1 2.4-1.1 3.7 0s2.4 1.1 3.7 0 2.4-1.1 3.7 0",
  "gunung-api": "M1.8 13.6 6.2 4.2h3.6l4.4 9.4H1.8z",
  siklon: "M8 2.4a5.6 5.6 0 1 1-2 10.8A3.3 3.3 0 1 0 8 6.8",
  info: "M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8zM8 7.1V11M8 5.1h.01",
  irbi: "M3 13V3h10v10M3 8h10",
  rekap: "M3.2 2.4h9.6v11.2H3.2zM5.2 5.2h5.6M5.2 8h5.6M5.2 10.8h3.2",
  ringkasan: "M2.2 2.4h5v5h-5zM8.8 2.4h5v5h-5zM2.2 9h5v4.6h-5zM8.8 9h5v4.6h-5z",
};

function Ikon({ id }) {
  const d = IKON[id];
  if (!d) return null;
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return hash;
}

function useJamWib() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function judulHalaman(location) {
  const { page, hazard } = location;
  if (page === "glosarium" || (page === "metode" && location.anchor === "glosarium")) return "Glosarium";
  const nama = {
    ringkasan: hazard === "banjir" ? "Banjir" : hazard === "gunung-api" ? "Gunung Api" : "Ringkasan",
    rekap: "Rekap Harian",
    siklon: "Siklon",
    irbi: "IRBI",
    peta: "Peta dan Data",
    potensi: "Potensi 7 hari",
    ispu: "Kualitas Udara",
    logika: "Logika Pemantauan",
    sumber: "Sumber Data",
    metode: "Info",
  }[page] || "Ringkasan";
  return nama;
}

function tautanV1() {
  const url = new URL(window.location.href);
  const path = url.pathname.replace(/\/v2\/index\.html$/, "/").replace(/\/v2\/?$/, "/");
  return `${url.origin}${path || "/"}`;
}

function muatUlang() {
  document.querySelector(".topbar .tright button.btn:not(.menu-btn)")?.click();
}

export function V2Shell({ children }) {
  const hash = useHash();
  const jam = useJamWib();
  const location = parseLocation(hash);
  const [menu, setMenu] = useState(false);
  const { data: cuplikanSiklon } = useCuplikanSiklon();
  const siklonDekat = potensiDekatIndonesia(cuplikanSiklon).dekat;
  const halamanKarhutla = topCurrent("karhutla", location.page, location.hazard);
  const glosarium = location.page === "glosarium" || location.anchor === "glosarium";

  useEffect(() => {
    setMenu(false);
  }, [hash]);

  useEffect(() => {
    if (!menu) return undefined;
    const tutup = (event) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", tutup);
    return () => window.removeEventListener("keydown", tutup);
  }, [menu]);

  useEffect(() => {
    const terapkan = () => {
      if (document.title.includes("v0.1")) document.title = document.title.replaceAll("v0.1", "v0.2");
    };
    terapkan();
    const node = document.querySelector("title");
    if (!node) return undefined;
    const pengamat = new MutationObserver(terapkan);
    pengamat.observe(node, { childList: true, characterData: true, subtree: true });
    return () => pengamat.disconnect();
  }, [hash]);

  const tanggal = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(jam);
  const pukul = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(jam);

  return (
    <div className="v2-app">
      <aside className={menu ? "v2-sidebar terbuka" : "v2-sidebar"} aria-label="Navigasi bencana">
        <a className="v2-brand" href="#/">
          <span className="v2-mark" aria-hidden="true">PB</span>
          <span>
            <span className="v2-name">Pantau Bencana</span>
            <span className="v2-ver">v0.2</span>
          </span>
        </a>
        <nav className="v2-nav">
          {TOP.map(([id, label, href]) => {
            const aktif = topCurrent(id, location.page, location.hazard);
            return (
              <div key={id} className={aktif ? "v2-item aktif" : "v2-item"}>
                <a href={href} aria-current={aktif ? "page" : undefined} className={id === "siklon" && siklonDekat ? "siklon-dekat" : undefined}>
                  <Ikon id={id} />
                  <span>{label}</span>
                </a>
                {id === "siklon" && siklonDekat ? (
                  <InfoTip label="Potensi siklon dekat Indonesia">
                    <PenjelasanSiklon cuplikan={cuplikanSiklon} />
                  </InfoTip>
                ) : null}
              </div>
            );
          })}
        </nav>
        {halamanKarhutla ? (
          <nav className="v2-sub" aria-label="Halaman Karhutla">
            {KARHUTLA_PAGES.map(([id, label, href]) => (
              <a key={id} href={href} aria-current={location.page === id ? "page" : undefined}>{label}</a>
            ))}
          </nav>
        ) : null}
        <div className="v2-foot">
          <a href="#/sumber-metode/glosarium" aria-current={glosarium ? "page" : undefined}>Glosarium</a>
          <a href={tautanV1()}>Buka tampilan v0.1</a>
          <p>Proyek data terbuka komunitas. Bukan produk BNPB, BMKG, PVMBG, atau KLH.</p>
        </div>
      </aside>
      {menu ? <button type="button" className="v2-scrim" aria-label="Tutup menu" onClick={() => setMenu(false)} /> : null}
      <div className="v2-column">
        <div className="v2-sticky">
          <header className="v2-topbar">
            <button type="button" className="v2-menu" aria-expanded={menu} onClick={() => setMenu((buka) => !buka)}>
              Menu
            </button>
            <div>
              <p className="v2-judul">{judulHalaman(location)}</p>
              <p className="v2-subjudul">Kompilasi data sumber publik. Bukan peringatan resmi.</p>
            </div>
            <div className="v2-jam">
              <span>{tanggal}</span>
              <strong>{pukul} WIB</strong>
            </div>
            <button type="button" className="v2-muat" onClick={muatUlang}>Muat ulang</button>
          </header>
          <p className="v2-notice">
            <strong>Prototipe v0.2.</strong> Kompilasi data dari sumber publik. Bukan peringatan resmi — untuk keputusan operasional, rujuk BNPB, BMKG, PVMBG, dan KLH.
          </p>
        </div>
        <KpiStrip location={location} />
        <div className="v2-body">{children}</div>
      </div>
    </div>
  );
}
