import { createRoot } from "react-dom/client";
import { App } from "../App.jsx";
import { V2Shell } from "./V2Shell.jsx";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "../styles.css";
import "./theme.css";

createRoot(document.getElementById("root")).render(
  <V2Shell>
    <App />
  </V2Shell>,
);
