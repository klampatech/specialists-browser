Looking at the inputs, I notice an immediate mismatch: the review template is designed for **engine↔mod interface functions** (`GiveFnptrsToDll`, `GetEntityAPI*`, `GetNewDLLFunctions`) but the function under review is `CTSKnife::CreateKnife` — a TS gameplay entity factory. The HLSDK reference doesn't apply directly. I'll review against the disassembly (the relevant basis) and note where the engine-interface checklist items are N/A.

A few things I'm working from without re-running tools (sandbox is read-only and `exec_command` is returning empty):
- The decompiled TS as provided.
- The disassembly as provided.
- The demangled symbol `CreateKnife__8CTSKnifeP11CBasePlayerG6VectorT2i`.
- AGENTS.md, which I've already loaded — project conventions look conventional-commits + read HANDOFF/SPEC first. This task is a one-shot review, no commit, so I'm not touching HANDOFF/SPEC.

---

## Cross-vendor review — `CTSKnife::CreateKnife`

```
VERDICT: FAIL

Checklist (adapted — original template is for engine interface functions):
1. Signature — ❌ — TS claims 6 args (pPlayer, vecPos, pWeapon, pOwner,
   vecAngles, vecVelocity). The demangled symbol parses as 2 args
   (`(p ?, ?)` per the demangler hint), and the disassembly accesses
   5 distinct arg-derived slots at [esp+0x20], [0x28], [0x2c], [0x34],
   [0x38], with apparent gaps at [0x24] and [0x30]. The 6-arg claim is
   not justified by the disassembly and the arg order/names are not
   consistent with the demangling.
2. Arg at [esp+0x2c] naming — ❌ — TS uses this slot as both `pOwner`
   (for the 4-byte write to [ebp+0xa0]) AND `vecPos` (for the 12-byte
   copy to pev->origin). The disassembly reuses the SAME slot twice,
   which means it's one arg (a pointer) — most naturally pOwner, with
   the origin copied from `pOwner.pev.origin`. TS misnames it as
   `vecPos` in step 6.
3. Field [ebp+0xa0] = pev->owner — ❌ — Disassembly writes DIRECTLY to
   `[ebp+0xa0]` (`mov DWORD PTR [ebp+0xa0], eax`), not indirectly via
   pev. Combined with the deref pattern at 6da27 (`mov ecx, [ebp+0x0];
   mov [ecx], eax` — pev->classname), [ebp+0x0] is the pev POINTER,
   so [ebp+0xa0] is a class MEMBER at offset 0xa0, not pev+0xa0.
   pev->owner would require [[ebp+0x0]+0xa0], an indirect access.
4. Success path / data flow — ⚠️ — The 12-byte origin copy should be
   `knife.pev.origin = pOwner.pev.origin` (or equivalent), not from a
   separate `vecPos` Vector. The velocity (pev+0x20) and angles
   ([ebp+0x94], a class member — not pev) flows are correct.
5. No fabricated paths — ✅ — The control flow (FPU compare, the two
   virtual-dispatch branches, the field-copy sequence) tracks the
   disassembly cleanly. No invented branches.
6. No TODO body — ✅ — Body is real code; TODOs are scoped to genuinely
   ambiguous parts (classname literal, vtable slot identity, weapon
   chain).
7. Field names — ⚠️ — pev->classname / pev->origin / pev->velocity are
   correct (offsets0x00, 0x08, 0x20 within pev). [ebp+0xa0] is
   mislabeled as pev->owner (should be a class member). [ebp+0x94],
   [ebp+0x8c], [ebp+0x92] are correctly flagged as unknown.
8. Compiles in isolation — ⚠️ — References `GOT_BASE`, `MAKE_STRING`,
   `VirtualDispatch60`, `VirtualDispatchFloat`, `VectorCopy`,
   `UTIL_SetOrigin`, `GetClassPtr<T>` — none defined here. Fine if
   defined elsewhere; would fail in isolation as written.

Engine-interface-specific items (N/A for this function):
- HLSDK reference comparison — N/A (not an engine↔mod interface).
- interfaceVersion check / assignment-back — N/A.
- memcpy vs struct copy — N/A (entity factory, not table export).

Additional minor issue:
- FPU condition precision: `test ah,0x40; jne` checks C3, which is set
  on EQUAL OR UNORDERED. TS's strict `===` is fine in practice (no
  NaN expected for time float) but is slightly imprecise. Worth a
  comment if the reviewer cares.
- `[ebp+0x60]` is a function-pointer TABLE (used as `[this+0x60][0x24]`
  and `[this+0x60][0x14]`), not a standard C++ vtable. The TS comment
  calls it a "virtual dispatch" without explaining the manual table
  at offset 0x60 — would be clearer as `m_fnDispatchTable` or similar.
```

