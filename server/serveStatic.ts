import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/** Production client — serves dist/public (no Vite dependency). */
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Run "npm run build" from the project root first.`,
    );
  }

  app.use(express.static(distPath));

  app.use("*", (req, res) => {
    // Never SPA-fallback asset paths — stale hashed JS URLs must 404, not return HTML
    // (browser/SW would try to execute HTML as JS → stuck on "Loading…").
    if (/\.(js|mjs|css|map|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|json)$/i.test(req.path)) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
