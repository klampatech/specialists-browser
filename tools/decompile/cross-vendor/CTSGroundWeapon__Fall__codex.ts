```typescript
/**
 * CTSGroundWeapon::Fall — handle a ground weapon landing on a surface.
 *
 * Schedules the next think, attempts to wall-mount the weapon (if a
 * pev flag suggests wall contact), otherwise plays a landing sound
 * and lays the weapon flat on the floor (zeroing pitch + roll while
 * preserving yaw). Returns early if neither path's conditions are
 * met. After processing, links the owner entity and marks the weapon
 * as on the ground so subsequent calls short-circuit.
 *
 * @param this  The CTSGroundWeapon entity instance
 * @returns     void
 */
export function Fall(this: CTSGroundWeapon): void {
  // `self` is a typed-as-any view so we can poke class fields by raw
  // offset until CTSGroundWeapon is fully modeled (D.4 task).
  const self = this as any;
  const pev = self.pev;

  // Schedule next think at gpGlobals.time + small delay.
  // pev + 0x104 = pev->nextthink (GoldSrc entvars_t).
  // [ebx+0x1600] (post-PIC) is the gpGlobals pointer; [eax] is gpGlobals->time.
  // Constant at [ebx-0x6f010] is a float stored as QWORD double in .rodata;
  // its exact value (delay seconds) is unclear.
  // TODO(asm-ambiguous): constant value TBD (placeholder 0.1).
  pev.nextthink = 0.1 + (gpGlobals as any).time;

  // Branch A: wall contact.
  // pev + 0x1a0 & 0x10 is a high-offset flag in the user-field region of
  // entvars_t (NOT the standard pev->flags near +0x148).
  // TODO(asm-ambiguous): flag meaning TBD — likely a TS-specific
  // landing/contact bit, possibly distinct from the standard FL_ONGROUND.
  if ((pev[0x1a0] & 0x10) !== 0) {
    // Only try to wall-mount once. self[0x64] is a 1-byte flag
    // (class offset; name TBD — likely m_bIsOnGround / m_bHasFallen).
    if (self[0x64] === 0) {
      // The disassembly inserts 12 bytes of stack junk before PutOnWall
      // (`sub esp,0xc; push esi; call; add esp,0x10`) for stack-frame
      // alignment — PutOnWall is 1143 bytes and likely needs 16-byte
      // aligned locals.
      self.PutOnWall();
    }
    playFallSound(pev);
    // fall through to common cleanup
  } else {
    // Branch B: floor landing.
    // pev + 0x1a5 & 0x02 is another high-offset flag.
    // TODO(asm-ambiguous): flag meaning TBD — likely another TS-specific
    // contact bit (perhaps "landed flat on floor, not on a slope/wall").
    // Process if EITHER the pev flag is set OR self[0x64] is non-zero;
    // otherwise early-return without scheduling anything.
    if ((pev[0x1a5] & 0x02) === 0 && self[0x64] === 0) {
      return;
    }
    playFallSound(pev);
    // Lay the weapon flat on the floor.
    // pev + 0x50 = angles.x, +0x54 = angles.y (preserved), +0x58 = angles.z.
    // The disassembly zeros only +0x50 and +0x58, intentionally
    // preserving yaw (rotation around the Z axis) so the weapon keeps
    // its facing direction.
    pev.angles.x = 0;
    pev.angles.z = 0;
  }

  // Common cleanup.
  // self[0x60] is m_pOwner (a CBaseEntity*); call a virtual method on it
  // at vtable offset 0x114, passing `self` as the arg.
  // TODO(asm-ambiguous): method name TBD — likely SetThink(this) so that
  // CTSGroundWeapon::WaitThink fires on the owner next, or possibly a
  // direct call to WaitThink via a generic dispatch helper.
  self[0x60][0x114](self);
  self[0x64] = 1;
}

// =========================================================================
// Helpers + forward-declared engine API
// =========================================================================

/** Sample name (string at [ebx-0x6c1ba]). TODO: verify against strings-n5.txt. */
const FALL_SOUND_SAMPLE = "weapons/fall.wav";

/**
 * Play the weapon-on-floor / on-wall impact sound.
 *
 * EMIT_SOUND_DYN's demangled signature has 7 args (entity, channel,
 * sample, volume, attenuation, flags, pitch) but the disassembly
 * pushes 8 args before the call. The 8th ([ebx-0x6ec2c]) is probably
 * a TS-specific extension. Volume + attenuation come from cvar/mem
 * reads at [ebx-0x6f3fc] and [ebx-0x6e7e4]; exact cvar names TBD.
 */
function playFallSound(pev: any): void {
  (EMIT_SOUND_DYN as any)(
    pev[0x208],                                  // edict_t* (pev + 0x208)
    6,                                           // channel (likely CHAN_STATIC)
    FALL_SOUND_SAMPLE,
    (gpGlobals as any).sndVol ?? 1.0,            // volume   ([ebx-0x6f3fc])
    (gpGlobals as any).sndAtt ?? 1.0,            // atten.   ([ebx-0x6e7e4])
    0,                                           // flags    (= 0)
    100,                                         // pitch    (0x64 = PITCH_NORM)
    (gpGlobals as any).sndPitch ?? 100           // 8th arg — TODO: meaning TBD
  );
}

// Forward declarations — replace when the engine API module exists.
declare const gpGlobals: any;
declare function EMIT_SOUND_DYN(...args: any[]): void;
```
