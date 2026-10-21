#!/usr/bin/env bash
# Verify the toolchain the shim work depends on.
#
# Three things can be missing after a reboot or on a fresh machine, and
# all three fail in confusing ways (an empty disassembly, a "module not
# found", or a browser that silently doesn't launch):
#
#   1. wabt's wasm-objdump   — every structural analysis depends on it
#   2. emscripten           — builds the shim
#   3. playwright + chromium — runs the browser tests
#
# Run this before touching the shim. Everything it prints a ✗ for needs
# fixing before analysis or verification is trustworthy.

set -uo pipefail
fail=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; fail=1; }

echo "=== 1. wabt (wasm-objdump) ==="
# Not usually on PATH — it ships as a tarball in /tmp. Check both.
WABT_BIN=""
if command -v wasm-objdump >/dev/null 2>&1; then
  WABT_BIN="$(command -v wasm-objdump)"
elif [ -x /tmp/wabt-1.0.42/bin/wasm-objdump ]; then
  WABT_BIN="/tmp/wabt-1.0.42/bin/wasm-objdump"
fi
if [ -n "$WABT_BIN" ]; then
  ok "wasm-objdump at $WABT_BIN"
  if ! command -v wasm-objdump >/dev/null 2>&1; then
    echo "      not on PATH — prefix analysis commands with:"
    echo "        export PATH=\"/tmp/wabt-1.0.42/bin:\$PATH\""
  fi
else
  bad "wasm-objdump not found (checked PATH and /tmp/wabt-1.0.42/bin)"
  echo "      fix A: export PATH=\"/tmp/wabt-1.0.42/bin:\$PATH\"   # if /tmp survived"
  echo "      fix B: sudo apt-get install -y wabt                  # 1.0.36 is sufficient"
fi

echo
echo "=== 2. emscripten (emcc) ==="
if command -v emcc >/dev/null 2>&1; then
  ok "emcc $(emcc --version 2>&1 | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
elif [ -f /home/kyle/emsdk/emsdk_env.sh ]; then
  ok "emsdk present but not on PATH — run: source /home/kyle/emsdk/emsdk_env.sh"
else
  bad "no emcc and no /home/kyle/emsdk/emsdk_env.sh"
fi

echo
echo "=== 3. playwright-core + chromium (browser tests) ==="
PW_CORE=""
for cand in /home/kyle/Development/*/node_modules/playwright-core \
            /home/kyle/node_modules/playwright-core; do
  [ -d "$cand" ] && { PW_CORE="$cand"; break; }
done
if [ -n "$PW_CORE" ]; then
  ok "playwright-core at $PW_CORE"
else
  bad "playwright-core not found"
  echo "      fix: cd <some repo> && npm i -D playwright-core"
fi

CHROME=""
for cand in /home/kyle/.cache/ms-playwright/chromium-*/chrome-linux64/chrome; do
  [ -x "$cand" ] && CHROME="$cand"
done
if [ -n "$CHROME" ]; then
  ok "chromium at $CHROME"
  echo "      (test-harness scripts auto-detect the newest build)"
else
  bad "no chromium in /home/kyle/.cache/ms-playwright/"
  echo "      fix: npx playwright install chromium"
fi

echo
echo "=== 4. live dev server ==="
if curl -sfk -o /dev/null --max-time 4 https://100.95.111.112:5174/webXash/; then
  ok "webXash responding on :5174"
else
  bad "webXash not responding on :5174"
  echo "      the browser tests need it; check the vite process"
fi

echo
echo "=== 5. baseline rollback ==="
BAK=/tmp/hl_emscripten_wasm32.wasm.bak
if [ -f "$BAK" ]; then
  ok "rollback baseline present ($(sha256sum "$BAK" | cut -c1-16)...)"
else
  bad "rollback baseline MISSING at $BAK"
  echo "      without it there is no way back from a bad deploy"
fi

echo
if [ "$fail" -eq 0 ]; then
  printf '\033[32mAll toolchain checks passed.\033[0m\n'
else
  printf '\033[31mSome checks failed — fix the ✗ items before trusting analysis.\033[0m\n'
fi
exit $fail