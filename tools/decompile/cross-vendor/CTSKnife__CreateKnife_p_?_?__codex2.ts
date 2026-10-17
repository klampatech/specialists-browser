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