### Issues to fix- [ ] **Arg count/name**: reconcile the 6-arg claim with the demangled2-arg signature and the disassembly's actual slot usage. Either drop the TS's vecPos/pOwner split (since one arg slot is reused) or explicitly mark the duplicate semantics.
- [ ] **`[ebp+0xa0]` ≠ `pev->owner`**: rename to `this->m_pOwner` (or `knife.field0xa0` with TODO). The disassembly writes direct, not through pev.
- [ ] **`VectorCopy(knife.pev.origin, vecPos)`** → **`knife.pev.origin = pOwner.pev.origin`**. The 12-byte source is the SAME arg that gets written to the owner field — it cannot be a separate Vector.
- [ ] **Document the manual dispatch table at `[this+0x60]`** (not a C++ vtable). Currently the TS calls it `VirtualDispatch60` with no explanation of why the table is at offset 0x60 instead of 0.
- [ ] **Classname string conversion**: `MAKE_STRING(GOT_BASE - 0x6E62B)` doesn't capture the actual pattern `string_literal - gpGlobals->pStringBase` (where pStringBase comes from a `[ebx+0x1600]->[edx+0x98]` deref chain). The macro can hide this, but worth a comment in the macro definition.
- [ ] **FPU condition**: clarify that `jne` is "not equal OR not unordered" (C3 clear), not strict `!=`.

### Suggested rewrite (full TS function)

