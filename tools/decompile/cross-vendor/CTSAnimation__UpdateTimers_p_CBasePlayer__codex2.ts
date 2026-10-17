// Suggested improvements to the decompiled TS — applies only the
// comment-clarity and stub-types fixes; logic is unchanged.

interface CtsFlSpeedCarrier {
  // 5th vtable entry on pPlayer->m_pActiveItem. Likely
  // CBasePlayerItem::GetMaxSpeed() (returns a float). TODO(asm):
  // confirm exact symbol against HLSDK CBasePlayerItem vtable.
  getSpeedMultiplier(): number;
}
interface CBasePlayerStub {
  m_pActiveItem: CtsFlSpeedCarrier;
}
interface CTSAnimation {
  // Offsets are placeholders; map to real names in D.4.
  m_flTimer_0x1e0: number;
  m_flTimer_0x1dc: number;
  m_flTimer_0x0c: number;
  m_flTimer_0x10: number;
  m_flTarget_0x8: number;
}

// Two globals referenced by the assembly:
//   [ebx-0x6f408] — used as the clamp goal for every timer field
//                   and both arms of the hysteresis block.
//   [ebx-0x6f404] — used by [esi+0x8] only, as the direction switch.
//
// TODO: resolve against HLSDK g_*/cvar_* symbols in D.5. Placeholder
// values (0.0) keep the math well-defined but will not match
// runtime.
const flGoalTarget = 0;
const flGoalThreshold = 0;

/**
 * CTSAnimation::UpdateTimers — decrement four timer fields on this
 * CTSAnimation by `flDelta`, then drive one hysteresis field
 * toward `flGoalTarget` (clamped from above going up, clamped from
 * below going down). The per-frame delta is the active-item's
 * speed query multiplied by `gpGlobals->frametime`.
 */
export function UpdateTimers(this: CTSAnimation, pPlayer: CBasePlayerStub): void {
  // TODO(asm-ambiguous): method at vtable[4] of m_pActiveItem.
  const flSpeed = pPlayer.m_pActiveItem.getSpeedMultiplier();
  const flDelta = flSpeed * gpGlobals.frametime;

  // Four countdown timer fields. The disassembly clamps each at
  // [ebx-0x6f408] from below (i.e., the field never goes below
  // `flGoalTarget` while counting down).
  this.m_flTimer_0x1e0 = Math.max(this.m_flTimer_0x1e0 - flDelta, flGoalTarget);
  this.m_flTimer_0x1dc = Math.max(this.m_flTimer_0x1dc - flDelta, flGoalTarget);
  this.m_flTimer_0x0c  = Math.max(this.m_flTimer_0x0c  - flDelta, flGoalTarget);
  this.m_flTimer_0x10  = Math.max(this.m_flTimer_0x10  - flDelta, flGoalTarget);

  // Hysteresis field. Threshold is [ebx-0x6f404]; goal is
  // [ebx-0x6f408] again.
  const flCur = this.m_flTarget_0x8;
  if (flCur < flGoalThreshold) {
    // Below threshold → count UP toward goal; clamp from above
    // (never exceed goal).
    const flNew = flCur + flDelta;
    this.m_flTarget_0x8 = flNew <= flGoalTarget ? flNew : flGoalTarget;
  } else {
    // At or above threshold → count DOWN toward goal; clamp from
    // below (never go below goal).
    const flNew = flCur - flDelta;
    this.m_flTarget_0x8 = flNew >= flGoalTarget ? flNew : flGoalTarget;
  }
}
