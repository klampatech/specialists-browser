// TODO: Bind to actual engine globals when the engine layer is ready.
declare const gpGlobals: any;
declare const gpGameRules: any;
declare const g_flSlowTimeThreshold: number;

/**
 * CTSSlowMotion::WaitThink — periodic think handler for the slow-motion
 * "wait" state. Reschedules itself, conditionally applies global or
 * per-player slow motion, and deactivates once the duration has elapsed.
 *
 * @param this  The CTSSlowMotion entity instance
 * @returns     void
 */
export function WaitThink(this: CTSSlowMotion): void {
  const self = this as any;

  // Reschedule: pev->nextthink = gpGlobals->time + 0.1
  // [esi+0] is the pev pointer (offset 0 of CTSSlowMotion); nextthink
  // lives at +0x104 in the linked entvars_t. The QWORD at [ebx-0x6f010]
  // is the float 0.1.
  self.pev.nextthink = gpGlobals.time + 0.1;

  // While the active flag is set, either apply global slow motion or
  // fall back to per-player distance checks.
  if (self.m_bActive) {
    if (self.m_bUseGlobal) {
      gpGameRules.GlobalSlowMotion2(self.m_flSlowAmount, self.m_bRestore);
    } else {
      self.CheckPlayersDistance();
    }
  }

  // Early-return when the slow-time threshold exactly matches the
  // duration. Disassembly: fld g_flSlowTimeThreshold; fcomp m_flDuration;
  // fnstsw ax; test ah,0x40; jne <epilogue>. The mask 0x40 in AH is bit 6
  // = FPU status bit 14 = C3 ("equal / unordered"); jne fires when C3 is
  // set, so this is a == check, not a >= check.
  if (g_flSlowTimeThreshold === self.m_flDuration) {
    return;
  }

  // Disassembly: fld m_flDuration; fcomp gpGlobals->time; fnstsw ax;
  // sahf; jae <continue>. After sahf, CF = C0 and ZF = C3; jae jumps
  // when CF=0, i.e. when m_flDuration >= gpGlobals->time. Fall-through
  // is the deactivate path.
  if (self.m_flDuration < gpGlobals.time) {
    // Duration has elapsed — drop the tracked entity refs and deactivate.
    self.m_pEnt1 = 0;
    self.m_pEnt2 = 0;
    self.DeactivateSlow();
  } else {
    // Duration still ahead — keep the slow motion going.
    if (self.m_bUseGlobal) {
      gpGameRules.GlobalSlowMotion2(self.m_flSlowAmount, self.m_bRestore);
    } else {
      self.CheckPlayersDistance();
    }
  }
}
