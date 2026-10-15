#!/usr/bin/env python3
"""
chunk.py — Extract a per-function chunk from the pre-computed
D.1 analysis output for a given symbol.

Reads:
  tools/decompile/analysis/nm-D-size.txt         (symbol table, sizes)
  tools/decompile/analysis/nm-D-CTS-specific.txt (filtered TS-specific surface)
  tools/decompile/analysis/objdump-disasm-full.txt (full disassembly)
  tools/decompile/analysis/readelf-dyn-syms.txt (full dynamic symbol table)
  tools/decompile/analysis/strings-n5.txt        (debug strings, >=5 chars)
  tools/decompile/analysis/SUMMARY.md            (priority list, for cross-ref)

Writes:
  tools/decompile/chunks/<demangled>.chunk.md

Demangler: MSVC-style `method__<classLen><className>[<argTypes>]`.
We extract method + class + best-effort arg types. c++filt doesn't
handle MSVC names, so this is a hand-rolled mini parser.

Usage:
  python3 tools/decompile/chunk.py ActivateSlow__13CTSSlowMotion
  python3 tools/decompile/chunk.py ActivateSlow__13CTSSlowMotion --out path/to/chunk.md
  python3 tools/decompile/chunk.py --list            # all TS-specific symbols
  python3 tools/decompile/chunk.py --list --class CTSSlowMotion
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

# ---------------------------------------------------------------------------
# Paths (relative to repo root). The script lives at tools/decompile/chunk.py.
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]
ANALYSIS_DIR = REPO_ROOT / "tools" / "decompile" / "analysis"
CHUNKS_DIR = REPO_ROOT / "tools" / "decompile" / "chunks"

NM_SIZE = ANALYSIS_DIR / "nm-D-size.txt"
NM_CTS = ANALYSIS_DIR / "nm-D-CTS-specific.txt"
DISASM = ANALYSIS_DIR / "objdump-disasm-full.txt"
DYN_SYMS = ANALYSIS_DIR / "readelf-dyn-syms.txt"
STRINGS = ANALYSIS_DIR / "strings-n5.txt"

# ---------------------------------------------------------------------------
# MSVC name demangling
# ---------------------------------------------------------------------------
# Pattern: method__<classLen><className>(<argType>(<argLen><argName>)*)?
# Arg types: P=ptr, R=ref, T=enum?, U=uint?, primitives: f=float, i=int,
# c=char, b=bool, v=void, s=short, l=long, x=longlong, e=..., etc.
# We only do best-effort; output is meant to be human + AI readable.
MSVC_METHOD_RE = re.compile(
    r"^(?P<method>[A-Za-z_]\w*)__"
    r"(?P<classlen>\d+)(?P<class>[A-Za-z_]\w*)"
    r"(?P<args>(?:[A-Z][A-Za-z0-9_]*\d*[A-Za-z_]\w*)*)$"
)
# Simpler: separate the class-mangling from any tail by re-matching just args
# (the method+class is captured above; we re-split on capital letters after).

PRIMITIVE_TYPE = {
    "v": "void", "c": "char", "b": "bool", "s": "short",
    "i": "int", "l": "long", "x": "long long",
    "f": "float", "d": "double",
    "e": "...",
}


def demangle_msvc(symbol: str) -> str:
    """Best-effort MSVC name demangler. Returns the demangled name
    (e.g. 'CTSSlowMotion::ActivateSlow()').

    Falls back to the raw symbol if the pattern doesn't match.
    """
    # Strip @plt suffix
    raw = symbol.removesuffix("@plt")

    # Match method__<classLen>, then take exactly classLen chars of rest as
    # the class name. A greedy \w* class would eat the arg-list tail
    # (e.g. Save__13CTSSlowMotionR5CSave would class-match as the whole
    # tail instead of stopping at CTSSlowMotion).
    m = re.match(r"^([A-Za-z_]\w*)__(\d+)(.+)$", raw)
    if not m:
        return raw
    method = m.group(1)
    classlen = int(m.group(2))
    rest = m.group(3)
    if len(rest) < classlen or not (rest[0].isalpha() or rest[0] == "_"):
        return raw
    cls = rest[:classlen]
    args_str = rest[classlen:]

    # Parse arg tail. Each arg starts with a type tag: P/R/T (composite)
    # or a primitive letter, or a digit (length prefix for class/enum).
    parsed_args: list[str] = []
    i = 0
    while i < len(args_str):
        ch = args_str[i]
        if ch in ("P", "R"):  # pointer / reference
            i += 1
            # Next is a length-prefixed name
            num_match = re.match(r"(\d+)([A-Za-z_]\w*)", args_str[i:])
            if num_match:
                n = int(num_match.group(1))
                name = num_match.group(2)
                if len(name) == n:
                    parsed_args.append(f"{ch.lower()} {name}")
                    i += len(num_match.group(0))
                    continue
            parsed_args.append(f"{ch.lower()} ?")
            continue
        if ch in PRIMITIVE_TYPE:
            parsed_args.append(PRIMITIVE_TYPE[ch])
            i += 1
            continue
        if ch.isdigit():
            num_match = re.match(r"(\d+)([A-Za-z_]\w*)", args_str[i:])
            if num_match:
                n = int(num_match.group(1))
                name = num_match.group(2)
                if len(name) == n:
                    parsed_args.append(name)
                    i += len(num_match.group(0))
                    continue
        # Unknown — bail out, treat rest as opaque
        parsed_args.append("?")
        break

    return f"{cls}::{method}({', '.join(parsed_args)})"


# ---------------------------------------------------------------------------
# Symbol table parsing
# ---------------------------------------------------------------------------
SYMTAB_RE = re.compile(
    r"^(?P<addr>[0-9a-f]+)\s+(?P<size>[0-9a-f]+)\s+(?P<type>\S+)\s+(?P<sym>\S+)$"
)


@dataclass
class SymInfo:
    addr: int
    size: int
    type: str
    sym: str
    demangled: str = ""

    def is_text(self) -> bool:
        return self.type.startswith("T") or self.type.startswith("W")


def parse_nm(path: Path) -> list[SymInfo]:
    syms: list[SymInfo] = []
    for line in path.read_text().splitlines():
        m = SYMTAB_RE.match(line)
        if not m:
            continue
        s = SymInfo(
            addr=int(m["addr"], 16),
            size=int(m["size"], 16),
            type=m["type"],
            sym=m["sym"],
            demangled=demangle_msvc(m["sym"]),
        )
        syms.append(s)
    return syms


def find_symbol(syms: list[SymInfo], name: str) -> SymInfo:
    for s in syms:
        if s.sym == name:
            return s
    raise SystemExit(f"symbol not found in nm-D-size.txt: {name}")


# ---------------------------------------------------------------------------
# Disassembly extraction
# ---------------------------------------------------------------------------
DISASM_FUNC_HEADER_RE = re.compile(r"^(?P<addr>[0-9a-f]+)\s+<(?P<sym>[^>]+)>:\s*$")
DISASM_LINE_RE = re.compile(r"^\s+(?P<addr>[0-9a-f]+):\s+(?P<inst>\S.*?)\s*$")


def extract_function(disasm_text: str, sym: SymInfo) -> tuple[list[str], list[str]]:
    """Return (function_lines, called_symbols).

    function_lines: the disassembly lines for [sym.addr, sym.addr+sym.size).
    called_symbols: names of any PLT/named symbols called within the body.
    """
    # Find the function header. Match by symbol name (unique within the file)
    # — the address encoding in the file is 8-digit zero-padded hex but
    # we accept either form to be robust.
    lines = disasm_text.splitlines()
    header_idx = None
    sym_name = sym.sym
    sym_plain = sym_name.removesuffix("@plt")
    for i, ln in enumerate(lines):
        # Header line: "00061384 <ActivateSlow__13CTSSlowMotion>:"
        if f"<{sym_plain}>:" in ln:
            header_idx = i
            break
    if header_idx is None:
        return ([], [])

    addr = sym.addr
    end = addr + sym.size
    body: list[str] = []
    called: list[str] = []
    call_re = re.compile(r"call\s+[0-9a-f]+\s+<([^>]+)>")
    in_body = False
    for ln in lines[header_idx:]:
        m = DISASM_LINE_RE.match(ln)
        if m:
            cur = int(m["addr"], 16)
            if cur < addr:
                continue  # before the body (e.g. the function header itself)
            if cur >= end:
                break
            body.append(ln)
            in_body = True
            cm = call_re.search(m["inst"])
            if cm:
                called.append(cm.group(1))
        else:
            # Continuation or comment line — include only if we're in body
            if in_body:
                body.append(ln)
    return body, called


# ---------------------------------------------------------------------------
# Class siblings
# ---------------------------------------------------------------------------
def find_class_siblings(syms: list[SymInfo], sym: SymInfo) -> list[SymInfo]:
    """Other methods/vtable/etc in the same class.

    For 'ActivateSlow__13CTSSlowMotion', we want all `__13CTSSlowMotion`
    siblings + RTTI / vtable / data members for the class.
    """
    if "__" not in sym.sym:
        return []
    # Extract the class part: everything after '__<len><classname>'
    m = re.match(r"^[^_]+__(\d+)([A-Za-z_]\w*)", sym.sym)
    if not m:
        return []
    class_marker = f"__{m.group(1)}{m.group(2)}"  # e.g. "__13CTSSlowMotion"
    classlen = m.group(1)
    bare_cls = m.group(2)
    # RTTI / vtable / data member prefixes (length-prefixed class names):
    rtfi_vtable = f"__vt_{classlen}{bare_cls}"   # __vt_13CTSSlowMotion
    rtfi_typeinfo = f"__ti{classlen}{bare_cls}"  # __ti13CTSSlowMotion
    rtfi_typeinfo_func = f"__tf{classlen}{bare_cls}"  # __tf13CTSSlowMotion
    data_member = f"_{classlen}{bare_cls}."      # _13CTSSlowMotion.m_SaveData
    # Match patterns: __<len><cls> (methods), __vt_/ __ti/ __tf (RTTI),
    # _<len><cls>.<member> (data).
    siblings: list[SymInfo] = []
    for s in syms:
        if s is sym:
            continue
        if (
            class_marker in s.sym
            or rtfi_vtable in s.sym
            or rtfi_typeinfo in s.sym
            or rtfi_typeinfo_func in s.sym
            or data_member in s.sym
        ):
            siblings.append(s)
    return sorted(siblings, key=lambda s: s.addr)


# ---------------------------------------------------------------------------
# Chunk markdown generation
# ---------------------------------------------------------------------------
PIC_NOTE = """\
> **Note on PIC/GOT pattern:** The first 6 bytes of this function
> (`call $+5; pop ebx; add ebx, 0x<got_offset>`) is a standard
> position-independent-code (PIC) pattern used to compute the
> global offset table (GOT) base. After this, `ebx` holds the
> base address of the .got section, and `[ebx + offset]` /
> `[ebx - offset]` accesses are global data (cvars, singletons,
> global state)."""


def build_chunk(sym: SymInfo, all_syms: list[SymInfo], disasm_text: str) -> str:
    body, called = extract_function(disasm_text, sym)
    siblings = find_class_siblings(all_syms, sym)
    # Dedup call list while preserving order
    seen = set()
    unique_called = []
    for c in called:
        if c not in seen:
            seen.add(c)
            unique_called.append(c)

    # Format disassembly with column-aligned code
    disasm_md = "```asm\n" + "\n".join(body) + "\n```" if body else "_(no disassembly found)_"

    # Siblings table
    sib_rows = []
    for s in siblings:
        if s.sym.startswith("_") and s.sym.split(".")[0].startswith("_"):
            # data member
            sib_rows.append(f"| `{s.sym}` | {s.type} | 0x{s.addr:08x} | {s.size} | — |")
        else:
            sib_rows.append(
                f"| `{s.sym}` | {s.type} | 0x{s.addr:08x} | {s.size} | `{s.demangled}` |"
            )
    sib_table = (
        "\n".join(sib_rows) if sib_rows else "_(no other class members found)_"
    )

    # Called symbols
    called_md = (
        "\n".join(f"- `{c}` ({demangle_msvc(c)})" for c in unique_called)
        if unique_called
        else "_(no PLT/named calls in body)_"
    )

    is_pic = body and "call" in body[1] and "pop" in body[2] if len(body) > 2 else False
    pic_section = "\n## PIC / GOT base computation\n" + PIC_NOTE + "\n" if is_pic else ""

    # Class name extraction
    cls_match = re.search(r"__(\d+)([A-Za-z_]\w*)", sym.sym)
    cls = cls_match.group(2) if cls_match else "(unknown)"

    return f"""# `{sym.sym}` — {cls}::{demangle_msvc(sym.sym).split('::')[-1].split('(')[0]}

