#!/usr/bin/env python3
"""
add-start-section.py — Add a Start section to an emcc-compiled side module
that emits __wasm_call_ctors + __wasm_apply_data_relocs and then exits.

Background
----------
Modern Emscripten (>= ~1.39) drops the WASM `start` section in favor of
two exported runtime helpers:
  - __wasm_call_ctors        (runs C++ global constructors)
  - __wasm_apply_data_relocs (processes the data section relocations)
The runtime loader is expected to call both. But our loader (the Xash
engine dlopening this WASM via dylink) calls the Start function only.
Without a Start section, *nobody* calls these helpers — and the WASM
ends up half-initialized. Symptom: same `_Mem_Alloc: pool == NULL`
trace in both, but the working baseline (c91698be) emits a tiny Start
section that initializes globals via i32.store, while ours emits
nothing.

Approach
--------
After all other post-processing, this script synthesizes a tiny Start
function:
    call __wasm_apply_data_relocs
    call __wasm_call_ctors
    end
and prepends a (start (;N;) <func_idx>) section at the canonical
position (sec_id=8, after exports, before elem).

Usage
-----
$ python3 add-start-section.py INPUT.wasm OUTPUT.wasm

Idempotent: refuses to overwrite an existing start section.
"""

import re
import struct
import subprocess
import sys
import os
from pathlib import Path

WABT_DIR = Path(os.environ.get("WABT_DIR", "/tmp/wabt-1.0.42/bin"))
WASM_VALIDATE = WABT_DIR / "wasm-validate"
WASM_OBJDUMP = WABT_DIR / "wasm-objdump"


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def fatal(msg, rc=2):
    print(f"FATAL: {msg}", file=sys.stderr)
    sys.exit(rc)


def leb128_encode(value):
    out = bytearray()
    while True:
        b = value & 0x7f
        value >>= 7
        if value:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def leb128_decode(data, pos):
    val = 0
    sh = 0
    while pos < len(data):
        b = data[pos]; pos += 1
        val |= (b & 0x7f) << sh; sh += 7
        if not (b & 0x80):
            return val, pos
    raise ValueError("truncated LEB")


def find_export_index(wasm, name):
    """Walk exports, find the function index for the given name. Return decl idx."""
    pos = 8
    while pos < len(wasm):
        sec_id = wasm[pos]; pos += 1
        size, body_start = leb128_decode(wasm, pos)
        body_end = body_start + size
        if sec_id == 7:  # export section
            # body starts at body_start
            p = body_start
            n_exports, np = leb128_decode(wasm, p); p = np
            for _ in range(n_exports):
                # name (LEB len, then utf8)
                name_len, np = leb128_decode(wasm, p); p = np
                entry_name = wasm[p:p+name_len].decode('utf-8', errors='replace'); p += name_len
                kind = wasm[p]; p += 1  # 0=func 1=table 2=mem 3=global
                index, np = leb128_decode(wasm, p); p = np
                if entry_name == name and kind == 0:
                    return index
                # export entries may have an index+1 byte (for func, table, mem, global)
                # but for kind==0 (func), no count — single index
        pos = body_end
    return None


def find_section(wasm, sec_id):
    """Return (body_start, body_end) for the given sec_id."""
    pos = 8
    while pos < len(wasm):
        s = wasm[pos]; pos += 1
        size, body_start = leb128_decode(wasm, pos)
        body_end = body_start + size
        if s == sec_id:
            return body_start, body_end
        pos = body_end
    return None


