```typescript
/**
 * CTSPlayerAmount::ClientDisconnect — handles a player disconnect.
 *
 * Decrements the running player count. If the count has reached the
 * configured threshold (and this entity has a non-empty target name),
 * fires the target — either directly with USE_TOGGLE (zero delay) or
 * via a freshly-spawned CBaseDelay that fires it after the configured
 * delay. Finally removes self if the kill-flag bit is set on pev.
 *
 * @param this  The CTSPlayerAmount entity instance.
 * @returns     void
 */
export function ClientDisconnect(this: CTSPlayerAmount): void {
  // 1. Decrement the running player count.
  this.playerCount--;

  // 2. Only act when the count has reached the configured threshold.
  if (this.playerCount !== this.playerThreshold) return;

  // 3. No target name configured → nothing to fire.
  if (this.targetName.length === 0) return;

  if (this.delay === 0.0) {
    // 4a. Zero delay → fire the target immediately with USE_TOGGLE.
    // TODO(asm-ambiguous): USE_TYPE 0x3 = USE_TOGGLE in HL SDK; verify
    //                      against TS's enum if different.
    FireTargets(
      this.targetName,
      /* pActivator */ null,
      /* pCaller   */ this,
      USE_TYPE.USE_TOGGLE,
      /* value     */ 0.0
    );
  } else {
    // 4b. Non-zero delay → spawn a CBaseDelay that fires the target
    //     after `this.delay` seconds. The delay entity is configured
    //     with pev.classname="DelayedUse", pev.nextthink = current
    //     time + delay, pev.target = this.targetname, pev.movetype = 3,
    //     pev.solid = 0, m_flDelay = 0, and m_iszKillTarget = "".
    const delay = GetClassPtr(CBaseDelay, /* location */ null);
    delay.pev.classname  = "DelayedUse";
    delay.pev.nextthink = gpGlobals.time + this.delay;
    delay.pev.target    = this.targetName;
    delay.pev.movetype  = 3;
    delay.pev.solid     = 0;
    delay.m_flDelay     = 0;
    delay.killTarget    = ""; // m_iszKillTarget = empty string_t (0xffff0000)
  }

  // 5. Remove self if the kill flag is set.
  // TODO(asm-ambiguous): bit 0 of the byte at pev+0x1a0 is tested; HL
  //                      SDK names that bit FL_FLY, but the semantic
  //                      here is "ready to be removed". Likely a
  //                      TS-local FL_KILLME (or pev.flags redefined
  //                      so this bit means "to be removed").
  if ((this.pev.flags & FL_KILLME) !== 0) {
    UTIL_Remove(this);
  }
}
```
