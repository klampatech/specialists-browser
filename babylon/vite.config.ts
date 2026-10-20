import { defineConfig } from "vite";
import * as path from "node:path";

export default defineConfig({
  // Vite's fs.allow entries are matched against the resolved absolute
  // path. A relative root made the comparison fail, so index.html itself
  // got rejected with a 403. Pin the root to an absolute path and derive
  // every allow entry from it so the two can never drift again.
  root: path.resolve(__dirname, "."),
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
        path.resolve(__dirname, ".."),        // repo root: src/mod/, _runtime_assets
        path.resolve(__dirname),              // babylon/ itself
        path.resolve(__dirname, "node_modules"),
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
