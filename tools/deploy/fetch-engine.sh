#!/usr/bin/env bash
# fetch-engine.sh — stage the Xash3D FWGS dedicated-server binaries.
#
# WHY THIS EXISTS
# ---------------
# The native `xash` binary the Rust port loads is NOT in this repo, and it
# is not a build artifact of anything here — it is upstream's own build. It
# used to be hand-copied out of /tmp/xashds/, which meant every image build
# depended on whatever happened to be lying around on one machine.
#
# WHY IT PINS BY CHECKSUM
# -----------------------
# The only published source for a 0.21-era xashds is the `continuous` release
# tag:
#   https://github.com/FWGS/xash3d-fwgs/releases/download/continuous/xashds-linux-amd64.tar.gz
#
# There is no v0.21 tag with an xashds asset, and `continuous` is a ROLLING
# tag — it is replaced in place. Fetching it tomorrow can legitimately yield a
# different engine, and a dedicated server silently swapping engine builds
# underneath a running fleet is exactly the kind of change nobody wants to
# discover from a client bug report.
#
# So the checksums below are the contract. If upstream's rolling build moves,
# this script FAILS rather than quietly producing a different binary. That is
# the intended behaviour: update the pins deliberately, after reading the diff.
#
# The `filesystem_stdio.so` sibling is pinned for the same reason — it is the
# VFS the engine calls into, and swapping it out from under the Rust server DLL
# is the same class of surprise.
#
# VERIFIED against the binaries that produced every passing test to date:
#   Xash3D FWGS 0.21, built on Ubuntu 22.04.3.

set -euo pipefail

OUT="${1:-/tmp/engine}"
XASH_SHA="dd4ad840eda680b30fbb638546a31581433c653c78d84580364426aff8ba1294"
FSO_SHA="9ed9f44dae85eb5eb8dd56183aa37c3096a56ba3bbbca0d20dc5df85aa2aaffd"
URL="https://github.com/FWGS/xash3d-fwgs/releases/download/continuous/xashds-linux-amd64.tar.gz"

mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

verify() {  # verify <file> <expected> <label>
  local got
  got="$(sha256sum "$1" | cut -d' ' -f1)"
  if [[ "$got" != "$2" ]]; then
    cat >&2 <<EOF

  ENGINE DRIFT — refusing to continue.

    $3
      pinned   $2
      fetched  $got

  Upstream's 'continuous' tag has moved. That is a rolling release, so a
  changed checksum is expected over time — but adopting it should be a
  deliberate decision, not a side effect of building an image.

  To adopt the new build: re-run this script with the fetch step skipped,
  copy the new checksums in above, and re-run the 32-player load test
  (docs/PRODUCTION-INFRA.md section 3) before deploying it to a fleet.

EOF
    exit 1
  fi
}

# Already staged and matching? Nothing to do.
if [[ -f "$OUT/xash" && -f "$OUT/filesystem_stdio.so" ]]; then
  if [[ "$(sha256sum "$OUT/xash" | cut -d' ' -f1)" == "$XASH_SHA" ]]; then
    echo "  engine already staged and verified in $OUT"
    exit 0
  fi
  rm -f "$OUT/xash" "$OUT/filesystem_stdio.so"
fi

echo "  fetching xashds (Xash3D FWGS 0.21-era, continuous tag)..."
curl -sSL --max-time 300 -o "$TMP/xashds.tar.gz" "$URL"

tar -xzf "$TMP/xashds.tar.gz" -C "$TMP"
# The release archive nests everything under xashds-linux-amd64/. Do not
# assume a flat layout - unpack then locate, so a future archive that drops
# the directory still works.
SRC="$(find "$TMP" -type f -name xash -printf '%h\n' | head -1)"
if [[ -z "$SRC" || ! -f "$SRC/filesystem_stdio.so" ]]; then
  echo "  unexpected archive layout:" >&2
  tar -tzf "$TMP/xashds.tar.gz" >&2
  exit 1
fi
cp "$SRC/xash" "$SRC/filesystem_stdio.so" "$OUT/"
chmod +x "$OUT/xash"

verify "$OUT/xash" "$XASH_SHA" "xash"
verify "$OUT/filesystem_stdio.so" "$FSO_SHA" "filesystem_stdio.so"

echo "  OK — staged and checksum-verified in $OUT"
echo "  note: these are upstream binaries; the Rust server DLL is built"
echo "        separately (cargo build --release -p ts-server-dll)."