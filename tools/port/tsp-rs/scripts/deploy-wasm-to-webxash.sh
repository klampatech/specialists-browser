#!/usr/bin/env bash
# deploy-wasm-to-webxash.sh — copy the built ts-client WASM into
# webxash/public/cl_dlls/, overwriting the HL client WASM the engine
# expects at that path.
#
# IMPORTANT semantic:
#   After this step, the engine will load OUR TS port's client as the
#   cl_dll. The exported DLL functions (Initialize, HUD_*) are the same
#   surface the engine calls; behavior is what changes.
#
# When you don't want this — e.g. to test HL-mode — restore the backup:
#   webxash/public/cl_dlls/client_emscripten_wasm32.wasm.<bk>.bak
# OR run build-ts-dll.sh + copy back the original.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
DIST="$REPO_ROOT/tools/port/tsp-rs/dist/ts-client_emscripten_wasm32.wasm"
DEST="$REPO_ROOT/webxash/public/cl_dlls/client_emscripten_wasm32.wasm"
BACKUP="$DEST.ts-port-$(date +%Y%m%d-%H%M%S).bak"

if [[ ! -f $DIST ]]; then
    echo "dist artifact not at $DIST" >&2
    echo "  run: bash tools/port/tsp-rs/scripts/build-wasm.sh" >&2
    exit 1
fi

# Backup whatever was at the destination before overwriting, so reverting
# to the old HL client is one mv away.
if [[ -f $DEST ]]; then
    cp "$DEST" "$BACKUP"
    echo "deploy-wasm-to-webxash: backed up $DEST -> $BACKUP"
fi

cp "$DIST" "$DEST"
echo "deployed: $DIST -> $DEST"
ls -la "$DEST" "$BACKUP" 2>&1 | awk '{print $5, $NF}'

echo
echo "next steps:"
echo "  pnpm --dir webxash dev      # vite dev server picks up the new cl DLL"
echo "  open https://100.95.111.112:5174/webXash/"
echo "  launch with -game ts +sv_lan 1 +map ts_lobby"
