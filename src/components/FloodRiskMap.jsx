import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { osmTileLayer } from "../lib/basemap.js";
import { INDONESIA_FRAME, INDONESIA_PAN_LIMIT } from "../lib/geo.js";
import { ANALISIS_WARNA } from "../lib/analisisPantauBencana.js";
import { kodeWilayah } from "../lib/floodMatrix.js";
import {
  FLOOD_PERMISSION,
  IDENTIFY_FAIL,
  INARISK_PORTAL,
  NODATA_LABEL,
  RISK_ATTRIBUTION,
  legendClass,
} from "../lib/floodMatrix.js";
import {
  BAHAYA_SERVICE,
  LEGEND_IMAGE,
  RISIKO_SERVICE,
  bigQueryUrl,
  exportImageUrl,
  identifyUrl,
} from "../lib/floodServices.js";

const PERINGATAN_TANPA_IRBI = "#c4b49a";

function envelopeOf(features) {
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
  for (const feature of features ?? []) walk(feature.geometry?.coordinates);
  if (south > north) return null;
  return { south, north, west, east };
}

async function readJson(url, timeoutMs) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.error) throw new Error(payload.error.message || "Permintaan layanan gagal");
  return payload;
}

let nationalCache = null;
let nationalLoad = null;

async function loadNationalKab() {
  if (nationalCache) return nationalCache;
  if (!nationalLoad) {
    nationalLoad = (async () => {
      const features = [];
      let offset = 0;
      for (let page = 0; page < 8; page += 1) {
        const payload = await readJson(bigQueryUrl(2, "1=1", { offset, recordCount: 250, allowableOffset: "0.45" }), 40000);
        const list = payload.features ?? [];
        features.push(...list);
        if (!list.length || payload.exceededTransferLimit === false) break;
        if (list.length < 250 && !payload.exceededTransferLimit) break;
        offset += list.length;
        if (!payload.exceededTransferLimit && list.length < 250) break;
      }
      nationalCache = features;
      return features;
    })().catch((error) => {
      nationalLoad = null;
      throw error;
    });
  }
  return nationalLoad;
}

