#!/usr/bin/env python3
"""
Diff our shim's DLL_FUNCTIONS table against the baseline DLL that renders.

Usage:
    python3 dllfunc-diff.py <baseline.wasm> [our-shim.c]

What it does, and why each step is needed:

  1. Find GetEntityAPI in the baseline by its export name.
  2. Disassemble it. xash3d-fwgs-era HLSDK builds build the table
     statically and memcpy it in, so the body contains a
     `memory.copy(p, __memory_base + N, SIZE)`. SIZE/4 is the
     number of populated fields.
  3. Read those SIZE bytes out of the data segment, 4 bytes at a time,
     giving the function index per field.
  4. Compare against the field names parsed out of
     xash3d-fwgs engine/eiface.h, and against the `p->pfnX = ts_Y`
     assignments in our shim source.

If step 2 does not find a memory.copy, the baseline builds the table
field-by-field instead; that case is not handled yet — you will get a
clear error rather than wrong numbers.
"""

import re
import struct
import subprocess
import sys

WABT = "/tmp/wabt-1.0.42/bin/wasm-objdump"


def objdump(path, section=None):
    """Disassemble, or dump a named section's headers.

    Export names only appear in `-j Export -x`; the `-d` disassembly
    prints `func[N] <sym>:` definitions instead. Callers need both, so
    keep the two modes distinct rather than overloading one return.
    """
    cmd = [WABT]
    if section:
        cmd += ["-j", section, "-x", path]
    else:
        cmd += ["-d", path]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"objdump failed: {out.stderr[:200]}")
    return out.stdout


def find_export(out, name):
    """Return the function index exported under `name`."""
    for m in re.finditer(r'func\[(\d+)\]\s+<[^>]*>\s+->\s+"' + re.escape(name) + '"', out):
        return int(m.group(1))
    return None


def find_body(out, func_index):
    """Return the disassembly text of func[N]'s definition."""
    m = re.search(r'func\[' + str(func_index) + r'\][^\n]*\n', out)
    if not m:
        return None
    end = out.find('func[', m.end())
    return out[m.start(): end if end != -1 else len(out)]


def instr_count(body):
    """Rough instruction count: disassembled lines minus the header."""
    return body.count('\n') - 2


def total_functions(wasm_path):
    """Number of function definitions, from the wasm section table."""
    d = open(wasm_path, 'rb').read()
    if d[:4] != b'\0asm':
        sys.exit(wasm_path + ' is not a wasm module')

    def uleb(i):
        r = s = 0
        while True:
            b = d[i]
            i += 1
            r |= (b & 0x7F) << s
            if not (b & 0x80):
                return r, i
            s += 7

    i, nfuncs = 8, None
    while i < len(d):
        sid = d[i]
        i += 1
        size, i = uleb(i)
        if sid == 3:                      # function section
            nfuncs, _ = uleb(i)
        if sid == 2:                      # import section
            # Imported functions share the index space ahead of locals.
            j, count = i, None
            count, j = uleb(j)
            for _ in range(count):
                _, j = uleb(j)            # module name
                _, j = uleb(j)            # field name
                kind = d[j]
                j += 1
                if kind == 0x00:
                    _, j = uleb(j)
                elif kind == 0x01:
                    j += 1
                    lim = d[j]
                    j += 1
                    _, j = uleb(j)
                    if lim:
                        _, j = uleb(j)
                elif kind == 0x02:
                    lim = d[j]
                    j += 1
                    _, j = uleb(j)
                    if lim:
                        _, j = uleb(j)
                elif kind == 0x03:
                    j += 2
        i += size
    return nfuncs


