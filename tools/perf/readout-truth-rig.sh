#!/usr/bin/env bash
# THE RIG, AS ONE SCRIPT.
#
# Xvfb, a headful Chrome with the DevTools port open, and the local
# build served with the CI stack behind it. The gate needs all three,
# and starting them by hand in three separate terminals is how the
# "port 8899 is already in use" and "chrome is running but there is no
# DevTools port" traps get met.
set -u

DISPLAY_NUM=:99
CHROME_DIR=/tmp/chrome-rig
PORT=9223

# The browser that works here is the Playwright build: the system
# Chrome starts, but on this box its DevTools port never opens.
CHROME="$HOME/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome)"

pkill -f "remote-debugging-port=$PORT" 2>/dev/null
pkill -f "Xvfb $DISPLAY_NUM" 2>/dev/null
sleep 1
rm -rf "$CHROME_DIR"

Xvfb "$DISPLAY_NUM" -screen 0 1600x1200x24 >/tmp/xvfb.log 2>&1 &
sleep 3

# HEADLESS, ON PURPOSE.
#
# A headful Chrome on this box starts, its GPU process dies in a loop,
# and it never opens its DevTools port (measured 2026-11-16: seven flag
# sets, including --disable-gpu, --in-process-gpu and --single-process).
# The headless build opens the port first time, and the gate needs no
# native chrome: the options overlay opens on the Escape key, and a
# headless page has no browser UI to swallow it.
DISPLAY="$DISPLAY_NUM" "$CHROME" \
  --headless=new \
  --remote-debugging-port="$PORT" \
  --remote-allow-origins='*' \
  --ignore-certificate-errors \
  --enable-unsafe-swiftshader \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  --user-data-dir="$CHROME_DIR" \
  --window-size=1600,1200 \
  about:blank >/tmp/chrome-rig.log 2>&1 &

for i in $(seq 1 20); do
  sleep 1
  if curl -s --max-time 2 "http://127.0.0.1:$PORT/json/version" | grep -q Browser; then
    echo "chrome is up on $PORT"
    break
  fi
done

curl -s --max-time 5 "http://127.0.0.1:$PORT/json/version" | head -c 200
echo
echo "the rig is up — Ctrl-C to tear it down"
wait
