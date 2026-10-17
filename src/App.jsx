import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardView } from "./components/DashboardView.jsx";
import { Footer } from "./components/Footer.jsx";
import { LogicPage } from "./components/LogicPage.jsx";
import { SiteHeader } from "./components/SiteHeader.jsx";
import { defaultRange, deriveDashboard } from "./lib/derive.js";
import { loadAll } from "./lib/loadData.js";
import { parseRoute } from "./lib/route.js";

const DEFAULT_TITLE = "Dashboard Peringatan Dini Karhutla Nasional";

function usePage() {
  const [page, setPage] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const sync = () => setPage(parseRoute(window.location.hash));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return page;
}

export function App() {
  const page = usePage();
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState("");
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState("");
  const [province, setProvince] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const datesReady = useRef(false);

  async function reload() {
    setLoading(true);
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
      setLoadedAt(new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date()));
    } catch (error) {
      setConfigError(error.message || "Gagal memuat konfigurasi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    const title = config?.judul || DEFAULT_TITLE;
    document.title = page === "logika" ? `Logika Pemantauan — ${title}` : title;
    window.scrollTo(0, 0);
  }, [page, config]);

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

  const dashboardTitle = config?.judul || DEFAULT_TITLE;
  const headerTitle = page === "logika" ? "Logika Pemantauan" : dashboardTitle;
  const headerSubtitle =
    page === "logika"
      ? "Cara prototipe membaca data hotspot, mengolahnya, lalu menampilkannya di dasbor."
      : "Prototipe internal untuk memantau kebakaran hutan dan lahan: titik panas, bahaya cuaca kebakaran, dan mutu udara.";

  return (
    <>
      <SiteHeader
        eyebrow={config?.instansi || "Dit. PD BNPB"}
        title={headerTitle}
        subtitle={headerSubtitle}
        loadedAt={loadedAt}
        loading={loading}
        onReload={reload}
        page={page}
        showReload={page === "dashboard"}
      />
      <div hidden={page !== "dashboard"}>
        {configError && !config ? (
          <main className="wrap main">
            <div className="banner error" role="alert">
              <strong>Konfigurasi tidak termuat.</strong>
              <p>{configError}</p>
            </div>
          </main>
        ) : (
          <DashboardView
            active={page === "dashboard"}
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
          />
        )}
      </div>
      {page === "logika" ? <LogicPage config={config} feeds={feeds} configError={configError} /> : null}
      <Footer />
    </>
  );
}
