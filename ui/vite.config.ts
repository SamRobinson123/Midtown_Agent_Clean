import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // your FastAPI mounts the UI at /ui, so make all asset paths relative to /ui/
  base: "/ui/",
});
