```typescript
/**
 * CTSKnife::WaitThink — periodic think for the thrown knife projectile.
 *
 * Runs every THINK_INTERVAL seconds. Reschedules itself, optionally
 * expires the knife (if a kill time is set), traces ahead in the
 * direction of motion to see what it would hit, applies damage to
 * that target, and finally defers to CTSPhysicObject::WaitThink
 * (unless the knife is in a "settled" state).
 *
 * @param this  The CTSKnife entity instance (this in the original C++)
 * @returns     void
 */
export function WaitThink(this: CTSKnife): void {
  const pev = this.pev;
  const gpGlobals = EngineGlobals();

  // ── 1. Reschedule next think ──────────────────────────────────
  // Think interval comes from a double-typed global at PIC [ebx-0x6ecd8].
  // Value is probably 0.1s (HL default).
  // TODO(asm-ambiguous): confirm the actual constant value from PIC.
  pev.nextthink = gpGlobals.time + THINK_INTERVAL;

  // ── 2. Expiration check ───────────────────────────────────────
  // m_flKillTime at class offset 0x88. == 0 means "no expiration";
  // otherwise, expire once gpGlobals.time has passed it.
  if (this.m_flKillTime !== 0 && this.m_flKillTime < gpGlobals.time) {
    RemoveEntityFromSlowedArray(this);
    UTIL_Remove(this);
    return; // skip the base-class think entirely on removal
  }

  // ── 3. Speed gate ─────────────────────────────────────────────
  // Skip the trace-and-damage block entirely if the knife is barely
  // moving. The threshold is PIC [ebx-0x6df70].
  // TODO(asm-ambiguous): exact value of the speed threshold.
  const velocity = pev.velocity;
  const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
  if (speed <= TRACE_MIN_SPEED) gotoEnd(this);

  const origin = pev.origin;
  const owner = pev.owner;

  // ── 4. Trace direction (length = TRACE_DISTANCE) ──────────────
  // If velocity is zero, trace straight up instead of dividing by zero.
  // TRACE_DISTANCE comes from PIC [ebx-0x6f3fc].
  // TODO(asm-ambiguous): exact value of TRACE_DISTANCE.
  const traceDir: Vector = speed === 0
    ? Vector.from(0, 0, TRACE_DISTANCE)
    : Vector.from(
        velocity.x * TRACE_DISTANCE / speed,
        velocity.y * TRACE_DISTANCE / speed,
        velocity.z * TRACE_DISTANCE / speed,
      );

  // ── 5. Trace endpoint: origin + traceDir * TRACE_MIN_SPEED ────
  const endpoint = Vector.from(
    origin.x + traceDir.x * TRACE_MIN_SPEED,
    origin.y + traceDir.y * TRACE_MIN_SPEED,
    origin.z + traceDir.z * TRACE_MIN_SPEED,
  );

  // ── 6. Trace forward (ignore owner = pev->owner) ──────────────
  // igmon = 0 means "don't ignore monsters" — they block the trace.
  const tr = UTIL_TraceLine(origin, endpoint, /*igmon*/ 0, owner);
  if (tr.flFraction >= 1.0) gotoEnd(this);

  // ── 7. Resolve the entity that was hit ────────────────────────
  // If the trace started inside a solid (flFraction == 0), the original
  // asm falls back to an engine helper to find what we're inside.
  // TODO(asm-ambiguous): the fallback loads PIC[ebx+0x1aa8] and calls
  // its vfunc at offset 0x114, using the returned entity's field at
  // offset 0x7c as the hit entity. Exact semantics not derivable from
  // this chunk — the engine call signature isn't in scope here.
  const pHit: CBaseEntity | null = tr.flFraction === 0
    ? /* engine fallback */ null
    : tr.pHit;
  if (!pHit) gotoEnd(this);

  // ── 8. Victim check ───────────────────────────────────────────
  // TODO(asm-ambiguous): vfunc at vtable offset 0xc8 (idx 50) on the
  // victim. Returns non-zero to abort damage. Likely IsAlive / IsPlayer
  // / TakeDamage / Blocked — can't tell without SDK headers.
  if (pHit.vfunc_50() !== 0) gotoEnd(this);

  // ── 9. Per-think displacement gate ────────────────────────────
  // TODO(asm-ambiguous): pev+0x160 on the victim; field semantics
  // unclear. Likely a custom "minimum impact displacement" gate added
  // by the TS mod so a near-stationary knife doesn't continually tick
  // damage on contact.
  const thinkDistance = speed * THINK_INTERVAL;
  if (thinkDistance < (pHit.pev as any).field_0x160) gotoEnd(this);

  // ── 10. Apply damage ─────────────────────────────────────────
  ClearMultiDamage();
  // damageDir == traceDir * TRACE_MIN_SPEED == endpoint - origin.
  // (Original asm recomputes it from scratch; in TS we just subtract.)
  pHit.TraceAttack(
    /*inflictor*/ pev,
    /*damage*/    thinkDistance,
    /*dir*/       Vector.from(
                    endpoint.x - origin.x,
                    endpoint.y - origin.y,
                    endpoint.z - origin.z,
                  ),
    /*tr*/        tr,
    /*bits*/      0x8001000,
  );
  ApplyMultiDamage(pev, pev);

  // ── 11. Defer to base class ───────────────────────────────────
  gotoEnd(this);
}

/**
 * Epilogue for WaitThink: defer to CTSPhysicObject::WaitThink unless
 * the knife is in a "settled" state (pev+0x108 == 5).
 *
 * TODO(asm-ambiguous): pev+0x108 — exact semantics unclear. Probably
 * a custom state flag added by the TS mod (e.g. "settled on ground").
 */
function gotoEnd(this: CTSKnife): void {
  if ((this.pev as any).field_0x108 === 5) return;
  CTSPhysicObject.WaitThink(this);
}
```
