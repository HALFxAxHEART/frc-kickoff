import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Two pages: the kickoff SPA (index.html) and the 5090 Wiring editor (wiring/index.html, served at /wiring/).
// The wiring editor is a separate page so its global styles (from Paradox Diagram) never touch the kickoff app.
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify("5090-1.0 (Paradox Diagram 1.3.4)") },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        wiring: fileURLToPath(new URL("./wiring/index.html", import.meta.url)),
      },
    },
  },
});
