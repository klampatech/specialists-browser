```typescript
/**
 * CTSBomb::EnableObjective — arms or disarms the bomb objective.
 *
 * When `enable` is true (ARM):
 *   1. Configures pev flags and the bomb model — clears bit 7 of
 *      pev+0x118, sets pev+0x10c (body) = 4, pev+0x108 (skin) = 7,
 *      and ORs pev+0x1a4 (renderfx) with 0x2000000.
 *   2. Fires an engine broadcast via a vtable call. Passes
 *      pev+0x208 as the first arg and (pev+0xb8 + a value read
 *      from a singleton via [esi->vtable+0x98]) as the second.
 *   3. Records the bomb's start time as
 *      `(*gpGlobals_like).field_0x8 - (*singleton).first_field`.
 *   4. Clears the wires-cut counter and detonate timers.
 *   5. Calls SetRandomWires(this) to randomize which wires are live.
 *
 * When `enable` is false (DISARM):
 *   Resets every flag/model/timer field touched above back to 0
 *   (and explicitly sets pev+0x118 = 0x80).
 *
 * @param this   The CTSBomb entity instance
 * @param enable True to arm the objective, false to disarm it
 * @returns      void
 */
export function EnableObjective(this: CTSBomb, enable: boolean): void {
  // Persist the enable flag and clear the wire-state byte
  this.m_bEnabled = enable ? 1 : 0;
  // TODO(asm-ambiguous): byte at offset 0x7f — cleared in both branches,
  // likely m_bDefused or m_bWiresExposed
  this.m_bDefused = 0;

  if (enable) {
    // === ARM the bomb objective ===

    // Show the bomb model and configure pev flags
    this.pev.flags &= 0xffffff7f;            // clear custom bit 7 (offset 0x118)
    this.pev.body = 4;                      // model body (offset 0x10c)
    this.pev.skin = 7;                      // model skin (offset 0x108)
    this.pev.renderfx |= 0x2000000;         // render effect flag (offset 0x1a4)

    // TODO(asm-ambiguous): engine broadcast — exact vtable entry unclear.
    // Passes pev+0x208 as arg1 and
    // (pev+0xb8 + *(singleton)+0x98) as arg2.
    EngineBroadcast(
      this.pev.handle_0x208,
      this.pev.field_0xb8 + EngineSingleton.field_0x98
    );

    // Record start time = (gpGlobals-like field at +0x8) -
    //                     (some singleton's first field)
    this.m_flStartTime = gpGlobals.timeOffset_0x8 - EngineSingleton.firstField;

    // Clear counters and timers
    this.m_iWiresCut = 0;
    this.m_flDetonateLength = 0;
    this.m_flDetonateTime = 0;

    // Pick which defuse wires are live
    SetRandomWires(this);
  } else {
    // === DISARM the bomb objective ===

    // Reset pev flags and bomb model
    this.pev.flags = 0x80;                  // set custom bit 7 (offset 0x118)
    this.pev.body = 0;                      // (offset 0x10c)
    this.pev.renderfx = 0;                  // (offset 0x1a4)
    this.pev.skin = 0;                      // (offset 0x108)

    // Zero all timing/counter fields
    this.m_flStartTime = 0;
    this.m_iWiresCut = 0;
    this.m_flDetonateLength = 0;
    this.m_flDetonateTime = 0;
  }
}
```
