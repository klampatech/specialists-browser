#!/usr/bin/env python3
"""
batch.py — High-throughput decomp pipeline.

Runs the chunk → codex-decompile → codex-review cycle for a list of
symbols sequentially, logging to `progress/decomp-log.md` and committing
per batch. Designed to run in the background; resilient to individual
failures (continues on error).

Usage:
  python3 tools/decompile/batch.py --symbols Spawn__8CTSTimer Use__8CTSTimer
  python3 tools/decompile/batch.py --class CTSTimer  # decompiles all remaining methods of a class
  python3 tools/decompile/batch.py --auto  # picks the next batch from progress/decomp-todo.txt
  python3 tools/decompile/batch.py --commit-every 5  # commit + push every 5 methods
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DECOMPILE_DIR = REPO_ROOT / "tools" / "decompile"
PROGRESS_DIR = REPO_ROOT / "progress"
CHUNKS_DIR = DECOMPILE_DIR / "chunks"
OUTPUT_DIR = DECOMPILE_DIR / "output"
CROSS_VENDOR_DIR = DECOMPILE_DIR / "cross-vendor"

DECOMPILE_PY = DECOMPILE_DIR / "decompile.py"
REVIEW_PY = DECOMPILE_DIR / "decompile-review.py"
CHUNK_PY = DECOMPILE_DIR / "chunk.py"

LOG_PATH = PROGRESS_DIR / "decomp-log.md"
TODO_PATH = PROGRESS_DIR / "decomp-todo.txt"


def now() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def log(msg: str) -> None:
    print(f"[{now()}] {msg}", flush=True)
    PROGRESS_DIR.mkdir(parents=True, exist_ok=True)
    with open(LOG_PATH, "a") as f:
        f.write(f"[{now()}] {msg}\n")


def run_step(cmd: list[str], timeout: int, label: str) -> tuple[int, str, str]:
    """Run a subprocess with explicit env. Returns (exit_code, stdout, stderr)."""
    env = os.environ.copy()
    env["PATH"] = "/home/kyle/bin:" + env.get("PATH", "")
    env["MINIMAX_API_KEY_UNUSED"] = "placeholder"
    try:
        res = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=REPO_ROOT,
            env=env,
        )
        return res.returncode, res.stdout, res.stderr
    except subprocess.TimeoutExpired as e:
        return -1, (e.stdout or b"").decode() if isinstance(e.stdout, bytes) else (e.stdout or ""), f"TIMEOUT after {timeout}s"


def find_done_set() -> set[str]:
    """Return set of demangled method names that are already done (output file exists)."""
    done = set()
    for f in OUTPUT_DIR.glob("*.ts"):
        # Filename patterns:
        # CTSGun__Spawn.ts, CTSSlowMotion__Use_p_?_?.ts, CHalfLifeMultiplay__PlayerKilled_p_CBasePlayer_...
        # Match class + method (split by __)
        stem = f.stem
        parts = stem.split("__", 1)
        if len(parts) == 2:
            cls_meth = parts[1].split("_p_")[0].split("_r_")[0]  # strip arg suffixes
            # The stem is e.g. CTSSlowMotion__Use_p_?_?  → method=Use
            # Or e.g. CTSGameRules__TeamWin_int_int_bool_?  → method=TeamWin
            done.add(f"{parts[0]}::{cls_meth}")
    return done


def get_class_methods(cls: str) -> list[str]:
    """Return list of remaining mangled symbol names for a class."""
    r = subprocess.run(
        ["grep", f"__{cls}$", str(DECOMPILE_DIR / "analysis" / "nm-D-CTS-specific.txt")],
        capture_output=True,
        text=True,
    )
    symbols = []
    for line in r.stdout.strip().split("\n"):
        if not line:
            continue
        parts = line.split()
        if len(parts) >= 4 and parts[2] == "T":
            symbols.append(parts[-1])
    return symbols


def get_remaining_for_class(cls: str, done: set[str]) -> list[str]:
    """Return mangled symbols of a class that are not yet done."""
    all_syms = get_class_methods(cls)
    remaining = []
    for sym in all_syms:
        # Demangle roughly: prefix is method, after __N is class
        m = re.match(r"^(.+?)__(\d+)([A-Za-z0-9_]+)$", sym)
        if not m:
            continue
        method, classlen, rest = m.groups()
        cls_name = rest[:int(classlen)]
        if f"{cls_name}::{method}" not in done:
            remaining.append(sym)
    return remaining


def demangle_symbol(sym: str) -> str:
    m = re.match(r"^(.+?)__(\d+)([A-Za-z0-9_]+)$", sym)
    if not m:
        return sym
    method, classlen, rest = m.groups()
    classlen = int(classlen)
    return f"{rest[:classlen]}::{method}"


def decompile_one(symbol: str, retries: int = 1) -> bool:
    """Run the full chunk → decompile → review cycle for one symbol.

    Returns True on success, False on any failure. The canonical
    output file is the success indicator.
    """
    log(f"=== {symbol} (demangled: {demangle_symbol(symbol)}) ===")

    # 1. Chunk (fast, 5-20s)
    log("  step 1: chunking...")
    code, out, err = run_step(
        [sys.executable, str(CHUNK_PY), symbol],
        timeout=60,
        label="chunk",
    )
    if code != 0:
        log(f"  CHUNK FAILED: exit={code}, stderr={err[:500]}")
        return False

    # Find the chunk file
    chunk_path = None
    for line in out.splitlines():
        if line.startswith("wrote "):
            p = Path(line.split()[1])
            if p.exists():
                chunk_path = p
                break
    if not chunk_path:
        log(f"  CHUNK: no path reported, output:\n{out[:500]}")
        return False
    stem = chunk_path.stem.removesuffix(".chunk")
    codex_path = CROSS_VENDOR_DIR / f"{stem}__codex.ts"

    # 2. Codex decompile (5-45 min)
    if not codex_path.exists():
        log("  step 2: codex decompile...")
        code, out, err = run_step(
            [
                sys.executable, str(DECOMPILE_PY), "--use", "codex",
                "--out", str(codex_path), "--no-rerun-chunk", symbol,
            ],
            timeout=2400,  # 40 min
            label="decompile",
        )
        if code != 0 or not codex_path.exists():
            log(f"  CODECX FAILED: exit={code}, codex_path exists={codex_path.exists()}, stderr={err[-500:]}")
            return False
    else:
        log("  step 2: codex output already exists, skipping")

    # 3. Codex review (5-20 min) — single-vendor pass-2
    log("  step 3: codex review...")
    out_canonical = OUTPUT_DIR / f"{stem}.ts"
    code, out, err = run_step(
        [sys.executable, str(REVIEW_PY), symbol],
        timeout=1200,  # 20 min
        label="review",
    )

    # Manual extraction fallback
    if not out_canonical.exists():
        review_path = CROSS_VENDOR_DIR / f"{stem}__codex2-review.md"
        if review_path.exists():
            review_text = review_path.read_text()
            m = re.search(
                r"Suggested rewrite.*?```typescript\n(.*?)\n```",
                review_text,
                re.DOTALL,
            )
            if m:
                out_canonical.write_text(m.group(1).rstrip() + "\n")
                log(f"  manual extraction OK: {out_canonical}")
            else:
                # Use codex pass-1 output as canonical (verdict was PASS)
                codex_text = codex_path.read_text()
                codex_clean = re.sub(r"^```(?:typescript)?\s*\n", "", codex_text)
                codex_clean = re.sub(r"\n```\s*$", "", codex_clean)
                if codex_clean.strip():
                    out_canonical.write_text(codex_clean)
                    log(f"  codex-1 fallback (PASS verdict): {out_canonical}")
                else:
                    log(f"  REVIEW FAILED: no rewrite, codex output empty")
                    return False
        else:
            log(f"  REVIEW FAILED: no review file written, exit={code}, stderr={err[-500:]}")
            return False

    log(f"  OK: {out_canonical} ({out_canonical.stat().st_size} bytes)")
    return True


def commit_batch(commit_msg: str) -> None:
    """git add + commit + push."""
    env = os.environ.copy()
    env["PATH"] = "/home/kyle/bin:" + env.get("PATH", "")
    subprocess.run(["git", "add", "-A"], cwd=REPO_ROOT, env=env, check=False)
    res = subprocess.run(
        ["git", "commit", "-m", commit_msg],
        cwd=REPO_ROOT, env=env, capture_output=True, text=True,
    )
    if res.returncode == 0:
        log(f"committed: {commit_msg}")
        push = subprocess.run(
            ["git", "push"],
            cwd=REPO_ROOT, env=env, capture_output=True, text=True,
        )
        if push.returncode == 0:
            log("pushed to main")
        else:
            log(f"PUSH FAILED: {push.stderr[-500:]}")
    else:
        log(f"COMMIT FAILED or no changes: {res.stderr[-500:]}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--symbols", nargs="+", help="specific mangled symbols to decompile")
    ap.add_argument("--class", action="append", dest="classes", help="class name to decompile all remaining methods for (can repeat)")
    ap.add_argument("--auto", action="store_true", help="use progress/decomp-todo.txt")
    ap.add_argument("--commit-every", type=int, default=5, help="commit + push every N methods")
    ap.add_argument("--max", type=int, default=999, help="max methods this run")
    ap.add_argument("--skip-review", action="store_true", help="only do chunk + decompile, skip review (faster but lower quality)")
    args = ap.parse_args()

    PROGRESS_DIR.mkdir(parents=True, exist_ok=True)
    if not LOG_PATH.exists():
        LOG_PATH.write_text(f"# Decomp log\n\nStarted: {now()}\n\n")

    done = find_done_set()
    log(f"Starting batch. Already done: {len(done)} methods.")

    # Build the symbol list
    symbols = []
    if args.symbols:
        symbols = list(args.symbols)
    if args.classes:
        for cls in args.classes:
            symbols.extend(get_remaining_for_class(cls, done))
    if args.auto:
        if TODO_PATH.exists():
            for line in TODO_PATH.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#"):
                    symbols.append(line)
    if not symbols:
        log("No symbols to process. Use --symbols, --class, or --auto.")
        return

    # De-dup
    seen = set()
    final = []
    for s in symbols:
        if s not in seen:
            seen.add(s)
            final.append(s)
    symbols = final

    log(f"Will process {len(symbols)} symbols (max: {args.max}):")
    for s in symbols[:args.max]:
        log(f"  - {s} → {demangle_symbol(s)}")

    successes = 0
    failures = []
    for i, sym in enumerate(symbols[:args.max]):
        log(f"\n--- {i+1}/{min(len(symbols), args.max)}: {sym} ---")
        if demangle_symbol(sym) in done:
            log(f"  already done, skipping")
            continue
        try:
            ok = decompile_one(sym)
        except Exception as e:
            log(f"  EXCEPTION: {e}")
            ok = False
        if ok:
            successes += 1
            done.add(demangle_symbol(sym))
        else:
            failures.append(sym)

        # Commit every N
        if args.commit_every and successes > 0 and successes % args.commit_every == 0:
            commit_batch(f"tools+src+docs: batch decomp — {successes} new methods")

    # Final commit
    if successes > 0:
        commit_batch(f"tools+src+docs: batch decomp — {successes} new methods (final)")

    log(f"\n=== BATCH COMPLETE ===")
    log(f"Successes: {successes}")
    log(f"Failures: {len(failures)}")
    if failures:
        log("Failed symbols:")
        for s in failures:
            log(f"  - {s}")


if __name__ == "__main__":
    main()
