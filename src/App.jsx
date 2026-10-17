import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardView } from "./components/DashboardView.jsx";
import { Footer } from "./components/Footer.jsx";
import { defaultRange, deriveDashboard } from "./lib/derive.js";
import { loadAll } from "./lib/loadData.js";

export function App() {
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

  if (configError && !config) {
    return (
      <>
        <header className="site-header">
          <div className="stripe" aria-hidden="true" />
          <div className="wrap header-inner">
            <div>
              <p className="eyebrow">Dit. PD BNPB</p>
              <h1>Dashboard Peringatan Dini Karhutla Nasional</h1>
            </div>
          </div>
        </header>
        <main className="wrap main">
          <div className="banner error" role="alert">
            <strong>Konfigurasi tidak termuat.</strong>
            <p>{configError}</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <DashboardView
        config={config}
        feeds={feeds}
        loading={loading}
        loadedAt={loadedAt}
        province={province}
        setProvince={setProvince}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        onReload={reload}
        view={view}
      />
      <Footer />
    </>
  );
}
