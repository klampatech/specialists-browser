#!/usr/bin/env python3
"""
rewrite-got-densify.py — Densify the elem section with all func decl indices.

Background
----------
After rewrite-got.py, our side-module WASM has const-init globals holding
function decl indices, and the elem section only contains ~1/229 of them
(verified empirically — see HANDOFF D.7.19). Most call_indirect(D) sites
read table[__table_base + D] which lands in an UNUSED slot, dispatching to
a WRONG-TYPE funcref from the engine's table region. This produces
"function signature mismatch" pageerrors.

Approach
--------
Densify the elem section to include funcref(func D) for every D from 0 up
to (tableSize - 1). The loader now has the right slot at every legal D.
Decls D ≥ tableSize are unreachable via the table — call_indirect(D) for
those would still trap. We document this as a known limitation; dense
coverage up to tableSize covers all 229 GOT-replaced functions plus most
of the engine's normal vtable dispatch.

Idempotent: if every decl in [0, tableSize) is already present in the
elem, this script copies input → output unchanged.

Usage
-----
$ python3 rewrite-got-densify.py INPUT.wasm OUTPUT.wasm

Exit codes:
  0  — success
  2  — argument/tool error
  1  — wasm-validate failed (output still written for inspection)
"""
import re
import subprocess
import sys
import os
from pathlib import Path

WABT_DIR = Path(os.environ.get("WABT_DIR", "/tmp/wabt-1.0.42/bin"))
WASM2WAT = WABT_DIR / "wasm2wat"
WAT2WASM = WABT_DIR / "wat2wasm"
WASM_VALIDATE = WABT_DIR / "wasm-validate"
WASM_OBJDUMP = WABT_DIR / "wasm-objdump"


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def fatal(msg, rc=2):
    print(f"FATAL: {msg}", file=sys.stderr)
    sys.exit(rc)


def leb128_decode(data, pos):
    """Decode unsigned LEB128 at pos, return (value, new_pos)."""
    value = 0
    shift = 0
    while pos < len(data):
        b = data[pos]
        pos += 1
        value |= (b & 0x7f) << shift
        shift += 7
        if not (b & 0x80):
            return value, pos
    raise ValueError("truncated LEB")


def reorder_dylink_first(path):
    """Mirror of rewrite-got.py: move dylink.0 to the FIRST section.

    Required by Xash3D-FWGS's getDylinkMetadata loader — writes a .reordered
    file alongside the input and returns that path.
    """
    wasm = Path(path).read_bytes()
    assert wasm[:4] == b'\x00asm', 'not a WASM binary'
    assert wasm[4:8] == b'\x01\x00\x00\x00', 'unsupported WASM version'

    sections = []
    pos = 8
    while pos < len(wasm):
        sec_id_pos = pos
        sec_id = wasm[pos]
        pos += 1
        size, body_start = leb128_decode(wasm, pos)
        body_end = body_start + size
        sec_full = wasm[sec_id_pos:body_end]
        sections.append((sec_id, sec_full))
        pos = body_end

    dylink_idx = None
    for i, (sec_id, data) in enumerate(sections):
        if sec_id != 0:
            continue
        size_decoded, payload_start = leb128_decode(data, 1)
        name_len, np = leb128_decode(data, payload_start)
        name = data[np:np + name_len].decode('utf-8', errors='replace')
        if name == 'dylink.0':
            dylink_idx = i
            break

    if dylink_idx is None:
        print(f"  No dylink.0 section found")
        return path
    if dylink_idx == 0:
        print(f"  dylink.0 already first — no reorder needed")
        return path

    print(f"  Reordering: dylink.0 from section {dylink_idx}/{len(sections) - 1} to front")
    dylink = sections.pop(dylink_idx)
    out = bytearray(wasm[:8])
    out.extend(dylink[1])
    for _, data in sections:
        out.extend(data)

    out_path = str(path) + ".reordered"
    Path(out_path).write_bytes(bytes(out))
    return out_path


def get_table_size(wat):
    """Find the imported __indirect_function_table size."""
    m = re.search(
        r'\(import "env" "__indirect_function_table" \(table \(;0;\) (\d+) funcref\)\)',
        wat,
    )
    return int(m.group(1)) if m else None


def get_decl_indices(wat):
    """All (func (;N;)) decl indices, sorted."""
    return sorted(set(int(n) for n in re.findall(r'\(func \(;(\d+);\)', wat)))


def find_elem_line(wat):
    """Return (line_start, line_end, [func_indices]) for the single elem line.

    The elem section produced by wabt's wasm2wat for our WASM is exactly
    one line: '  (elem (;0;) (global.get 1) func N1 N2 ... Nk)'. Anything
    different is treated as a different (or missing) elem shape.
    """
    m = re.search(
        r'^  \(elem \(;0;\) \(global\.get 1\) func((?: \d+)+)\)',
        wat,
        re.M,
    )
    if not m:
        return None, None, None
    line_start = wat.rfind('\n', 0, m.start()) + 1
    line_end = m.end()
    nums = [int(x) for x in m.group(1).split()]
    return line_start, line_end, nums


def find_const_init_values(wat):
    """All const-init globals' values (these are D-style decl indices in PIC code)."""
    out = []
    for gm in re.finditer(
        r'\(global \(;\d+;\) i32 \(i32\.const (\d+)\)\)', wat
    ):
        v = int(gm.group(1))
        if 0 <= v < 10000:  # plausible function decl
            out.append(v)
    return sorted(set(out))


