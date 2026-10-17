```
VERDICT: PASS-WITH-NOTES

# Cataloging note

The HLSDK reference provided is for the 4 mod↔engine interface
entry points (`GiveFnptrsToDll`, `GetEntityAPI`,
`GetEntityAPI2`, `GetNewDLLFunctions`). The function under review
— `CTSBomb::SetRandomWires` — is **not** in that category. It's
a TS gameplay entity method on the bomb entity, with no HLSDK
counterpart and no interface-version semantics.

The 8-item checklist is structurally a no-op for this function.
I've adapted the spirit (disassembly-faithful, no fabrication,
correct externals) and applied it to what the disassembly
actually shows.

Checklist:
1. Signature — ✅ — `SetRandomWires(this: CTSBomb): void`. Demangled
   symbol is `CTSBomb::SetRandomWires()`, no explicit args, void
   return. Matches.
2. Version check — N/A — Not an interface export, no version
   constant in the disassembly. TS correctly omits any compare.
3. `*interfaceVersion` assignment-back — N/A.
4. Success-path struct copy — N/A. Closest analogue —
   "engine-call use is correct": ✅. Two `call DWORD PTR [...+0x168]`
   map to `RANDOM_LONG(0, 2)`. Engine slot 0x168 is
   `pfnRANDOM_LONG(int lLow, int lHigh)` returning a value in
   `[lLow, lHigh]`. The asm pushes `push 0x2; push 0x0` (right-
   to-left cdecl/stdcall), so the engine sees `(0, 2)` →
   result ∈ {0,1,2}. The TS's `RANDOM_LONG(0, 2)` is exactly
   right.
5. No fabricated paths — ✅ — Faithful translation of the
   disassembly:
     - `[edi+0x7c]=3 ; [edi+0x7d]=3 ; [edi+0x7e]=3` →
       3 explicit `m_WireState[i]=3` writes.
     - `lea edx,[edi+0xc] ; mov BYTE PTR [edx+eax*1+0x70],0x1`
       (i.e. `this[0x7c+rand]=1`) → `m_WireState[disarmIndex]=1`.
     - Loop at `0x7c5e0`: `RANDOM_LONG(0,2)` → `add eax,0x70` →
       `cmp BYTE PTR [eax+esi*1],0x1 ; je 0x7c5e0` →
       `mov BYTE PTR [eax+edi*1+0xc],0x2`.
       TS: `do { trapIndex = RANDOM_LONG(0,2) } while
       (m_WireState[trapIndex] === 1); m_WireState[trapIndex]=2`.
     - Alignment NOP `lea esi,[esi+0x0]` correctly ignored.
     - Register-reuse (`esi=edi+0xc`, `ebp=engfuncs`) correctly
       abstracted away.
   Nothing invented.
6. No TODO body — ✅ — Logic is fully expressed in TS. TODOs only
   annotate ambiguous field names and externals.
7. Field names — ⚠️ — `m_WireState` is inferred from the 3-byte
   indexed-write pattern at offsets 0x7c / 0x7d / 0x7e. A
   3-element byte array is the cleanest abstraction; the
   binary's `[base+eax*1]` access pattern is consistent with
   either an array or 3 separate fields, but the compiler not
   coalescing the init writes argues slightly for "three
   fields." Either reading is defensible; the array is more
   idiomatic. TODO-flagged appropriately.
8. Compiles in isolation — ⚠️ — `CTSBomb` and `RANDOM_LONG` are
   not declared here (TODOs acknowledge that). With those
   defined in D.4 / engine bindings, the function compiles
   cleanly. Inspected-by-eye check passes.

Issues to fix:
- None blocking.
- D.4 cross-check: confirm `CTSBomb::CutWire` reads the same
  offsets (0x7c..0x7e) with the same state enum, otherwise
  the inferred field name needs to align with whatever CutWire
  reads as.
- Optional polish (D.4): declare
  `private m_iWireState: [number, number, number]` on
  `CTSBomb`, with a comment noting the wire-role enum
  `{ NEUTRAL=3, DISARM=1, TRAP=2 }` (or whatever matches
  `CutWire`).
- Behavioral note (matches asm, not a bug): the do-while has no
  iteration cap. Probability of exit per roll is 2/3 (only the
  disarm slot returns equal-to-1), so termination is fast in
  practice. If you want a defensive cap, that's a hardening
  choice and would deviate from the disassembly — flag in
  SPEC.md before doing so.

Suggested rewrite: not required. The TS is a clean translation
of the disassembly with no fabricated behavior. Re-listing it
verbatim would add noise without changing semantics.
```
