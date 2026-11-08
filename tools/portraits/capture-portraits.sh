#!/usr/bin/env bash
# Capture every character model in a TS `models/player` tree with the
# Half-Life Asset Manager (https://github.com/SamVanheer/HalfLifeAssetManager),
# headless, under Xvfb + Mesa software GL.
#
#   docs/design-assets/capture-portraits.sh <player-dir> <out-dir>
#
# WHAT THIS IS FOR
# ----------------
# The mod ships one .mdl per character under `ts/models/player/<name>/`.
# The GAME only draws portrait art for the seven characters in its own
# default `mp_teammodels` (seal;merc|gordon;laurence|agent|hitman;castor):
# `ts/models/player/<name>/<name>.bmp` exists for exactly those seven.
# Every other character model has no portrait at all.
#
# HLAM renders the .mdl the way GoldSource does, so a screenshot of it is
# a true portrait of the character - and it is the only way to get one for
# the characters the mod does not draw art for.
#
# THE OUTPUT IS A CAPTURE, NOT A PORTRAIT YET
# -------------------------------------------
# Each capture is the raw viewport: the whole character, framed by HLAM's
# own auto-centring, on a transparent background. `normalize-portraits.py`
# turns those into the uniform portraits (same scale, same crop, same
# baseline) that the character picker uses.
#
# DEPENDS ON
# -----------
#   * `hlam` - the Half-Life Asset Manager 3.0 Linux build:
#       https://github.com/SamVanheer/HalfLifeAssetManager/releases
#       (halflifeassetmanager_3.0.0_amd64.deb)
#   * `xvfb`, `openbox`, `xdotool`, `imagemagick` (for `import`)
#   * Mesa's software rasteriser (llvmpipe) - no GPU needed
#
# HOW THE APP IS DRIVEN
# ----------------------
# HLAM has no scripting API, so it is driven through the window:
#   * F10 is "Take Screenshot...", which opens a save dialog; the path is
#     typed in and Enter commits it,
#   * the timeline's Play/Pause and Restart buttons put the model in a
#     deterministic pose - frame 0 of sequence 0, animation stopped - so
#     two captures of the same model are byte-identical,
#   * HLAM is single-instance: a second process hands its file to the
#     first and exits. So each capture starts by making sure no instance
#     is alive, and the window we drive is matched by THIS model's name.
set -uo pipefail

PLAYERS="${1:?usage: capture-portraits.sh <player-dir> <out-dir>}"
OUTDIR="${2:?usage: capture-portraits.sh <player-dir> <out-dir>}"
WORK="${HLAM_WORKDIR:-/tmp/hlam-capture}"
DISPLAY_NUM="${HLAM_DISPLAY:-:99}"

# The window size we force, and the timeline button coordinates in it.
WIN_W=1600; WIN_H=1150
RESTART_X=1213; RESTART_Y=1180
PAUSE_X=1320;   PAUSE_Y=1180

export DISPLAY="$DISPLAY_NUM"

die() { echo "FAIL: $*" >&2; exit 1; }
command -v hlam >/dev/null || die "hlam is not installed"
command -v xdotool >/dev/null || die "xdotool is not installed"

mkdir -p "$WORK" "$OUTDIR"

# HLAM in portable mode keeps its settings next to argv[0]; invoked as a
# bare "hlam" that is the working directory. Seed it so the capture is
# transparent-background (an FBO render, not the window grab).
INI="$WORK/Half-Life Asset Manager.ini"
if [ ! -f "$INI" ]; then
  cat > "$INI" <<'EOF'
[General]
OneAssetAtATime=false
PauseAnimationsOnTimelineClick=true

[Video]
TransparentScreenshots=true
EOF
fi

# A display and a window manager: without a WM the menus and dialogs do
# not get focus, and xdotool cannot drive them.
if ! xdpyinfo >/dev/null 2>&1; then
  Xvfb "$DISPLAY_NUM" -screen 0 1600x1200x24 -nolisten tcp >"$WORK/xvfb.log" 2>&1 &
  XVFB_PID=$!
  sleep 2
  openbox >"$WORK/openbox.log" 2>&1 &
  OB_PID=$!
  trap 'kill $XVFB_PID $OB_PID 2>/dev/null' EXIT
  sleep 1
fi

capture_one() {
  local model="$1" out="$2" base
  base="$(basename "$model")"

  # No stale instance: it would swallow the file and leave its own window.
  pkill -f 'hlam --portable' 2>/dev/null
  for _ in $(seq 1 40); do
    pgrep -f 'hlam --portable' >/dev/null || break
    sleep 0.25
  done

  rm -f "$out"
  ( cd "$WORK" && hlam --portable "$model" > "$WORK/hlam.log" 2>&1 & echo $! > "$WORK/hlam.pid" )
  local hpid; hpid="$(cat "$WORK/hlam.pid")"

  # Wait for THIS model's window (its title carries the model path).
  local wid=""
  for _ in $(seq 1 120); do
    wid=$(xdotool search --name "$base" 2>/dev/null | while read -r w; do
             xdotool getwindowname "$w" 2>/dev/null | grep -q -- "$base" && echo "$w"
           done | head -1)
    [ -n "$wid" ] && break
    sleep 0.5
  done
  if [ -z "$wid" ]; then
    kill "$hpid" 2>/dev/null
    return 1
  fi

  sleep 2
  xdotool windowsize "$wid" "$WIN_W" "$WIN_H" 2>/dev/null
  xdotool windowmove "$wid" 0 0 2>/dev/null
  xdotool windowactivate "$wid" 2>/dev/null
  sleep 2

  # Deterministic pose: pause the animation, then rewind to frame 0.
  xdotool mousemove --window "$wid" "$PAUSE_X" "$PAUSE_Y" click 1
  sleep 0.5
  xdotool mousemove --window "$wid" "$RESTART_X" "$RESTART_Y" click 1
  sleep 1.5

  # Take Screenshot... -> save dialog -> type the path -> Enter.
  xdotool key F10
  sleep 3
  xdotool type --delay 12 "$out"
  sleep 1
  xdotool key Return

  local ok=0
  for _ in $(seq 1 40); do
    [ -s "$out" ] && { ok=1; break; }
    sleep 0.5
  done

  kill "$hpid" 2>/dev/null; sleep 0.5; kill -9 "$hpid" 2>/dev/null
  pkill -f 'hlam --portable' 2>/dev/null
  [ "$ok" = 1 ]
}

for dir in "$PLAYERS"/*/; do
  name="$(basename "$dir")"
  mdl="$(ls "$dir"*.mdl 2>/dev/null | head -1)"
  [ -n "$mdl" ] || { echo "SKIP $name (no .mdl)"; continue; }
  printf '=== %s <- %s\n' "$name" "$(basename "$mdl")"
  capture_one "$mdl" "$OUTDIR/$name.png" || echo "FAILED $name"
done

echo
echo "=== captures ==="
ls -la "$OUTDIR"
