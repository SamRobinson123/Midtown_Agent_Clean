import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // App is served at /ui (FastAPI mounts it there)
  base: "/ui/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
