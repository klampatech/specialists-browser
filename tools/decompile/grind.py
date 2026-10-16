#!/usr/bin/env python3
"""
grind.py — Decompile loop that survives execute_code kernel timeouts.

Each call to grind() in execute_code processes ONE method using
subprocess.Popen with start_new_session=True so the process detaches
and outlives the kernel. Subsequent calls can poll the file and start
the next one.

This is the right pattern for proxy-bottlenecked sequential AI calls.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

REPO = Path("/home/kyle/Development/specialists-browser")
CHUNKS = REPO / "tools/decompile/chunks"
OUT = REPO / "tools/decompile/output"
CV = REPO / "tools/decompile/cross-vendor"
LOG = REPO / "progress/decomp-log.md"
PID_FILE = REPO / "progress/grind.pid"

# Pending state — survives between execute_code calls via a pid file
# Format: PID_FILE contains the mangled symbol + output path + started_at

PID_FILE.parent.mkdir(parents=True, exist_ok=True)


def log(msg: str) -> None:
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}\n"
    with open(LOG, "a") as f:
        f.write(line)
    print(line, end="", flush=True)


def env_with_proxy():
    e = os.environ.copy()
    e["PATH"] = "/home/kyle/bin:" + e.get("PATH", "")
    e["MINIMAX_API_KEY_UNUSED"] = "placeholder"
    return e


def chunk_one(symbol: str) -> Path | None:
    """Run chunk.py for a symbol. Returns chunk file path or None."""
    r = subprocess.run(
        [sys.executable, "tools/decompile/chunk.py", symbol],
        capture_output=True, text=True, cwd=REPO, env=env_with_proxy(),
        timeout=30,
    )
    if r.returncode != 0:
        log(f"  CHUNK FAILED: {r.stderr.strip()[:300]}")
        return None
    for line in r.stdout.splitlines():
        if line.startswith("wrote "):
            p = Path(line.split()[1])
            if p.exists():
                return p
    return None


def start_codex(symbol: str, chunk_path: Path, codex_out: Path) -> int | None:
    """Spawn codex CLI detached. Returns PID."""
    # Use Popen with start_new_session=True so it survives parent exit.
    # stdin=DEVNULL so codex doesn't hang waiting for input.
    # stdout/stderr to file so we can debug if needed.
    log_file = REPO / "progress" / f"codex-{codex_out.stem}.log"
    with open(log_file, "w") as f:
        proc = subprocess.Popen(
            [sys.executable, "tools/decompile/decompile.py", "--use", "codex",
             "--out", str(codex_out), "--no-rerun-chunk", symbol],
            cwd=REPO, env=env_with_proxy(),
            stdout=f, stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
        )
    PID_FILE.write_text(f"{proc.pid} {symbol} {codex_out} {log_file}\n")
    log(f"  started codex pid={proc.pid} for {symbol}")
    return proc.pid


def start_review(symbol: str) -> int | None:
    """Spawn the decompile-review.py detached."""
    log_file = REPO / "progress" / f"review-{symbol.replace('/', '_')}.log"
    with open(log_file, "w") as f:
        proc = subprocess.Popen(
            [sys.executable, "tools/decompile/decompile-review.py", symbol],
            cwd=REPO, env=env_with_proxy(),
            stdout=f, stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
        )
    log(f"  started review pid={proc.pid} for {symbol}")
    return proc.pid


def status() -> dict:
    """Return current state of pending work."""
    state = {
        "codex_running": None,
        "review_running": None,
        "codex_log": None,
        "review_log": None,
    }
    if PID_FILE.exists():
        line = PID_FILE.read_text().strip()
        if line:
            parts = line.split(None, 3)
            if len(parts) >= 4:
                pid, symbol, out_path, log_file = parts
                if Path(f"/proc/{pid}").exists():
                    state["codex_running"] = (int(pid), symbol, out_path)
                    state["codex_log"] = log_file
    # Count outputs
    state["done_count"] = len(list(OUT.glob("*.ts")))
    state["codex_count"] = len(list(CV.glob("*__codex.ts")))
    return state


def done_set() -> set[str]:
    """Return demangled method names that are already done."""
    done = set()
    for f in OUT.glob("*.ts"):
        stem = f.stem
        parts = stem.split("__", 1)
        if len(parts) == 2:
            cls = parts[0]
            meth = parts[1].split("_p_")[0].split("_r_")[0]
            done.add(f"{cls}::{meth}")
    return done


def get_remaining_for_class(cls: str) -> list[str]:
    """Return mangled symbols of methods in a class that are not done."""
    import re
    r = subprocess.run(
        ["grep", f"__{cls}$", "tools/decompile/analysis/nm-D-CTS-specific.txt"],
        capture_output=True, text=True, cwd=REPO, env=env_with_proxy(),
    )
    done = done_set()
    remaining = []
    for line in r.stdout.strip().split("\n"):
        if not line:
            continue
        parts = line.split()
        if len(parts) >= 4 and parts[2] == "T":
            sym = parts[-1]
            m = re.match(r"^(.+?)__(\d+)([A-Za-z0-9_]+)$", sym)
            if m:
                method, classlen, rest = m.groups()
                cls_name = rest[:int(classlen)]
                if f"{cls_name}::{method}" not in done:
                    remaining.append(sym)
    return remaining


def grind(symbol: str) -> str:
    """Chunk + spawn codex for one symbol. Returns 'ok' or error string."""
    log(f"=== {symbol} ===")
    chunk = chunk_one(symbol)
    if not chunk:
        return "chunk_failed"
    stem = chunk.stem.removesuffix(".chunk")
    codex_out = CV / f"{stem}__codex.ts"
    if codex_out.exists():
        log(f"  codex output already exists: {codex_out}")
    else:
        pid = start_codex(symbol, chunk, codex_out)
        if not pid:
            return "codex_spawn_failed"
        return f"codex_started:{pid}"
    return "codex_done"


def next_symbol() -> str | None:
    """Pop the next symbol from the priority queue (a file or hardcoded)."""
    # Priority queue: CTSGun, CTSGameRules, CTSAnimation, CTSStunt, SlowMotionFlow, then rest
    PRIORITY = [
        "CTSGun", "CTSGameRules", "CTSAnimation", "CTSStunt",
        # CTSGunUci, CTSGuni, etc. — subclasses
        "CTSKnife", "CTSWorldGun", "CTSFlag", "CTSBriefcase",
        "CTSBomb", "CTSHack", "CTSPowerUp", "CTSGroundWeapon",
        "CTSSellZone", "CTSGroundAmmo", "CTSAmmoPack", "CTSTeamEscape",
        "CTSDMHill", "CTSWind", "CTSPowerUp", "CTSObjective",
        "CTSObjectiveManager", "CTSWinGiver", "CTSMapGlobals",
        "CTSPhysicObject", "CTSTrigger", "CTSTimer", "CTSCustomTarget",
        "CTSSellZone", "CTSSellZone", "CTSSharedEmitter", "CTSParticle",
        "CTSEffector", "CTSKnife", "CTSObserver", "CTSObjectivePointer",
        "CTSSMGAmmo", "CTSSMGWeapon", "CTSShotgunWeapon", "CTSSellZone",
        "CTSSellZone", "CTSSellZone", "CTSSellZone", "CTSSellZone",
    ]
    done = done_set()
    for cls in PRIORITY:
        for sym in get_remaining_for_class(cls):
            return sym
    return None


if __name__ == "__main__":
    # CLI: `python3 tools/decompile/grind.py [symbol]`
    if len(sys.argv) > 1:
        sym = sys.argv[1]
        print(grind(sym))
    else:
        s = next_symbol()
        if s:
            print(f"Next: {s}")
        else:
            print("No more symbols.")
