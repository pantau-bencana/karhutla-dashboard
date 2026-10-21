import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "./components/Badge.jsx";
import { OfficialLinks } from "./components/OfficialLinks.jsx";
import { DashboardView } from "./components/DashboardView.jsx";
import { Footer } from "./components/Footer.jsx";
import { HazardPlaceholder } from "./components/HazardPlaceholder.jsx";
import { KualitasUdara } from "./components/KualitasUdara.jsx";
import { LogicPage } from "./components/LogicPage.jsx";
import { MetodePage } from "./components/MetodePage.jsx";
import { SiteHeader } from "./components/SiteHeader.jsx";
import { SourcesPage } from "./components/SourcesPage.jsx";
import { SummaryPage } from "./components/SummaryPage.jsx";
import { VolcanoPage } from "./components/VolcanoPage.jsx";
import { defaultRange, deriveDashboard } from "./lib/derive.js";
import { hazardById } from "./lib/hazards.js";
import { loadAll } from "./lib/loadData.js";
import { parseLocation } from "./lib/route.js";
import { assessFreshness } from "./lib/freshness.js";
import { officialLinks } from "./lib/sourceCatalog.js";
import { MANIFEST_POLL_MINUTES } from "./lib/schedule.js";

const FloodPage = lazy(() => import("./components/FloodPage.jsx").then((module) => ({ default: module.FloodPage })));

const DEFAULT_TITLE = "Pantau Bencana v0.1";

