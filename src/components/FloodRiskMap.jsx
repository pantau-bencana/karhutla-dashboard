import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { INDONESIA_FRAME } from "../lib/geo.js";
import {
  FLOOD_PERMISSION,
  IDENTIFY_FAIL,
  INARISK_PORTAL,
  NODATA_LABEL,
  RISK_ATTRIBUTION,
  legendClass,
} from "../lib/floodMatrix.js";
import { BAHAYA_SERVICE, LEGEND_IMAGE, RISIKO_SERVICE, bigQueryUrl, dasQueryUrl, exportImageUrl, identifyUrl } from "../lib/floodServices.js";

const PROVINCES = ["Aceh", "Bengkulu"];

function envelopeOf(collection) {
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  const walk = (coords) => {
    if (!coords) return;
    if (typeof coords[0] === "number") {
      const [lon, lat] = coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      south = Math.min(south, lat);
      north = Math.max(north, lat);
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      return;
    }
    coords.forEach(walk);
  };
  for (const feature of collection?.features ?? []) walk(feature.geometry?.coordinates);
  if (south > north) return null;
  return { south, north, west, east };
}

function holesFrom(collection) {
  const holes = [];
  for (const feature of collection?.features ?? []) {
    const geometry = feature.geometry;
    const rings =
      geometry?.type === "Polygon"
        ? [geometry.coordinates?.[0]]
        : geometry?.type === "MultiPolygon"
          ? geometry.coordinates.map((polygon) => polygon[0])
          : [];
    for (const ring of rings) {
      if (ring?.length > 2) holes.push(ring.map(([lon, lat]) => [lat, lon]));
    }
  }
  return holes;
}

async function readJson(url, timeoutMs) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.error) throw new Error(payload.error.message || "Permintaan layanan gagal");
  return payload;
}

