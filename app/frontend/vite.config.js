import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/upload": "http://localhost:3000",
      "/blobs": "http://localhost:3000",
      "/metrics": "http://localhost:3000",
      "/anchor": "http://localhost:3000"
    }
  }
});
