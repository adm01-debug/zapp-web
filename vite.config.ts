import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "framer-motion"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "framer-motion"],
    force: true,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI framework
          "vendor-ui": ["framer-motion", "class-variance-authority", "clsx", "tailwind-merge"],
          // Data layer
          "vendor-data": ["@tanstack/react-query", "@supabase/supabase-js"],
          // Charts (heavy)
          "vendor-charts": ["recharts"],
          // i18n
          "vendor-i18n": ["i18next", "react-i18next"],
          // Spreadsheet export (heavy)
          "vendor-xlsx": ["xlsx"],
          // PDF
          "vendor-pdf": ["jspdf", "jspdf-autotable"],
          // Maps (heavy)
          "vendor-mapbox": ["mapbox-gl"],
          // ElevenLabs
          "vendor-elevenlabs": ["@elevenlabs/react"],
          // Date utilities - consolidate micro-chunks
          "vendor-date-fns": ["date-fns"],
        },
      },
    },
  },
}));
