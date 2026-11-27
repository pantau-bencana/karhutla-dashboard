import { cpSync, createReadStream, existsSync, renameSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(root, "data");
const outDir = path.join(root, "dist", "teknis");

function dataMiddleware() {
  return (req, res, next) => {
    try {
      if ((req.url || "").includes("import")) {
        next();
        return;
      }
      const raw = decodeURIComponent((req.url || "/").split("?")[0]);
      const rel = path.normalize(raw).replace(/^[/\\]+/, "");
      if (!rel || rel.startsWith("..") || rel.includes(`..${path.sep}`)) {
        next();
        return;
      }
      const resolved = path.resolve(dataDir, rel);
      const base = dataDir.endsWith(path.sep) ? dataDir : dataDir + path.sep;
      if (!resolved.startsWith(base) || !existsSync(resolved) || !statSync(resolved).isFile()) {
        next();
        return;
      }
      const type = resolved.endsWith(".json") || resolved.endsWith(".topojson")
        ? "application/json; charset=utf-8"
        : resolved.endsWith(".png")
          ? "image/png"
          : "text/csv; charset=utf-8";
      res.setHeader("Content-Type", type);
      res.setHeader("Cache-Control", "no-cache");
      createReadStream(resolved).pipe(res);
    } catch {
      next();
    }
  };
}

// VITE_BASE_PATH dari configure-pages, misalnya "/karhutla-dashboard/".
// Mode Teknis memakai edisi v0.2 pada jalur "teknis/". Folder /v2/ tetap dipertahankan.
function siteBase() {
  const raw = String(process.env.VITE_BASE_PATH ?? "").trim();
  if (!raw || raw === "/" || raw === "./") return "./";
  const withSlash = raw.endsWith("/") ? raw : `${raw}/`;
  return `${withSlash}teknis/`;
}

export default defineConfig({
  base: siteBase(),
  plugins: [
    react(),
    {
      name: "teknis-index-dan-data",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url || "/";
          if (url === "/" || url.startsWith("/?")) req.url = `/index-v2.html${url.slice(1)}`;
          next();
        });
        server.middlewares.use("/data", dataMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use("/data", dataMiddleware());
      },
      closeBundle() {
        const builtHtml = path.join(outDir, "index-v2.html");
        if (existsSync(builtHtml)) renameSync(builtHtml, path.join(outDir, "index.html"));
        cpSync(dataDir, path.join(outDir, "data"), {
          recursive: true,
          filter(source) {
            const rel = path.relative(dataDir, source);
            if (!rel) return true;
            return rel.split(path.sep)[0] !== "boundaries";
          },
        });
      },
    },
  ],
  build: {
    outDir: "dist/teknis",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(root, "index-v2.html"),
    },
  },
});
