```typescript
/**
 * CTSWorldGun::BounceTouch — Touch handler for a world-dropped weapon
 * bouncing off another entity. Two paths branch off a pev byte flag:
 *
 *  1. Slow-motion (pev byte 0x1a5, mask 0x2):
 *     - Virtual call via [pOther+0x60]->vtable[0x10]
 *     - If 2D speed (pev+0x20, +0x24) ≤ a threshold, apply ~0.4
 *       friction to BOTH velocity (pev+0x20..0x2c) and the secondary
 *       vec3 (pev+0x5c..0x68)
 *     - Zero out [pev+0x58]
 *
 *  2. Normal path:
 *     - Same virtual call (return × ~0.04) compared against the
 *       current 2D speed
 *     - If scaled ≤ speed, snapshot the global trace, check that the
 *       plane-normal Z is 0 AND [pOther+0xc8] == 0
 *     - Set the flag and play the pickup bounce sound
 *
 * @param this    The CTSWorldGun entity (the bouncing weapon)
 * @param pOther  The CBaseEntity we just touched
 * @returns       void
 */
export function BounceTouch(this: CTSWorldGun, pOther: CBaseEntity): void {
  // The disassembly loads pOther (first explicit stack arg) into ebp
  // and uses it as the base register for every entity field access.
  // `this` (in ECX) isn't directly referenced in this body.

  // ============================================================
  // == Common: scale pev+0x28 by a global double ================
  // ============================================================
  //   fld  QWORD [ebx-0x6de58]   ; slowamt-style global double (~0.95)
  //   fmul DWORD  [eax+0x28]     ; only one component
  //   fstp DWORD  [eax+0x28]
  // TODO(asm-ambiguous): the [pev+0x28] offset modifies a single
  //   float — likely velocity.z if velocity lives at pev+0x20.
  //   Exact slowamt constant TBD via GOT cross-reference.
  const pev = pOther.pev as any;
  const slowAmt = 0.95;
  pev.floatAt(0x28) = pev.floatAt(0x28) * slowAmt;

  // ============================================================
  // == Branch on slow-motion flag (pev+0x1a5 bit 0x2) ==========
  // ============================================================
  // TODO(asm-ambiguous): the [pev+0x1a5] high-offset byte is not a
  //   standard HL1 flag — likely a TS-specific bit.
  if ((pev.byteAt(0x1a5) & 0x2) !== 0) {
    // --- SLOW-MOTION DAMPING PATH ---
    //   eax = [pOther+0x60]
    //   push pOther          ; 'this' for the call
    //   call [eax+0x10]      ; vtable entry #4; return unused
    // TODO(asm-ambiguous): [pOther+0x60] is an opaque interface ptr
    //   in pOther's CBaseEntity layout.
    (pOther as any).interfaceAt(0x60).callVfunc(0x10, pOther);

    // Re-read pev velocity (x,y at +0x20, +0x24) and compute 2D speed.
    const vx = pev.floatAt(0x20);
    const vy = pev.floatAt(0x24);
    const xySpeed = Math.sqrt(vx * vx + vy * vy);

    // `fmul [ebx-0x6f074]; fcompp` — gates the friction path with
    // `speed * GATE <= speed`.
    // TODO(asm-ambiguous): [ebx-0x6f074] global float; almost
    //   certainly ~1.0 (making the comparison trivially true).
    if (xySpeed <= 1.0) {
      // Apply ~0.4 friction to BOTH vectors:
      //   - velocity at pev+0x20..0x2c
      //   - secondary vec3 at pev+0x5c..0x68 (likely angvelocity or
      //     basevelocity)
      // TODO(asm-ambiguous): [ebx-0x6decc] global double ~0.4.
      const FRICTION = 0.4;
      pev.vecScaleAt(0x20, FRICTION);
      pev.vecScaleAt(0x5c, FRICTION);
    }

    // Zero out [pev+0x58] (a pev dword).
    // TODO(asm-ambiguous): [pev+0x58] purpose unclear — likely
    //   basevelocity.x or a custom TS field.
    pev.dwordAt(0x58) = 0;
    return;
  }

  // ============================================================
  // == Normal path: bounce-pickup detection ====================
  // ============================================================
  // Re-read 2D speed of pev velocity.
  const vx = pev.floatAt(0x20);
  const vy = pev.floatAt(0x24);
  const xySpeed = Math.sqrt(vx * vx + vy * vy);

  // Same vfunc #4 call; result multiplied by [ebx-0x6cb60] ~ 0.04.
  // TODO(asm-ambiguous): [ebx-0x6cb60] global float ~0.04.
  const slowedDist = (pOther as any).interfaceAt(0x60).callVfunc(0x10, pOther) * 0.04;

  // If the scaled distance > current speed, the touch entity is
  // still in flight — no bounce sound.
  if (slowedDist > xySpeed) return;

  // Snapshot the engine's last global trace.
  const trace = UTIL_GetGlobalTrace();

  // `fcomp [ebx-0x6df40]` against the local trace copy's [esp+0x5c].
  // The plane-normal Z == 0 ⇒ the hit was a wall (flat), not a floor.
  // TODO(asm-ambiguous): trace_t field at offset 0x5c — likely
  //   `vecHitNormal[2]`, but needs trace_t cross-reference.
  const tracePlaneZ = (trace as any).floatAt(0x5c);
  const isFlatHit = tracePlaneZ === 0;

  // [pOther+0xc8] is the "haven't played the bounce sound yet" flag.
  // Play only when the flag is unset AND the hit was flat.
  // TODO(asm-ambiguous): [pOther+0xc8] field name TBD.
  if (((pOther as any).byteAt(0xc8) !== 0) || !isFlatHit) return;

  // Lock out further bounces.
  (pOther as any).byteAt(0xc8) = 1;

  // Compute the bounce sound's pitch:
  //   sampleIdx  = [pev+0x208]
  //   engineBase = [ebx+0x1aa8]
  //   pitchBase  = engineBase.vtable[0x168](sampleIdx, 0, 10, 0.5)
  //   pitch      = pitchBase + 100 (0x64)
  // TODO(asm-ambiguous): [pev+0x208] is past standard entvars_t —
  //   likely a TS-specific index. Engine vtable entry 0x168 opaque
  //   without engine-internals cross-reference.
  const sampleIdx = pev.dwordAt(0x208);
  const engineBase = (ENGINE_GLOBALS as any).dwordAt(0x1aa8);
  const pitchBase = (engineBase as any).vfunc(0x168)(sampleIdx, 0, 10, 0.5);
  const pitch = pitchBase + 100;

  // EMIT_SOUND_DYN(edict, channel, sample, vol, atten, flags, pitch)
  // Channel 6 = CHAN_WEAPON.
  EMIT_SOUND_DYN(
    pOther.edict,
    /* channel */ 6,                                // CHAN_WEAPON
    /* sample  */ /* [ebx-0x6c1ba] */ 'weapons/gun_pickup.wav',
    /* volume  */ 1.0,                              // 0x3f800000
    /* atten   */ 0.8,                              // 0x3f4ccccd
    /* flags   */ 0,
    /* pitch   */ pitch
  );
}
```
