import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  server: {
    port: 5190,
    host: "0.0.0.0",
    strictPort: true,
    open: false,
    // Vite's filesystem sandbox blocks symlinks by default; the
    // babylon/public/sounds symlink to _runtime_assets/half-life/ts/sound
    // resolves outside the project root, so we need to allow the
    // target path. See https://vitejs.dev/config/server-options.html#server-fs-allow
    fs: {
      allow: [
        // Allow Vite to read through the symlink to the game assets.
        "/home/kyle/Development/specialists-browser/_runtime_assets",
      ],
    },
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
