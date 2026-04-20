import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const publicSupabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://chkgnqrfrtovcpqwogeg.supabase.co";

const publicSupabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoa2ducXJmcnRvdmNwcXdvZ2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTI1MzMsImV4cCI6MjA5MTY4ODUzM30.qXWNcTH1DH0f83g8ZMf7CJRSF1prpPlU_jxwIQ91E2k";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(publicSupabaseUrl),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(publicSupabaseKey),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
      "framer-motion",
      "lucide-react",
      "@supabase/supabase-js",
    ],
  },
  // Pré-bundle das libs mais pesadas evita waterfall de imports na 1ª tela.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "framer-motion",
      "lucide-react",
      "date-fns",
      "sonner",
    ],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    // recharts (~500KB) and html2canvas (PDF export, ~200KB) are lazily loaded
    // and intentionally kept as separate vendor chunks.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['@radix-ui/react-tooltip', '@radix-ui/react-dialog', '@radix-ui/react-popover'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
}));
