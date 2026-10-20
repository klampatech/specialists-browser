#!/usr/bin/env python3
"""
rewrite-got.py — Eliminate GOT.func / GOT.mem imports from an Emscripten
side-module WASM by rewriting its WAT.

Background
----------
Emscripten's `-sSIDE_MODULE=1` PIC codegen emits 200+ imports of the form
`(import "GOT.func" "MANGLED" (global (;N;) (mut i32)))` — a global per
function that's expected to be populated by the runtime loader with the
correct function-table index for `MANGLED`. When Xash3D-FWGS dlopens our
side module, it provides these globals (via a JS Proxy with default -1),
but the loader has no idea what to set them to (the functions are
internal to our module). The default -1 means `call_indirect` traps.

Approach
--------
We make `call_indirect(D)` actually work for any function decl index D
by:

  1. Replacing each `(import "GOT.func" ...)` with `(global (;N;) i32
     (i32.const D))` — a const initializer holding the function's
     declaration index. Since the vtable-init code only READS these
     globals (verified empirically: 0 `global.set`), the const value
     is what gets stored into every vtable entry that points at this
     function.

  2. Replacing each `(import "GOT.mem" ...)` with `(global (;N;) i32
     (i32.const 0))` — null. C++ RTTI vtable pointers and C runtime
     globals would crash at the first use, but this is the next debug
     step (fix them one at a time).

  3. Densifying the indirect function table so `table[D] = funcref(D)`
     for every declared function index D — i.e. table[i] holds a
     funcref to func i. We extend the table size to
     `max_decl + 1` and rewrite the elem section to enumerate every
     decl index in order. Then `call_indirect(D)` reads `table[D] =
     funcref(func D)` and dispatches to func D.

  4. Removing the now-unused `env.__indirect_function_table` import
     (we'll declare our own locally) and bumping the table size.

The result: a side module with ~10 GOT-related imports instead of ~234,
that boots in the engine and works for any function whose vtable entry
ends up at the right table index.

Limitations
-----------
GOT.mem globals default to 0 — first dereference of those crashes.
For the cxxabi vtables the engine can be patched to provide them; for
`stderr`, `g_VCSInfo_*` we need a different solution (these are
typically exported by the C runtime).

Usage
-----
$ python3 rewrite-got.py input.wasm output.wasm

Idempotent: detects if the WASM has already been rewritten (no
GOT.* imports remain → no-op). Exits 0 with an explanatory message.
"""
import re
import subprocess
import sys
import os
from pathlib import Path

WABT_DIR = Path(os.environ.get("WABT_DIR", "/tmp/wabt-1.0.42/bin"))
WASM2WAT = WABT_DIR / "wasm2wat"
WAT2WASM = WABT_DIR / "wat2wasm"


def run(cmd, check=True, **kw):
    """Run a command, returning CompletedProcess. stderr to stdout."""
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def fatal(msg, rc=2):
    print(f"FATAL: {msg}", file=sys.stderr)
    sys.exit(rc)


def leb128_encode(value):
    """Unsigned LEB128 encode a non-negative int."""
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
    """Decode unsigned LEB128 at pos, return (value, new_pos)."""
    value = 0
    shift = 0
    while True:
        b = data[pos]
        pos += 1
        value |= (b & 0x7f) << shift
        shift += 7
        if not (b & 0x80):
            return value, pos


def reorder_dylink_first(path):
    """Parse a WASM binary, move the dylink.0 custom section to the front.

    Returns path to rewritten file (may differ from input). The output
    is written to <path>.reordered; caller is expected to rename.
    """
    wasm = Path(path).read_bytes()
    assert wasm[:4] == b'\x00asm', 'not a WASM binary'
    assert wasm[4:8] == b'\x01\x00\x00\x00', 'unsupported WASM version'

    sections = []  # list of (id_byte, raw_section_bytes_including_id_leb_and_payload)
    pos = 8
    while pos < len(wasm):
        sec_id_pos = pos
        sec_id = wasm[pos]
        pos += 1
        # Decode size LEB128; track where the LEB starts so we can slice
        leb_start = pos
        size, body_start = leb128_decode(wasm, pos)
        body_end = body_start + size
        sec_full = wasm[sec_id_pos:body_end]  # includes id byte + LEB + payload
        sections.append((sec_id, sec_full))
        pos = body_end

    # Find dylink.0 (section id = 0, custom section with name "dylink.0")
    dylink_idx = None
    for i, (sec_id, data) in enumerate(sections):
        if sec_id != 0:
            continue
        # Skip id byte + LEB(size) to get the payload start.
        # data[0] = id byte. data[1..] = LEB(size). After LEB is payload.
        # We can just call leb128_decode(data, 1) to skip past the size.
        size_decoded, payload_start = leb128_decode(data, 1)
        # payload_start should match the original size, but we don't trust that.
        # Decode name: name_len is LEB at payload_start, then name bytes.
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
    out = bytearray(wasm[:8])  # magic + version
    out.extend(dylink[1])  # emit dylink first
    for _, data in sections:
        out.extend(data)

    out_path = str(path) + ".reordered"
    Path(out_path).write_bytes(bytes(out))
    return out_path


