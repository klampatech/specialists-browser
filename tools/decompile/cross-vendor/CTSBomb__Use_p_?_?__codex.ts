```typescript
/**
 * CTSBomb::Use — handles a player interacting with (defusing) the bomb.
 *
 * If the bomb is armed, the activator is a player, and the player can interact
 * with this objective, this method advances the bomb's defuse timer, sends a
 * status message to the activator, and (when the timer elapses) fires the
 * bomb's targets, broadcasts a HUD message, resets two state fields, and
 * schedules the bomb for removal.
 *
 * @param this        The CTSBomb entity instance (this in the original C++)
 * @param pActivator  The CBaseEntity that triggered the use (typically the player)
 * @param useType     USE_TYPE (unused in this implementation)
 * @param value       float (unused in this implementation)
 */
export function Use(
  this: CTSBomb,
  pActivator: CBaseEntity,
  useType: USE_TYPE,
  value: number,
): void {
  // ── early-outs ───────────────────────────────────────────────────────────

  // Bomb must be armed. ([esi+0x64] is a byte flag; 0 = disarmed.)
  if (!this.m_bArmed) return;

  // Only players may interact. Virtual call at pActivator's vtable+0xc8.
  // TODO(asm-ambiguous): the vtable offset 0xc8 is too large for the standard
  // HL1 IsPlayer() slot — this could be a TS-modified IsPlayer or a custom
  // IsAlive/IsValidActivator.
  if (!pActivator.IsPlayer()) return;

  // CTSObjective::CanInteract(pActivator) — gameplay-layer permission check.
  if (!this.CanInteract(pActivator)) return;

  // ── per-tick cache + time arithmetic ─────────────────────────────────────

  // gpGlobals->time, loaded via the PIC/GOT float slot at [ebx-0x6f408].
  const now = gpGlobals.time;

  // Tick-cache: refresh m_flLastTick whenever `now` has caught up to it.
  // The "current time" for the cache is read via the triple-deref pattern
  // [ebx+0x1600] → *ptr → **ptr, which lands on gpGlobals.curtime (the
  // server-time accumulator). This is *not* the same float as the one
  // loaded for `now`, hence the indirection.
  if (now >= this.m_flLastTick) {
    this.m_flLastTick = gpGlobals.curtime;
  }

  // Δt since the last tick.
  const elapsed = gpGlobals.curtime - this.m_flLastTick;

  // If the elapsed time is "too big" (≥ the constant at [ebx-0x6f010],
  // a QWORD/double ~0.1 s), skip the decrement path. The constant acts
  // as a sanity cap — beyond it, gpGlobals->curtime has probably wrapped
  // or the entity has been frozen, and the timer shouldn't be touched.
  const elapsedLimit = 0.1;
  if (elapsed < elapsedLimit) {
    if (now === this.m_flDefuseProgress) {
      // Edge case: when `now` exactly matches the current progress
      // (very rare float coincidence), reset the progress to the
      // int max-defuse-time reinterpreted as a float.
      this.m_flDefuseProgress = this.m_iMaxDefuseTime;
    } else {
      // Normal case: subtract the elapsed time from the progress.
      this.m_flDefuseProgress -= elapsed;
    }
  }

  // ── status message to the activator ─────────────────────────────────────

  // Build an int status: max(now, m_flDefuseProgress), truncated via the
  // x87 round-to-zero control-word dance (fnstcw / 0x0c / fldcw / fistp).
  // TODO(asm-ambiguous): the format string at [ebx-0x6cdf5] is unknown;
  // it formats the int into something like "T-%d" or "%.0f".
  const remaining = Math.max(now, this.m_flDefuseProgress);
  const message = UTIL_VarArgs("%d", Math.trunc(remaining));

  // Print the message to the activator's HUD (dest 4 = HUD_PRINTCENTER).
  ClientPrint(pActivator.pev, 4, message);

  // Refresh the tick cache again so the next Use() call sees fresh data.
  this.m_flLastTick = gpGlobals.curtime;

  // ── defuse complete: fire targets, HUD broadcast, reset, cleanup ────────

  // If the defuse time hasn't actually elapsed yet, stop here. (test ah,0x41
  // checks both C0 and C3: jumps if either is set, i.e. now ≤ progress.)
  if (now <= this.m_flDefuseProgress) return;

  // If pev->target is set, fire those targets. STRING() resolves a string_t
  // offset to a char* via gpGlobals->pStringBase (loaded as **ptr+0x98).
  if (this.pev.target) {
    FireTargets(STRING(this.pev.target), this, this, USE_TYPE, 0);
  }

  // If pev->message (or pev->noise) is set, broadcast a HUD message to all
  // clients. TSHudMessageAll(channel, r, g, b, x, y, msg) — the literal
  // argument values come straight off the stack.
  if (this.pev.message) {
    TSHudMessageAll(0, 0xff, 0, 8, 30, STRING(this.pev.message));
  }

  // Clear the two state fields that tracked defuse progress.
  this.m_iStateField1 = 0; // [esi+0x6c]
  this.m_iStateField2 = 0; // [esi+0x70]

  // Schedule the bomb for removal: vtable slot 0x114, called with arg 1.
  // TODO(asm-ambiguous): the vtable offset 0x114 + arg=1 is unusual for
  // vanilla HL1 — likely a TS-specific Remove(flags) or OnDefused(1).
  this.removeOrCleanup(1);
}
```
