```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `OnGround(this: any): void` matches the demangled
   C++ symbol `CTSWorldGun::OnGround()` (no args, no return). The
   `this`-as-first-arg convention is implicit in TS via the `this: any`
   annotation. No issues.
2. Version check — ⚠️ — N/A for this function (it is a gameplay method,
   not one of the 4 engine↔mod interface entries). Flagging only because
   the review template is built around the interface functions; this
   item doesn't apply.
3. interfaceVersion assignment — ⚠️ — N/A (same reason). No
   assignment-back is expected here.
4. Success path: struct copy — ⚠️ — N/A. The function does not perform a
   struct copy. It mutates entity fields in place, which is the correct
   thing for `OnGround`. Faithful to the disassembly (no `memcpy`
   pattern is visible in the asm body).
5. No fabricated code paths — ✅ — The asm is straight-line (no branches,
   no loops); the TS body is also straight-line. Every external call
   (`UTIL_SetOrigin`, `UTIL_SetSize`) and every store the TS emits is
   visible in the asm. The 4 dword stores to `this+0xc/0x10/0x14/0x18`
   and the 2 stores to `pev+0x198/0x10c` match exactly. Reordering of
   independent field writes is fine.
6. No TODO body — ✅ — The body is fully expressed in code. There are two
   `TODO(asm-ambiguous)` comments but they are scoped to two specific
   field-offset-to-symbol mappings, not used to defer real logic.
7. Field names — ⚠️ — Mixed pass/fail:
     ✅ `this.pev`, `pev.origin`, `UTIL_SetOrigin`, `UTIL_SetSize`
        all match HLSDK/GoldSrc conventions.
     ⚠️ `pev.__0x198`, `pev.__0x10c` — pev offsets are flagged as
        `__0x__` placeholders with a TODO, which is honest. **But** the
        accompanying docstring asserts these are "drop[ping] a
        movement/collision flag and re-arm[ing] a damage/solid flag."
        That is unfounded speculation — the asm only shows a store of
        `0` and a store of `1`, not what those bits semantically mean.
        Strip the speculation.
     ⚠️ `this.__0xc /0x10 / 0x14 / 0x18` — flagged as TODO placeholders
        for CTSWorldGun-instance fields. Honest. (Note: 0xc–0x17 is
        plausibly a `vec3_t angles` followed by a 0x18 dword, but the
        values `0x00460000`, `0x60`, `0xffff0000` don't decode to
        clean IEEE-754 floats, so the TODO is warranted.)
     ❌ Naming inconsistency in the maxs constants:
        `const maxsXZ = __GROUND_MAXS_XY;` — the local is named `maxsXZ`
        but the source constant is named `_XY`. Same for
        `const maxsY = __GROUND_MAXS_Z;`. Either the locals or the
        constants have the wrong suffix. (Recall: HL/GoldSrc is Z-up
        in its physics, but engine vectors are X-forward, Y-left,
        Z-up, so naming depends on convention; pick one and be
        consistent.)
8. Compiles in isolation — ❌ — The snippet references several symbols
   it doesn't define:
     - type `Vector`
     - functions `UTIL_SetOrigin`, `UTIL_SetSize`
     - constants `__GROUND_MINS_UNIFORM`, `__GROUND_MAXS_XY`,
       `__GROUND_MAXS_Z`, `__LAY_FLAT_VALUE`
   Per the checklist ("no external type references we don't define
   here; use `any` for unknowns"), this fails. Acceptable mitigations:
   declare `type Vector = [number, number, number]`, declare
   `declare function UTIL_SetOrigin(...)` / `UTIL_SetSize(...)` stubs,
   and either `declare const __GROUND_MINS_UNIFORM: number;` or fold
   the values inline as `0xNNNNNNNN`-style magic-number comments.

Issues to fix:
- **Strip speculation in the pev docstring.** "Dropping a
  movement/collision flag and re-arming a damage/solid flag" is not
  derivable from the disassembly. Replace with neutral phrasing:
  "Two writes into the pev block at offsets 0x198 and 0x10c; field
  names TBD in D.4."
- **Fix the maxs constant naming inconsistency.** Either rename
  `__GROUND_MAXS_XY` → `__GROUND_MAXS_XZ` and `__GROUND_MAXS_Z` →
  `__GROUND_MAXS_Y`, or rename the locals to `maxsXY` / `maxsZ`. Pick
  the convention that matches what these globals mean in HL's
  coordinate space.
- **Make the snippet self-contained** per the isolation rule.
  Add the `Vector` type alias and stub declarations for the
  `UTIL_*` functions and `__*` constants, OR explicitly mark them as
  placeholders that the consumer must replace.
- **(Optional, not a fail)** `this.__0x10 = 0x60` — the asm is
  `mov cx, 0x60; mov edx, ecx`, which only guarantees the lower 16
  bits are 0x60; the upper 16 are whatever ecx had after the prior
  `UTIL_SetSize` PLT call (i.e. volatile / unknown). In practice
  the compiler emits this as a clean 0x00000060, so the TS
  constant is fine, but a brief comment noting the asm-only-
  proves-low-16-bits assumption is welcome.

Suggested rewrite:
```typescript
/**
 * CTSWorldGun::OnGround — Called by the engine once a thrown weapon
 * pickup settles on a surface. Re-snaps the entity to its current
 * origin (so UTIL_SetOrigin's wrapper re-traces it down to the
 * underlying floor), sizes the entity to the ground-rest bounding
 * box read from data-segment globals, and writes four class-instance
 * dwords that the pickup / respawn chain reads later.
 *
 * @param this  The CTSWorldGun entity instance (`this` in the
 *              original C++)
 * @returns     void
 */

