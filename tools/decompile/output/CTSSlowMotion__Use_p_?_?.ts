/**
 * CTSSlowMotion::Use — handle the "use" event for a slow-motion trigger entity.
 *
 * When the entity is "used":
 *   1. ActivateSlow() runs unconditionally.
 *   2. On the first use (use-count gate at offset 0x100 == 0), schedule
 *      deactivation by writing a sentinel + current game time into the
 *      schedule fields (offsets 0x14 and 0x18).
 *   3. If pev.message (string_t) is non-null, broadcast a HUD message.
 *   4. If pev.target (string_t) is non-null, fire the target with
 *      USE_TOGGLE semantics.
 *
 * @param this        The CTSSlowMotion entity instance.
 * @param pActivator  Entity that triggered the use (unused here).
 * @param useType     USE_TYPE value (unused here).
 * @param value       Float value (unused here — FireTargets gets a hard 0.0).
 */
export function Use(
  this: CTSSlowMotion,
  pActivator: CBaseEntity,
  useType: USE_TYPE,
  value: number,
): void {
  // 1. Activate the slow-motion effect right now.
  this.ActivateSlow();

  // 2. First-use gate: writes the deactivation schedule.
  //    m_iHasBeenUsed is at offset 0x100 from `this` (verified against asm
  //    `cmp DWORD PTR [esi+0x100], 0x0; jne skip`).
  //    m_flDeactivateTimeout is at offset 0x14.
  //    m_flActivatedAt is at offset 0x18.
  // TODO(class-layout): the field names above are inferred from register
  //   usage patterns; confirm against CTSSlowMotion source when available.
  // TODO(asm-ambiguous): the 0xffff0000 sentinel's meaning — NaN-until-explicit
  //   time vs packed flag — is unclear until cross-vendored with WaitThink
  //   and DeactivateSlow chunks.
  if (this.m_iHasBeenUsed === 0) {
    this.m_flDeactivateTimeout = 0xffff0000;
    // TODO(verify-globals): [ebx+0x1c78] is treated as gpGlobals.time here;
    //   could equally be a CVAR or other global. Confirm via symbol table.
    this.m_flActivatedAt = gpGlobals.time;
  }

  // 3. If a HUD message is configured on this entity, broadcast it.
  //    The string argument is built via the STRING() macro:
  //    gpGlobals.pStringBase + pev->message.
  if (this.pev.message !== 0) {
    TSHudMessageAll(0, 0xff, 0x00, 0x08, 0x1e, STRING(this.pev.message));
  }

  // 4. If a target is configured, fire it with toggle semantics.
  //    FireTargets(targetString, pCaller=this, pActivator=this, USE_TOGGLE, 0.0).
  if (this.pev.target !== 0) {
    FireTargets(STRING(this.pev.target), this, this, USE_TYPE.TOGGLE, 0.0);
  }
}
