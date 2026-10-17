```
## Mismatch notice (read this first)

The 8-item checklist in this prompt was written for the four HLSDK
entry-point exports (`GiveFnptrsToDll`, `GetEntityAPI`,
`GetEntityAPI2`, `GetNewDLLFunctions`). `CTSAnimation::Init()` is
not one of those — it's a 90-byte straight-line member-initializer
that writes 11 DWORDs and 1 BYTE to `this`. Items 1–4 of the
checklist (signature-vs-HLSDK, version check, `*interfaceVersion`
writeback, success-path struct copy) do not apply at all. I applied
the items that still make sense (5–8) and added function-specific
checks A–D below.

VERDICT: PASS-WITH-NOTES

Checklist (adapted):
1. Signature — ✅ — disassembly is cdecl: only arg is at   `[esp+0x4]`, body ends in plain `ret` (not `ret N`), no value in
   `eax`. `Init(this: any): void` matches. Surfacing `this`
   explicitly is a stylistic choice consistent with the conversion
   guidance's "single TS function declaration" rule.
2. (n/a — no version check; this is not an API export)
3. (n/a — no `*interfaceVersion`; this is not an API export)
4. (n/a — no success-path struct copy; this is not an API export)
5. No fabricated paths — ✅ — disassembly is straight-line stores
   only, no branches; TS body has no invented branches.
6. No TODO body — ✅ — body is all real assignments; TODOs are
   only on inferred field *names*, never on logic.
7. Field names — ⚠️ — assembly only proves offsets and value widths.
   `m_iSequenceA/B` and `m_iGait` are reasonable inferences (the
   two -1 sequence slots + gait default of 1 line up with TS
   conventions). `m_flBulletDanceAlpha` / `m_flBulletDanceSpeed`
   are inferred from sibling methods (EnableBulletDance writes
   0.15 / 3.0 at the same offsets on `CBasePlayer`); Init itself
   only proves those slots are DWORDs, and a DWORD zero is
   bit-identical as int or float. The float guess is defensible
   but not proven from this function alone — leave the `m_fl` /
   `m_dw` distinction as TODO until EnableBulletDance is reviewed.
8. Compiles in isolation — ✅ — `any` for `this`, no imports, no
   external type references. Compiles standalone.

Function-specific checks:
A. Coverage of every store in the disassembly — ✅ — let me walk
   it: disassembly writes at offsets {0x00, 0x04, 0x08, 0x0c, 0x10,
   0x14, 0x18, 0x1dc, 0x1e0, 0x1e4} with values {-1, 0, 0, 0, 0,
   -1, 1, 0, 0, 0}, plus a 1-byte store at 0x1e8 = 0. Decompiled TS
   has all 11 DWORD writes and the BYTE write, with matching offsets
   and values. The TS regroups them by purpose (sequences, small-int
   fields, gait, BulletDance block) rather than mirroring the
   disassembly order — that's fine because plain stores are
   commutative.
B. BYTE-vs-DWORD width preserved — ⚠️ minor — `[this+0x1e8]` is a1-byte store in the assembly (`mov BYTE PTR [eax+0x1e8], 0x0`)
   but the TS just writes `this.m_bBulletDanceFlag = 0`. With the
   literal `0` the widening is harmless; but a future maintainer
   who later assigns `1` here would silently widen to a DWORD write
   and clobber `[this+0x1e9..0x1ec]`. Add an explicit
   "1-byte store, do not widen" comment so this doesn't happen.
C. No invented semantics in the comments — ✅ — every inferred
   name is marked `TODO(asm-inferred-name)`. The cross-reference
   to the parallel CBasePlayer BulletDance block (which motivates
   the 0x1dc–0x1e8 grouping) is a useful piece of context, not
   fabrication.
D. m_fl vs m_dw on the BulletDance slots — ⚠️ minor — I'd rather
   see `m_dwField1dc` / `m_dwField1e0` until the float guess is
   confirmed, then rename. The current `m_fl` commits to a type
   the disassembly doesn't prove.

Issues to fix:
- Add an explicit "1-byte store" comment to `[this+0x1e8]` so a
  later maintainer doesn't widen it.
- (Optional) Prefer `m_dwField1dc` / `m_dwField1e0` over `m_fl`
  on the BulletDance slots until EnableBulletDance is reviewed;
  the `m_fl` guess is currently unjustified by this function
  alone.

Suggested rewrite (only the byte-store comment and the `m_dw`
renames differ; the rest of the doc-comment and the field layout
explanation are fine as-is):

```typescript
/**
 * CTSAnimation::Init — initialize the CTSAnimation instance to safe defaults.
 *
 * Disassembly (90 B at 0x0005b320): 11 DWORD stores + 1 BYTE store
 * to `this`, then `ret`. No branches, no calls, no return value.
 *
 * Calling convention: cdecl-style; `[esp+0x4]` is the only stack
 * arg (`this`). No `push esi; push ebx` prologue — `this` is loaded
 * straight off the stack.
 *
 * Field layout (offsets are literal `[this+offset]` writes; names
 * are best-guess based on CTSAnimation's role and on the parallel
 * CBasePlayer offsets accessed by EnableBulletDance /
 * DisableBulletDance / BulletDance):
 *   [0x00], [0x14]  : two sequence indices; -1 is GoldSrc's "no
 *                     active sequence" sentinel.
 *   [0x04..0x10]    : small-int animation fields (timers, counters,
 *                     blend state) — zero-init on construction.
 *   [0x18]          : gait-style enum; default 1.
 *   [0x1dc..0x1e8]  : BulletDance state block on `this`. Same
 *                     offset range as CBasePlayer's BulletDance
 *                     fields. Zero on construction; EnableBulletDance
 *                     seeds the nonzero values at runtime.
 */
