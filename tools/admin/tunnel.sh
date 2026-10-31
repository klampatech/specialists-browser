#!/usr/bin/env bash
#
# tunnel.sh — open the admin console's SSH tunnel.
#
#   tools/admin/tunnel.sh            open the tunnel and print the URL
#   tools/admin/tunnel.sh --check    report whether it is already up
#
# THE CONSOLE IS LOOPBACK ONLY
# ----------------------------
# The admin service binds 127.0.0.1:8095 on the production box. It has
# no public vhost, no DNS record, and nothing routes to it from the
# internet -- not by a password guess, not by a scanner, not at all
# (docs/ADMIN-CONSOLE.md §4.1). The way in is an SSH tunnel:
#
#     ssh -N -L 8095:127.0.0.1:8095 bb-prod
#
# and this script is that command, plus the two things a bare command
# does not do: it says the URL, and it refuses to start a second tunnel
# on top of the first.
#
# WHY A SCRIPT AND NOT AN SSH CONFIG ALIAS
# ----------------------------------------
# An alias in ~/.ssh/config is a change to ONE machine. It is a
# convenience, and a good one -- but it is not something anybody else
# can use, and it is not in the repository where a reviewer can read
# it. This file is the record: the same host, the same port, the same
# key, for whoever runs it.
#
# IT REFUSES TO START TWICE
# -------------------------
# A second `ssh -L` on a port that is already forwarded fails inside
# ssh, with a message about "address already in use" that arrives late
# and reads like a network problem. So the script checks the port
# FIRST, with a TCP connect, and says plainly what it found: either
# the tunnel is already up -- in which case the console is already
# reachable and there is nothing to do -- or something else is on the
# port, which the operator needs to know about.
#
# IT LEAVES NOTHING BEHIND
# -------------------------
# The tunnel is a child process, and the script kills it on the way out
# -- on Ctrl-C, on a failed start, on any error. There is no state
# file, no lock file and no half-open forward: the port is free again
# the moment the script ends. `ExitOnForwardFailure=yes` does the same
# job on the other side of the handshake: if the forward cannot be
# bound, ssh EXITS instead of sitting there with a tunnel that does not
# work.
#
# THE ENVIRONMENT
# ---------------
#   ADMIN_TUNNEL_HOST       the ssh host            default bb-prod
#   ADMIN_TUNNEL_LOCAL_PORT the local port          default 8095
#   ADMIN_TUNNEL_REMOTE_PORT the port on the host   default 8095
#   ADMIN_TUNNEL_KEY        the ssh key             default ~/.ssh/id_specialists_ovh
#   ADMIN_TUNNEL_SSH        the ssh binary          default ssh
#
# ADMIN_TUNNEL_SSH exists so the unit test can stand a fake ssh in
# front of the script and prove the two behaviours that matter: that it
# refuses to start twice, and that it leaves nothing behind. It is not
# a way to skip the checks -- every check runs whatever binary is
# named.

set -euo pipefail

HOST="${ADMIN_TUNNEL_HOST:-bb-prod}"
LOCAL_PORT="${ADMIN_TUNNEL_LOCAL_PORT:-8095}"
REMOTE_PORT="${ADMIN_TUNNEL_REMOTE_PORT:-8095}"
KEY="${ADMIN_TUNNEL_KEY:-$HOME/.ssh/id_specialists_ovh}"
SSH="${ADMIN_TUNNEL_SSH:-ssh}"

die() { echo "tunnel: $*" >&2; exit 1; }

# IS SOMETHING ALREADY LISTENING ON THE LOCAL PORT?
#
# A TCP connect is the honest test: a port that accepts a connection is
# a port that is IN USE, whether it is this tunnel, another ssh -L, or
# a leftover from a terminal that was closed without cleaning up.
port_is_open() {
  (exec 3<>"/dev/tcp/127.0.0.1/${1}") 2>/dev/null
}

# ── --check: is the console already reachable? ─────────────────────────────
if [ "${1:-}" = "--check" ]; then
  if ! port_is_open "$LOCAL_PORT"; then
    echo "tunnel: nothing is listening on 127.0.0.1:${LOCAL_PORT} -- the tunnel is not up"
    exit 1
  fi
  echo "tunnel: something is listening on 127.0.0.1:${LOCAL_PORT}"
  if command -v curl >/dev/null 2>&1; then
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
      "http://127.0.0.1:${LOCAL_PORT}/" 2>/dev/null || echo 000)"
    echo "tunnel: the console answers with HTTP ${code}"
    if [ "$code" = "200" ]; then
      echo "tunnel: the console is at http://127.0.0.1:${LOCAL_PORT}/"
    fi
  fi
  exit 0
fi

# THE ALREADY-UP CHECK. Before anything is started, so a second tunnel
# fails with THIS message instead of ssh's -- and before the key is
# looked at, because a tunnel that is already up needs no key.
if port_is_open "$LOCAL_PORT"; then
  echo "tunnel: something is already listening on 127.0.0.1:${LOCAL_PORT}" >&2
  echo "  If that is the tunnel, the console is already at http://127.0.0.1:${LOCAL_PORT}/" >&2
  echo "  and there is nothing to do. Close the other terminal and run this again." >&2
  exit 1
fi

[ -r "$KEY" ] || die "the SSH key is not readable: ${KEY}
  The console's tunnel uses the specialists key; see
  docs/ADMIN-CONSOLE-RUNBOOK.md."

SSH_PID=""
cleanup() {
  if [ -n "$SSH_PID" ] && kill -0 "$SSH_PID" 2>/dev/null; then
    kill "$SSH_PID" 2>/dev/null || true
    wait "$SSH_PID" 2>/dev/null || true
  fi
}
# The EXIT trap is what makes the promise true on EVERY path out of this
# script: Ctrl-C, a failed start, an error, a normal end.
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"$SSH" -N \
  -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
  -i "$KEY" \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  "$HOST" &
SSH_PID=$!

# WAIT FOR THE FORWARD TO BE THERE, so the URL this script prints is a
# URL that works.
came_up=0
for _ in $(seq 1 50); do
  if ! kill -0 "$SSH_PID" 2>/dev/null; then
    wait "$SSH_PID" 2>/dev/null || true
    die "the tunnel did not start: ssh exited. Its own error is above."
  fi
  if port_is_open "$LOCAL_PORT"; then
    came_up=1
    break
  fi
  sleep 0.2
done

if [ "$came_up" != "1" ]; then
  die "the tunnel did not come up on 127.0.0.1:${LOCAL_PORT} within 10 seconds."
fi

echo "tunnel: the admin console is at http://127.0.0.1:${LOCAL_PORT}/"
echo "tunnel: ${HOST} -- Ctrl-C closes it."

wait "$SSH_PID"
