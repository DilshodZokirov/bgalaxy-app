import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Capacitor APK ichida fayllar relative yo‘l bilan yuklanadi (base: "./").
// Oddiy Vercel/web buildida esa base: "/" qoladi.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "capacitor" ? "./" : "/",
  server: {
    port: 5173,
  },
}));
