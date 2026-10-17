/**
 * CTSKnife::WaitThink — periodic think for the thrown knife projectile.
 */
export function WaitThink(this: CTSKnife): void {
  const pev = this.pev;
  const gpGlobals = EngineGlobals();

  // ── 1. Reschedule next think ──────────────────────────────────
  pev.nextthink = gpGlobals.time + THINK_INTERVAL;

  // ── 2. Expiration check (early-return path bypasses base class) ─
  // asm: `jmp 6ed46` — different epilogue from the trace-failure path,
  // which goes to 6ed32 and DOES call CTSPhysicObject::WaitThink.
  if (this.m_flKillTime !== 0 && this.m_flKillTime < gpGlobals.time) {
    RemoveEntityFromSlowedArray(this);
    UTIL_Remove(this);
    return;
  }

  // ── 3. Speed gate ─────────────────────────────────────────────
  const velocity = pev.velocity;
  const origin = pev.origin;
  const owner = pev.owner;
  const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
  if (speed <= TRACE_MIN_SPEED) gotoEnd(this);

  // ── 4. Trace direction (straight up if speed == 0) ────────────
  // asm: fcom [ebx-0x6f408] (zero); C3 fires on equal/NaN.
  // For normal velocity values, equivalent to `speed === 0`.
  const traceDir: Vector = speed === 0
    ? Vector.from(0, 0, TRACE_DISTANCE)
    : Vector.from(
        velocity.x * TRACE_DISTANCE / speed,
        velocity.y * TRACE_DISTANCE / speed,
        velocity.z * TRACE_DISTANCE / speed,
      );

  // ── 5. Trace endpoint ─────────────────────────────────────────
  const endpoint = Vector.from(
    origin.x + traceDir.x * TRACE_MIN_SPEED,
    origin.y + traceDir.y * TRACE_MIN_SPEED,
    origin.z + traceDir.z * TRACE_MIN_SPEED,
  );

  // ── 6. Trace forward (5 args per HLSDK signature) ─────────────
  // asm pushes &tr as the 5th arg; HLSDK UTIL_TraceLine takes an
  // output TraceResult* (not a return value).
  const tr: TraceResult = { /* uninit */ } as TraceResult;
  UTIL_TraceLine(origin, endpoint, /*igmon*/ 0, owner, tr);

  // ── 7. Resolve hit entity ─────────────────────────────────────
  let pHit: CBaseEntity | null = tr.pHit;
  if (tr.flFraction === 0) {
    // TODO(asm-ambiguous, must fix in D.4):
    // asm at 6ebd9–6ebea calls [engine_global+0x1aa8]->vfunc[0x114](0)
    // and uses `result->field_0x7c` as the hit entity when the trace
    // started inside a solid. Stub for now — control flow preserved
    // via the !pHit guard below.
    pHit = null;
  }
  if (!pHit) gotoEnd(this);

  // ── 8. Victim check (vfunc idx 50 at vtable+0xc8) ─────────────
  // TODO(asm-ambiguous): function semantics unclear — likely IsAlive /
  // IsPlayer / TakeDamage / Blocked.
  if (pHit.vfunc_50() !== 0) gotoEnd(this);

  // ── 9. Per-think displacement gate ────────────────────────────
  const thinkDistance = speed * THINK_INTERVAL;
  if (thinkDistance < (pHit.pev as any).field_0x160) gotoEnd(this);

  // ── 10. Apply damage (vfunc idx 21 at vtable+0x54 = TraceAttack) ─
  ClearMultiDamage();
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
 * Epilogue: defer to CTSPhysicObject::WaitThink unless the knife is
 * in the "settled" state (pev+0x108 == 5).
 *
 * NOTE: the literal 5 is an opaque enum in the asm; named constant
 * pending D.4 enum discovery.
 */
function gotoEnd(this: CTSKnife): void {
  if ((this.pev as any).field_0x108 === 5 /* KNIFE_STATE_SETTLED */) return;
  CTSPhysicObject.WaitThink(this);
}
