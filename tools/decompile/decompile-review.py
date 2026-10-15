#!/usr/bin/env python3
"""
decompile-review.py — Cross-vendor review (Codex decompile → Claude review).

Reads the codex-generated TS (in cross-vendor/<symbol>__codex.ts) plus
the chunk + HLSDK reference, composes a review prompt, sends to
`claude -p`, extracts the suggested rewrite, and saves:
  - output/<symbol>.ts                       (canonical, post-review)
  - cross-vendor/<symbol>__claude.ts         (reviewer's version)
  - cross-vendor/<symbol>__claude-review.md  (verdict + checklist + rewrite)

Usage:
  python3 tools/decompile/decompile-review.py GiveFnptrsToDll
  python3 tools/decompile/decompile-review.py --no-rerun-chunk GetEntityAPI2
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DECOMPILE_DIR = REPO_ROOT / "tools" / "decompile"
PROMPT_FILE = DECOMPILE_DIR / "prompts" / "review-single-function.md"
HLSDK_FILE = DECOMPILE_DIR / "references" / "hlsdk-goldsrc-interface.md"
CHUNKS_DIR = DECOMPILE_DIR / "chunks"
OUTPUT_DIR = DECOMPILE_DIR / "output"
CROSS_VENDOR_DIR = DECOMPILE_DIR / "cross-vendor"


def find_symbol_files(symbol: str) -> tuple[Path, Path]:
    """Find chunk + codex-output for a symbol. Symbol may be raw or demangled.

    The chunk's header has the format:
        # `<symbol>` — <demangled>
    The chunk's sibling table has:
        | `<symbol>` | ... |
    We match the header specifically (line-start # + backticks) so we don't
    pick up the wrong chunk when the symbol appears as a sibling elsewhere.
    """
    import re as _re
    chunk_path = None
    for p in CHUNKS_DIR.glob("*.chunk.md"):
        # Match header line: starts with "# `" + symbol + "`"
        if _re.search(rf"^# `?{_re.escape(symbol)}`?\s*—", p.read_text(), _re.MULTILINE):
            chunk_path = p
            break
    if not chunk_path:
        sys.exit(f"no chunk header found for {symbol} — run chunk.py first")
    stem = chunk_path.stem.removesuffix(".chunk")
    codex_path = CROSS_VENDOR_DIR / f"{stem}__codex.ts"
    if not codex_path.exists():
        sys.exit(f"no codex output at {codex_path} — run codex first")
    return chunk_path, codex_path


def compose_prompt(symbol: str, chunk_text: str, codex_text: str, hlsdk_text: str) -> str:
    template = PROMPT_FILE.read_text()
    codex_clean = codex_text.replace("```typescript\n", "").replace("\n```", "").strip()
    composed = template.replace(
        "PASTE: enginefuncs_t, DLL_FUNCTIONS, NEW_DLL_FUNCTIONS, globalvars_t\ntypes from hlsdk-goldsrc-interface.md, plus the reference implementations\nof the 4 entry points.",
        hlsdk_text,
    ).replace(
        "PASTE: the codex-generated TS function here",
        codex_clean,
    )
    # Reference the chunk file path so the AI knows where to read
    composed = composed.replace(
        "Load `tools/decompile/chunks/<demangled>.chunk.md`.",
        f"Loaded below (inline) — the disassembly + class context for this function.\n\n```\n{chunk_text}\n```",
    )
    return composed


def send_to_claude(prompt_text: str) -> str:
    res = subprocess.run(
        ["claude", "-p", prompt_text],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    if res.returncode != 0:
        sys.stderr.write(f"claude -p failed (exit {res.returncode})\n")
        sys.stderr.write("STDERR:\n" + res.stderr + "\n")
        sys.exit(res.returncode)
    return res.stdout


def extract_rewrite(review_text: str) -> str | None:
    """Find the first ```typescript ... ``` block after 'Suggested rewrite'."""
    # Find "Suggested rewrite" then the next typescript block
    m = re.search(
        r"Suggested rewrite.*?```typescript\n(.*?)\n```",
        review_text,
        re.DOTALL,
    )
    if not m:
        # Fallback: any typescript block
        m = re.search(r"```typescript\n(.*?)\n```", review_text, re.DOTALL)
    if not m:
        return None
    return m.group(1).rstrip() + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("symbol", help="raw mangled symbol (e.g. GiveFnptrsToDll)")
    ap.add_argument("--dry-run", action="store_true",
                    help="compose + show prompt, don't send to claude")
    args = ap.parse_args()

    chunk_path, codex_path = find_symbol_files(args.symbol)
    chunk_text = chunk_path.read_text()
    codex_text = codex_path.read_text()
    hlsdk_text = HLSDK_FILE.read_text()

    prompt = compose_prompt(args.symbol, chunk_text, codex_text, hlsdk_text)
    print(f"composed review prompt: {len(prompt)} chars", file=sys.stderr)

    if args.dry_run:
        sys.stdout.write(prompt)
        return

    review = send_to_claude(prompt)
    review_path = CROSS_VENDOR_DIR / f"{chunk_path.stem.removesuffix('.chunk')}__claude-review.md"
    review_path.write_text(review)
    print(f"wrote review: {review_path}", file=sys.stderr)

    rewrite = extract_rewrite(review)
    if not rewrite:
        print("no rewrite extracted from review (verdict may be PASS); skipping output", file=sys.stderr)
        return

    out_path = OUTPUT_DIR / f"{chunk_path.stem.removesuffix('.chunk')}.ts"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(rewrite)
    claude_path = CROSS_VENDOR_DIR / f"{chunk_path.stem.removesuffix('.chunk')}__claude.ts"
    claude_path.write_text(rewrite)
    print(f"wrote canonical: {out_path}", file=sys.stderr)
    print(f"wrote cross-vendor: {claude_path}", file=sys.stderr)
    # Print the verdict + the rewrite to stdout
    print("=== REVIEW (first 30 lines) ===")
    print("\n".join(review.splitlines()[:30]))
    print("=== REWRITE ===")
    print(rewrite)


if __name__ == "__main__":
    main()
