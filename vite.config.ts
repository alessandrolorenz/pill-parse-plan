import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@pill-parse/core": path.resolve(__dirname, "./packages/core/src"),
    },
  },
  test: {
    // Scoped deliberately: apps/mobile runs the same harness under Jest with the
    // React Native preset. Vitest's default root-wide glob would try to execute
    // those RN tests in this Node environment and fail confusingly.
    include: ["packages/*/src/**/*.test.ts"],
  },
}));