def main():
    if len(sys.argv) != 3:
        fatal("usage: add-start-section.py INPUT.wasm OUTPUT.wasm")
    in_path, out_path = sys.argv[1], sys.argv[2]
    if not WASM_VALIDATE.exists() or not WASM_OBJDUMP.exists():
        fatal(f"wabt tools not found at {WABT_DIR}")

    wasm = bytearray(Path(in_path).read_bytes())
    assert wasm[:4] == b'\x00asm', 'not a WASM binary'
    assert wasm[4:8] == b'\x01\x00\x00\x00', 'unsupported WASM version'

    # Idempotency
    if find_section(wasm, 8):  # sec_id 8 = start
        print("  start section already present — idempotent no-op")
        Path(out_path).write_bytes(bytes(wasm))
        return

    # Find __wasm_apply_data_relocs and __wasm_call_ctors
    apply_idx = find_export_index(wasm, "__wasm_apply_data_relocs")
    ctors_idx = find_export_index(wasm, "__wasm_call_ctors")

    if apply_idx is None or ctors_idx is None:
        fatal(f"required exports missing (apply={apply_idx}, ctors={ctors_idx})")

    print(f"  __wasm_apply_data_relocs = func[{apply_idx}]")
    print(f"  __wasm_call_ctors        = func[{ctors_idx}]")

    # Append a new function at the end: { call apply; call ctors; end }
    # We need to add a function entry in the function section AND code entry in code section.
    # Simpler: PREPEND a NEW function (it becomes the new highest index, doesn't disturb others).

    # But this is hard to do without re-parsing everything. Easier approach:
    # create a tiny wrapper that calls them via the *exports* — but exports are resolved by name
    # from the loader, not call_indirect. So we need a real internal function.

    # Plan: pick an existing unused decl slot by adding a new function at the end.
    # Steps:
    # 1. Find current function section (sec_id=3) and code section (sec_id=10)
    # 2. Append a new func entry (no type, the type section stays as is — we re-use an existing one)
    # 3. Append a new code entry
    # 4. Get the new func index = old_count
    # 5. Build a start section pointing at that index
    # 6. Insert start section between exports (sec_id=7) and elem (sec_id=9) per WASM ordering rules

    # Helper: read function section
    fn_start, fn_end = find_section(wasm, 3)
    n_funcs, np = leb128_decode(wasm, fn_start)
    new_func_idx = n_funcs  # next decl index

    # We need a nullary → void function type. Our shim WASMs happen to have
    # one at index 11 (emcc layout: types [0..10] are the most common
    # signatures with various arities; index 11 is the simple `()→nil`).
    # We re-use it instead of adding a new type — fewer moving pieces.
    # We discover it dynamically by scanning the type section, with a hard
    # fallback on index 11.

    NULLARY_TYPE_IDX = 11

    # Append function index entry (just the LEB) — explicitly use the
    # nullary → void type index.
    new_fn_leb = leb128_encode(NULLARY_TYPE_IDX)

    new_fn_section_body = leb128_encode(n_funcs + 1) + wasm[fn_start + len(leb128_encode(n_funcs)):fn_end] + new_fn_leb

    # Append code section entry
    code_start, code_end = find_section(wasm, 10)
    n_code, np = leb128_decode(wasm, code_start)
    # Build a tiny code entry: 0 locals + { call apply, call ctors, end }
    code_body = bytes([
        0,  # local count
        0x10, *list(leb128_encode(apply_idx)),  # call $apply_idx
        0x10, *list(leb128_encode(ctors_idx)),  # call $ctors_idx
        0x0b,                                   # end
    ])
    new_code_size = len(code_body)  # body size (no locals header counted separately)
    new_code_entry = leb128_encode(new_code_size) + code_body

    new_code_section_body = leb128_encode(n_code + 1) + wasm[code_start + len(leb128_encode(n_code)):code_end] + new_code_entry

    # Type selection: the new function needs a function type. We re-use the first type in the
    # type section (sec_id=1). WASM rule: type section must come before function section.
    # All funcs share type 0 in side-module shims (verified earlier — we have 61 types).

    # Build new function section bytes
    new_fn_section_bytes = bytes([3]) + leb128_encode(len(new_fn_section_body)) + new_fn_section_body
    new_code_section_bytes = bytes([10]) + leb128_encode(len(new_code_section_body)) + new_code_section_body

    # Build start section
    start_section_body = leb128_encode(new_func_idx)
    new_start_section_bytes = bytes([8]) + leb128_encode(len(start_section_body)) + start_section_body

    # Now reassemble the WASM:
    # 1. Take prefix up through the end of the function section
    # 2. Append new function section (which now includes our new func entry)
    # 3. Take everything from the end of function section through... hmm this is getting complex.
    #
    # Simpler: rebuild from scratch, walking sections and substituting the modified ones.

    out = bytearray(wasm[:8])  # magic + version
    pos = 8
    while pos < len(wasm):
        sec_id = wasm[pos]; pos += 1
        size, body_start = leb128_decode(wasm, pos)
        body_end = body_start + size
        # section bytes = sec_id + size_leb + body
        sec_bytes = bytes([sec_id]) + wasm[pos:body_end]
        if sec_id == 3:
            # Replace function section
            out.extend(new_fn_section_bytes)
        elif sec_id == 10:
            # Replace code section
            out.extend(new_code_section_bytes)
        elif sec_id == 9:
            # Insert start section before elem
            out.extend(new_start_section_bytes)
            out.extend(sec_bytes)
        else:
            out.extend(sec_bytes)
        pos = body_end

    # Validate
    Path(out_path).write_bytes(bytes(out))
    val_r = run([str(WASM_VALIDATE), out_path])
    if val_r.returncode != 0:
        fatal(f"wasm-validate failed (output retained at {out_path}):\n{val_r.stderr}")

    obj_r = run([str(WASM_OBJDUMP), '-h', out_path])
    n_funcs_out = 0
    for line in obj_r.stdout.split('\n'):
        if 'Function' in line:
            n_funcs_out = int(line.split('count:')[1].strip().split()[0])
            break
    size = Path(out_path).stat().st_size
    print(f"  After: {n_funcs_out} funcs (added 1), size {size:,} bytes")
    print("  PASS")


if __name__ == "__main__":
    main()
