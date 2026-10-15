#!/usr/bin/env python3
"""
decompile.py — Send a function chunk to Claude Code (or Codex) for decompilation.

Pipeline:
  1. Run chunk.py <symbol> to generate the chunk markdown
  2. Compose the prompt template + chunk content
  3. Pipe to `claude -p "<combined prompt>"`
  4. Save the response to tools/decompile/output/<demangled>.ts

Usage:
  python3 tools/decompile/decompile.py ActivateSlow__13CTSSlowMotion
  python3 tools/decompile/decompile.py --use codex ActivateSlow__13CTSSlowMotion
  python3 tools/decompile/decompile.py --dry-run ActivateSlow__13CTSSlowMotion
  python3 tools/decompile/decompile.py --list-priority
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DECOMPILE_DIR = REPO_ROOT / "tools" / "decompile"
CHUNK_PY = DECOMPILE_DIR / "chunk.py"
PROMPT_FILE = DECOMPILE_DIR / "prompts" / "single-function.md"
CHUNKS_DIR = DECOMPILE_DIR / "chunks"
OUTPUT_DIR = DECOMPILE_DIR / "output"


def run_chunker(symbol: str) -> Path:
    """Run chunk.py to generate the chunk file. Returns its path."""
    res = subprocess.run(
        [sys.executable, str(CHUNK_PY), symbol],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    if res.returncode != 0:
        sys.stderr.write(res.stderr)
        sys.exit(f"chunk.py failed for {symbol}")
    # chunk.py prints "wrote <path>" — extract it
    for line in res.stdout.splitlines():
        if line.startswith("wrote "):
            return Path(line.split()[1])
    sys.exit(f"chunk.py did not report output path:\n{res.stdout}")


def find_chunk(symbol: str) -> Path | None:
    """Try to find an existing chunk file for this symbol (don't re-run chunk.py)."""
    for p in CHUNKS_DIR.glob("*.chunk.md"):
        text = p.read_text()
        if f"`{symbol}`" in text:
            return p
    return None


def send_to_claude(prompt_text: str, model: str | None = None) -> str:
    """Pipe prompt to `claude -p` and return stdout. Raises on failure."""
    if shutil.which("claude") is None:
        sys.exit("claude CLI not found on PATH (install: https://claude.com/claude-code)")
    cmd = ["claude", "-p"]
    if model:
        cmd.extend(["--model", model])
    cmd.append(prompt_text)
    res = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO_ROOT)
    if res.returncode != 0:
        sys.stderr.write(f"claude -p failed (exit {res.returncode})\n")
        sys.stderr.write("STDERR:\n" + res.stderr + "\n")
        sys.exit(res.returncode)
    return res.stdout


def send_to_codex(prompt_text: str) -> str:
    """Pipe prompt to `codex exec` (Codex CLI's non-interactive mode)."""
    if shutil.which("codex") is None and not Path("/home/kyle/bin/codex").exists():
        sys.exit(
            "codex CLI not found. On m5 it's installed at /home/kyle/bin/codex "
            "(NOT in PATH). Add /home/kyle/bin to PATH, or pass --use codex after "
            "running `export PATH=/home/kyle/bin:$PATH`."
        )
    # Codex CLI's non-interactive entry point is `codex exec "<prompt>"`.
    # Codex requires an env var matching `env_key` in config.toml to be non-empty,
    # even when it's just a placeholder (the actual auth is done by a local proxy
    # at 127.0.0.1:8789 → api.minimax.io). Setting the placeholder unblocks the
    # call. See /home/kyle/.codex/config.toml [model_providers.minimax].
    codex_bin = shutil.which("codex") or "/home/kyle/bin/codex"
    env = {**os.environ, "MINIMAX_API_KEY_UNUSED": "placeholder"}
    res = subprocess.run(
        [codex_bin, "exec", prompt_text],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
        env=env,
    )
    if res.returncode != 0:
        sys.stderr.write(f"codex exec failed (exit {res.returncode})\n")
        sys.stderr.write("STDERR:\n" + res.stderr + "\n")
        sys.exit(res.returncode)
    return res.stdout


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("symbol", nargs="?", help="raw mangled symbol")
    ap.add_argument("--use", choices=["claude", "codex"], default="claude",
                    help="which CLI to use (default: claude)")
    ap.add_argument("--model", help="override model (passed to claude --model)")
    ap.add_argument("--out", help="explicit output .ts path (default: output/<demangled>.ts)")
    ap.add_argument("--dry-run", action="store_true",
                    help="generate chunk and show composed prompt, don't send to AI")
    ap.add_argument("--list-priority", action="store_true",
                    help="list priority decompile targets from SUMMARY.md")
    ap.add_argument("--no-rerun-chunk", action="store_true",
                    help="reuse existing chunk file instead of regenerating")
    args = ap.parse_args()

    if args.list_priority:
        summary = (REPO_ROOT / "tools" / "decompile" / "analysis" / "SUMMARY.md").read_text()
        print(summary)
        return

    if not args.symbol:
        ap.print_help()
        sys.exit(2)

    # 1. Get chunk
    if args.no_rerun_chunk:
        chunk_path = find_chunk(args.symbol)
        if not chunk_path:
            sys.exit(f"no existing chunk for {args.symbol}; remove --no-rerun-chunk")
    else:
        chunk_path = run_chunker(args.symbol)
    print(f"chunk:  {chunk_path}", file=sys.stderr)

    # 2. Compose prompt
    prompt_template = PROMPT_FILE.read_text()
    chunk_text = chunk_path.read_text()
    # The prompt template ends with "## The chunk" + a sentence; append
    # the actual chunk content. We assume the template has a clear
    # delimiter (the literal "## The chunk" heading) — append after that.
    if "## The chunk" in prompt_template:
        head, _ = prompt_template.rsplit("## The chunk", 1)
        composed = head.rstrip() + "\n\n## The chunk\n\n" + chunk_text
    else:
        composed = prompt_template + "\n\n" + chunk_text

    if args.dry_run:
        print(composed)
        return

    # 3. Send to AI
    print(f"sending to {args.use} (chunk={len(chunk_text)} chars, prompt={len(composed)} chars)", file=sys.stderr)
    if args.use == "claude":
        out = send_to_claude(composed, model=args.model)
    else:
        out = send_to_codex(composed)

    # 4. Save output. Derive filename from chunk, unless --out.
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
    else:
        out_path = OUTPUT_DIR / (chunk_path.stem.removesuffix(".chunk") + ".ts")
    out_path.write_text(out)
    print(f"wrote {out_path}  ({len(out)} chars)", file=sys.stderr)
    # Print the result to stdout for inline viewing
    print(out)


if __name__ == "__main__":
    main()
