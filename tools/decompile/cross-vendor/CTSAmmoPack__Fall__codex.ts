```typescript
// Ambient engine globals (loaded via PIC/GOT in the original DLL).
// TODO: replace with CVAR_GET_FLOAT / gpGlobals->frametime lookups once
//       the engine-callback layer is wired up.
declare const frameTime: number;
declare const sv_gravity: number;
declare function UTIL_Remove(ent: CTSAmmoPack): void;

/**
 * CTSAmmoPack::Fall — physics tick for the ammo pack entity.
 *
 * Recomputes the per-entity falling velocity, handles ground impact
 * (zeros horizontal velocity and dispatches OnGround), and removes
 * the entity if an internal threshold falls below the gravity value.
 *
 * @param this  The CTSAmmoPack entity instance (this in the original C++)
 * @returns     void
 */
export function Fall(this: CTSAmmoPack): void {
  const pev = this.pev;

  // pev->flFallVel = frameTime + sv_gravity->value
  // (QWORD load of a global double from the GOT; fadd promotes the cvar
  //  float to double; result is truncated back to float on store.)
  pev.flFallVel = frameTime + sv_gravity;

  // If landed (bit 0x2 of pev->flags is set), zero horizontal velocity
  // and dispatch the OnGround event.
  // TODO(asm-ambiguous): mask 0x2 corresponds to FL_PARTIALGROUND in
  //       standard HL1 (FL_ONGROUND is 0x1) — verify engine flag layout.
  if ((pev.flags & 0x2) !== 0) {
    pev.velocity.x = 0;
    pev.velocity.z = 0;
    this.OnGround();
  }

  // Despawn if an internal threshold drops below the gravity value.
  // TODO: offset 0xa4 field meaning unclear — possibly a cached fall
  //       velocity, fall-limit timer, or class-specific counter.
  if (this.m_fFallVel < sv_gravity) {
    UTIL_Remove(this);
  }
}
```
