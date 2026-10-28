import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

createRoot(document.getElementById("root")).render(<App />);
