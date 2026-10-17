```typescript
/**
 * CTSPowerUp::Spawn — initialize a power-up entity at spawn time.
 *
 *  1. Run base class Spawn through the parent sub-object's vtable.
 *  2. One-shot reset of a shared global flag if it is still 0xff.
 *  3. Set pev->classname to a string-table offset.
 *  4. Allocate and store pev->target in the engine string table.
 *  5. Initialize button + oldbuttons for pickup detection.
 *  6. Configure glow-shell render state.
 *  7. Place the entity at pev->origin via UTIL_SetOrigin.
 *  8. Set a uniform bounding box via UTIL_SetSize.
 *  9. Initialize a 16-bit-style flags field, a goal-pointer slot,
 *     and zero two adjacent dwords.
 * 10. Schedule the first WaitThink via pev->nextthink.
 * 11. Reset anim sequence info on this CBaseAnimating.
 * 12. Set anim scale to 1.0.
 * 13. Finalize via SetupPowerUp(this.itemType, -1, 0.0, true).
 *
 * @param this  The CTSPowerUp entity instance (this in the original C++)
 */
export function Spawn(this: CTSPowerUp): void {
  // 1. Call base class Spawn through the parent sub-object's vtable.
  //    [edi+0x60] is the base sub-object pointer; vtable slot 0x28.
  // TODO(asm-ambiguous): confirm which base class lives at offset 0x60
  // (likely the CBaseAnimating primary base).
  this.baseClassSpawn();

  // 2. If a shared global flag (GOT+0x14f0) is still 0xff, clear it.
  //    One-shot reset.
  // TODO: identify the global and the flag.
  if (GLOBAL[GOT_0x14f0].byte_1 === 0xff) {
    GLOBAL[GOT_0x14f0].byte_1 = 0;
  }

  // 3. Set pev->classname to a string-table offset.
  //    The literal is in .rodata; the string base is at engine_globals[0x98].
  const pev = this.pev;
  const engineGlobals = GLOBAL[GOT_0x1600][0];
  pev.classname = STRING_AT("classname_string") - engineGlobals[0x98];

  // 4. Allocate pev->target in the engine string table.
  // TODO: confirm the actual target string literal.
  ALLOC_STRING(pev.target, "target_string");

  // 5. Initialize button + oldbuttons for pickup detection.
  pev.button = 6;
  pev.oldbuttons = 2;

  // 6. Configure glow-shell render state.
  pev.renderfx = 1;            // 0x148 — pulse/flash effect
  pev.renderamt = 255.0;       // 0x14c — fully opaque
  pev.rendermode = 0;          // 0x150 — kRenderNormal
  pev.rendercolor = new Vector(0, 0, 0); // 0x154, 0x158, 0x15c
  // (0x15c is written as int 14; likely renderflags, not rendercolor.b)

  // 7. Place the entity at pev->origin.
  UTIL_SetOrigin(pev, pev.origin);

  // 8. Set a uniform bounding box from a global half-extent.
  const halfSize = GLOBAL[GOT_minus_0x6f408];
  const mins = new Vector(halfSize, halfSize, halfSize);
  UTIL_SetSize(pev, mins, mins);

  // 9. Initialize flags + goal pointer + zero two dwords.
  this.flags16 = 0xffff0000;            // 0x0c
  this.goalEnt = GLOBAL[GOT_0x1e18];    // 0x10
  this.field_0x14 = 0;                  // 0x14
  this.field_0x18 = 0;                  // 0x18

  // 10. Schedule the first WaitThink via pev->nextthink.
  pev.nextthink = GLOBAL_DOUBLE[GOT_minus_0x6ecd8] + engineGlobals.time;

  // 11. Reset anim sequence info on this CBaseAnimating.
  this.ResetSequenceInfo();

  // 12. Set anim scale to 1.0.
  pev.scale = 1.0; // 0x138

  // 13. Finalize via SetupPowerUp.
  this.SetupPowerUp(this.itemType, -1, 0.0, true);
}
```
