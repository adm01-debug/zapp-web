import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://*.mapbox.com https://api.mapbox.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ai.gateway.lovable.dev https://api.elevenlabs.io https://api.mapbox.com https://events.mapbox.com; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
    },
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
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
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
          // Screenshot export (heavy)
          "vendor-html2canvas": ["html2canvas"],
        },
      },
    },
  },
}));
