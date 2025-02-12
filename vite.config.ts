import { nodePolyfills } from "vite-plugin-node-polyfills"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import config from "config"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills(),
    react(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-stuff": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
  },
  define: {
    CONFIG: config,
    global: {}, // needed for custom-event lib
  },
  publicDir: config.get("publicDir"),
  server: {
    cors:false,
    proxy: {
      "/cashu": {
        target: "http://127.0.0.1:8080", // Serve cashu.me here for development
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cashu/, ""),
      },
    },
  },
})
