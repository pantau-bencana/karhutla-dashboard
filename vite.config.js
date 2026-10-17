import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(root, "data");

function dataMiddleware() {
  return (req, res, next) => {
    try {
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
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      createReadStream(resolved).pipe(res);
    } catch {
      next();
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    {
      name: "sample-data",
      configureServer(server) {
        server.middlewares.use("/data", dataMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use("/data", dataMiddleware());
      },
      closeBundle() {
        cpSync(dataDir, path.join(root, "dist", "data"), { recursive: true });
      },
    },
  ],
});
