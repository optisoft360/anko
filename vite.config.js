import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: "@", replacement: "/src" }],
  },
  esbuild: {
    target: "esnext",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
  },
  optimizeDeps: {
    include: ["@uppy/core", "@uppy/dashboard", "@uppy/aws-s3", "@uppy/react"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      "/companion": {
        target: "http://127.0.0.1:3020",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/ws/": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
