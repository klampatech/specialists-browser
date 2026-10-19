#!/usr/bin/env python3
"""
grind_parallel.py — Autonomous parallel decompile orchestrator.

Runs the chunk → codex-decompile → codex-review pipeline in parallel,
commits every N methods, and keeps going until the priority queue is
empty. Designed to run in the background as a long-lived process.

Throughput: ~3-5 methods/minute when 5 codex workers + 2 review workers
run concurrently.

Usage:
  python3 tools/decompile/grind_parallel.py [--workers N] [--max N]

State:
  - progress/grind_parallel.pid (master PID)
  - progress/workers/<name>.pid (per-worker PID)
  - progress/workers/<name>.log (per-worker log)
"""
from __future__ import annotations
import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

REPO = Path("/home/kyle/Development/specialists-browser")
CHUNKS = REPO / "tools/decompile/chunks"
OUT = REPO / "tools/decompile/output"
CV = REPO / "tools/decompile/cross-vendor"
LOG = REPO / "progress/decomp-log.md"
WORKERS = REPO / "progress/workers"
PID_FILE = REPO / "progress/grind_parallel.pid"
REMAINING = REPO / "progress/remaining-methods.json"

WORKERS.mkdir(parents=True, exist_ok=True)


def log(msg: str) -> None:
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [parallel] {msg}\n"
    with open(LOG, "a") as f:
        f.write(line)
    print(line, end="", flush=True)


def env() -> dict:
    e = os.environ.copy()
    e["PATH"] = "/home/kyle/bin:" + e.get("PATH", "")
    e["MINIMAX_API_KEY_UNUSED"] = "placeholder"
    return e


def load_remaining() -> list[dict]:
    """Return list of remaining {cls, method, size} dicts (mutated on commit)."""
    if not REMAINING.exists():
        log(f"FATAL: {REMAINING} missing")
        sys.exit(1)
    return json.loads(REMAINING.read_text())


def save_remaining(items: list[dict]) -> None:
    REMAINING.write_text(json.dumps(items, indent=2))


def is_done(cls: str, method: str) -> bool:
    """A method is done if a canonical output file exists for it."""
    pattern = f"{cls}__{method}"
    for f in OUT.glob(f"{pattern}*.ts"):
        # Exclude the cross-vendor outputs (those live in CV/, not OUT/)
        return True
    return False


def find_done_set() -> set[str]:
    done = set()
    for f in OUT.glob("*.ts"):
        stem = f.stem
        parts = stem.split("__", 1)
        if len(parts) == 2:
            cls = parts[0]
            # strip _p_..., _r_... suffix from method
            meth = parts[1].split("_p_")[0].split("_r_")[0]
            done.add(f"{cls}::{meth}")
    return done


def spawn(name: str, cmd: list[str], cwd: Path = REPO) -> int:
    """Spawn a detached subprocess. Returns PID."""
    log_file = WORKERS / f"{name}.log"
    with open(log_file, "ab") as f:
        proc = subprocess.Popen(
            cmd,
            cwd=str(cwd),
            env=env(),
            stdout=f, stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
        )
    pid_file = WORKERS / f"{name}.pid"
    pid_file.write_text(f"{proc.pid}\n")
    return proc.pid


def alive(pid: int) -> bool:
    """True if process is alive AND not a zombie."""
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    # Zombies are technically alive but the work is done. Check /proc/<pid>/stat.
    try:
        with open(f"/proc/{pid}/stat") as f:
            stat = f.read().split()
        state = stat[2]  # 3rd field is process state (R/S/D/Z/T/...)
        if state == "Z":
            return False
    except (FileNotFoundError, IndexError):
        pass
    return True


def wait_for(name: str, timeout: float = 7200.0) -> bool:
    """Wait for a worker to finish. Returns True if completed, False on timeout."""
    pid_file = WORKERS / f"{name}.pid"
    if not pid_file.exists():
        return False
    pid = int(pid_file.read_text().strip())
    start = time.time()
    while alive(pid):
        if time.time() - start > timeout:
            return False
        time.sleep(5)
    return True


def chunk_then_codex(cls: str, mname: str) -> bool:
    """Run chunk.py for the symbol, then spawn codex. Returns True if spawned."""
    sym = find_symbol_for(cls, mname)
    if not sym:
        log(f"  no symbol for {cls}::{mname}, skipping")
        return False
    name = f"codex_{cls}_{mname}".replace("/", "_").replace("?", "_")
    # Skip if already done
    if (CV / f"{cls}__{mname}__codex.ts").exists():
        log(f"  codex already done for {cls}::{mname}")
        return True  # considered done from codex step
    # Spawn codex directly — decompile.py will run chunk for us
    log(f"  spawning codex for {cls}::{mname}")
    spawn(name, [sys.executable, "tools/decompile/decompile.py",
                 "--use", "codex", "--no-rerun-chunk", sym])
    return True