**Raw symbol:** `{sym.sym}`
**Demangled:** `{sym.demangled}`
**Address:** `0x{sym.addr:08x}`
**Size:** {sym.size} bytes (0x{sym.size:x})
**Symbol type:** {sym.type} ({"code" if sym.is_text() else "data"})

## Binary

- `ts/dlls/ts_i386.so` (TS server mod, 32-bit ELF, NOT stripped, has full debug symbols)
- Compiled against: libm.so.6, libc.so.6 (statically linked into the .so otherwise)

## Class context

Class: **`{cls}`** (TS gameplay entity)

Other public methods + members in this class:

| Symbol | Type | Address | Size | Demangled |
|---|---|---|---|---|
{sib_table}

## Disassembly

{disasm_md}
{pic_section}
## External calls in body

{called_md}

## Conversion guidance for the AI

- Treat the disassembly as a **specification**, not literal source.
  Don't do 1:1 line-by-line translation — produce clean,
  idiomatic TypeScript that captures what the function **does**.
- Use clear names: `{cls}` is the class; method name is
  `{demangle_msvc(sym.sym).split('::')[-1].split('(')[0]}`.
- Field offsets in the disassembly (`[esi+0xf8]`, `[esi+0x64]`)
  correspond to `this` fields. Infer the field's purpose from
  the operations (float = time/value, byte = flag, ptr = object).
  Use the GoldSrc entity class as a reference for field names.