```typescript
/**
 * CTSKnife::CreateKnife — Static factory that allocates and initializes a
 * CTSKnife (thrown-knife projectile) attached to an owning player.
 *
 * Demangled signature: `CTSKnife::CreateKnife(p ?, ?)` (2 args per the
 * symbol); the disassembly touches 5 distinct arg-derived stack slots
 * (with two apparent gaps), so the TS-side 6-arg shape is provisional.
 *
 * Data flow (verified against disassembly):
 *   1. GetClassPtr<CTSKnife>(null) → if null, return null
 *   2. pev->classname = MAKE_STRING(<literal at GOT_BASE - 0x6E62B>)
 *      (minus gpGlobals->pStringBase, resolved via [ebx+0x1600]->[+0x98])
 *   3. this->m_pOwner = arg at [esp+0x2c]   // [this+0xa0], class member
 *   4. m_fnDispatchTable[0x24](this)        // [this+0x60] table, slot 0x24
 *   5. this->field0x8c = (*arg3)->field0x208 *   6. this->pev.origin = arg3->pev.origin  // 12-byte copy from pOwner
 *   7. UTIL_SetOrigin(this->pev, &this->pev.origin)
 *   8. this->pev.velocity = vecVelocity     // 12-byte copy
 *   9. this->field0x94 = vecAngles          // 12-byte copy (class member)
 *  10. this->field0x92 = 0                  // clear byte flag
 *  11. FPU compare gpGlobals->time vs pPlayer.field0x180:
 *        - equal/unordered  → m_fnDispatchTable[0x14](this, cached_ts, 0)
 *        - not equal        → m_fnDispatchTable[0x10](pPlayer) returns float,
 *                              then m_fnDispatchTable[0x14](this, f, 0)
 *
 * @returns The new CTSKnife, or null if allocation failed.
 */
export function CreateKnife(
  pPlayer: CBasePlayer,    // arg1 — owner; cached timestamp at field0x180
  // NOTE: demangler shows 2 args; TS-side signature below is provisional
  //       and may need collapsing to match the real C++ signature.
  vecPos: Vector,          // PROVISIONAL — see inspection point
  pWeapon: unknown,        // arg slot at [esp+0x28]; double-deref to field0x208
  pOwner: CBasePlayer,     // arg slot at [esp+0x2c]; reused for both writes below
  vecAngles: Vector,       // arg slot at [esp+0x34]; copied to [this+0x94]
  vecVelocity: Vector      // arg slot at [esp+0x38]; copied to pev->velocity
): CTSKnife | null {
  // 1. Allocate via the engine's typed class pointer helper.
  const knife = GetClassPtr<CTSKnife>(null);
  if (knife === null) return null;

  // 2. Set pev->classname.
  //    Disassembly: classname = (GOT_BASE - 0x6E62B) - (*(gpGlobals_path + 0x98))
  //    MAKE_STRING macro should expand to the full string_t conversion.
  //    TODO(asm-ambiguous): identify the literal classname string.
  knife.pev.classname = MAKE_STRING(GOT_BASE - 0x6E62B) as unknown as string_t;

  // 3. Set this->m_pOwner (class field at offset 0xa0).
  //    NOTE: This is NOT pev->owner. [this+0x0] is the pev pointer;
  //    [this+0xa0] is a direct class member, written without going
  //    through pev. pev->owner would require [[this+0]+0xa0], an  //    indirect access that the disassembly does NOT do here.
  knife.m_pOwner = pOwner;

  // 4. Virtual dispatch through [this+0x60] (a manually-managed function
  //    pointer table, not a C++ vtable), slot 0x24, with `this` as the arg.
  //    TODO(asm-ambiguous): identify the function at slot 0x24.
  DispatchTable60(knife, 0x24, knife);

  // 5. this->field0x8c = (*pWeapon)->field0x208  //    TODO(asm-ambiguous): resolve the weapon type behind the chain.
  knife.field0x8c = (pWeapon as any).chain?.field0x208;

  // 6. Copy pOwner.pev.origin → knife.pev.origin (12 bytes via rep movsd).
  //    The source is the SAME arg slot used for m_pOwner, NOT a separate
  //    vecPos Vector. (This is the key correction vs the prior TS.)
  VectorCopy(knife.pev.origin, pOwner.pev.origin);

  // 7. Engine-side origin update via UTIL_SetOrigin(pev, &pev->origin).
  UTIL_SetOrigin(knife.pev, knife.pev.origin);

  // 8. Copy vecVelocity into pev->velocity (12 bytes via rep movsd).
  VectorCopy(knife.pev.velocity, vecVelocity);

  // 9. Copy vecAngles into this->field0x94 (12 bytes via rep movsd).
  //    NOTE: [this+0x94] is a class member, not inside pev.
  VectorCopy(knife.field0x94, vecAngles);

  // 10. Clear the byte flag at this->field0x92.
  knife.field0x92 = 0;

  // 11. FPU compare: global time (likely gpGlobals->time) vs pPlayer.field0x180.
  //     Disassembly: fcomp; fnstsw ax; test ah,0x40; jne target
  //     C3 is set on EQUAL or UNORDERED. jne fires on C3=0 (strictly
  //     not-equal, assuming no NaN). Fall-through = equal-or-unordered.
  //     TODO(asm-ambiguous): confirm the global is gpGlobals->time.
  const globalTime: number = *(GOT_BASE - 0x6F408) as unknown as number;

  if (globalTime === pPlayer.field0x180) {
    // 11a. Cache hit: dispatch [this+0x60][0x14](this, cached_ts, 0).
    DispatchTable60(knife, 0x14, knife, pPlayer.field0x180, 0);
  } else {
    // 11b. Cache miss: query pPlayer's dispatch table, slot 0x10 (returns float),
    //      then dispatch [this+0x60][0x14](this, f, 0).
    const f: number = DispatchTableFloat(pPlayer, 0x60, 0x10, pPlayer);
    DispatchTable60(knife, 0x14, knife, f, 0);
  }

  return knife;
}
```

### Closing note for Kyle

This function doesn't fit the engine-interface review template — that template's checklist items 2/3/4 (version check, interfaceVersion assignment-back, memcpy) are not applicable to a gameplay entity factory. I'd recommend either (a) extending the rubric with a "gameplay entity" checklist (signature from demangler + arg slot accounting, class-member vs pev-member disambiguation, virtual-vs-table dispatch, FPU condition precision), or (b) flagging this template as engine-interface-only and using a lighter rubric for `CreateKnife`-class functions. Happy to draft (a) if useful.
