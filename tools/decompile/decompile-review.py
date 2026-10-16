#!/usr/bin/env python3
"""
decompile-review.py — Single-vendor pass-2 review (codex impl → codex review).

**Why codex-only:** The `claude` CLI is not installed on m5. Original
cross-vendor pattern (codex decompile + claude review) is not available.
We use the same codex model for pass-2 review with a different prompt
that focuses on quality issues. Output naming changes:

  - output/<symbol>.ts                       (canonical, post-review)
  - cross-vendor/<symbol>__codex.ts          (pass-1 decompile output)
  - cross-vendor/<symbol>__codex2.ts         (pass-2 reviewer's version)
  - cross-vendor/<symbol>__codex2-review.md  (verdict + checklist + rewrite)

Usage:
  python3 tools/decompile/decompile-review.py GiveFnptrsToDll
  python3 tools/decompile/decompile-review.py --no-rerun-chunk GetEntityAPI2
  python3 tools/decompile/decompile-review.py --dry-run AddItem__6CTSGun
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
    We match the header specifically (line-start # + backticks) so we don't
    pick up the wrong chunk when the symbol appears as a sibling elsewhere.
    """
    import re as _re
    chunk_path = None
    for p in CHUNKS_DIR.glob("*.chunk.md"):
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
    composed = composed.replace(
        "Load `tools/decompile/chunks/<demangled>.chunk.md`.",
        f"Loaded below (inline) — the disassembly + class context for this function.\n\n```\n{chunk_text}\n```",
    )
    return composed


def send_to_codex(prompt_text: str) -> str:
    """Send prompt to codex/MiniMax-M3 via the local proxy at 127.0.0.1:8789."""
    if shutil.which("codex") is None and not Path("/home/kyle/bin/codex").exists():
        sys.exit("codex CLI not found at /home/kyle/bin/codex")
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


def extract_rewrite(review_text: str) -> str | None:
    """Find the first ```typescript ... ``` block after 'Suggested rewrite'."""
    m = re.search(
        r"Suggested rewrite.*?```typescript\n(.*?)\n```",
        review_text,
        re.DOTALL,
    )
    if not m:
        m = re.search(r"```typescript\n(.*?)\n```", review_text, re.DOTALL)
    if not m:
        return None
    return m.group(1).rstrip() + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("symbol", help="raw mangled symbol (e.g. GiveFnptrsToDll)")
    ap.add_argument("--dry-run", action="store_true",
                    help="compose + show prompt, don't send to codex")
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

    review = send_to_codex(prompt)
    stem = chunk_path.stem.removesuffix('.chunk')
    review_path = CROSS_VENDOR_DIR / f"{stem}__codex2-review.md"
    review_path.write_text(review)
    print(f"wrote review: {review_path}", file=sys.stderr)

    rewrite = extract_rewrite(review)
    if not rewrite:
        # No rewrite means verdict was PASS — use codex pass-1 output as canonical.
        print("no rewrite extracted from review (verdict may be PASS); using codex pass-1 output as canonical", file=sys.stderr)
        rewrite = codex_path.read_text()
        rewrite = re.sub(r"^```(?:typescript)?\s*\n", "", rewrite)
        rewrite = re.sub(r"\n```\s*$", "", rewrite)
        if not rewrite.strip():
            print("codex output is empty after stripping; cannot fall back", file=sys.stderr)
            return

    out_path = OUTPUT_DIR / f"{stem}.ts"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(rewrite)
    codex2_path = CROSS_VENDOR_DIR / f"{stem}__codex2.ts"
    codex2_path.write_text(rewrite)
    print(f"wrote canonical: {out_path}", file=sys.stderr)
    print(f"wrote cross-vendor: {codex2_path}", file=sys.stderr)
    print("=== REVIEW (first 30 lines) ===")
    print("\n".join(review.splitlines()[:30]))
    print("=== REWRITE ===")
    print(rewrite)


if __name__ == "__main__":
    main()
