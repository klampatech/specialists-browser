```typescript
/**
 * CTSSlowMotionPoint::Spawn — initializes the slow-motion trigger zone entity:
 * classname, point bounds, origin, render mode, custom state fields, scheduled
 * first think, and zeroed affected-player tracking buffer.
 *
 * @param this  The CTSSlowMotionPoint entity instance
 * @returns     void
 */
export function Spawn(this: CTSSlowMotionPoint): void {
  // PIC-resolved classname string ("slowmo_point")
  this.pev.classname = "slowmo_point";
  // TODO(asm-ambiguous): exact PIC constant derived from GOT - 0x6eea7 - *(*globalPtr + 0x98)

  // mins = maxs = zero vector → point entity, no extent
  const mins = new Vector(0, 0, 0);
  const maxs = new Vector(0, 0, 0);
  UTIL_SetSize(this.pev, mins, maxs);

  // Origin = pev->origin (already engine-set; no offset tweak)
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // Render mode: invisible / semi-transparent trigger zone
  this.pev.rendermode = 0;     // kRenderNormal
  this.pev.renderfx = 0;        // kRenderFxNone
  this.pev.renderamt = 0x80;    // semi-transparent (128)
  // TODO(asm-ambiguous): pev offset 0x118 — confirm field name against SPEC.md

  // Custom CTSSlowMotionPoint state fields (offsets 0x0c..0x18 on `this`)
  this.m_iAffectedPlayerIndex = -1;                       // 0x0c: no player yet
  this.m_flCurrentSlowAmount = cvar_slow_amount.value;    // 0x10: cached cvar value at spawn
  this.m_flStartTime = 0;                                  // 0x14
  this.m_flEndTime = 0;                                    // 0x18

  // Schedule first think: gpGlobals->time + small delay constant
  this.pev.nextthink = gpGlobals.time + NEXT_THINK_DELAY;
  // TODO(asm-ambiguous): NEXT_THINK_DELAY value is the QWORD at [ebx-0x6ecd8]

  // Zero out the affected-player tracking buffer (132 bytes / 33 DWORDs at offset 0x64..0xE7)
  this.m_affectedPlayers.fill(0);

  // Zero out additional state fields (offsets 0xE8..0xF4)
  this.m_iAffectedPlayerCount = 0;     // 0xE8
  this.m_flActivationTime = 0;          // 0xEC
  this.m_flDeactivationTime = 0;        // 0xF0
  this.m_bActive = false;                // 0xF4 (byte)
}
```