export function FloodRiskMap() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const riskRef = useRef(null);
  const bahayaRef = useRef(null);
  const kabRef = useRef(null);
  const lineRef = useRef(null);
  const maskRef = useRef(null);
  const dasRef = useRef(null);
  const tokenRef = useRef(0);
  const identifyRef = useRef(0);
  const [province, setProvince] = useState("Aceh");
  const [showBahaya, setShowBahaya] = useState(false);
  const [showDas, setShowDas] = useState(false);
  const [mapError, setMapError] = useState("");
  const [bigNote, setBigNote] = useState("");
  const [dasNote, setDasNote] = useState("");
  const [identify, setIdentify] = useState("");
  const [legendOk, setLegendOk] = useState(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
      minZoom: 4,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);
    map.createPane("flood-mask");
    map.getPane("flood-mask").style.zIndex = 420;
    map.createPane("flood-lines");
    map.getPane("flood-lines").style.zIndex = 450;
    map.createPane("flood-das");
    map.getPane("flood-das").style.zIndex = 410;
    map.fitBounds(
      [
        [INDONESIA_FRAME.south, INDONESIA_FRAME.west],
        [INDONESIA_FRAME.north, INDONESIA_FRAME.east],
      ],
      { animate: false },
    );
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    let timer = 0;
    const draw = () => {
      const size = map.getSize();
      if (!size || size.x < 40 || size.y < 40) return;
      const scale = Math.min(1, 1024 / Math.max(size.x, size.y));
      const width = Math.max(64, Math.round(size.x * scale));
      const height = Math.max(64, Math.round(size.y * scale));
      const bounds = map.getBounds();
      const sw = map.options.crs.project(bounds.getSouthWest());
      const ne = map.options.crs.project(bounds.getNorthEast());
      const bbox = [sw.x, sw.y, ne.x, ne.y];
      const token = ++tokenRef.current;
      const place = (layerRef, service, opacity) => {
        const url = exportImageUrl(service, bbox, width, height);
        if (!layerRef.current) {
          const overlay = L.imageOverlay(url, bounds, { opacity, interactive: false });
          overlay.on("load", () => {
            if (token === tokenRef.current) setMapError("");
          });
          overlay.on("error", () => {
            if (token === tokenRef.current) setMapError("Layanan peta BNPB tidak tersedia");
          });
          overlay.addTo(map);
          layerRef.current = overlay;
          return;
        }
        layerRef.current.setOpacity(opacity);
        layerRef.current.setUrl(url);
        layerRef.current.setBounds(bounds);
      };
      place(riskRef, RISIKO_SERVICE, showBahaya ? 0.55 : 0.9);
      if (showBahaya) place(bahayaRef, BAHAYA_SERVICE, 0.85);
      else if (bahayaRef.current) {
        map.removeLayer(bahayaRef.current);
        bahayaRef.current = null;
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(draw, 450);
    };
    map.on("moveend", schedule);
    schedule();
    return () => {
      window.clearTimeout(timer);
      map.off("moveend", schedule);
    };
  }, [showBahaya]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    let cancelled = false;
    kabRef.current?.remove();
    lineRef.current?.remove();
    maskRef.current?.remove();
    kabRef.current = null;
    lineRef.current = null;
    maskRef.current = null;
    setBigNote("");
    (async () => {
      try {
        const kabupaten = await readJson(bigQueryUrl(2, `wadmpr='${province}'`), 20000);
        if (cancelled) return;
        const extent = envelopeOf(kabupaten);
        kabRef.current = L.geoJSON(kabupaten, {
          pane: "flood-lines",
          interactive: false,
          style: { color: "#57534e", weight: 1, fillOpacity: 0 },
        }).addTo(map);
        const holes = holesFrom(kabupaten);
        if (holes.length) {
          maskRef.current = L.polygon(
            [
              [
                [20, 80],
                [20, 150],
                [-20, 150],
                [-20, 80],
              ],
              ...holes,
            ],
            { pane: "flood-mask", stroke: false, fillColor: "#1c1915", fillOpacity: 0.45, interactive: false },
          ).addTo(map);
        }
        if (extent) {
          map.fitBounds(
            [
              [extent.south, extent.west],
              [extent.north, extent.east],
            ],
            { padding: [16, 16], animate: false },
          );
        }
        const lines = await readJson(bigQueryUrl(0, `wapro1='${province}' OR wapro2='${province}'`), 20000);
        if (cancelled) return;
        lineRef.current = L.geoJSON(lines, {
          pane: "flood-lines",
          interactive: false,
          style: { color: "#143028", weight: 1.6, opacity: 0.9 },
        }).addTo(map);
      } catch {
        if (!cancelled) setBigNote("Batas BIG tidak tersedia. Raster inaRISK tetap diminta tanpa pemotongan provinsi.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [province]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    dasRef.current?.remove();
    dasRef.current = null;
    if (!showDas) {
      setDasNote("");
      return undefined;
    }
    let cancelled = false;
    setDasNote("Memuat Klasifikasi DAS KLHK…");
    (async () => {
      try {
        const kabupaten = await readJson(bigQueryUrl(2, `wadmpr='${province}'`), 20000);
        const box = envelopeOf(kabupaten);
        if (!box) throw new Error("extent");
        const features = [];
        for (let offset = 0; offset < 2000; offset += 1000) {
          const page = await readJson(dasQueryUrl(box, offset), 20000);
          const batch = page.features ?? [];
          features.push(...batch);
          if (batch.length < 1000) break;
        }
        if (cancelled) return;
        dasRef.current = L.geoJSON(
          { type: "FeatureCollection", features },
          {
            pane: "flood-das",
            style: (feature) => {
              const kriteria = feature?.properties?.KRITERIA || feature?.properties?.kriteria || "";
              const dipulihkan = kriteria === "DIPULIHKAN";
              return {
                color: dipulihkan ? "#9a3412" : "#1d4ed8",
                weight: 1.2,
                fillColor: dipulihkan ? "#9a3412" : "#1d4ed8",
                fillOpacity: 0.08,
              };
            },
            onEachFeature(feature, layer) {
              const nama = feature?.properties?.NAMA_DAS || feature?.properties?.nama_das || "DAS";
              const kriteria = feature?.properties?.KRITERIA || feature?.properties?.kriteria || "";
              layer.bindTooltip(`${nama} — ${kriteria}`, { sticky: true });
            },
          },
        ).addTo(map);
        setDasNote(
          features.length
            ? `${features.length} DAS pada jendela provinsi. Label mengikuti kolom KRITERIA.`
            : "Tidak ada DAS pada jendela ini.",
        );
      } catch {
        if (!cancelled) setDasNote("Klasifikasi DAS KLHK tidak tersedia. Peta risiko tetap ditampilkan.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showDas, province]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const onClick = async (event) => {
      const token = ++identifyRef.current;
      setIdentify("Memeriksa nilai indeks…");
      try {
        const payload = await readJson(identifyUrl(event.latlng.lng, event.latlng.lat), 8000);
        if (token !== identifyRef.current) return;
        const reading = legendClass(payload?.value);
        if (reading.kind === "nodata") {
          setIdentify(NODATA_LABEL);
          return;
        }
        const kelas = reading.kelas ? ` Kelas legenda: ${reading.kelas}.` : " Di luar rentang legenda 0–1,0.";
        setIdentify(`Indeks risiko ${reading.teks}.${kelas} Bukan peringatan dini.`);
      } catch {
        if (token === identifyRef.current) setIdentify(IDENTIFY_FAIL);
      }
    };
    map.on("click", onClick);
    return () => map.off("click", onClick);
  }, []);

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>Peta Risiko Banjir</h2>
          <p>{FLOOD_PERMISSION}</p>
        </div>
      </header>
      <div className="logic-body">
        <p>
          <a href={INARISK_PORTAL} target="_blank" rel="noreferrer">
            Portal inaRISK
          </a>
          . Status peta ini belum Aktif. Izin tertulis BNPB menyusul.
        </p>
        <div className="province-filter" role="group" aria-label="Provinsi peta banjir">
          {PROVINCES.map((name) => (
            <button key={name} type="button" aria-pressed={province === name} onClick={() => setProvince(name)}>
              {name}
            </button>
          ))}
        </div>
        <div className="province-filter" role="group" aria-label="Lapisan tambahan">
          <button type="button" aria-pressed={showDas} onClick={() => setShowDas((value) => !value)}>
            Klasifikasi DAS KLHK
          </button>
          <button type="button" aria-pressed={showBahaya} onClick={() => setShowBahaya((value) => !value)}>
            Bahaya banjir
          </button>
        </div>
        <p className="fine">
          DAS memakai label layanan apa adanya: DIPULIHKAN atau DIPERTAHANKAN. Lapisan bahaya adalah tampilan bawaan
          layanan, bukan indeks risiko, dan tidak punya kelas legenda pada metadata layanan.
        </p>
        {mapError ? (
          <p className="banner warn" role="status">
            <strong>{mapError}</strong>
            <p>
              <a href={INARISK_PORTAL} target="_blank" rel="noreferrer">
                Portal inaRISK
              </a>
            </p>
          </p>
        ) : null}
        {bigNote ? <p className="fine">{bigNote}</p> : null}
        {dasNote ? <p className="fine">{dasNote}</p> : null}
        <div ref={containerRef} className="map-canvas flood-map" role="application" aria-label="Peta indeks risiko banjir" />
        <p className="fine">{RISK_ATTRIBUTION}</p>
        <div className="flood-legend">
          {legendOk ? (
            <img src={LEGEND_IMAGE} alt="Legenda indeks risiko inaRISK" onError={() => setLegendOk(false)} />
          ) : null}
          <p>0–0,3 Rendah. 0,3–0,6 Sedang. 0,6–1,0 Tinggi.</p>
        </div>
        <p className="fine" role="status">
          {identify || "Klik peta untuk membaca indeks pada titik itu."}
        </p>
      </div>
    </section>
  );
}
