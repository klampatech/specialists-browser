// Forward declarations so this function compiles standalone.
// In D.4 we'll replace these with the real class/globals.
declare const g_pGlobals: { time: number };
declare const g_slow_think_interval: number; // [ebx-0x6ecd8]; cvar is a double (fld QWORD)
declare const g_slow_stop_epsilon: number;   // [ebx-0x6e7f4]
declare const g_slow_stop_sentinel: number;  // [ebx-0x6f408]
declare const g_slow_factor: number;         // [ebx-0x6f3fc]
declare function UTIL_Remove(self: any): void;
declare function RemoveEntityFromSlowedArray(self: any): void;
declare class CTSPhysicObject {
  WaitThink(self: any): void;
}

/**
 * CTSShrapnel::WaitThink — per-tick slow-motion handling for shrapnel.
 *
 * Engine contract:
 *   - Each tick the function reschedules itself via pev->nextthink.
 *   - The body branches on velocity magnitude vs. slow-motion cvars.
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x0006c678 (472 B). The bin: comments
 * below mark the corresponding offsets / FPU sequences.
 *
 * External calls: UTIL_Remove, RemoveEntityFromSlowedArray,
 *                 CTSPhysicObject::WaitThink (direct PLT call, 0x58590).
 *
 * @param this CTSShrapnel instance (the `this` pointer in the original).
 */
export function WaitThink(this: any /* CTSShrapnel */): void {
  // ---- Globals (PIC base offsets, best-guess names) -----------------------
  const thinkInterval: number = g_slow_think_interval;
  const stopEpsilon:   number = g_slow_stop_epsilon;
  const stopSentinel:  number = g_slow_stop_sentinel;
  const slowFactor:    number = g_slow_factor;

  // ---- this->fields -------------------------------------------------------
  const pev: any = this.pev;             // [this+0x00]
  const flKillTime: number = this.m_flKillTime; // [this+0x88], best-guess name

  // (1) Reschedule the next tick.  Bin: 6c69a-6c6a2:
  //     fld QWORD thinkInterval; fadd DWORD gpGlobals->time;
  //     fstp DWORD pev->nextthink.
  pev.nextthink = g_pGlobals.time + thinkInterval;

  // (2) speed = ||pev->velocity||.  Bin: 6c6a8-6c6c3 (vec3 hypot via fmul/fadd/fsqrt).
  const vx = pev.velocity.x, vy = pev.velocity.y, vz = pev.velocity.z;
  const speed = Math.hypot(vx, vy, vz);

  // (3) Branch on speed.
  //
  // bin: 6c6cb fcomp speed, [ebx-0x6e7f4];     fnstsw; test ah, 0x41;  jne 6c7ac
  //      `test ah, 0x41` covers both C0 and C3; jne (ZF=0) taken when
  //      speed != epsilon; fall-through when speed == epsilon (Path A).
  if (speed !== stopEpsilon) {
    // Path B/C/D: speed != epsilon.  Bin: 6c7ac-6c7d8.
    //   fcomp speed, epsilon; sahf; jae 6c7f2
    //     `jae` after `sahf` = CF=0 = ST(0) NOT < operand = speed >= epsilon.
    //   Fall-through at 6c7da when speed < epsilon, then movetype check.
    if (speed >= stopEpsilon) {
      // Path B: speed > epsilon.  No velocity transform. Falls to kill-time.
    } else {
      // Path C/D: speed < epsilon.  Bin: 6c7dd cmp [eax+0x108], 5; je 6c7f2.
      if (pev.movetype !== 5 /* MOVETYPE_FLY */) {
        // Path D: tear down.  Falls to 6c7f2 kill-time.
        UTIL_Remove(this);
      }
      // Path C: movetype == FLY. Skip UTIL_Remove. Falls to 6c7f2 kill-time.
    }
  } else {
    // Path A: speed === epsilon (and only here).  Bin: 6c6dc-6c7a8.
    //
    // 3a: fcom speed, [ebx-0x6f408]; fnstsw; test ah, 0x40; je 6c72c.
    //     `test ah, 0x40` covers only C3; ZF=1 iff C3=0 iff speed <= sentinel.
    //     `je 6c72c` jumps for normalize; fall-through at 6c70c is the
    //     snap branch when speed > sentinel.
    let ix: number, iy: number, iz: number;
    if (speed <= stopSentinel) {
      // Normalize: I = (slow_factor / speed) * velocity.
      // bin: 6c72c fdivr [ebx-0x6f3fc] (i.e. ST(0) = slow_factor / speed);
      //      then 3 fmul into pev->velocity-sized stack buffer.
      const k = slowFactor / speed;
      ix = k * vx; iy = k * vy; iz = k * vz;
    } else {
      // Snap: I = (0, 0, slow_factor_bits).  Bin: 6c70c-6c727.
      //   mov eax, [ebx-0x6f3fc]; mov [esp], 0; mov [esp+4], 0;
      //   mov [esp+8], eax.  The bit-load keeps the assignment
      //   independent of any float-specific arithmetic.
      ix = 0;
      iy = 0;
      iz = slowFactor;
    }

    // 3b: velocity = (speed - slow_factor) * I.  Bin: 6c74f-6c7a6.
    //   fld [esp+0x2c]; fsub [ebx-0x6f3fc]; then 3 fmul;
    //   `rep movsd` copies 12 bytes from a local buffer to pev->velocity.
    const scale = speed - slowFactor;
    pev.velocity.x = scale * ix;
    pev.velocity.y = scale * iy;
    pev.velocity.z = scale * iz;
  }

  // (4) Kill-time / parent-think dispatch.  Bin: 6c7f2-6c845.
  //
  //   6c7f2 fld [ebx-0x6f408]; fcomp [ebp+0x88]; fnstsw; test ah, 0x40; jne 6c830
  //        `jne 6c830` jumps when C3=1, i.e. stop_sentinel > flKillTime.
  //        Fall-through (C3=0) covers sentinel <= flKillTime (== OR <).
  //   6c818 (second compare) fcomp flKillTime, gpGlobals->time;
  //        sahf; jae 6c830.  `jae` after `sahf` = CF=0 = ST(0) NOT <
  //        operand = flKillTime >= time.  Falls through when flKillTime < time.
  //   6c830 mov movetype check; if movetype == 5, skip parent think.
  //   Cleanup fires when sentinel <= flKillTime AND flKillTime < time.
  if (stopSentinel <= flKillTime && flKillTime < g_pGlobals.time) {
    RemoveEntityFromSlowedArray(this);
    UTIL_Remove(this);
  } else if (pev.movetype !== 5 /* MOVETYPE_FLY */) {
    // Direct PLT call: `call 58590 <WaitThink__15CTSPhysicObject@plt>`.
    // In a class-based TS model this is `super.WaitThink()`; we use the
    // prototype form here so the function compiles standalone.
    CTSPhysicObject.prototype.WaitThink(this);
  }
  // movetype === MOVETYPE_FLY ⇒ function returns with no parent think.
}
