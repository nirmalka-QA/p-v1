import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { federation } from "@module-federation/vite";
import { wisprAliases } from "../../tools/vite/wispr-aliases";
import mfConfig from "./module-federation.config";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), federation(mfConfig)],
  resolve: { alias: wisprAliases },
  // The @wispr/* libs are aliased to source for instant HMR (see wispr-aliases). Exclude them
  // from dep pre-bundling so Vite serves their latest source directly — otherwise a new export
  // stays hidden behind a stale, immutable-cached optimized bundle (same `?v=` hash reused across
  // in-place re-bundles) until node_modules/.vite is wiped AND the browser cache cleared.
  optimizeDeps: {
    exclude: [
      "@wispr/contracts",
      "@wispr/ui",
      "@wispr/tokens",
      "@wispr/services",
      "@wispr/store",
      "@wispr/mfe-runtime",
      "@wispr/projects",
      "@wispr/utils",
    ],
  },
  // Module Federation requires top-level await support.
  build: { target: "esnext" },
  server: {
    port: 4200,
    // Route all /api traffic through the local nginx edge (port 8080). nginx already handles:
    //   /api/strategy/…      → strategy module  (rewrites to /strategy/v1/…)
    //   /api/requirements/…  → requirements module (rewrites to /requirements/v1/…)
    //   everything else      → Core
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
