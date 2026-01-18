import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";


const host = process.env.TAURI_DEV_HOST;


export default defineConfig(async () => ({
  plugins: [react()],

  
  
  
  clearScreen: false,
  
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
      
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    
    assetsDir: "assets",
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          
          if (assetInfo.name && assetInfo.name.includes('icons')) {
            return 'icons/[name].[ext]';
          }
          return 'assets/[name].[ext]';
        }
      }
    },
    
    copyPublicDir: true
  },
  publicDir: 'public',
}));
