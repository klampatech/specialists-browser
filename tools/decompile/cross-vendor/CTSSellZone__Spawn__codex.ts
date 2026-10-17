```typescript
/**
 * CTSSellZone::Spawn — initializes the sell zone when placed in the map.
 *
 * Schedules the first think, applies the size/origin keyvalues, configures
 * trigger-style collision, and initializes per-instance state fields
 * (touch state, target entity, sentinel state value) so the sell zone is
 * ready to handle player entries.
 *
 * @param this  The CTSSellZone entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSSellZone): void {
  const pev = this.pev;

  // ── Schedule first think. asm computes:
  //      nextthink = (got_base - 0x6EDED) - gpGlobals[0x98]
  //    The subtracted constant is a function pointer (some helper), and
  //    gpGlobals[0x98] is a globals_t field whose identity is not visible
  //    in the chunk.
  //    TODO(asm-ambiguous): globals_t field at 0x98, meaning of offset
  //    constant, and whether the result is an absolute or relative time. ──
  pev.nextthink = /* TODO: see asm 0x6273d–0x62749 */;

  // ── Deferred schedule via GOT-loaded vtable (call at vtable+0x8), args
  //    (gpGlobals[0x98] + pev[0xb8], pev[0x208]).
  //    This is the only opaque call in the body: ecx = GOT[0x1aa8]; call [ecx+0x8].
  //    TODO(asm-ambiguous): identify the engine helper. ──
  // (engineHelper.schedule(pev[0xb8] + globals[0x98], pev[0x208]));

  // ── Apply size keyvalue (mins/maxs). ──
  UTIL_SetSize(pev, pev.mins, pev.maxs);

  // ── Apply origin keyvalue. ──
  UTIL_SetOrigin(pev, pev.origin);

  // ── Set a pev->flags bit (0x80). In HL SDK 0x80 = FL_AIMTARGET, but TS
  //    repurposes flag bits on trigger entities — verify in the entity
  //    header. ──
  pev.flags |= 0x80;

  // ── Configure solid (1 = SOLID_TRIGGER) and movetype (5 = MOVETYPE_TOSS).
  //    HL entvars_s offsets are 0x10c for solid and 0x108 for movetype;
  //    this matches the asm writes at +0x10c/0x108. The movetype value
  //    is unusual for a stationary trigger — possibly overridden later.
  //    TODO(asm-ambiguous): movetype vs solid offset in this build. ──
  pev.solid = 1;
  pev.movetype = 5;

  // ── Per-instance fields relative to `this` (CTSSellZone layout):
  //    0x0c: pointer → NULL
  //    0x10: pointer → NULL
  //    0x14: int    → 0xffff0000  (sentinel; low 16 = 0, high 16 = 0xffff)
  //    0x18: pointer → GOT[0x1824] global
  //    TODO(asm-ambiguous): field naming — without TS source these are
  //    educated guesses based on offset patterns and CTSSellZone role. ──
  this.m_pGoal = null;
  this.m_pTouch = null;
  this.m_iState = 0xffff0000;
  this.m_pSellItem = /* TODO: GOT[0x1824] global */;
}
```
