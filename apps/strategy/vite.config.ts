import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { federation } from "@module-federation/vite";
import { wisprAliases } from "../../tools/vite/wispr-aliases";
import mfConfig from "./module-federation.config";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), federation(mfConfig)],
  resolve: { alias: wisprAliases },
  build: { target: "esnext" },
  server: { port: 4203, strictPort: true, cors: true },
  preview: { port: 4203, strictPort: true, cors: true },
});