function paintOf(province, feature, kabPaint, provPaint) {
  if (province) {
    const kode = kodeWilayah(feature?.properties?.kdpkab);
    return kabPaint?.get(kode) ?? null;
  }
  return provPaint?.get(feature?.properties?.wadmpr) ?? null;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function tooltipFor(province, feature, kabPaint, provPaint) {
  const nama = province ? feature?.properties?.wadmkk : feature?.properties?.wadmpr;
  const paint = paintOf(province, feature, kabPaint, provPaint);
  if (province && paint?.status && paint.pendudukBaris?.length) {
    return [nama, paint.status, ...paint.pendudukBaris].filter(Boolean).map(escapeHtml).join("<br>");
  }
  return nama ? escapeHtml(nama) : "";
}

export function FloodRiskMap({ province = "", onProvince, kabPaint, provPaint }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const riskRef = useRef(null);
  const bahayaRef = useRef(null);
  const kabRef = useRef(null);
  const lineRef = useRef(null);
  const geomRef = useRef(null);
  const tokenRef = useRef(0);
  const identifyRef = useRef(0);
  const identifyHandler = useRef(() => {});
  const provinceRef = useRef(province);
  const inariskRef = useRef(false);
  const [showInarisk, setShowInarisk] = useState(false);
  const [showBahaya, setShowBahaya] = useState(false);
  const [mapError, setMapError] = useState("");
  const [bigNote, setBigNote] = useState("");
  const [identify, setIdentify] = useState("");
  const [legendOk, setLegendOk] = useState(true);
  const [loadingMap, setLoadingMap] = useState(false);

  provinceRef.current = province;
  inariskRef.current = showInarisk;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
      minZoom: 4,
      maxBounds: [
        [INDONESIA_PAN_LIMIT.south, INDONESIA_PAN_LIMIT.west],
        [INDONESIA_PAN_LIMIT.north, INDONESIA_PAN_LIMIT.east],
      ],
    });
    osmTileLayer(L).addTo(map);
    map.createPane("flood-lines");
    map.getPane("flood-lines").style.zIndex = 450;
    map.fitBounds(
      [
        [INDONESIA_FRAME.south, INDONESIA_FRAME.west],
        [INDONESIA_FRAME.north, INDONESIA_FRAME.east],
      ],
      { animate: false },
    );
    map.on("click", (event) => {
      if (provinceRef.current && inariskRef.current) identifyHandler.current(event);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showInarisk) {
      riskRef.current?.remove();
      bahayaRef.current?.remove();
      riskRef.current = null;
      bahayaRef.current = null;
      return undefined;
    }
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
      place(riskRef, RISIKO_SERVICE, showBahaya ? 0.55 : 0.75);
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
  }, [showInarisk, showBahaya]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    let cancelled = false;
    kabRef.current?.remove();
    lineRef.current?.remove();
    geomRef.current?.remove();
    kabRef.current = null;
    lineRef.current = null;
    geomRef.current = null;
    setBigNote("");
    setLoadingMap(true);
    const where = province ? `wadmpr='${province.replaceAll("'", "''")}'` : "1=1";
    (async () => {
      try {
        const features = province
          ? (await readJson(bigQueryUrl(2, where, { offset: 0, recordCount: 300, allowableOffset: "0.05" }), 30000)).features ?? []
          : await loadNationalKab();
        if (cancelled) return;
        const drawn = province ? features.filter((feature) => feature?.properties?.wadmpr === province) : features;
        if (!drawn.length) {
          setBigNote("Batas kabupaten dari BIG tidak tersedia untuk tampilan ini.");
          setLoadingMap(false);
          return;
        }
        kabRef.current = L.geoJSON(
          { type: "FeatureCollection", features: drawn },
          {
            pane: "flood-lines",
            style: (feature) => {
              const paint = paintOf(province, feature, kabPaint, provPaint);
              const fill = paint?.fill || "#f4f1ea";
              return {
                color: paint?.fill ? "#57534e" : "#d6d3d1",
                weight: province ? 1 : 0.4,
                fillColor: fill,
                fillOpacity: paint?.fill ? 0.72 : 0.35,
                dashArray: paint?.hatch ? "4 3" : null,
              };
            },
            onEachFeature(feature, layer) {
              const tip = tooltipFor(province, feature, kabPaint, provPaint);
              if (tip) layer.bindTooltip(tip, { sticky: true, className: "flood-tip" });
              if (!province) {
                layer.on("click", (event) => {
                  L.DomEvent.stopPropagation(event);
                  const next = feature?.properties?.wadmpr;
                  if (next) onProvince?.(next);
                });
              }
            },
          },
        ).addTo(map);
        const extent = envelopeOf(drawn);
        if (province && extent) {
          map.fitBounds(
            [
              [extent.south, extent.west],
              [extent.north, extent.east],
            ],
            { padding: [16, 16], animate: false },
          );
        } else if (!province) {
          map.fitBounds(
            [
              [INDONESIA_FRAME.south, INDONESIA_FRAME.west],
              [INDONESIA_FRAME.north, INDONESIA_FRAME.east],
            ],
            { animate: false },
          );
        }
        if (province) {
          try {
            const lines = await readJson(bigQueryUrl(0, `wapro1='${province.replaceAll("'", "''")}' OR wapro2='${province.replaceAll("'", "''")}'`), 20000);
            if (!cancelled) {
              lineRef.current = L.geoJSON(lines, {
                pane: "flood-lines",
                interactive: false,
                style: { color: "#143028", weight: 1.6, opacity: 0.9 },
              }).addTo(map);
            }
          } catch {
            if (!cancelled) setBigNote("Garis batas provinsi BIG tidak tersedia. Wilayah kabupaten tetap ditampilkan.");
          }
        }
      } catch {
        if (!cancelled) setBigNote("Batas BIG tidak tersedia. Peta wilayah tidak dapat digambar pada pembaruan ini.");
      } finally {
        if (!cancelled) setLoadingMap(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [province, onProvince]);

  useEffect(() => {
    kabRef.current?.eachLayer((layer) => {
      const feature = layer.feature;
      const paint = paintOf(province, feature, kabPaint, provPaint);
      const fill = paint?.fill || "#f4f1ea";
      layer.setStyle({
        color: paint?.fill ? "#57534e" : "#d6d3d1",
        weight: province ? 1 : 0.4,
        fillColor: fill,
        fillOpacity: paint?.fill ? 0.72 : 0.35,
        dashArray: paint?.hatch ? "4 3" : null,
      });
      const tip = tooltipFor(province, feature, kabPaint, provPaint);
      if (tip) layer.bindTooltip(tip, { sticky: true, className: "flood-tip" });
      else layer.unbindTooltip();
    });
  }, [province, kabPaint, provPaint, loadingMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !province) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(new URL("data/live/bmkg-cap-geom.json", document.baseURI).href, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled) return;
        const features = [];
        for (const cap of payload?.caps ?? []) {
          for (const ring of cap.rings ?? []) {
            if (ring.length < 3) continue;
            features.push({
              type: "Feature",
              properties: { cap_id: cap.cap_id, event: cap.event, severity: cap.severity },
              geometry: { type: "Polygon", coordinates: [ring] },
            });
          }
        }
        if (!features.length) return;
        geomRef.current = L.geoJSON(
          { type: "FeatureCollection", features },
          {
            interactive: false,
            style: { color: "#9a3412", weight: 1.2, fillOpacity: 0, dashArray: "2 3" },
          },
        ).addTo(map);
      } catch {
        /* poligon CAP tidak wajib ada pada cuplikan */
      }
    })();
    return () => {
      cancelled = true;
      geomRef.current?.remove();
      geomRef.current = null;
    };
  }, [province]);

  identifyHandler.current = async (event) => {
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

  return (
    <div className="flood-map-block">
      <div className="province-filter" role="group" aria-label="Lapisan peta banjir">
        <button type="button" aria-pressed={showInarisk} onClick={() => setShowInarisk((value) => !value)}>
          Overlay inaRISK
        </button>
        {showInarisk ? (
          <button type="button" aria-pressed={showBahaya} onClick={() => setShowBahaya((value) => !value)}>
            Bahaya banjir
          </button>
        ) : null}
      </div>
      <p className="fine">{FLOOD_PERMISSION} Overlay inaRISK mati sampai dinyalakan. Status peta inaRISK belum Aktif.</p>
      {mapError ? (
        <p className="banner warn" role="status">
          <strong>{mapError}</strong>{" "}
          <a href={INARISK_PORTAL} target="_blank" rel="noopener noreferrer">
            Portal inaRISK
          </a>
        </p>
      ) : null}
      {loadingMap ? <p className="fine">Memuat batas wilayah dari BIG…</p> : null}
      {bigNote ? <p className="fine">{bigNote}</p> : null}
      <div ref={containerRef} className="map-canvas flood-map" role="application" aria-label="Peta banjir Indonesia" />
      <div className="flood-legend" aria-label="Legenda peta">
        {Object.entries(ANALISIS_WARNA).map(([nama, warna]) => (
          <span key={nama}>
            <i style={{ background: warna }} /> {nama}
          </span>
        ))}
        <span>
          <i style={{ background: PERINGATAN_TANPA_IRBI }} /> Peringatan aktif, kelas IRBI belum ada
        </span>
        <span>
          <i style={{ background: "#f4f1ea", border: "1px solid #d6d3d1" }} /> Tidak ada peringatan aktif
        </span>
      </div>
      <p className="fine">
        Warna Awas, Siaga, dan Waspada adalah analisis dasbor, bukan status resmi. Tanpa peringatan yang masih berlaku, wilayah tidak diwarnai.
      </p>
      {showInarisk ? (
        <>
          <p className="fine">{RISK_ATTRIBUTION}</p>
          <div className="flood-legend">
            {legendOk ? <img src={LEGEND_IMAGE} alt="Legenda indeks risiko inaRISK" onError={() => setLegendOk(false)} /> : null}
            <p>0–0,3 Rendah. 0,3–0,6 Sedang. 0,6–1,0 Tinggi.</p>
          </div>
          <p className="fine" role="status">
            {province ? identify || "Klik peta untuk membaca indeks pada titik itu." : "Pilih provinsi, lalu klik peta untuk membaca indeks."}
          </p>
        </>
      ) : null}
    </div>
  );
}