// --- stubs so this snippet compiles in isolation -----------------
type Vector = [number, number, number];
declare function UTIL_SetOrigin(pev: any, origin: Vector): void;
declare function UTIL_SetSize(pev: any, mins: Vector, maxs: Vector): void;
declare const __GROUND_MINS_UNIFORM: number;   // [data - 0x6b68c]
declare const __GROUND_MAXS_XZ:     number;   // [data - 0x6b688]
declare const __GROUND_MAXS_Y:      number;   // [data - 0x6f408]
declare const __LAY_FLAT_VALUE:     number;   // [data + 0x133c]
// ----------------------------------------------------------------export function OnGround(this: any /* CTSWorldGun */): void {
  const pev: any = this.pev;

  // Two writes into the pev block at offsets 0x198 and 0x10c; field
  // names TBD in D.4.
  // TODO(asm-ambiguous): map these to named pev fields once the
  // entvars layout dump (D.1) lands.
  pev.__0x198 = 0;
  pev.__0x10c = 1;

  // Re-set origin to itself; the engine-side UTIL_SetOrigin wrapper
  // is responsible for the actual ground-trace side effect.
  UTIL_SetOrigin(pev, pev.origin);

  // Ground-rest mins is a uniform scalar applied to x/y/z; maxs
  // splits xz (horizontal) from y (vertical). HL coordinate space
  // uses Z-up, so "XZ" = horizontal plane.
  const minsScalar = __GROUND_MINS_UNIFORM;
  const maxsXZ     = __GROUND_MAXS_XZ;
  const maxsY      = __GROUND_MAXS_Y;
  const mins: Vector = [minsScalar, minsScalar, minsScalar];
  const maxs: Vector = [maxsXZ,     maxsXZ,     maxsY];
  UTIL_SetSize(pev, mins, maxs);

  // Four class-instance dword stores at offsets 0xc, 0x10, 0x14, 0x18.
  // Order is shuffled from the asm, but the writes are independent.
  // TODO(asm-ambiguous): these are CTSWorldGun-instance fields —
  // TBD once the class layout (D.4) is reconstructed.
  this.__0xc  = 0x00460000;
  this.__0x10 = 0x60;
  this.__0x14 = 0xffff0000;
  this.__0x18 = __LAY_FLAT_VALUE;
}
```
```

Two additional notes outside the formal checklist that you may want to record in `HANDOFF.md` or the chunk review log:

- **Review-template applicability.** The D.3 cross-vendor prompt is
  written for the four `ts_i386.so` engine↔mod interface exports
  (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`,
  `GetNewDLLFunctions`). `CTSWorldGun::OnGround` is gameplay code, so
  checklist items 2/3/4 (`*interfaceVersion` semantics) are not
  applicable here. The body, field-name, and isolation checks still
  apply and are what the verdict above is anchored to. If you want a
  second template tuned for member-function reviews (control-flow
  fidelity, pev/class-field conventions, PLT-stub declarations),
  flag it and I'll sketch one.

- **Data-segment globals are real addresses, not invented names.**
  `__GROUND_MINS_UNIFORM`, `__GROUND_MAXS_XZ`, `__GROUND_MAXS_Y`,
  `__LAY_FLAT_VALUE` are placeholders invented by the decompiler pass.
  Before this chunk can be considered "done" rather than "draft",
  those four addresses (data − 0x6b68c, −0x6b688, − 0x6f408,
  + 0x133c) need to be cross-referenced against `strings-n5.txt`
  and the cvar/global dump so the placeholders get replaced by real
  names (or marked as genuinely unknown). I'd suggest adding that as
  the next task in `HANDOFF.md` rather than letting it ride under
  the D.4 class-layout work.
