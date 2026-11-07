#!/usr/bin/env bash
# Find the EXPENSIVE spots on a map, so the regression fixture stands
# where a regression is easiest to see.
#
# WHY
# ---
# The fixture node is the map's FIRST nav node. It is reproducible —
# the same spot on every run — but it is ARBITRARY, and it may well be
# a quiet corner of the map. A regression fixture that stands in a
# quiet corner hides a regression: the frame cost is so low that a 10%
# regression reads as noise.
#
# So the map's nav nodes are read in order, the player is put on each
# one, the frame cost is measured, and the most expensive node is the
# one to keep.
#
# The MAP is not chosen here. Run measure-map-cost.sh first to find
# the heaviest map, then point this at it.
#
# USAGE
#   tools/perf/scan-fixture-cost.sh <map> [node-index ...]
#
# With no node indexes, it scans the first ten.
set -uo pipefail

REPO=/home/kyle/Development/specialists-browser
MAP="${1:-}"
shift || true

if [ -z "$MAP" ]; then
  echo "usage: $0 <map> [node-index ...]" >&2
  exit 2
fi

NODES=("$@")
if [ ${#NODES[@]} -eq 0 ]; then
  NODES=(0 1 2 3 4 5 6 7 8 9)
fi

# The settle is the long pole: a teleport invalidates the client's PVS
# and the cost keeps falling for a minute or so after it. A shorter
# settle than the fixture uses is a deliberate trade — a scan of ten
# positions at a minute each is ten minutes, and the scan is looking
# for the EXPENSIVE spots, where the post-teleport decay matters
# least.
SETTLE_MIN=${SCAN_SETTLE_MIN_MS:-45000}

echo ""
echo "==================================================================="
echo "  SCANNING: $MAP"
echo "==================================================================="

for NODE in "${NODES[@]}"; do
  echo ""
  echo "  --- node $NODE ---"
  timeout 500 node "$REPO/tools/perf/measure-engine-cost.cjs" \
    --repeat 2 --map "$MAP" --fixture-node "$NODE" --settle-min-ms "$SETTLE_MIN" 2>&1 \
    | grep -E "fixture:|settling:|SETTLED|tick" | sed 's/^/    /'
done