export function Init(this: any): void {
  // Sequence indices.
  this.m_iSequenceA = -1; // [this+0x00] — TODO(asm-inferred-name)
  this.m_iSequenceB = -1; // [this+0x14] — TODO(asm-inferred-name)

  // Small-int animation state fields.
  this.m_iField04 = 0; // [this+0x04] — TODO
  this.m_iField08 = 0; // [this+0x08] — TODO
  this.m_iField0c = 0; // [this+0x0c] — TODO
  this.m_iField10 = 0; // [this+0x10] — TODO

  // Default gait style.
  this.m_iGait = 1; // [this+0x18] — TODO(asm-inferred-name)

  // BulletDance state block on `this`. DWORD width is proven by
  // Init; the float interpretation comes from EnableBulletDance
  // and is unconfirmed as of this function.
  this.m_dwField1dc = 0; // [this+0x1dc] — TODO: float? see EnableBulletDance
  this.m_dwField1e0 = 0; // [this+0x1e0] — TODO: float? see EnableBulletDance
  this.m_dwField1e4 = 0; // [this+0x1e4] — TODO

  // ⚠ 1-byte store. Do NOT widen this to a DWORD write — it would
  // clobber [this+0x1e9..0x1ec].
  this.m_bField1e8 = 0; // [this+0x1e8] — TODO(asm-inferred-name), BYTE
}
```

Bottom line: the decompiled TS faithfully captures every store in
the disassembly, with no invented control flow and no external
type references. The only real fixes are (1) an explicit byte-width
comment on `[this+0x1e8]` and (2) holding off on the `m_fl` prefix
for the BulletDance slots until the sibling methods confirm it.
```

A note on the project protocol: per `AGENTS.md`, the entry point for any work session is `HANDOFF.md`, and `SPEC.md` is updated on design changes. This review touches one already-decompiled function's field naming — that's a D.3-style refinement, not a design change — so I haven't read or edited `HANDOFF.md` / `SPEC.md` for it. If you want the `m_fl` → `m_dw` rename (or any byte-width clarification) reflected in the canonical D.3 output, say the word and I'll update the chunk file accordingly.
