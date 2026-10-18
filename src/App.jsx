import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { DashboardView } from "./components/DashboardView.jsx";
import { Footer } from "./components/Footer.jsx";
import { GlossaryPage } from "./components/GlossaryPage.jsx";
import { HazardPlaceholder } from "./components/HazardPlaceholder.jsx";
import { LogicPage } from "./components/LogicPage.jsx";
import { SiteHeader } from "./components/SiteHeader.jsx";
import { SourcesPage } from "./components/SourcesPage.jsx";
import { SummaryPage } from "./components/SummaryPage.jsx";
import { defaultRange, deriveDashboard } from "./lib/derive.js";
import { hazardById } from "./lib/hazards.js";
import { loadAll } from "./lib/loadData.js";
import { parseLocation } from "./lib/route.js";
import { assessFreshness } from "./lib/freshness.js";
import { MANIFEST_POLL_MINUTES } from "./lib/schedule.js";

const FloodPage = lazy(() => import("./components/FloodPage.jsx").then((module) => ({ default: module.FloodPage })));

const DEFAULT_TITLE = "Prototipe Pemantauan Karhutla";

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
    const pageName = { ringkasan: "Ringkasan", peta: "Peta dan Data", logika: "Logika Pemantauan", sumber: "Sumber Data", glosarium: "Glosarium" }[page] || "Ringkasan";
    document.title = `${pageName} ${hazardName} — ${config?.judul || DEFAULT_TITLE}`;
  }, [page, hazard, config]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, hazard]);

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
  const built = hazardById(hazard).siap && page !== "glosarium";
  const flood = hazard === "banjir" && (page === "ringkasan" || page === "peta");
  const title = page === "glosarium" ? "Glosarium" : `${hazardById(hazard).nama}`;
  const subtitle =
    page === "glosarium"
      ? "Singkatan dan istilah pada dasbor."
      : hazard === "karhutla"
        ? "Prototipe pemantauan kebakaran hutan dan lahan. Bukan peringatan resmi."
        : hazardById(hazard).status;

  return (
    <>
      <SiteHeader
        eyebrow={config?.instansi || "Dit. PD BNPB"}
        title={title}
        subtitle={subtitle}
        manifest={manifest}
        freshness={freshness}
        onReload={() => reload()}
        loading={loading}
        page={page}
        hazard={hazard}
      />
      {page === "glosarium" ? <GlossaryPage /> : null}
      {flood ? (
        <Suspense fallback={<main className="wrap main"><p>Memuat modul Banjir…</p></main>}>
          <FloodPage />
        </Suspense>
      ) : null}
      {!built && !flood && page !== "glosarium" ? <HazardPlaceholder hazardId={hazard} /> : null}
      {built && page === "ringkasan" ? (
        configError && !config ? (
          <ConfigError message={configError} />
        ) : (
          <SummaryPage config={config} feeds={feeds} manifest={manifest} freshness={freshness} />
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
            view={view}
            freshness={freshness}
          />
        )
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
