#!/usr/bin/env bash
# Measure the engine's frame cost on several maps, one server at a time.
#
# WHY THIS EXISTS
# ---------------
# Kyle observed (2026-11-07) that ts_lobbyduel "seems to be the
# heaviest" map, and offered it as the level for a perf test. That is
# a claim worth checking with numbers rather than adopting on faith:
# a perf fixture that is not actually the worst case is a fixture
# that lets a regression hide.
#
# Each map gets its OWN CI server, booted on that map, because the
# server rotates its map on its own schedule and a run that straddles
# a rotation would measure two maps and report the average. (The CI
# instance now gets an empty map cycle, so it cannot rotate at all.)
#
# EVERY RUN IS FIXTURED: the map, the position (the map's own first
# nav node), the view angles and the warm-up are all pinned. That is
# the whole point — the first version of this script produced a clean
# looking table of six maps that was really measuring wherever the
# client happened to spawn.
#
# USAGE
#   tools/perf/measure-map-cost.sh ts_lobbyduel ts_casa ts_frigid ...
set -uo pipefail

REPO=/home/kyle/Development/specialists-browser
PROD=bb-prod
MAPS=("$@")
if [ ${#MAPS[@]} -eq 0 ]; then
  echo "usage: $0 <map> [map ...]" >&2
  exit 2
fi

for MAP in "${MAPS[@]}"; do
  echo ""
  echo "==================================================================="
  echo "  MAP: $MAP"
  echo "==================================================================="

  ssh -o BatchMode=yes "$PROD" 'bash /home/ubuntu/ci-stack.sh down' >/dev/null 2>&1
  ssh -o BatchMode=yes "$PROD" "CI_MAP=$MAP bash /home/ubuntu/ci-stack.sh up" 2>&1 | tail -2
  sleep 5

  # TWO RUNS PER MAP, because the spawn point is random and the
  # viewpoint moves the cost by several times. One run per map is a
  # sample, not a measurement.
  #
  # `--map` IS NOT OPTIONAL HERE. It is what makes the harness pin the
  # POSITION as well as the angles: the fixture node comes from the
  # map's own nav data, and without `--map` the harness only pins the
  # view and the spawn stays random — which is the confounded
  # measurement this script was written to replace.
  for RUN in 1 2; do
    timeout 500 node "$REPO/tools/perf/measure-engine-cost.cjs" --repeat 4 --map "$MAP" 2>&1 \
      | grep -E "map:|fixture:|view:|settling:|SETTLED|tick" | sed 's/^/  /'
  done
done

echo ""
echo "==================================================================="
echo "  tearing the CI stack down"
echo "==================================================================="
ssh -o BatchMode=yes "$PROD" 'bash /home/ubuntu/ci-stack.sh down' 2>&1 | tail -4