- Globals via `[ebx+offset]` (after PIC setup) are cvars or
  singletons. Compare with the cvar names in `strings-n5.txt`
  if relevant (e.g. `slowamt`, `ts_slowmotion`).
- Add `// TODO(asm-ambiguous):` comments where the assembly is
  ambiguous (e.g. conditional branches where the condition is
  unclear without knowing the GoldSrc engine semantics).
- Output ONE TypeScript function declaration. Don't try to
  reconstruct the full class yet — that's a separate D.4 task.
- The output should compile in isolation (no external type
  references we don't define here).
"""


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def cmd_list(args, syms: list[SymInfo]) -> None:
    cls_filter = args.klass
    for s in syms:
        if cls_filter and cls_filter not in s.demangled and cls_filter not in s.sym:
            continue
        print(f"0x{s.addr:08x}  {s.size:>5}  {s.type}  {s.sym}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("symbol", nargs="?", help="raw mangled symbol (e.g. ActivateSlow__13CTSSlowMotion)")
    ap.add_argument("--list", action="store_true", help="list all symbols from nm-D-CTS-specific.txt")
    ap.add_argument("--class", dest="klass", help="filter --list by class name substring")
    ap.add_argument("--out", help="explicit output path (default: chunks/<demangled>.chunk.md)")
    ap.add_argument("--all-syms", default=str(NM_SIZE), help="path to nm-D-size.txt (override for tests)")
    args = ap.parse_args()

    if not args.list and not args.symbol:
        ap.print_help()
        sys.exit(2)

    # Use nm-D-CTS-specific.txt when listing (smaller, TS-specific surface)
    list_path = NM_CTS if args.list else Path(args.all_syms)
    syms = parse_nm(list_path)

    if args.list:
        cmd_list(args, syms)
        return

    sym = find_symbol(syms, args.symbol)
    sym.demangled = demangle_msvc(sym.sym)  # re-demangle from full table

    disasm_text = DISASM.read_text()
    # For class-sibling lookup, use the full nm-D-size.txt (the CTS file
    # only has TS-specific, so class members like the static vtable entry
    # __vt_13CTSSlowMotion might be elsewhere).
    full_syms = parse_nm(NM_SIZE)

    chunk = build_chunk(sym, full_syms, disasm_text)

    if args.out:
        out = Path(args.out)
    else:
        # demangled is like 'CTSSlowMotion::ActivateSlow()'
        # safe filename
        name = sym.demangled.replace("::", "__").replace("(", "_").rstrip(")_").replace(",", "")
        if not name:
            name = sym.sym
        out = CHUNKS_DIR / f"{name}.chunk.md"

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(chunk)
    print(f"wrote {out}  ({len(chunk)} chars, {len(chunk.splitlines())} lines)")


if __name__ == "__main__":
    main()