def read_table_from_data(wasm_path, mem_base, size, nfuncs, disasm, seg_hint=None):
    """Read `size` bytes of the static data segment at memory offset `mem_base`.

    Emscripten maps its data segment at linear-memory 0, so memory address
    M lives at seg_start + M in the file. Rather than hand-parse the
    section table (which desyncs on custom sections) we locate the segment
    by its padding: emscripten reserves a low run of repeated bytes at the
    start of the data segment, which is a long, unambiguous run.

    The read is then VALIDATED against the module's function count. A
    wrong offset yields large integers that happen to look like data;
    without this check the tool would report confident nonsense.
    """
    d = open(wasm_path, 'rb').read()
    nvals = size // 4

    def reads_as_table(off):
        if off < 0 or off + size > len(d):
            return None
        vals = struct.unpack('<%dI' % nvals, d[off:off + size])
        if nfuncs is None:
            return None
        # A real DLL_FUNCTIONS table is 50 DISTINCT function indices, one
        # per hook. Reject:
        #   - any zero or out-of-range slot  (reading the wrong bytes)
        #   - duplicate indices               (a constant/pointer array, not
        #                                       50 separate hook functions)
        # The duplicate check matters: small in-range integers can be
        # satisfied by constant tables in rodata, which pass a range check
        # alone and silently produce a report where every hook looks like a
        # no-op.
        if any(v == 0 or v >= nfuncs for v in vals):
            return None
        if len(set(vals)) != nvals:
            return None
        # Every slot must name a function that actually exists in this
        # module. This is the decisive check: constant tables in rodata
        # are made of distinct small in-range integers and survive both
        # tests above, but they point at nothing.
        if not all(('func[%d]' % v) in disasm for v in vals):
            return None
        return vals

    # Candidate segment starts: ends of long runs of identical bytes.
    # Emscripten pads the low addresses of the data segment, so one of
    # these is the true segment start. The module contains other repeated
    # byte runs, so we cannot just take the first — collect them all and
    # keep whichever one produces a valid table. This is self-validating:
    # if none does, the tool fails loudly instead of printing nonsense.
    candidates = []
    if seg_hint is not None:
        candidates.append(seg_hint)
    run_byte, run_len = None, 0
    for i in range(min(len(d), 1 << 23)):
        b = d[i]
        if b == run_byte:
            run_len += 1
            if run_len >= 24 and i + 1 < len(d) and d[i + 1] != b:
                if i + 1 != seg_hint:
                    candidates.append(i + 1)
                if len(candidates) > 8192:
                    break
        else:
            run_byte, run_len = b, 1

    # Several candidates can satisfy the structural checks — rodata holds
    # more than one block of 50 distinct small in-range integers. Score
    # instead of taking the first: a built DLL_FUNCTIONS table is written
    # in field order, so its indices ascend. That is a heuristic, so the
    # structural checks still gate it and the winner is reported below
    # for the reader to sanity-check.
    best = None
    for seg_start in candidates:
        off = seg_start + mem_base
        vals = reads_as_table(off)
        if vals is None:
            continue
        ascending = sum(1 for i in range(1, nvals) if vals[i] > vals[i - 1])
        score = ascending
        if best is None or score > best[0]:
            best = (score, seg_start)
    if best is not None:
        seg_start = best[1]
        off = seg_start + mem_base
        return d[off:off + size], seg_start

    sys.exit(
        'could not locate the DLL_FUNCTIONS static table. Tried '
        f'{len(candidates)} candidate data-segment starts; none produced '
        f'{nvals} in-range function indices (expected 0..{nfuncs}). '
        'This build may lay the data segment out differently — the '
        'output would be untrustworthy, so stopping here.')


def dll_functions_fields(eiface_path):
    """Parse DLL_FUNCTIONS field names out of xash3d-fwgs engine/eiface.h."""
    src = open(eiface_path, errors='replace').read()
    end = src.find('} DLL_FUNCTIONS;')
    if end == -1:
        sys.exit("no `} DLL_FUNCTIONS;` in " + eiface_path)
    # Walk back to the matching opening brace.
    depth = 0
    i = end
    start = None
    while i > 0:
        if src[i] == '}':
            depth += 1
        elif src[i] == '{':
            depth -= 1
            if depth == 0:
                start = src.rfind('typedef', 0, i)
                break
        i -= 1
    if start is None:
        sys.exit('could not match the opening brace of DLL_FUNCTIONS in ' + eiface_path)
    body = src[start:end]
    fields = []
    for line in body.split('\n'):
        l = line.split('//')[0].strip()
        mm = re.match(r'[\w\s\*]+\(\s*\*\s*(\w+)\s*\)', l)
        if mm:
            fields.append(mm.group(1))
    return fields


