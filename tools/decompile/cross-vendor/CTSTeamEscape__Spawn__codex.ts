```typescript
/**
 * CTSTeamEscape::Spawn — initialize the team-escape objective entity.
 *
 * Sets the entity classname, registers a target-name dispatch via
 * an indirect engine call, sizes and positions the entity as a
 * non-solid trigger, schedules the first WaitThink, and clears the
 * internal per-player state array.
 *
 * @param this  The CTSTeamEscape entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSTeamEscape): void {
  const pev = this.pev;

  // pev->classname = MAKE_STRING("ts_team_escape")
  pev.classname = MAKE_STRING("ts_team_escape");

  // TODO(asm-ambiguous): indirect dispatch through [ebx+0x1aa8][0x8]
  //   with args (engine_string_base + pev->string_at_0xb8,
  //   pev->field_0x208). Looks like a FireTargets variant — needs
  //   the GOT+0x1aa8 table mapped to confirm.

  // UTIL_SetSize(pev, pev->mins, pev->maxs)
  UTIL_SetSize(pev, pev.mins, pev.maxs);

  // UTIL_SetOrigin(pev, pev->origin)
  UTIL_SetOrigin(pev, pev.origin);

  // pev->spawnflags = 0x80
  pev.spawnflags = 0x80;

  // pev->solid = 1 (SOLID_TRIGGER)
  pev.solid = 1;

  // pev->effects = 0
  pev.effects = 0;

  // pev->flags = 5
  pev.flags = 5;

  // Clear internal flag byte at this+0x64.
  // TODO: confirm field purpose — likely a per-round "enabled" flag.
  this.m_bEnabled = false;

  // Two pairs of (sentinel, global) dwords at this+0x0c/0x10 and
  // this+0x14/0x18. The 0xffff0000 sentinel reads as -infinity in
  // float or "not yet set" in int; the globals come from the GOT
  // at offsets 0x196c and 0x1a34.
  // TODO(asm-ambiguous): confirm field meaning — possibly vec3_t
  //   y/z components, or (string-id, frame) tuples.
  this.m_StateA = -1;
  this.m_StateB = GLOBAL_AT_1a34;
  this.m_StateC = -1;
  this.m_StateD = GLOBAL_AT_196c;

  // pev->nextthink = engine_time + <constant_double_at_GOT-0x6f018>
  pev.nextthink = gpGlobals.time + NEXT_THINK_DELAY;

  // memset(this+0x6c, 0, 132) — zero 33 dwords of internal state,
  // most likely a per-player status array (max 32 players + slack).
  for (let i = 0; i < 33; i++) this.m_PlayerStatus[i] = 0;

  // Clear dword at this+0xf0.
  // TODO: confirm field purpose — likely a last-touched index.
  this.m_iLastTouched = 0;
}
```
