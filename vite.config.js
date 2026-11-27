import { cpSync, createReadStream, existsSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(root, "data");

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
      if (!resolved.startsWith(base)) {
        next();
        return;
      }
      if (!existsSync(resolved) || !statSync(resolved).isFile()) {
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

// GitHub Actions sets VITE_BASE_PATH from actions/configure-pages (for this
// repo, "/karhutla-dashboard"). A relative base still works locally and on
// Pages; the explicit prefix is what the project site serves.
function siteBase() {
  const raw = String(process.env.VITE_BASE_PATH ?? "").trim();
  if (!raw || raw === "/") return "./";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function kosongkanAkarDist() {
  return {
    name: "kosongkan-akar-dist",
    apply: "build",
    buildStart() {
      const dist = path.join(root, "dist");
      if (!existsSync(dist)) return;
      for (const nama of readdirSync(dist)) {
        if (nama === "v1" || nama === "v2" || nama === "v3" || nama === "teknis") continue;
        rmSync(path.join(dist, nama), { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig({
  base: siteBase(),
  plugins: [
    react(),
    kosongkanAkarDist(),
    {
      name: "sample-data",
      configureServer(server) {
        server.middlewares.use("/data", dataMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          const [pathname, search = ""] = (req.url || "/").split("?");
          const found = pathname.match(/^(?:\/karhutla-dashboard)?\/(teknis|v1|v2|v3)$/);
          if (found && req.method === "GET") {
            res.statusCode = 302;
            res.setHeader("Location", `${pathname}/${search ? `?${search}` : ""}`);
            res.end();
            return;
          }
          next();
        });
        server.middlewares.use("/data", dataMiddleware());
      },
      closeBundle() {
        writeFileSync(
          path.join(root, "dist", "teknis.html"),
          `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=./teknis/" />
    <link rel="canonical" href="./teknis/" />
    <title>Pantau Bencana — Mode Teknis</title>
    <script>location.replace(new URL("teknis/", window.location.href).href);</script>
  </head>
  <body>
    <p><a href="./teknis/">Lanjut ke Mode Teknis</a></p>
  </body>
</html>
`,
        );
        cpSync(dataDir, path.join(root, "dist", "data"), {
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
    emptyOutDir: false,
  },
});
