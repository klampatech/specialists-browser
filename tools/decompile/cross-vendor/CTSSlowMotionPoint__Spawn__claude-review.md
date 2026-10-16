```
VERDICT: PASS-WITH-NOTES

Checklist (for a D.4.1 gameplay method; D.3 interface checks are N/A here):
1. Signature — ✅ — `void Spawn(this: CTSSlowMotionPoint)` matches the
   disassembly's plain-thiscall shape (no return, one `this` arg).
2. Version check — N/A — no API version negotiation in a Spawn method.
3. interfaceVersion assignment-back — N/A.
4. Success path — ✅ — the `rep stos DWORD` zero-fill of 33 DWORDs at
   offset 0x64 is correctly captured as `this.m_affectedPlayers.fill(0)`.
5. No fabricated paths — ✅ — control flow is straight-line and matches
   the disassembly 1:1. No spurious branches, no early returns.
6. No TODO body — ✅ — function body is real code; TODOs are scoped to
   genuinely ambiguous bits (offset→field-name mapping, constants).
7. Field names — ⚠️ — see Issues below.
8. Compiles in isolation — ⚠️ — references `CTSSlowMotionPoint`,
   `Vector`, `UTIL_SetSize`, `UTIL_SetOrigin`, `gpGlobals`,
   `cvar_slow_amount`, and `NEXT_THINK_DELAY` without inline `any` stubs.

Issues to fix:

  A. **Value at `this+0x0c` does not match disassembly literal.**
     Assembly: `mov ax,0x0; or eax,0xffff0000` ⇒ `eax = 0xffff0000`.
     That is `-65536` (or `0xffff0000` as uint32), NOT `-1`.
     TS claims `this.m_iAffectedPlayerIndex = -1`. Either the C source
     really wrote `-1` and a sloppy compiler pattern produced the
     non-canonical literal (rare but possible — `or eax, imm32` and
     `mov ax, imm16` are the same length on i386, so a peephole pass
     could substitute), or the disassembly literal *is* `-65536` and
     this should be flagged. Resolve by reading the actual C from
     `CreateSlowMotionPoint` (the constructor) — the sentinel pattern
     matches better there.

  B. **Field-name mapping for `pev` offsets 0x108 / 0x10c / 0x118 is
     unverified.** Two candidate mappings from leaked entvars_t are
     plausible, and both place `renderfx` at 0x118:
       (i)  0x108=rendermode, 0x10c=rendercolor.r, 0x118=renderfx
       (ii) 0x108=renderamt,  0x10c=renderfx,       0x118=??? (some
            later-field candidate — 0x118=renderfx in many leaked
            dumps but `0x80` as `renderfx` is not a standard value;
            `kRenderFxNone=0`, `kRenderFxHalfLambda=0x80` exists but
            is unusual for a slow-motion trigger).
     Whichever mapping is correct, the current assignment pair
     `rendermode=0, renderfx=0, renderamt=0x80` produces no visible
     rendering under `kRenderNormal` (renderamt is ignored). The
     intent for a "trigger zone" is usually `kRenderTransAlpha (=5)
     + renderamt=0x80`. Verify against `SPEC.md` for what visual
     state (if any) the trigger is meant to have.

  C. **`cvar_slow_amount` is inferred, not resolved.** `[ebx+0x13a8]`
     is a PIC-relative global. TS assumes it is the cached value of
     the `slowamt` cvar. Demangled `grep` against `nm -D` / the
     cvar-singleton string table (see `tools/decompile/analysis/
     strings-n5.txt`) will pin it. Not blocking, but it should not
     ship as an inferred name.

  D. **`NEXT_THINK_DELAY` constant is unverified.** The 8-byte at
     `[ebx-0x6ecd8]` is fld'd as a double then added to a single
     (truncated). Resolution: dump the data section at that PIC
     offset and read the bytes. Common values for "small delay"
     in TS are 0.1s–0.5s.

  E. **`pev.classname = "slowmo_point"` simplification is fine** but
     note that the disassembly actually performs `MAKE_STRING`-style
     arithmetic (`sub eax,[edx+0x98]` against the GOT-style string
     base). The TS is at the abstraction layer — acceptable, but
     flag it in `SPEC.md` so the next pass knows the offset is
     intentional.

  F. **Type stubs for isolated compilation.** `CTSSlowMotionPoint`,
     `Vector`, `gpGlobals`, `cvar_slow_amount`, `NEXT_THINK_DELAY`
     are not declared inline. For the snippet to compile standalone,
     these need `// @ts-expect-error` or stub `any` declarations.
     Low priority — this snippet will live in a file with imports.

No rewrite required — the structure is right. The above are
field-name and value-clarity fixes, not logic fixes.
```

Hand-off note for `HANDOFF.md` (no scope change, just a heads-up): `tools/decompile/cross-vendor/CTSSlowMotionPoint__Spawn__codex.ts` is the file reviewed here. The four siblings (`CreateSlowMotionPoint`, `DeactivateSlow`, `WaitThink`, `ActivateSlow`) likely share issues C (cvar inference) and B (entvars_t field mapping). Worth a single follow-up pass to resolve `[ebx+0x13a8]` and the 0x108/0x10c/0x118 mapping against HLSDK before D.4.2 ships.
