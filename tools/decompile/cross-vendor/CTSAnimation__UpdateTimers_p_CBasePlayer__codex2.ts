/**
 * CTSAnimation::UpdateTimers — Decrements a set of animation timer fields
 * each frame using a per-frame time delta derived from the player's active
 * item's max speed and gpGlobals->frametime. Also drives one parameter
 * field (this+0x8) toward a goal value, with a direction switch at a
 * threshold (hysteresis).
 *
 * Demangled: CTSAnimation::UpdateTimers(p CBasePlayer)
 * Calling convention: __cdecl with `this` on the stack at [esp+0x10],
 *   pPlayer at [esp+0x14] (NOT the MSVC default __thiscall — see the
 *   disassembly: both [esp+0x10] and [esp+0x14] are loaded, so `this`
 *   is passed explicitly, not via ECX).
 *
 * @param this     The CTSAnimation instance
 * @param pPlayer  The CBasePlayer whose active item provides the speed
 * @returns        void
 */
export function UpdateTimers(this: CTSAnimation, pPlayer: CBasePlayer): void {
  // Per-frame delta:
  //   flDelta = <active-item-speed-method>() * gpGlobals->frametime
  //
  // Disassembly:
  //   [pPlayer+0x60]                -> pPlayer->m_pActiveItem
  //   [edx+0x10] (edx=m_pActiveItem) -> vtable slot 0x10, returns float
  //   push eax; call [edx+0x10]      -> eax (pPlayer) is also pushed,
  //                                     suggesting __cdecl call shape
  //                                     or stack alignment. TODO.
  //   [ebx+0x1600]; [eax]           -> two-level indirection to gpGlobals
  //                                     (GOT slot holds ptr to a wrapper
  //                                     struct whose first field is
  //                                     globalvars_t*; first deref
  //                                     yields the gpGlobals pointer)
  //   [gpGlobals+0x4]                -> gpGlobals->frametime
  //
  // TODO(asm-ambiguous): confirm vtable slot 0x10 of m_pActiveItem.
  //   HLSDK candidates: GetMaxSpeed, GetItemInfo. TS-specific:
  //   GetSpeedMultiplier (added by the mod). Pick after D.4 when we
  //   cross-reference each table slot with TS's actual implementations.
  const flSpeed = pPlayer.m_pActiveItem.getSpeedMultiplier(); // TODO: verify
  const flDelta = flSpeed * (gpGlobals as { frametime: number }).frametime;

  // Two global float constants used by the hysteresis field at this+0x8
  // (and as the floor for the four simple countdown fields below):
  //   [ebx-0x6f408] = flGoalTarget    (clamp target / goal value)
  //   [ebx-0x6f404] = flGoalThreshold (direction-switch threshold)
  // Both are in BSS (offsets 0x0eea08 and 0x0eea0c from binary base).
  // TODO(asm-ambiguous): recover actual values from the .so's data
  //   section. `0` is a placeholder that would make the timers
  //   degenerate to "always clamped at 0" if the real value is non-zero.
  const flGoalTarget: number = 0;     // TODO: import from [ebx-0x6f408]
  const flGoalThreshold: number = 0;  // TODO: import from [ebx-0x6f404]

  // Four countdown timer fields, each decremented by flDelta and clamped
  // at flGoalTarget (likely 0.0). Names TBD — likely jump / slide /
  // blend / dodge timers in the TS mod.
  // TODO(asm-ambiguous): field names not derivable from this disassembly
  //   alone. Cross-reference with CTSAnimation's other methods.
  this.m_flTimer_0x1e0 = Math.max(this.m_flTimer_0x1e0 - flDelta, flGoalTarget);
  this.m_flTimer_0x1dc = Math.max(this.m_flTimer_0x1dc - flDelta, flGoalTarget);
  this.m_flTimer_0x0c  = Math.max(this.m_flTimer_0x0c  - flDelta, flGoalTarget);
  this.m_flTimer_0x10  = Math.max(this.m_flTimer_0x10  - flDelta, flGoalTarget);

  // Hysteresis parameter at this+0x8. Drives toward flGoalTarget with
  // a direction switch at flGoalThreshold:
  //   - If flCur <  flGoalThreshold: increment, clamp at goal from above
  //     (i.e., store = min(flCur + flDelta, flGoalTarget))
  //   - If flCur >= flGoalThreshold: decrement, clamp at goal from below
  //     (i.e., store = max(flCur - flDelta, flGoalTarget))
  const flCur = this.m_flTarget_0x8;
  if (flCur < flGoalThreshold) {
    const flNew = flCur + flDelta;
    this.m_flTarget_0x8 = flNew <= flGoalTarget ? flNew : flGoalTarget;
  } else {
    const flNew = flCur - flDelta;
    this.m_flTarget_0x8 = flNew >= flGoalTarget ? flNew : flGoalTarget;
  }
}
