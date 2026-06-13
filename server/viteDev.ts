import fs from "fs";
import path from "path";
import { type Express } from "express";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { log } from "./log";

/** Dev-only Vite middleware — never imported in production (see server/app.ts). */
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer, createLogger } = await import("vite");
  const react = (await import("@vitejs/plugin-react")).default;

  const repoRoot = path.resolve(import.meta.dirname, "..");
  const clientRoot = path.resolve(repoRoot, "client");
  const viteLogger = createLogger();

  const vite = await createViteServer({
    configFile: false,
    plugins: [react()],
    root: clientRoot,
    resolve: {
      alias: {
        "@": path.resolve(clientRoot, "src"),
        "@shared": path.resolve(repoRoot, "shared"),
        "@assets": path.resolve(repoRoot, "attached_assets"),
        "lucide-react": path.resolve(clientRoot, "src", "lib", "lucide-react.tsx"),
      },
    },
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server, overlay: false },
      allowedHosts: true,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  try {
    log("Warming up client (Vite)…");
    const clientTemplate = path.resolve(clientRoot, "index.html");
    const template = await fs.promises.readFile(clientTemplate, "utf-8");
    await vite.transformIndexHtml("/", template);
    await vite.warmupRequest("/src/main.tsx");
    log("Client ready — open http://localhost:" + (process.env.PORT || "5000"));
  } catch (warmErr) {
    console.warn("[vite] Warmup skipped (first page load may be slower):", warmErr);
  }

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(clientRoot, "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
