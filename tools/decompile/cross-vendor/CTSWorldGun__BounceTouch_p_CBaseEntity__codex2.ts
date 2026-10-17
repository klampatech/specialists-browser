/**
 * CTSWorldGun::BounceTouch — touch handler for a world-dropped weapon.
 *
 * Decompiled from disassembly at 0x00090b0c (629 B); see
 * tools/decompile/chunks/<demangled>.chunk.md. NOT one of the 4
 * engine<->mod export entry points covered by the HLSDK reference, so
 * checks 2/3/4 of that reference do not apply. Cross-reference is vs
 * the assembly itself.
 *
 * Two paths branch on the slow-motion flag at [pev+0x1a5] bit 1:
 *   1. SLOW (flag set):
 *        - virtual call: (*this->[0x60])->_vtable[0x10/4](this);
 *        - if 2D speed (|pev.vel.xy|) <= a GATE scale, dampen velocity
 *          AND [pev+0x5c] by ~FRICTION;
 *        - zero [pev+0x58].
 *   2. NORMAL (flag unset):
 *        - same virtual call, but the return × ~0.04 is compared
 *          against the current 2D speed;
 *        - if (xySpeed > scaled), snapshot the global trace, check
 *          the plane-normal Z == 0 (wall hit, not floor) AND
 *          [this+0xc8] == 0 (haven't bounced yet);
 *        - set the flag, compute the bounce pitch, EMIT_SOUND_DYN.
 *
 * Calling-convention reminder: under x86-32 Linux cdecl (Itanium C++
 * ABI), `this` is the FIRST stack arg. After the prologue (push
 * ebp/edi/esi/ebx + sub esp, 0x9C = -0xAC), [esp+0xB0] = entry_esp+4
 * = `this`. pOther (param `p CBaseEntity`) is at [esp+0xB4] but is
 * never read in this body — the disassembly only operates on `this`
 * and on global/trace state.
 */

// Forward declarations so the file compiles in isolation.
declare const ENGINE_GLOBALS: any;
declare function UTIL_GetGlobalTrace(): any;
declare function EMIT_SOUND_DYN(
  edict: any, channel: number, sample: string,
  volume: number, attenuation: number, flags: number, pitch: number,
): void;

// Opaque accessors preserved from the disassembly — these are how D.4
// will eventually hang real field names off the structs.
type pev_t = any;
type CTSWorldGun = any;
type CBaseEntity = any;

