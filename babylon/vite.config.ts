import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "../public",
  server: {
    port: 5175,
    host: "127.0.0.1",
    strictPort: true,
    open: false,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
});