def main():
    if len(sys.argv) != 3:
        fatal("usage: rewrite-got-densify.py INPUT.wasm OUTPUT.wasm")
    in_path, out_path = sys.argv[1], sys.argv[2]

    if not WASM2WAT.exists() or not WAT2WASM.exists():
        fatal(f"wabt tools not found at {WABT_DIR} (wasm2wat, wat2wasm required)")

    # --- WAT round-trip input ---
    wat_r = run([str(WASM2WAT), in_path])
    if wat_r.returncode != 0:
        fatal(f"wasm2wat failed:\n{wat_r.stderr}")
    wat = wat_r.stdout
    print(f"  WAT: {len(wat):,} chars, {wat.count(chr(10)):,} lines")

    # --- Parse the inputs ---
    table_size = get_table_size(wat)
    if table_size is None:
        fatal("Could not find __indirect_function_table in WAT")
    print(f"  tableSize: {table_size}")

    decls = get_decl_indices(wat)
    if not decls:
        fatal("Could not parse (func (;N;)) decl indices")
    max_decl = max(decls)
    min_decl = min(decls)
    print(f"  decl range: {min_decl}-{max_decl}, total: {len(decls)}")

    line_start, line_end, elem_funcs = find_elem_line(wat)
    if elem_funcs is None:
        fatal("Could not parse the (elem (;0;) (global.get 1) func ...) line")
    print(f"  elem entries: {len(elem_funcs)}, unique: {len(set(elem_funcs))}")

    in_elem = set(elem_funcs) if elem_funcs is not None else set()

    # --- Idempotency check ---
    needed = [d for d in decls if d < table_size]
    missing = [d for d in needed if d not in in_elem] if in_elem else needed
    if not missing:
        print(f"  Already densified: all {len(needed)} decls in [0, {table_size}) are present.")
        print(f"  Idempotent: copying input → output.")
        Path(out_path).write_bytes(Path(in_path).read_bytes())
        return
    print(f"  Missing {len(missing)} of {len(needed)} decls in [0, {table_size})")
    if len(missing) > 0:
        print(f"    First 20 missing: {missing[:20]}")
        print(f"    Last 5: {missing[-5:]}")

    # --- Diagnostics: const-init values that are unreachable ---
    const_values = find_const_init_values(wat)
    above = [v for v in const_values if v >= table_size]
    below = [v for v in const_values if v < table_size]
    print(f"  const-init globals (PIC D values): {len(const_values)} distinct")
    print(f"    in [0, tableSize): {len(below)} (will be reachable after densify)")
    print(f"    >= tableSize:      {len(above)}  (still unreachable — would trap)")
    if above:
        print(f"    Sample above: {above[:10]}")

    # --- Build the new elem list ---
    new_elem_funcs = sorted(d for d in decls if d < table_size)

    # Defensive: if the densified list is shorter than the current elem
    # (shouldn't happen but be safe), still proceed.
    if len(new_elem_funcs) < len(elem_funcs or []):
        print(f"  WARNING: new_elem ({len(new_elem_funcs)}) < current elem ({len(elem_funcs)}).")

    # --- Replace the elem line in the WAT ---
    new_func_list = ' ' + ' '.join(str(d) for d in new_elem_funcs)
    new_elem_line = '  (elem (;0;) (global.get 1) func' + new_func_list + ')'
    new_wat = wat[:line_start] + new_elem_line + wat[line_end:]
    print(f"  new elem line: {len(new_elem_line):,} chars, {len(new_elem_funcs):,} entries")

    # --- Write WAT, wat2wasm ---
    wat_out = out_path + ".wat"
    Path(wat_out).write_text(new_wat)
    print(f"  WAT written: {wat_out} ({len(new_wat):,} chars)")

    wat_r = run([str(WAT2WASM), wat_out, '-o', out_path])
    if wat_r.returncode != 0:
        print(f"  WAT preserved at: {wat_out}", file=sys.stderr)
        fatal(f"wat2wasm failed:\n{wat_r.stderr}")
    print(f"  WASM written: {out_path}")

    # --- Validate ---
    val_r = run([str(WASM_VALIDATE), out_path])
    if val_r.returncode != 0:
        fatal(f"wasm-validate failed (output retained at {out_path}):\n{val_r.stderr}")

    # --- Reorder dylink.0 first (Xash3D-FWGS loader requirement) ---
    final_path = reorder_dylink_first(out_path)
    if final_path != out_path:
        # Replace out_path with the .reordered variant
        Path(out_path).unlink(missing_ok=True)
        Path(out_path).write_bytes(Path(final_path).read_bytes())
        Path(final_path).unlink(missing_ok=True)

    # --- Final validate after reorder ---
    val_r = run([str(WASM_VALIDATE), out_path])
    if val_r.returncode != 0:
        fatal(f"wasm-validate failed AFTER reorder (output retained at {out_path}):\n{val_r.stderr}")

    # --- Stats ---
    obj_r = run([str(WASM_OBJDUMP), '-j', 'Import', '-x', out_path])
    if obj_r.returncode == 0:
        new_total = obj_r.stdout.count(' <- ')
        new_func = obj_r.stdout.count('GOT.func')
        new_mem = obj_r.stdout.count('GOT.mem')
        size = Path(out_path).stat().st_size
        print(f"  After: {new_total} imports, {new_func} GOT.func, {new_mem} GOT.mem ({size:,} bytes)")

    print("  PASS")


if __name__ == "__main__":
    main()
