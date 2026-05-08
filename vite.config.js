import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Vite dev server config
  server: {
    port: 1420,
    strictPort: true,
    // Tauri expects a fixed port
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },

  // Clear the terminal on startup
  clearScreen: false,

  // Environment variables prefix for Tauri
  envPrefix: ['VITE_', 'TAURI_'],

  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari14',
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    // Output to dist
    outDir: 'dist',
  },
});