def our_assignments(shim_path):
    """Parse `p->pfnX = ts_Y;` out of ts_FillDllFunctions."""
    src = open(shim_path).read()
    m = re.search(r'static void ts_FillDllFunctions\(DLL_FUNCTIONS \*p\)\s*\{(.*?)\n\}', src, re.S)
    if not m:
        sys.exit("could not find ts_FillDllFunctions in " + shim_path)
    return {mm.group(1): mm.group(2)
            for mm in re.finditer(r'p->(\w+)\s*=\s*(\w+)\s*;', m.group(1))}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    baseline = sys.argv[1]
    shim = sys.argv[2] if len(sys.argv) > 2 else 'shim/ts_shim_v3.c'
    eiface = sys.argv[3] if len(sys.argv) > 3 else '/tmp/xiface.h'

    exports = objdump(baseline, 'Export')
    api = find_export(exports, 'GetEntityAPI') or find_export(exports, 'GetEntityAPI2')
    if api is None:
        sys.exit('baseline exports neither GetEntityAPI nor GetEntityAPI2')
    out = objdump(baseline)
    body = find_body(out, api)

    # The static-table shape: `memory.copy(..., __memory_base + N, SIZE)`.
    mc = re.search(r'__memory_base>\s*\n.*?i32\.const (\d+)\s*\n.*?i32\.add\s*\n'
                   r'.*?i32\.const (\d+)\s*\n.*?memory\.copy', body, re.S)
    if not mc:
        sys.exit('GetEntityAPI does not memcpy a static table — '
                 'this baseline builds the table field-by-field, '
                 'which this tool does not decode yet.')
    mem_base, size = int(mc.group(1)), int(mc.group(2))
    nfields = size // 4

    print(f'GetEntityAPI: func[{api}]  static table @ mem_base+{mem_base}, '
          f'{size} bytes = {nfields} fields')

    nfuncs = total_functions(baseline)
    seg_hint = None
    for a in sys.argv[4:]:
        if a.startswith('--seg-offset='):
            seg_hint = int(a.split('=', 1)[1])
    raw, seg_start = read_table_from_data(baseline, mem_base, size, nfuncs, out, seg_hint)
    print(f'data segment starts at file offset {seg_start} (structural checks passed)')
    vals = struct.unpack('<%dI' % nfields, raw)

    fields = dll_functions_fields(eiface)
    if len(fields) != nfields:
        print(f'WARNING: eiface.h declares {len(fields)} DLL_FUNCTIONS fields '
              f'but the baseline populates {nfields}. First {min(len(fields),nfields)} compared.')

    ours_raw = our_assignments(shim)
    ours = {k: v for k, v in ours_raw.items() if v is not None}

    print()
    print(f'{"idx":>3}  {"field":<26} {"baseline":>8} {"~instr":>7}  ours')
    print('-' * 74)
    null_fields, thin = [], []
    for i in range(nfields):
        name = fields[i] if i < len(fields) else f'<field {i}>'
        fi = vals[i]
        b = find_body(out, fi)
        n = instr_count(b) if b else -1
        ours_val = ours.get(name)
        if ours_val is None:
            null_fields.append((i, name))
            ours_txt = '*** NULL ***'
        else:
            ours_txt = ours_val
        flag = ''
        if b is not None and n <= 12:
            flag = '  <- baseline no-op'
            thin.append((i, name, n))
        print(f'{i:>3}  {name:<26} {fi:>8} {n:>7}  {ours_txt}{flag}')

    print()
    print(f'SUMMARY: baseline populates {nfields}/{len(fields)} fields; '
          f'our shim assigns {len(ours)}; NULL in ours: {len(null_fields)}')
    if thin:
        print()
        print('Baseline hooks that are NO-OPS (<=12 instrs) even though the')
        print('baseline renders the map — implement more of these and you are')
        print('chasing the wrong thing:')
        for i, name, n in thin:
            print(f'  [{i:>2}] {name:<26} {n} instrs')


if __name__ == '__main__':
    main()