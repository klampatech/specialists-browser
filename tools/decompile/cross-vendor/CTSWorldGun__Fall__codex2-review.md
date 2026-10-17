I now have full context. Before I give a verdict I need to flag three things, because they fundamentally change what "the right answer" looks like here:

**Meta-issue 1 — This exact review has already been done.**

`tools/decompile/cross-vendor/CTSWorldGun__Fall__codex2-review.md` already exists, dated prior session, verdict `PASS-WITH-NOTES`, produced by codex itself running the same prompt template against the same chunk. The canonical post-review TS is at `tools/decompile/output/CTSWorldGun__Fall.ts` (decompile-review.py's saved PASS-WITH-NOTES branch). It addresses every issue the previous reviewer flagged. D.4 progress was already at 246/365 when this session started; this method has been through the pipeline.

**Meta-issue 2 — The TS you pasted is the pre-review codex output, not the canonical.**

Byte-for-byte identical to `tools/decompile/cross-vendor/CTSWorldGun__Fall__codex.ts` (the first-pass codex impl, before the codex2 review refined it). The current canonical is the rewritten version that already exists.

**Meta-issue 3 — The 8-item checklist is calibrated for the engine↔mod interface functions, not gameplay class methods.**

Items 2/3/4 (version check, `*interfaceVersion` assignment-back, success-path struct copy) are categorically not applicable to `CTSWorldGun::Fall`. The previous codex2 reviewer hit this same wall and worked around it by substituting class-method sub-checks. I'll do the same.

Now the verdict, on the pasted pre-review `codex.ts`:

```
VERDICT: PASS-WITH-NOTES

Preamble: see meta-issues above. The previous review (codex2, in
tools/decompile/cross-vendor/CTSWorldGun__Fall__codex2-review.md)
produced the same verdict on the same input. The canonical
post-review output at tools/decompile/output/CTSWorldGun__Fall.ts
already contains the suggested rewrite addressing every issue
below — there is no new work to do unless Kyle wants a third
review pass on a different input.

Checklist (with class-method substitutions where the original
items are N/A):
1. Signature — ✅ — `Fall(this: CTSWorldGun): void` matches the
   demangled C++ symbol `Fall__11CTSWorldGun` and the C++ method
   `CTSWorldGun::Fall()`. TS-tied `this` parameter is the correct
   TS encoding of the implicit `this` parameter. No extra args,
   return type `void` matches the disassembled ret.
2. Version check — N/A — engine↔mod interface artifact. No
   version constant in this function.
3. interfaceVersion assignment-back — N/A.
4. Success-path struct copy — N/A.
5. No fabricated code paths — ⚠️ — Control flow matches the
   disassembly: the four `jae`/two `jne`/one `je`/one `test ah,0x1`
   all align with the conditional structure. BUT two semantic
   gaps:
   - **+0x7c application is asymmetric.** The disassembly loads
     `[ptr+0x7c]` for BOTH branches (tr.pHit path and engine_ret
     path). The TS applies `+0x7c` only to the engine_ret branch
     and treats `tr.pHit` as already unwrapped. Pick one model
     and apply it consistently.
   - **The "vecAngles pitch/yaw" comment is wrong.** The     `pev+0x50` / `pev+0x58` writes correspond to
     `pev.velocity.x` / `pev.velocity.z` (HLSDK entvars_t has
     velocity at 0x50/0x54/0x58). Velocity.y at 0x54 is
     deliberately NOT zeroed — that's slide physics. The
     "vecAngles pitch/yaw" guess is misleading; remove or
     correct it.
6. No TODO body — ⚠️ — Body is fully expressed in code (not a
   comment stub). It carries 5 `TODO(asm-ambiguous)` annotations
   plus several `field0xXX` placeholders, which is acceptable
   for a first pass but should be resolved before D.5 ship.
7. Field names — ⚠️ — Mixed.
   ✅ Real names where unambiguous: `pev`, `gpGlobals.flTime`,
   `EMIT_SOUND_DYN`, `UTIL_Remove`, `UTIL_TraceLine`,
   `get_weapon_info`, `ClearMultiDamage`, `ApplyMultiDamage`.
   ⚠️ Speculative / wrong names:
   - **`flFallVelocity`** at `pev+0x104`: not a standard
     HLSDK entvars_t field (HLSDK's `entvars_t` ends around
     offset 0x108, and `flFallVelocity` is typically an
     internal accumulator, not a struct field). Treat as
     a TODO until sourced from TS headers.
   - **`pev.pEdictField`** at `pev+0x208`: 0x208 is past
     entvars_t. The actual symbol is
     `CBaseEntity::m_pContainingEdict` (offset 0x208 from
     CBaseEntity, which overlays pev at offset 0). The TS
     naming `pev.pEdictField` is structurally wrong.
   - **`m_iWeaponType`** at `[ebp+0x88]`: `0x88` is a class-
     private field offset, not pev. Name is plausible but
     flag as class-private.
8. Compiles in isolation — ❌ — References ~15 undeclared
   external symbols: `CTSWorldGun`, `CBaseEntity`, `pev`,
   `gpGlobals`, `sv_gravity`, `tsBounceScale`, `tsSndVolume`,
   `tsSndAtten`, `tsSndFlags`, `tsTraceScale`, `tsDmgScale`,
   `damagePosStruct`, `EMIT_SOUND_DYN`, `UTIL_Remove`,
   `RemoveEntityFromSlowedArray`, `UTIL_TraceLine`,
   `engfuncLookup`, `get_weapon_info`, `ClearMultiDamage`,
   `ApplyMultiDamage`, `DMG_NERVEGAS`, `DMG_ACID`, `VectorAdd`,
   `VectorScale`, `IGNORE_MONSTERS`. Need `declare` stubs or
   imports.

Class-method sub-checks (substituting for items 2-4):
- 2a. Arithmetic patterns — ⚠️ — `pev.flFallVelocity =
  pev.flFallVelocity + sv_gravity.value` is an RMW guess.
  The disassembly does `fld QWORD; fadd DWORD; fstp DWORD`
  with no RMW load of `[edx+0x104]`. That pattern fits
  either (a) `pev+0x104 = X + sv_gravity` where X is a
  separate symbol, or (b) an `a += b` where the compiler
  CSE'd the load. Either is plausible — flag the ambiguity.
- 3a. Virtual dispatch resolution — ⚠️ —
  - `[ebp+0x60]+0x10` × `[ebx-0x6de98]`: plausible as
    `this.fnTable0x60.method_0x10() * tsBounceScale.value`,
    but `[ebp+0x60]` is more likely a per-instance member fn
    ptr than a vtable (vtable is at offset 0). Investigate
    before naming.
  - `[edi+0x60]+0x54`: this is the TakeDamage virtual
    dispatch. TS reads it correctly. ✅ Ordering of the 6
    stack args matches disassembly (ent, inflictor, damage
    float via FPU spill, direction, dmgStruct,
    dmgBits=0x1080).
- 4a. EMIT_SOUND_DYN argument order — ❌ — see Issues #1.

Issues to fix:
1. **EMIT_SOUND_DYN argument order is wrong** (HIGH). Disassembly
   push order, top-of-stack first: `[edx+0x208]` (entity),
   `0x6` (channel), `eax` (sample), `[ebx-0x6f3fc]` (volume),
   `[ebx-0x6e7e4]` (attenuation), `0x0` (fFlags), `0x64`
   (pitch=100). HLSDK: `EMIT_SOUND_DYN(edict*, int, char*,
   float, float, int, int)`. The TS places `100` between
   volume and attenuation instead of at the end. **Swap to
   `(entity, 6, sample, tsSndVolume.value, tsSndAtten.value,
   tsSndFlags.value, 100)`.** This bug matches what the
   previous codex2 review caught.

2. **`pev.pEdictField` is misnamed** (MEDIUM). See item 7.
   Rename to `this.m_pContainingEdict` or `this.edict()`.

3. **`flFallVelocity` is unverified** (MEDIUM). See item 7.
   Either source from a TS header or expose as a
   `// TODO(asm-verified)` field.

4. **+0x7c application is asymmetric** (MEDIUM). See item 5.

5. **vecAngles pitch/yaw comment is wrong** (LOW). See item 5.

6. **Replace placeholders with tracked TODOs.** `field0x50`,
   `field0x58`, `field0x7c`, `field0x160`, `fnTable0x60`,
   `parent.WAITThink()` need either real names or   `// TODO(<ticket>): <why>`.

7. **`this.parent.WAITThink()` is an approximation.** The
   disassembly calls `WaitThink__15CTSPhysicObject@plt`, the
   base-class method. Model as `super.WAITThink()` (or the
   equivalent TS pattern) for clarity.

8. **Compile-in-isolation failures** (HIGH). See item 8.

Suggested rewrite: no new rewrite needed. The canonical at
`tools/decompile/output/CTSWorldGun__Fall.ts` already
addresses all 8 issues (verified by reading it just now).
It uses `declare` stubs for the externals, fixes the
EMIT_SOUND_DYN arg order, names the fields correctly
(`this.m_pContainingEdict`, `this.super.WAITThink()`,
`pev.velocity.x/z`), and applies +0x7c consistently.
That file is the version D.4 will consolidate from when
world-guns.ts gets built (HANDOFF priority #11, afterCTSGun + CTSGameRules + CTSAnimation + CTSStunt).
```

---

**Recommended next action:** nothing review-wise — the canonical exists. If you want me to do something concrete with this method, options:

1. **Validate** that `output/CTSWorldGun__Fall.ts` still represents what the chunk says (i.e., a fresh codex2-equivalent review against the current canonical). I'd find this unlikely to surface new issues, but it's a useful periodic check.
2. **Move on** to the priority-11 CTSWorldGun consolidation (`src/mod/world-guns.ts`) when D.4.8 (CTSGun) + D.4.6-equivalents for CTSGameRules/CTSAnimation/CTSStunt finish. Per HANDOFF, world-guns is the 5th-tier consolidation.
3. **Fix the review prompt template** at `tools/decompile/prompts/review-single-function.md` so its 8-item checklist auto-detects gameplay class methods and substitutes the class-method sub-checks. The previous codex2 reviewer had to flag the mismatch by hand; baking the substitution into the template removes that step. ~30-line patch.

What would you like? My read of the AGENTS.md protocol is that review-without-action doesn't justify a HANDOFF update, so I'm holding off on writes until you pick one.
