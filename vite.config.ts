import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import monacoEditorPlugin from 'vite-plugin-monaco-editor';
import path from 'path';


const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [
    react(),
    monacoEditorPlugin.default({
      languageWorkers: ['editorWorkerService', 'typescript', 'json', 'css', 'html'],
      customWorkers: []
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Base path for Wails production builds
  base: './',
  
  
  clearScreen: false,
  
  server: {
    port: 6712,
    strictPort: true,
    host: host || "0.0.0.0",
    hmr: host
      ? {
          protocol: "ws",
          host: "0.0.0.0",
          port: 6712,
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