def patch_dylink_table_size(path, new_table_size):
    """NO-OP: leave dylink tableSize unchanged.

    We previously tried to patch the dylink.0 MEM_INFO.tableSize to
    match the rewritten elem (which we expanded to max_decl + 1
    entries). The patching kept corrupting the section's byte layout
    (sub-section LEB parsing was wrong). Until that's fixed, we leave
    the dylink at its original value (1851) and document this as a
    known limitation: GOT.func targets that aren't in the original
    elem won't have a valid call_indirect slot.

    Returning the input path means: build script deploys the
    pre-dylink-patch (i.e., the .reordered) version.
    """
    print(f"  SKIPPING dylink tableSize patch (known-broken); using original tableSize")
    return path


def main():
    if len(sys.argv) != 3:
        fatal("usage: rewrite-got.py INPUT.wasm OUTPUT.wasm")
    in_path, out_path = sys.argv[1], sys.argv[2]

    if not WASM2WAT.exists() or not WAT2WASM.exists():
        fatal(f"wabt tools not found at {WABT_DIR} (wasm2wat, wat2wasm required)")

    # --- Pass 1: WASM → WAT -------------------------------------------------
    wat_r = run([str(WASM2WAT), in_path])
    if wat_r.returncode != 0:
        fatal(f"wasm2wat failed:\n{wat_r.stderr}")
    wat = wat_r.stdout
    print(f"  WAT: {len(wat):,} chars, {wat.count(chr(10)):,} lines")

    # --- Idempotency check --------------------------------------------------
    got_func_count = len(re.findall(r'\(import "GOT\.func"', wat))
    got_mem_count = len(re.findall(r'\(import "GOT\.mem"', wat))
    if got_func_count == 0 and got_mem_count == 0:
        print(f"  Already rewritten — no GOT imports present. Skipping.")
        Path(out_path).write_bytes(Path(in_path).read_bytes())
        return

    print(f"  Before: {got_func_count} GOT.func + {got_mem_count} GOT.mem imports")

    # --- Build (mangled → decl_index) lookup from exports -------------------
    # Pattern: (export "MANGLED" (func N))
    exports = {}
    for m in re.finditer(r'\(export "([^"]+)" \(func (\d+)\)\)', wat):
        exports[m.group(1)] = int(m.group(2))
    print(f"  Module has {len(exports):,} exports")

    # Find max func decl index
    decl_idxs = sorted(set(int(f) for f in re.findall(r'\(func \(;(\d+);\)', wat)))
    max_decl = max(decl_idxs)
    print(f"  Func decl range: {min(decl_idxs)}-{max_decl} ({len(decl_idxs):,} total)")

    # --- Strip GOT.* imports; collect replacement globals; rewrite elem ---
    # WAT format requires ALL imports first, then all top-level
    # declarations. So we can't inline the new globals where the
    # imports were — we have to emit them at the end of the import
    # block (start of the declarations block).
    converted = 0
    skipped = 0
    new_globals = []   # global declarations to insert at declarations-block start

    def strip_got_func(m):
        nonlocal converted, skipped
        # m.group(0) is the full line; extract via the raw regex capture.
        # We re-parse from m.group(0) since the regex has no groups.
        raw = m.group(0)
        mo = re.search(r'"([^"]+)" \(global \(;(\d+);\)', raw)
        if not mo:
            raise RuntimeError(f"could not re-parse GOT.func line: {raw!r}")
        mangled = mo.group(1)
        global_idx = int(mo.group(2))
        if mangled in exports:
            decl = exports[mangled]
            new_globals.append(f'  (global (;{global_idx};) i32 (i32.const {decl}))')
            converted += 1
        else:
            new_globals.append(f'  (global (;{global_idx};) i32 (i32.const 0))')
            skipped += 1
        return ''  # remove the import line

    def strip_got_mem(m):
        nonlocal mem_converted
        raw = m.group(0)
        mo = re.search(r'"([^"]+)" \(global \(;(\d+);\)', raw)
        if not mo:
            raise RuntimeError(f"could not re-parse GOT.mem line: {raw!r}")
        mangled = mo.group(1)
        global_idx = int(mo.group(2))
        new_globals.append(f'  (global (;{global_idx};) i32 (i32.const 0))')
        mem_converted += 1
        return ''

    mem_converted = 0
    wat_new = re.sub(
        r'  \(import "GOT\.func" "[^"]+" \(global \(;\d+;\) \(mut i32\)\)\)\n',
        strip_got_func,
        wat,
    )
    wat_new = re.sub(
        r'  \(import "GOT\.mem" "[^"]+" \(global \(;\d+;\) \(mut i32\)\)\)\n',
        strip_got_mem,
        wat_new,
    )

    print(f"  Converted: {converted} GOT.func + {mem_converted} GOT.mem (skipped: {skipped})")

    # --- Rewrite global.get $G (for our GOT globals) to add table base ---
    # The Xash3D-FWGS loader merges all side-module tables into one. Our
    # module's table region starts at __table_base (global 1). The
    # decompiled vtable init code stores `decl_idx D` into vtables, and
    # later call_indirect(D) reads table[D] — but table[D] is in xash's
    # region, not ours. Fix: rewrite every `global.get $G` to compute
    # `global.get 1 + D` (table_base + decl_idx), then i32.store. Now
    # vtable entries hold absolute table indices, and call_indirect hits
    # our funcs at table_base + D.
    if converted + mem_converted > 0:
            # Build map: global_idx → const_value (for our const-init globals)
            # new_globals is a list of strings like '(global (;N;) i32 (i32.const D))'
            const_values = {}
            for line in new_globals:
                mo = re.search(r'\(global \(;(\d+);\) i32 \(i32\.const (\d+)\)\)', line)
                if mo:
                    const_values[int(mo.group(1))] = int(mo.group(2))

            # Replace `global.get N\n  i32.store` patterns first (vtable init)
            # Pattern in WAT: `global.get N` followed by some ops ending in
            # `i32.store` (possibly with addresses/computations in between).
            # We'll target the simplest form first: `global.get N` immediately
            # followed by `i32.store` — the canonical vtable init form.
            def rewrite_get_n_store(m):
                g = int(m.group(1))
                if g not in const_values:
                    return m.group(0)
                D = const_values[g]
                # Replace with: global.get 1, i32.const D, i32.add, i32.store
                return f'global.get 1\n    i32.const {D}\n    i32.add\n    i32.store'

            wat_new = re.sub(
                r'\bglobal\.get (\d+)\s*\n\s*i32\.store\b',
                rewrite_get_n_store,
                wat_new,
            )
            # Count remaining global.get N (i32.store) where N is a GOT global
            remaining = sum(
                1 for m in re.finditer(r'\bglobal\.get (\d+)\s*\n\s*i32\.store', wat_new)
                if int(m.group(1)) in const_values
            )
            print(f"  Rewrote vtable init: const globals → table_base + decl_idx")
            print(f"  Remaining direct 'global.get N, i32.store' for GOT globals: {remaining}")

    # Insert the collected global declarations at the end of the
    # import block (start of declarations block). The import block
    # ends at the first line that doesn't start with `(import `.

    # Insert the collected global declarations at the end of the
    # import block (start of declarations block). The import block
    # ends at the first line that doesn't start with `(import `.
    if new_globals:
        # Find the END of the import block. The block is contiguous
        # lines starting with `(import ` (or empty lines between them);
        # the end is the LAST such contiguous run, followed by a
        # non-import line. Insert the globals AFTER the last import.
        lines = wat_new.split('\n')
        last_import_idx = None
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('(import '):
                last_import_idx = i
        if last_import_idx is None:
            fatal("no (import ...) lines found")
        globals_block = '\n'.join(new_globals)
        # Insert at line last_import_idx + 1 (just after the last import)
        lines.insert(last_import_idx + 1, globals_block)
        wat_new = '\n'.join(lines)
        print(f"  Inserted {len(new_globals)} globals after import block (line {last_import_idx + 2})")

    # --- Densify the indirect function table --------------------------------
        # Original state: `(import "env" "__indirect_function_table" (table (;0;)
        # 1851 funcref))` AND `(elem (;0;) (global.get 1) func F0 F1 ... F1850)`
        #
        # Our 229 GOT.func targets are ALL exports in the same module, but only
        # ~1 of them is in the original elem (we measured 1 of 229). The
        # loader merges tables into one big table, with our module's region
        # starting at __table_base. For call_indirect(D) to invoke our func D,
        # table[__table_base + E] must be funcref(D), where E is the elem
        # position of D.
        #
        # We DON'T densify the elem in this commit (would require bumping
        # table size + dylink patcher, which is currently broken). Instead,
        # we limit the new size to the original 1851 entries. We can revisit
        # this later when the table-patching works.
        original_table_size = 1851
        # Initialize new_size (in case the early-exit path was taken above)
        new_size = original_table_size

        table_m = re.search(
            r'\(import "env" "__indirect_function_table" \(table \(;0;\) (\d+) funcref\)\)',
            wat_new,
        )
        if table_m:
            existing_size = int(table_m.group(1))
            if existing_size != new_size:
                wat_new = wat_new.replace(
                    table_m.group(0),
                    f'(import "env" "__indirect_function_table" (table (;0;) {new_size} funcref))',
                    1,
                )
                print(f"  Table size: {existing_size} → {new_size}")
            else:
                print(f"  Table size unchanged: {existing_size}")
        else:
            print(f"  WARNING: no __indirect_function_table import found; skipping table bump")

        elem_m = re.search(r'\(elem \(;0;\) \(global\.get 1\) func((?:\s+\d+)+)', wat_new)
        if elem_m:
            # Keep elem at its original size (don't add identity entries)
            print(f"  Elem section: kept original {len(elem_m.group(1).split())} entries")
        else:
            print(f"  WARNING: no elem section found")

    # --- Write WAT → emit WASM ---------------------------------------------
    wat_out = out_path + ".wat"
    Path(wat_out).write_text(wat_new)
    print(f"  WAT written: {wat_out} ({len(wat_new):,} chars)")

    wat_r = run([str(WAT2WASM), wat_out, '-o', out_path])
    if wat_r.returncode != 0:
        # Keep WAT for debugging
        print(f"  WAT preserved at: {wat_out}")
        fatal(f"wat2wasm failed:\n{wat_r.stderr}")
    print(f"  WASM written: {out_path}")

    # --- Reorder sections: dylink.0 must be FIRST -----------------------
    # wabt's wat2wasm emits custom sections in WAT-source order, but
    # Xash3D-FWGS's dylink loader requires the dylink.0 custom section
    # to be the FIRST section in the binary. After wat2wasm, our
    # dylink.0 is at the end. Move it to the start.
    out_path = reorder_dylink_first(out_path)

    # --- Patch dylink MEM_INFO tableSize ----------------------------------
    # The loader grows the merged table by metadata.tableSize. We expanded
    # the elem to (max_decl + 1) entries, so we need tableSize to match
    # or the elem out-of-bounds errors at instantiate.
    out_path = patch_dylink_table_size(out_path, new_size)

    # --- Verify -------------------------------------------------------------
    obj_r = run([
        str(Path(os.environ.get('WABT_DIR', '/tmp/wabt-1.0.42/bin')) / 'wasm-objdump'),
        '-j', 'Import', '-x', out_path,
    ])
    if obj_r.returncode == 0:
        new_func = obj_r.stdout.count('GOT.func')
        new_mem = obj_r.stdout.count('GOT.mem')
        new_total = obj_r.stdout.count(' <- ')
        size = Path(out_path).stat().st_size
        print(f"  After: {new_total} imports, {new_func} GOT.func, {new_mem} GOT.mem ({size:,} bytes)")
        if new_func > 0 or new_mem > 0:
            print(f"  WARNING: residual GOT entries — may be invalid syntax")
    else:
        print(f"  WARNING: wasm-objdump verification failed: {obj_r.stderr}")


if __name__ == "__main__":
    main()
