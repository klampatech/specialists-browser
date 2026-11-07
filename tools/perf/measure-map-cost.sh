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

# THE REPO ROOT, DERIVED FROM WHERE THIS SCRIPT LIVES.
#
# It used to be hardcoded to /home/kyle/Development/specialists-browser,
# which works on Kyle's machine and nowhere else. The unit suite could
# not see it either — the two tests that read these scripts hardcoded
# the same path, so they passed locally and failed on the CI runner
# (where the repo is at /home/runner/work/...) with an ENOENT.
#
# It is derived BEFORE the snapshot copy below, because inside the
# snapshot BASH_SOURCE points at the temp file and the original
# location is gone — so the root travels with the snapshot as an
# exported variable.
REPO="${XASH_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
export XASH_REPO_ROOT="$REPO"

# RUN FROM A SNAPSHOT.
#
# Bash reads a script INCREMENTALLY, by byte offset. So editing a
# script while it is running does not change the lines already read —
# it SHIFTS THE BYTES, and bash lands mid-line on whatever the edit
# left there. That is how the map sweep died with
#
#     line 70: syntax error near unexpected token `('
#
# on a line that was perfectly valid when written: the edit landed
# while the sweep was executing it. The sweep's RESULTS were fine (it
# had finished every map); only the teardown broke.
#
# So the script copies ITSELF to a snapshot and runs the snapshot.
# The copy cannot be edited out from under it.
if [ -z "${XASH_PERF_SNAPSHOT:-}" ]; then
  SNAPSHOT=$(mktemp "${TMPDIR:-/tmp}/xash-perf-XXXXXX.sh")
  cp "$0" "$SNAPSHOT"
  chmod +x "$SNAPSHOT"
  export XASH_PERF_SNAPSHOT=1
  export XASH_PERF_SNAPSHOT_FILE="$SNAPSHOT"
  exec bash "$SNAPSHOT" "$@"
fi

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
    LOG=$(mktemp)
    timeout 500 node "$REPO/tools/perf/measure-engine-cost.cjs" --repeat 4 --map "$MAP" >"$LOG" 2>&1
    RC=$?
    grep -E "map:|fixture:|view:|settling:|SETTLED|tick" "$LOG" | sed 's/^/  /'

    # A RUN THAT PRODUCED NO RESULT MUST BE LOUD.
    #
    # The first version of this script piped the harness straight into
    # a grep, so a run that threw — or was killed by the timeout —
    # left NO line in the output at all, and a map with no data looked
    # exactly like a map with no result. Two maps came back empty that
    # way and nobody could tell why. The full log is kept, and the
    # reason is printed.
    if ! grep -q "SETTLED" "$LOG"; then
      echo "  *** RUN $RUN PRODUCED NO RESULT (exit $RC) — the tail of its log:"
      tail -20 "$LOG" | sed 's/^/      /'
    fi
    rm -f "$LOG"
  done
done

echo ""
echo "==================================================================="
echo "  tearing the CI stack down"
echo "==================================================================="
ssh -o BatchMode=yes "$PROD" 'bash /home/ubuntu/ci-stack.sh down' 2>&1 | tail -4

# The snapshot cleans itself up.
[ -n "${XASH_PERF_SNAPSHOT_FILE:-}" ] && rm -f "$XASH_PERF_SNAPSHOT_FILE"