export function BounceTouch(
  this: CTSWorldGun,
  pOther: CBaseEntity, // eslint-disable-line @typescript-eslint/no-unused-vars
): void {
  // Disassembly:  push ebp/edi/esi/ebx; sub esp,0x9c;
  //               ebp = [esp+0xb0] = `this` (NOT pOther)
  //               ebx = GOT base (PIC)
  const pev: pev_t = (this as any).pev;

  // ────────────────── Common: scale pev+0x28 by a global ───────────────
  //   fld  QWORD [ebx-0x6de58] ; fmul DWORD [eax+0x28] ; fstp DWORD [eax+0x28]
  // [pev+0x28] lies inside the velocity.z slot of the origin/velocity union
  // at +0x20..+0x2C. (Confirmed by the subsequent 2D-speed read at
  // +0x20/+0x24.)
  // TODO(asm-ambiguous): cross-reference [ebx-0x6de58] to a cvar; this
  //   is a placeholder ~0.95.
  pev.floatAt(0x28) *= 0.95;

  // ────────────────── Branch on slow-motion flag ─────────────────────────
  //   test  BYTE [eax+0x1a5], 0x2  ;  je  90c98 (normal path)
  // TODO(asm-ambiguous): [pev+0x1a5] is a TS-specific byte (past the end of
  //   standard pev_t). Treat as `m_fSlowMo` until D.4 names it.
  if ((pev.byteAt(0x1a5) & 0x2) !== 0) {
    // ── SLOW-MOTION DAMPING ──────────────────────────────────────────
    //   mov  eax, [ebp+0x60]
    //   push ebp                  ; receiver = `this`
    //   call [eax+0x10]            ; virtual, slot 4
    // TODO(asm-ambiguous): [this+0x60] is a TS-side interface/callback
    //   pointer; vtable slot 0x10/4 needs class-layout cross-reference.
    (this as any).interfaceAt(0x60).callVfunc(0x10, this);

    // Compute 2D speed of pev.velocity (read +0x20, +0x24).
    const vx = pev.floatAt(0x20);
    const vy = pev.floatAt(0x24);
    const xySpeed = Math.sqrt(vx * vx + vy * vy);

    // TODO(asm-ambiguous): the slow-path uses `fxch / fmul [ebx-0x6f074] /
    //   fxch / fcompp` — equivalent to `xySpeed * GATE <= xySpeed`. The
    //   effective gate is treated as ~1.0 here (placeholder).
    if (xySpeed <= 1.0) {
      // Apply ~0.4 friction to BOTH vectors:
      //   - velocity at pev+0x20..0x2C
      //   - secondary vec3 at pev+0x5C..0x68 (likely basevelocity)
      // TODO(asm-ambiguous): [ebx-0x6decc] is a global double ~0.4;
      //   [pev+0x5C] is a TS-specific vec3 (often basevelocity in TS mods).
      const FRICTION = 0.4;
      pev.vecScaleAt(0x20, FRICTION);
      pev.vecScaleAt(0x5c, FRICTION);
    }

    // Zero out [pev+0x58].
    // TODO(asm-ambiguous): [pev+0x58] purpose unclear — likely a
    //   basevelocity.x slot or a custom TS scalar field.
    pev.dwordAt(0x58) = 0;
    return;
  }

  // ────────────────── Normal path ─────────────────────────────────────
  const vx = pev.floatAt(0x20);
  const vy = pev.floatAt(0x24);
  const xySpeed = Math.sqrt(vx * vx + vy * vy);

  // Same virtual call; result × ~0.04 [ebx-0x6cb60].
  //   sub esp,0xc ; push 0 ; push 0xa ; ... (CALL vfunc) ; fmul [ebx-0x6cb60]
  // TODO(asm-ambiguous): [ebx-0x6cb60] is a global float ~0.04.
  const scaled = (this as any).interfaceAt(0x60).callVfunc(0x10, this) * 0.04;

  // fcompp vs (xySpeed): skip-sound when (xySpeed <= scaled).
  if (scaled >= xySpeed) return;

  // Snapshot the engine's last global trace.
  const trace = UTIL_GetGlobalTrace();

  // fcomp [ebx-0x6df40] (= 0.0) against trace->[+0x5C]. plane-normal Z == 0
  // means a wall hit (flat), not a floor.
  // TODO(asm-ambiguous): trace_t field at +0x5C is `vecHitNormal[2]`
  //   in HLSDK; TS may extend trace_t — verify against trace_t cross-ref.
  const isFlatHit = (trace as any).floatAt(0x5c) === 0;

  // [this+0xC8] is the "haven't played the bounce yet" flag. Play only
  // when the flag is unset AND the hit was flat.
  // TODO(asm-ambiguous): [this+0xC8] field name TBD (e.g. `m_fHasBounced`).
  if (((this as any).byteAt(0xc8) !== 0) || !isFlatHit) return;
  (this as any).byteAt(0xc8) = 1;

  // ── Compute the bounce pitch ─────────────────────────────────────────
  //   mov  eax, [pev+0x208]            ; save edict for EMIT_SOUND_DYN
  //   mov  [esp+0x4], eax
  //   push 0.5 ; push 0xa ; push 0x0  ; arg pack for engine vfunc
  //   mov  eax, [ebx+0x1aa8]           ; engine globals ptr
  //   call [eax+0x168]                 ; engine->vtable[0x168/4]
  //   add  esp, 0xc ; add eax, 0x64    ; pitchBase += 100
  // TODO(asm-ambiguous): [pev+0x208] is past standard pev_t bounds; TS
  //   likely extends pev_t with a cached edict pointer. Treat as edict
  //   here, NOT as a sample index. [ebx+0x1aa8] and vtable[0x168/4] need
  //   engine-internals cross-reference.
  const edict = pev.dwordAt(0x208);

  const engineBase = (ENGINE_GLOBALS as any).dwordAt(0x1aa8);
  const pitchBase = (engineBase as any).vfunc(0x168)(/* arg0 */ 0, /* arg1 */ 10, /* arg2 */ 0.5);
  const pitch = pitchBase + 100;

  // EMIT_SOUND_DYN(edict, channel, sample, vol, atten, flags, pitch)
  // Channel 6 = CHAN_WEAPON.
  // TODO(asm-ambiguous): [ebx-0x6c1ba] is a .rodata string; the working
  //   guess "weapons/gun_pickup.wav" needs a string-table cross-reference.
  EMIT_SOUND_DYN(
    /* edict   */ edict,                              // from pev+0x208 of `this`
    /* channel */ 6,                                  // CHAN_WEAPON
    /* sample  */ 'weapons/gun_pickup.wav',
    /* volume  */ 1.0,                                // 0x3F800000
    /* atten   */ 0.8,                                // 0x3F4CCCCD
    /* flags   */ 0,
    /* pitch   */ pitch,
  );
}
