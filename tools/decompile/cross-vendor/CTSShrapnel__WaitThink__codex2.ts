/**
 * CTSShrapnel::WaitThink — per-tick slow-motion handling for shrapnel.
 *
 * Each engine tick:
 *   1. Reschedules `pev->nextthink = gpGlobals->time + think_interval`.
 *   2. If `speed > stop_epsilon` (the common case), updates `pev->velocity`:
 *        - if `speed === stop_sentinel`: snap to `(0, 0, slow_factor)`
 *        - else: normalize to length `slow_factor`
 *        - write back: `velocity = (speed - slow_factor) * (ix, iy, iz)`
 *      Else (`speed <= stop_epsilon`):
 *        - if `pev->movetype !== 5`: `UTIL_Remove(this)`
 *   3. Kill-time check:
 *        - if `flKillTime` was set (i.e. `flKillTime !== stop_sentinel`)
 *          and `flKillTime < gpGlobals->time`:
 *              pull the entity out of the slow-motion registry and destroy it.
 *        - else, when `pev->movetype !== 5`: dispatch the physics tick to
 *              `CTSPhysicObject::WaitThink`.
 *
 * Decompiled from `ts/dlls/ts_i386.so` @ 0x0006c678 (472 bytes).
 *
 * PIC globals (resolved via `[ebx ± k]` after the `call $+5; pop ebx;
 * add ebx, +0xf978c` PIC setup):
 *   [ebx+0x1600]   = gpGlobals
 *   [ebx-0x6ecd8]  = slow_think_interval
 *   [ebx-0x6e7f4]  = slow_stop_epsilon
 *   [ebx-0x6f408]  = slow_stop_sentinel
 *   [ebx-0x6f3fc]  = slow_factor
 *
 * `this`-relative fields touched:   [this+0x00] = pev
 *                                   [this+0x88] = flKillTime
 *
 * @param this  The CTSShrapnel entity instance.
 * @returns     void
 */
export function WaitThink(this: any): void {
  // ---- Globals (PIC) --------------------------------------------------------
  const gpGlobals:     any = (globalThis as any).g_pGlobals;
  const thinkInterval: number = (globalThis as any).g_slow_think_interval;
  const stopEpsilon:   number = (globalThis as any).g_slow_stop_epsilon;
  const stopSentinel:  number = (globalThis as any).g_slow_stop_sentinel;
  const slowFactor:    number = (globalThis as any).g_slow_factor;

  // ---- this->fields ---------------------------------------------------------
  const pev:        any = this.pev;
  const flKillTime: number = this.m_flKillTime;

  // (1) Reschedule the next tick.  pev+0x104 = pev->nextthink.
  pev.nextthink = gpGlobals.time + thinkInterval;

  // (2) speed = ||velocity||.  pev+0x20 = pev->velocity.
  const speed = Math.hypot(pev.velocity.x, pev.velocity.y, pev.velocity.z);

  // (3) Branch on speed.  `test ah,0x41; jne 6c7ac` is the GCC "<=" idiom:
  //     jne fires for less-than OR equal (jne = jump if C0|C3 != 0).
  //     So: speed > stop_epsilon -> fall through (velocity update);
  //         speed <= stop_epsilon -> jump to slow branch (0x6c7ac).
  if (speed > stopEpsilon) {
    // (3a) Decide on the intermediate vector `I` that will be scaled.
    //      `test ah,0x40; je 6c72c` is the GCC "!=" idiom: je fires when
    //      C3=0 (not equal), so 0x6c72c is the normalize branch and the
    //      fall-through (at 0x6c70c) is the snap branch.
    let ix: number;
    let iy: number;
    let iz: number;
    if (speed === stopSentinel) {
      // Snap-to-zero.  In practice `slow_factor` is 0.0 here, so the
      // post-scaling write zeros out all three components.
      ix = 0;
      iy = 0;
      iz = slowFactor;
    } else {
      // Normalize the velocity direction to length `slow_factor`.
      const k = slowFactor / speed;
      ix = k * pev.velocity.x;
      iy = k * pev.velocity.y;
      iz = k * pev.velocity.z;
    }

    // (3b) Apply: velocity = (speed - slow_factor) * I.
    //      The binary does a 12-byte `rep movsd`; here it's a direct write.
    const scale = speed - slowFactor;
    pev.velocity.x = scale * ix;
    pev.velocity.y = scale * iy;
    pev.velocity.z = scale * iz;
  } else {
    // (3c) Slow branch (0x6c7ac).  The binary redundantly re-checks
    //      `speed` against `stop_epsilon` with `jae` (always taken here
    //      for the `speed == epsilon` case) and then compares
    //      `pev->movetype` against 5.  We collapse that to the live
    //      condition: only the `movetype !== 5` case does anything.
    // TODO(entvars): verify the "5" constant against TS's own MoveType
    // enum — value 4 is `MOVETYPE_FLY` in the canonical HLSDK enum, so
    // either TS uses a custom enum ordering or the field is not `movetype`.
    if (pev.movetype !== 5) {
      (globalThis as any).UTIL_Remove(this);
    }
  }

  // (4) Kill-time / parent-think dispatch.
  //
  //   0x6c7f2: fcomp [flKillTime]
  //   0x6c800: test ah,0x40          ; C3 only
  //   0x6c803: jne 0x6c830           ; jumps when EQUAL (C3=1)
  //
  //   So the kill-time path is reached only on the FALL-THROUGH, i.e.
  //   when `flKillTime !== stop_sentinel`.  Then the binary compares
  //   `flKillTime` with `gpGlobals->time` (`sahf; jae 0x6c830`), and the
  //   remove sequence fires only when `flKillTime < time`.
  if (flKillTime !== stopSentinel && flKillTime < gpGlobals.time) {
    (globalThis as any).RemoveEntityFromSlowedArray(this);
    (globalThis as any).UTIL_Remove(this);
  } else if (pev.movetype !== 5) {
    // TODO(entvars): same constant-identity caveat as above.
    // Direct PLT call to CTSPhysicObject::WaitThink in the binary.
    (this as any).__superWaitThink();
  }
}
