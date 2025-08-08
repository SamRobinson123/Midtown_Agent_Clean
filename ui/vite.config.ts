import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/ui/" // ensures assets resolve when FastAPI mounts at /ui
});
