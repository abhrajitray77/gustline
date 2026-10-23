import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    // In local dev the API runs separately on :8000.
    proxy: { "/api": "http://localhost:8000" },
    // File change events don't reach WSL from a Windows drive, so poll instead.
    watch: { usePolling: true },
  },
});
