/**
 * CTSTimer::WaitThink — think callback that runs once a
 * CTSTimer's wait period has elapsed.
 *
 * Disassembly-driven behavior (all branches unconditional * with respect to each other; order is the order in the asm):
 *   1. If pev->target is set, FireTargets with USE_TOGGLE=3,
 *      this as both activator and caller, value=0.
 *   2. If pev->message is set, TSHudMessageAll(0, 0xff, 0, 1,
 *      30, STRING(pev->message)).
 *   3. If pev->flags & FL_ONGROUND (bit 0; suspect — TODO:
 *      confirm which FL_* bit this is in TS), clear two
 *      CTSTimer fields at offsets 0x0c and 0x10 (field names
 *      unknown — TODO: confirm in D.4).
 *   4. Always: pev->nextthink = gpGlobals->time +
 *      (float)this->m_iDelay, where m_iDelay is stored as int
 *      at offset 0x64 (loaded via `fild`, not `fld`).
 */
export function WaitThink(this: any /* CTSTimer — defined in D.4 */): void {
  const pev = this.pev as any;
  const gpGlobalsAny = (typeof gpGlobals !== "undefined" ? gpGlobals : ({} as any));

  // (1) FireTargets
  if (pev.target !== 0) {
    FireTargets(
      STRING(pev.target), // arg1: const char* (string_t via STRING())
      this,               // arg2: CBaseEntity* pActivator
      this,               // arg3: CBaseEntity* pCaller
      3,                  // arg4: USE_TYPE = USE_TOGGLE
      0                   // arg5: float value
    );
  }

  // (2) TSHudMessageAll — arg order matches demangled
  // signature `TSHudMessageAll(Uc, Uc, Uc, i, i, Pc)`.
  if (pev.message !== 0) {
    TSHudMessageAll(
      0,                    // arg1: uchar
      0xff,                 // arg2: uchar (likely client mask = all)
      0,                    // arg3: uchar
      1,                    // arg4: int
      30,                   // arg5: int (likely hold-time, seconds)
      STRING(pev.message)   // arg6: const char*
    );
  }

  // (3) Flag-gated clear of two CTSTimer-specific fields.
  // TODO(asm-ambiguous, D.4): field names at offsets 0x0c and
  // 0x10 are guessed as m_pGoalEnt / m_pLink. Verify against  // the reconstructed CTSTimer class layout. Also confirm  // which FL_* flag bit 0 maps to in TS (FL_ONGROUND in  // stock HLSDK, but TS may use a custom flag here).
  if ((pev.flags & 0x1) !== 0) {
    this.m_pGoalEnt = 0;   // CTSTimer+0x0c  (TODO: confirm name)
    this.m_pLink = 0;      // CTSTimer+0x10  (TODO: confirm name)
  }

  // (4) Re-schedule. Field at this+0x64 is loaded with `fild`,
  // so it's an int (likely m_iDelay / m_iWait, not m_flDelay).
  // TODO(asm-ambiguous, D.4): confirm field name against full
  // CTSTimer class layout.
  pev.nextthink = gpGlobalsAny.time + this.m_iDelay;
}
