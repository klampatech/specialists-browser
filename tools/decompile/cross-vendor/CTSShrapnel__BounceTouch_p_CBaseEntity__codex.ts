```typescript
/**
 * CTSShrapnel::BounceTouch — handle a shrapnel piece touching another entity.
 *
 * Applies trace damage to pOther (using this.m_pOwner as the attacker when
 * set, otherwise this itself), reverses and scales this->pev->velocity for
 * the bounce, plays a bounce sound, and schedules the next think call.
 * Brush surfaces (func_wall, worldspawn, etc.) take a separate "embed and
 * spin" path where pOther is rotated and given new velocity instead of
 * being damaged.
 *
 * @param this   The CTSShrapnel entity instance
 * @param pOther The entity that was touched
 * @returns      void
 */
export function BounceTouch(this: CTSShrapnel, pOther: CBaseEntity): void {
  // === Guard: skip if pOther is flagged for removal. ===
  // The compiler reads pOther->pev (offset 0 of CBaseEntity) and tests
  // the low byte at pev+0x118. The high bit being set means the entity
  // is being killed.
  // TODO(asm-ambiguous): standard HL SDK has groundentity (4-byte pointer)
  // at pev+0x118, so this byte read is the low byte of that pointer.
  if (((pOther.pev[0x118] as number) & 0x80) !== 0) {
    return;
  }

  // === Branch on a float flag stored in pOther's pev at offset 0x16c. ===
  // Compared against the constant at [ebx-0x6f408] (likely 0.0). If
  // non-zero, pOther is treated as a brush (skip damage, embed-and-spin
  // path).
  // TODO(asm-ambiguous): exact field name and the threshold constant —
  // verify against the cvar / strings-n5.txt reference.
  const fSurfaceFlag: number = pOther.pev[0x16c] as number;
  const isBrushSurface: boolean = fSurfaceFlag !== 0;

  // === Compute |velocity| and the unit-velocity direction. ===
  // Used as damage direction (soft target) and embed offset direction
  // (brush). Falls back to (0, 0, 1) when speed is zero.
  const vel: Vector = this.pev.velocity;
  const speed: number = Math.hypot(vel.x, vel.y, vel.z);
  const dir: Vector = (speed === 0)
    ? { x: 0, y: 0, z: 1 }
    : { x: vel.x / speed, y: vel.y / speed, z: vel.z / speed };

  if (isBrushSurface) {
    // === Brush-surface path: no damage. Check classname for embed handling. ===
    const classname: string = STRING(pOther.pev.classname);
    // TODO(asm-ambiguous): the two classname strings at [ebx-0x6e053] and
    // [ebx-0x6e048] are likely "worldspawn" / "func_wall" / "func_breakable"
    // or similar — verify with strings-n5.txt.
    if (classname === STR_BRUSH_A || classname === STR_BRUSH_B) {
      // === Specific brush: embed shrapnel slightly into the wall and start
      //     it spinning. ===
      const scale2: number = 1.0; // TODO: actual scale from [ebx-0x6df74]
      const offset: Vector = {
        x: dir.x * scale2,
        y: dir.y * scale2,
        z: dir.z * scale2,
      };
      // Move this->pev->origin backwards by `offset` (into the wall).
      UTIL_SetOrigin(this.pev, {
        x: this.pev.origin.x - offset.x,
        y: this.pev.origin.y - offset.y,
        z: this.pev.origin.z - offset.z,
      });
      // Convert the offset direction to angles and copy to pOther.
      const angles: Vector = UTIL_VecToAngles(offset);
      pOther.pev.angles = angles;
      // Set angular velocity (x = 90.0), clear a flag, and set a counter.
      pOther.pev.avelocity.x = 90.0; // 0x42b40000
      pOther.pev[0x10c] = 0;
      pOther.pev[0x108] = 5;
      // Set pOther's velocity and avelocity from a fixed global vec3.
      // TODO: vec3 at [ebx+0x1888] — likely a downward gravity vector.
      const fixedVec: Vector = PLACEHOLDER_FIXED_VEC; // TODO
      pOther.pev.velocity = fixedVec;
      pOther.pev.avelocity = fixedVec;
    } else {
      // === Generic brush (not a special classname): just reverse velocity. ===
      const fBounce: number = 1.0; // TODO: from [ebx-0x6df78]
      this.pev.velocity = {
        x: -vel.x * fBounce,
        y: -vel.y * fBounce,
        z: -vel.z * fBounce,
      };
    }
  } else {
    // === Soft-target path. First an extra virtual-function gate: if the
    //     function returns 0, also take the brush path (no damage). ===
    // TODO(asm-ambiguous): [edi+0x60]+0xc8 is a vfunc on pOther; signature // (likely IsAlive() / IsMonster() / FVisible(CBaseEntity*)) is unclear.
    const fDamagable: number = pOther.vfunc_IsDamagable(pOther) as number;
    if (fDamagable === 0) {
      // No damage, just reverse velocity (generic bounce).
      const fBounce: number = 1.0; // TODO: from [ebx-0x6df78]
      this.pev.velocity = {
        x: -vel.x * fBounce,
        y: -vel.y * fBounce,
        z: -vel.z * fBounce,
      };
    } else {
      // === Damage pOther via trace, then bounce. ===
      // Attacker is this.m_pOwner if set, otherwise this itself.
      // TODO(asm-ambiguous): offset 0x8c on this is m_pOwner.
      const attacker: CBaseEntity = (this.m_pOwner !== null)
        ? this.m_pOwner
        : this;

      const trace: TraceResult = UTIL_GetGlobalTrace();
      ClearMultiDamage();
      pOther.TraceAttack(
        attacker.pev,            // pevAttacker
        /* damage */ 0,          // TODO: damage value not visible in this chunk
        dir,                     // damage direction
        trace,                   // trace result
        0x1004,                  // bitsDamageType (DMG_BLAST | DMG_SLASH?)
      );
      ApplyMultiDamage(attacker.pev, pOther.pev);

      // Reverse and scale velocity for the bounce.
      const fBounce2: number = 1.0; // TODO: from [ebx-0x6df78]
      this.pev.velocity = {
        x: -vel.x * fBounce2,
        y: -vel.y * fBounce2,
        z: -vel.z * fBounce2,
      };
    }
  }

  // === Emit bounce sound with a dynamic pitch offset. ===
  // The pitch offset comes from this->pev+0x208 (a sound index), routed
  // through an engine helper ([eax+0x168]) and shifted by 0x64.
  // TODO(asm-ambiguous): the sound-setup helper signature and the sample
  // name at [ebx-0x6e7b7] need verification.
  const pitchIdx: number = this.pev[0x208] as number;
  const pitchOffset: number =
    (engineGetSoundPitch(pitchIdx, 0x14, 0x1e) as number) + 0x64;
  EMIT_SOUND_DYN(
    this.edict,
    4,                                  // channel (4 = CHAN_VOICE)
    "weapons/shrapnel_hit.wav",         // TODO: from [ebx-0x6e7b7]
    1.0,                                // volume (0x3f800000)
    0.8,                                // attenuation (0x3f4ccccd)
    0,                                  // flags
    pitchOffset,
    0.5,                                // pitch factor (0x3f000000)
  );

  // === Schedule next think. ===
  // The compiler writes these as raw dword stores to CTSShrapnel fields
  // at offsets 0xc, 0x10, and 0x88. The exact field names are unclear  // without the full class definition.
  // TODO(asm-ambiguous): field names at offsets 0xc, 0x10, 0x88 are
  // CTSShrapnel-specific (likely think function pointer, mode/counter,
  // and nextthink time).
  this.m_pFunction = 0x460000;
  this.m_iMode = 0x60;
  this.m_flNextThink = (globals.time as number) + 0.1; // TODO: from [ebx-0x6ecd0]
}
```
