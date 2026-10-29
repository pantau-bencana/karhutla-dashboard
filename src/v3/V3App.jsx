import { useEffect, useState } from "react";
import { App } from "../App.jsx";
import { GunungPage } from "./pages/GunungPage.jsx";
import { SummaryPage } from "./pages/SummaryPage.jsx";
import { V3Shell, lokasiDariHash } from "./V3Shell.jsx";

function useLokasi() {
  const [lokasi, setLokasi] = useState(() => lokasiDariHash(window.location.hash));
  useEffect(() => {
    const sinkron = () => setLokasi(lokasiDariHash(window.location.hash));
    window.addEventListener("hashchange", sinkron);
    return () => window.removeEventListener("hashchange", sinkron);
  }, []);
  return lokasi;
}

export function V3App() {
  const lokasi = useLokasi();
  const ringkas = lokasi.page === "ringkasan" && lokasi.hazard === "karhutla";
  const halamanGunung = lokasi.hazard === "gunung-api"
    && !["glosarium", "metode", "siklon", "irbi", "rekap"].includes(lokasi.page);
  const [wilayah, setWilayah] = useState("");
  const [jendela, setJendela] = useState("hari");
  const [muat, setMuat] = useState(0);

  function onMuat() {
    if (ringkas || halamanGunung) {
      setMuat((nilai) => nilai + 1);
      return;
    }
    document.querySelector(".v3-app .topbar button.btn:not(.menu-btn)")?.click();
  }

  return (
    <V3Shell location={lokasi} onMuat={onMuat} ringkas={ringkas}>
      {ringkas ? (
        <SummaryPage
          wilayah={wilayah}
          setWilayah={setWilayah}
          jendela={jendela}
          setJendela={setJendela}
          muat={muat}
          onMuat={onMuat}
        />
      ) : halamanGunung ? (
        <GunungPage muat={muat} />
      ) : (
        <App />
      )}
    </V3Shell>
  );
}