function useLocation() {
  const initial = parseLocation(window.location.hash);
  const hazardRef = useRef(initial.hazard);
  const [location, setLocation] = useState(initial);
  useEffect(() => {
    const sync = () => {
      const next = parseLocation(window.location.hash);
      if (next.page !== "glosarium") hazardRef.current = next.hazard;
      setLocation({ ...next, hazard: next.page === "glosarium" ? hazardRef.current : next.hazard });
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return location;
}

export function App() {
  const location = useLocation();
  const { page, hazard } = location;
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState("");
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const datesReady = useRef(false);
  const [province, setProvince] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [periodeJam, setPeriodeJam] = useState(24);

  async function reload({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setConfigError("");
    try {
      const response = await fetch(new URL("config.json", document.baseURI).href, { cache: "no-store" });
      if (!response.ok) throw new Error(`config.json tidak dapat dimuat (HTTP ${response.status}).`);
      let json;
      try {
        json = JSON.parse(await response.text());
      } catch {
        throw new Error("config.json bukan JSON yang valid.");
      }
      const loaded = await loadAll(json);
      setConfig(json);
      setFeeds(loaded);
      if (!datesReady.current) {
        const hotspot = loaded.find((feed) => feed.id === "hotspot");
        const range = defaultRange(hotspot?.rows ?? [], 7);
        setFrom(range.from);
        setTo(range.to);
        datesReady.current = true;
      }
    } catch (error) {
      setConfigError(error.message || "Gagal memuat konfigurasi.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    const minutes = Number(config?.pembaruan?.cekManifestMenit) || MANIFEST_POLL_MINUTES;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      reload({ quiet: true });
    }, minutes * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [config?.pembaruan?.cekManifestMenit]);

  useEffect(() => {
    const hazardName = hazardById(hazard).nama;
    const onGlossary = page === "glosarium" || (page === "metode" && location.anchor === "glosarium");
    const pageName = onGlossary
      ? "Glosarium"
      : ({ ringkasan: "Ringkasan", peta: "Peta dan Data", ispu: "Kualitas Udara", logika: "Logika Pemantauan", sumber: "Sumber Data", metode: "Sumber dan Metode" }[page] || "Ringkasan");
    const judulSitus = hazard === "karhutla" ? (config?.judul || DEFAULT_TITLE) : DEFAULT_TITLE;
    document.title = `${pageName} ${hazardName} — ${judulSitus}`;
  }, [page, hazard, location.anchor, config]);

  useEffect(() => {
    if (page !== "glosarium") return;
    const dest = location.term ? `#/sumber-metode/glosarium/${location.term}` : "#/sumber-metode/glosarium";
    if (window.location.hash.toLowerCase() !== dest) window.location.replace(dest);
  }, [page, location.term]);

  useEffect(() => {
    const id = location.term || location.anchor || (page === "glosarium" ? "glosarium" : "");
    if (!id) {
      window.scrollTo(0, 0);
      return undefined;
    }
    let cancelled = false;
    const timers = [];
    const run = () => {
      if (cancelled) return;
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    run();
    const frame = window.requestAnimationFrame(run);
    for (const delay of [50, 200, 600]) timers.push(window.setTimeout(run, delay));
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [page, hazard, location.anchor, location.term]);

  const view = useMemo(() => {
    if (!config) return null;
    const byId = (id) => feeds.find((feed) => feed.id === id)?.rows ?? [];
    return deriveDashboard({
      hotspots: byId("hotspot"),
      sipongi: byId("sipongi"),
      irbi: byId("irbi"),
      bmkg: byId("bmkg"),
      ispu: byId("ispu"),
      province,
      from,
      to,
      config,
    });
  }, [config, feeds, province, from, to]);

  const manifest = feeds.manifest || null;
  const hotspotFeed = feeds.find((feed) => feed.id === "hotspot");
  const freshness = assessFreshness({
    observedAt: hotspotFeed?.observedAt || manifest?.datasets?.hotspot?.observed_at || "",
    nextRun: manifest?.next_run || "",
  });
  const built = hazardById(hazard).siap && page !== "glosarium" && page !== "metode";
  const flood = hazard === "banjir" && page !== "glosarium" && page !== "metode" && (page === "ringkasan" || page === "peta");

  return (
    <>
      <SiteHeader
        manifest={manifest}
        onReload={() => reload()}
        loading={loading}
        page={page}
        hazard={hazard}
        anchor={page === "glosarium" ? "glosarium" : location.anchor}
      />
      {page === "metode" || page === "glosarium" ? (
        <MetodePage
          manifest={manifest}
          anchor={page === "glosarium" ? "glosarium" : location.anchor}
          term={location.term}
        />
      ) : null}
      {hazard === "gunung-api" && page !== "glosarium" && page !== "metode" ? <VolcanoPage /> : null}
      {flood ? (
        <Suspense fallback={<main className="wrap main"><p>Memuat modul Banjir…</p></main>}>
          <FloodPage />
        </Suspense>
      ) : null}
      {!built && !flood && hazard !== "gunung-api" && page !== "glosarium" && page !== "metode" ? <HazardPlaceholder hazardId={hazard} /> : null}
      {built && page === "ringkasan" ? (
        configError && !config ? (
          <ConfigError message={configError} />
        ) : (
          <SummaryPage
            config={config}
            feeds={feeds}
            manifest={manifest}
            freshness={freshness}
            loading={loading}
            province={province}
            setProvince={setProvince}
            from={from}
            setFrom={setFrom}
            to={to}
            setTo={setTo}
            periodeJam={periodeJam}
            setPeriodeJam={setPeriodeJam}
          />
        )
      ) : null}
      {built && page === "peta" ? (
        configError && !config ? (
          <ConfigError message={configError} />
        ) : (
          <DashboardView
            active
            config={config}
            feeds={feeds}
            loading={loading}
            province={province}
            setProvince={setProvince}
            from={from}
            setFrom={setFrom}
            to={to}
            setTo={setTo}
            periodeJam={periodeJam}
            setPeriodeJam={setPeriodeJam}
            view={view}
            freshness={freshness}
          />
        )
      ) : null}
      {built && page === "ispu" ? (
        <main className="wrap main">
          <header className="page-head">
            <div>
              <h1>Kualitas Udara (ISPU)</h1>
              <p className="lead">ISPU diukur di stasiun pemantau KLH. Dashboard ini tidak mengambil data ISPU otomatis dan tidak membuat prediksi ISPU.</p>
            </div>
            <div className="badges">
              <Badge kind="tau">Tautan saja</Badge>
              <OfficialLinks links={officialLinks("ispu").filter((link) => link.href.includes("ispu.kemenlh.go.id"))} />
            </div>
          </header>
          <KualitasUdara feeds={feeds} province={province} provinces={config?.provinsiPrioritas ?? []} />
        </main>
      ) : null}
      {built && page === "logika" ? <LogicPage config={config} /> : null}
      {built && page === "sumber" ? <SourcesPage manifest={manifest} /> : null}
      <Footer />
    </>
  );
}

function ConfigError({ message }) {
  return (
    <main className="wrap main">
      <div className="banner error" role="alert">
        <strong>Konfigurasi tidak termuat.</strong>
        <p>{message}</p>
      </div>
    </main>
  );
}
