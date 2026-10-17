```typescript
/**
 * CTSTrigger::WaitTouch — handle an entity touching a TS trigger.
 *
 * Validates the touching entity (must be an alive player matching the
 * optional team filter and "must have flag" requirement), fires the
 * trigger's `target` string (USE_TOGGLE), broadcasts an HUD message
 * derived from `message` + the touching player's netname, then
 * reschedules the next trigger time using `m_delay` clamped by a cvar
 * floor.
 *
 * @param this      The CTSTrigger instance (this in the original C++).
 * @param pEntity   The entity that touched the trigger.
 * @returns         void
 */
export function WaitTouch(this: CTSTrigger, pEntity: CBaseEntity): void {
  const pGlobals = globalThis.gpGlobals; // TODO: gpGlobals struct type

  // Bail out if still inside the wait window: fcomp + test ah,0x41 + je
  // jumps when st(0) > operand, i.e. when m_nextTriggerTime is still
  // in the future relative to gpGlobals.time.
  if (this.m_nextTriggerTime > pGlobals.time) return;

  // Two virtual calls on pEntity (via vtable pointer at [esi+0x60]).
  // The touching entity must be a player AND alive.
  // TODO(asm-ambiguous): [esi+0x60] is a vtable-like pointer; the
  // exact class hierarchy placing it at that offset is not visible
  // from this chunk.
  if (!pEntity.IsPlayer()) return;
  if (!pEntity.IsAlive()) return;

  // Team filter (-1 == "any team").
  let teamMatches = false;
  if (this.m_iTeamFilter === -1) {
    teamMatches = true;
  } else {
    // pEntity.TeamName() (vtable 0xd0) returns the entity's team-name
    // string; CTSGameRules::GetTeamIndex then maps that name to an
    // index using the global team-cvar name at [ebx+0x14f0].
    // TODO(asm-ambiguous): the demangled name lists only one PCc for
    // GetTeamIndex; the second push (the global team-cvar name) may be
    // a default-team arg or simply ignored.
    const teamName = pEntity.TeamName();
    const teamIndex = CTSGameRules.GetTeamIndex(
      globalThis.g_teamCvarName, // string ptr at [ebx+0x14f0]
      teamName
    );
    if (this.m_iTeamFilter === teamIndex) {
      teamMatches = true;
    }
  }

  // If the trigger's "must have flag" spawnflag (bit 0x8 at pev+0x1a0)
  // is set, the touching entity must be carrying the flag.
  if ((this.pev.spawnflags & 0x8) !== 0) {
    if (!HaveFlag(pEntity)) return;
  }

  // If team matched and a target string is set, fire USE_TOGGLE on it.
  // Both pActivator and pCaller are the trigger itself.
  if (teamMatches && this.pev.target !== 0) {
    FireTargets(
      STRING(this.pev.target),    // arg1: target name (string-table lookup)
      this,                       // arg2: pActivator
      this,                       // arg3: pCaller
      USE_TYPE.USE_TOGGLE,        // arg4: useType = 3
      0.0                         // arg5: value
    );
  }

  // If a HUD message is set, sprintf it (using `message` as the format
  // string and the touching player's netname as the only variadic arg)
  // and broadcast it to all players.
  if (this.pev.message !== 0) {
    const buf = sprintf(
      STRING(this.pev.message),         // format string (assumed to contain %s)
      STRING(pEntity.pev.netname)
    );
    // TSHudMessageAll(channel, r, g, b, x, y, msg) — TS-specific layout.
    TSHudMessageAll(0, 0xff, 0, 8, 30, buf);
  }

  // Reschedule: m_nextTriggerTime = gpGlobals.time + max(m_delay, cvar_floor)
  // The FPU dance (fcom cvar; jae; fstp st(0); fld cvar; faddp) is the
  // standard `max(a, b)` pattern.
  const cvarFloor = globalThis.waitFloor; // QWORD cvar at [ebx-0x6f010]
  const nextDelay = (this.m_delay >= cvarFloor) ? this.m_delay : cvarFloor;
  this.m_nextTriggerTime = pGlobals.time + nextDelay;
}
```