def find_symbol_for(cls: str, method: str) -> str | None:
    """Find the mangled symbol for a (class, method) pair from the symbol table."""
    nm_file = REPO / "tools/decompile/analysis/nm-D-CTS-specific.txt"
    if not nm_file.exists():
        return None
    # symbols look like: 00000000 T ActivateSlow__13CTSSlowMotion
    for line in nm_file.read_text().splitlines():
        parts = line.split()
        if len(parts) >= 4 and parts[2] == "T":
            sym = parts[-1]
            m = re.match(r"^(.+?)__(\d+)([A-Za-z0-9_]+)$", sym)
            if not m:
                continue
            meth, cls_len, rest = m.groups()
            cls_name = rest[:int(cls_len)]
            if cls_name == cls and meth == method:
                return sym
    return None


def run_review(cls: str, mname: str) -> bool:
    """Spawn the review pass for a (cls, method) pair."""
    sym = find_symbol_for(cls, mname)
    if not sym:
        return False
    name = f"review_{cls}_{mname}".replace("/", "_").replace("?", "_")
    log(f"  spawning review for {cls}::{mname}")
    spawn(name, [sys.executable, "tools/decompile/decompile-review.py", sym])
    return True


def commit_batch(msg: str) -> bool:
    """Commit + push. Returns True on success."""
    log(f"  committing: {msg}")
    e = env()
    r = subprocess.run(["git", "add", "-A"], cwd=REPO, env=e, capture_output=True, text=True)
    if r.returncode != 0:
        log(f"  git add failed: {r.stderr}")
        return False
    r = subprocess.run(["git", "commit", "-m", msg], cwd=REPO, env=e, capture_output=True, text=True)
    if r.returncode != 0:
        # Possibly nothing to commit
        log(f"  git commit returned {r.returncode}: {r.stderr[-300:]}")
        return False
    log(f"  committed: {r.stdout.strip()[:80]}")
    # Don't auto-push; vault sync is a separate concern
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=5, help="max parallel codex workers")
    ap.add_argument("--max", type=int, default=999, help="max methods to process this run")
    ap.add_argument("--commit-every", type=int, default=5)
    ap.add_argument("--review-timeout", type=int, default=1800, help="per-method review timeout (sec)")
    args = ap.parse_args()

    PID_FILE.write_text(f"{os.getpid()}\n")

    remaining = load_remaining()
    done = find_done_set()
    log(f"Starting. Remaining: {len(remaining)}, Already done: {len(done)}")

    success_count = 0
    failures: list[tuple[str, str]] = []
    commit_countdown = args.commit_every

    # We track codex and review jobs by (cls, mname)
    # State machine per item: pending → codex_running → review_running → done

    # Iterate through remaining list, marking done items as we go.
    # We process in priority order (already sorted by remaining-methods.json).
    items = []
    for entry in remaining:
        cls = entry["cls"]
        mname = entry["method"]
        key = f"{cls}::{mname}"
        if key in done:
            continue
        items.append((cls, mname))

    log(f"Pending work: {len(items)} methods")

    i = 0
    in_flight: dict[tuple[str, str], str] = {}  # (cls,mname) -> worker_name
    while i < len(items) or in_flight:
        # Fill up to args.workers concurrent jobs
        while len(in_flight) < args.workers and i < len(items):
            cls, mname = items[i]
            i += 1
            if chunk_then_codex(cls, mname):
                in_flight[(cls, mname)] = f"codex_{cls}_{mname}".replace("/", "_").replace("?", "_")
            else:
                log(f"  skip {cls}::{mname}: no symbol found")

        if not in_flight:
            break

        # Wait for any one to finish, then transition to review
        time.sleep(3)
        for (cls, mname), wname in list(in_flight.items()):
            worker_pid_file = WORKERS / f"{wname}.pid"
            if not worker_pid_file.exists():
                # worker gone but no pid file? skip
                continue
            try:
                pid = int(worker_pid_file.read_text().strip())
            except Exception:
                continue
            if alive(pid):
                continue
            # Worker finished — check whether it was codex or review
            if wname.startswith("codex_"):
                # transition to review
                run_review(cls, mname)
                in_flight[(cls, mname)] = f"review_{cls}_{mname}".replace("/", "_").replace("?", "_")
            else:
                # Review done — verify canonical exists
                # canonical filename: <cls>__<mname>.ts (possibly with arg suffix)
                canonical_candidates = list(OUT.glob(f"{cls}__{mname}*.ts"))
                if canonical_candidates:
                    log(f"  ✓ {cls}::{mname} → {canonical_candidates[0].name}")
                    success_count += 1
                    # Remove from remaining-methods.json
                    remaining = [e for e in remaining
                                 if not (e["cls"] == cls and e["method"] == mname)]
                    save_remaining(remaining)
                    # Commit if cadence hit
                    commit_countdown -= 1
                    if commit_countdown <= 0:
                        commit_batch(f"tools+src: decomp batch — {success_count} methods")
                        commit_countdown = args.commit_every
                else:
                    log(f"  ✗ {cls}::{mname} produced no canonical output")
                    failures.append((cls, mname))
                del in_flight[(cls, mname)]

        # Master PID health check
        if not alive(os.getpid()):
            break

    log(f"\n=== GRIND COMPLETE ===")
    log(f"Successes: {success_count}")
    log(f"Failures: {len(failures)}")
    if failures:
        log("Failed methods:")
        for cls, mname in failures:
            log(f"  - {cls}::{mname}")


if __name__ == "__main__":
    main()