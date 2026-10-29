import { createRoot } from "react-dom/client";
import { V3App } from "./V3App.jsx";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "../styles.css";
import "./theme.css";

createRoot(document.getElementById("root")).render(<V3App />);
