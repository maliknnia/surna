import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      "lucide-react": path.resolve(import.meta.dirname, "client", "src", "lib", "lucide-react.tsx"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Don't pull recharts into the home-route preload graph — only analytics pages need it.
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter(
          (dep) =>
            !dep.includes("recharts") &&
            !dep.includes("charts-") &&
            !dep.includes("leaflet") &&
            !dep.includes("maps-"),
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Do NOT split recharts/d3 into "charts" — it creates a circular import with the
          // react "vendor" chunk and crashes production with "Cannot access before initialization".
          if (id.includes("leaflet") || id.includes("@googlemaps")) return "maps";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@radix-ui") || id.includes("lucide-react")) return "ui";
          if (id.includes("clsx") || id.includes("tailwind-merge")) return "utils";
          if (id.includes("react-dom") || id.includes("/react/")) return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY || "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});
