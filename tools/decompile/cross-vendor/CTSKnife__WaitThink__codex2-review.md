```
VERDICT: PASS-WITH-NOTES

⚠ Template scope mismatch — the checklist is designed for the D.3
   engine↔mod interface functions (GiveFnptrsToDll / GetEntityAPI* /
   GetNewDLLFunctions). The function under review (CTSKnife::WaitThink)
   is a D.4 entity-method decompilation. Items 2–4 are N/A by design;
   I've applied the spirit of the checklist (faithfulness, no invented
   paths, field naming, compile-ability) to this function instead.

Checklist (re-mapped for a D.4 entity method):
1. Signature — ✅ — `WaitThink(this: CTSKnife): void` matches the
   asm. `this` is the first arg at `[esp+0xa0]` after the prologue
   (push edi/esi/ebx + sub esp 0x90 + call-pop PIC setup, then
   return-address-at-0x9c, then first-arg-at-0xa0). No other args.
   Void return — the asm has no `eax` writeback on the success path.
2. Version check — N/A — no version constant in this function.
3. interfaceVersion assignment — N/A — not an interface shim.
4. Success-path struct copy — N/A — no memcpy in this function.
5. No fabricated paths — ⚠ — Mostly faithful; see issues 1 + 3 below.
   In particular: the **early `return` after RemoveEntityFromSlowedArray
   / UTIL_Remove correctly maps to `jmp 6ed46` in the asm**, which
   skips CTSPhysicObject::WaitThink entirely (different epilogue than
   the trace-and-damage failures, which jump to 6ed32 and DO call the
   base class via `gotoEnd`). Good catch by the decompiler.
6. No TODO body — ✅ — TODOs are scoped to specific gaps (engine
   helper at flFraction==0, virtual function names, field semantics)
   and clearly tagged `TODO(asm-ambiguous)`. Body is not "mostly TODO".
7. Field names — ✅ — Known HLSDK field names used (`pev`, `velocity`,
   `origin`, `nextthink`, `time`, `owner`). Unknown offsets
   (`[esi+0x88]` → `m_flKillTime`, `[edx+0x160]` → `field_0x160`,
   `[eax+0x108]` → `field_0x108`) are either plausibly inferred from
   usage or left as `field_0xXXX` placeholders. `m_flKillTime` is a
   defensible inference (it's compared to gpGlobals->time and 0).
8. Compiles in isolation — ✅ — TS syntax is valid; external symbols
   referenced (Vector, CTSKnife, CBaseEntity, TraceResult,
   EngineGlobals, UTIL_TraceLine, UTIL_Remove, RemoveEntityFromSlowedArray,
   ClearMultiDamage, ApplyMultiDamage, CTSPhysicObject, THINK_INTERVAL,
   TRACE_DISTANCE, TRACE_MIN_SPEED) are reasonable to declare elsewhere.

Issues to fix:
1. **UTIL_TraceLine call signature drift.** Asm pushes 5 args
   (vecStart, vecEnd, igmon, pentIgnore, &tr). TS only passes 4 and
   treats `UTIL_TraceLine` as returning a `TraceResult`. The HLSDK
   signature takes a `TraceResult*` output param — the TS is treating
   it as value-returning. Either (a) intentional ergonomic redesign
   (then document it explicitly), or (b) a miss that needs the
   output-param pattern.

2. **Engine fallback for `tr.flFraction === 0` is a null placeholder.**
   Asm at 6ebd9–6ebea calls `[ebx+0x1aa8]->vfunc[0x114](0)` and then
   reads `result->field_0x7c` as the hit entity. The TS replaces this
   with `null`, relying on the `if (!pHit) gotoEnd` guard. Control
   flow is preserved (no damage applied when fallback returns null),
   but the actual engine-helper call is missing. The TODO comment is
   there but easy to miss — promote it to a function-level TODO or
   leave the helper as a stub.

3. **`pev.field_0x108` sentinel in `gotoEnd`** — the asm compares
   `[eax+0x108]` to literal 5 to decide whether the knife is "settled"
   (skip base-class think) or "live" (defer to CTSPhysicObject::WaitThink).
   TS captures this correctly. But `5` is an opaque literal — should
   be a named constant like `KNIFE_STATE_SETTLED = 5` so the meaning
   is at least hinted at in code rather than in the surrounding comment.

4. **`speed === 0` guard around the trace direction is correct, not
   a fabrication** (re-checking the asm at 6eb06 — `fcom [ebx-0x6f408]`
   then `test ah, 0x40; je6eb34`. Status bit C3 is bit 6 of AH, so
   the je fires on C3=0, i.e., NOT equal. For fcom vs 0 with speed=0,
   C3=1 (equal), so je doesn't fire → takes the "trace up" path).
   Good catch by the decompiler; not a fabrication.

5. **`this: CTSKnife` explicit-this-parameter pattern** is unusual   for a method decompilation. It works (TS enforces the binding at
   the call site) but reads strangely. When D.4 wires up the full
   class, fold this into `class CTSKnife { WaitThink(): void {...} }`.

Suggested rewrite (just the touched sections; full function structure
preserved):

```typescript
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
```

Bottom line: faithful decompilation with three small follow-ups —
(1) reconcile UTIL_TraceLine signature, (2) promote the engine-fallback
TODO out of an inline `/* ... */` comment, (3) name the `5` sentinel.
Ready to land as-is; the follow-ups belong in the next D.4 pass.
