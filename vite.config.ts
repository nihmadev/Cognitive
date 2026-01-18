import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-ignore - process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host: "127.0.0.1",
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    // Ensure assets are properly placed and accessible
    assetsDir: "assets",
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep original structure for icons - important for Tauri asset protocol
          if (assetInfo.name && assetInfo.name.includes('icons')) {
            return 'icons/[name].[ext]';
          }
          return 'assets/[name].[ext]';
        }
      }
    },
    // Copy public directory assets as-is for Tauri asset protocol
    copyPublicDir: true
  },
  publicDir: 'public',
}));
