```typescript
/**
 * CTSShrapnel::Spawn — initialize a freshly-created shrapnel entity.
 *
 * Delegates to the parent CTSPhysicObject::Spawn(), attaches the shrapnel
 * model, configures scale and sub-model (body/skin), sets a point-sized
 * bounding box, schedules the first WaitThink (pev->next_think = now;
 * m_flWaitThinkTime = now + delay), caches two identifier pairs (purpose
 * unclear from this function alone), and sets TS-specific gameplay flags.
 *
 * @param this  The CTSShrapnel entity instance.
 * @returns     void
 */
export function Spawn(this: CTSShrapnel): void {
  // Compiler-generated PIC/GOT base is in EBX after the prologue:
  //   call $+5; pop ebx; add ebx, 0xf9d66
  // After this, [ebx ± N] reads globals / GOT entries.

  // ── 1. Parent spawn (CTSPhysicObject::Spawn) ─────────────────────
  CTSPhysicObject.Spawn(this);

  // ── 2. Attach model ──────────────────────────────────────────────
  // Model string constant lives at GOT-relative [ebx-0x6e067].
  // TODO: confirm exact model name from tools/decompile/analysis/strings-n5.txt.
  SET_MODEL(this.pev, /* modelName */ "");

  // ── 3. Visual scale + sub-model ──────────────────────────────────
  this.pev.scale  = 1.0;   // [pev+0x11c]
  this.pev.scale2 = 1.0;   // [pev+0x120]
  this.pev.body   = 10;    // [pev+0x108]
  this.pev.skin   = 2;     // [pev+0x10c]

  // ── 4. Bounding box (point-sized) ────────────────────────────────
  // mins and maxs are both filled with the same Vector loaded from a GOT
  // constant at [ebx-0x6f408]. Result: a point-sized entity whose
  // collision is provided by the visual model itself.
  const bounds: Vector = /* Vector at [ebx-0x6f408] */ Vector.zero;
  UTIL_SetSize(this.pev, bounds, bounds);

  // ── 5. Cached identifier pairs ───────────────────────────────────
  // Two 32-bit pairs are written at [this+0xc]/[this+0x10] and
  // [this+0x14]/[this+0x18]. Purpose is not deducible from this function
  // alone — values 0x460000 / 0x490000 don't match any standard HL enum,
  // and 0x60 could be a TS-specific type tag. Possibly cached
  // classname/globalname string indices or shrapnel-type markers.
  // TODO(asm-ambiguous): field purpose unclear. The low-16 bits of
  // [this+0x10] / [this+0x18] are 0x60 from `mov cx, 0x60`; the high-16
  // bits depend on ECX state at that point and are assumed zero.
  this.m_iCachedA = 0x460000;   // [this+0xc]
  this.m_iCachedB = 0x60;       // [this+0x10]
  this.m_iCachedC = 0x490000;   // [this+0x14]
  this.m_iCachedD = 0x60;       // [this+0x18]

  // ── 6. Schedule the first WaitThink ──────────────────────────────
  // pev->next_think    = gpGlobals->time           (think runs next frame)
  // m_flWaitThinkTime  = gpGlobals->time + DELAY   (the real deadline the
  //                                                WaitThink compares against)
  // DELAY is a double constant at GOT-relative [ebx-0x6ecc8].
  this.pev.next_think    = gpGlobals.time;
  this.m_flWaitThinkTime = gpGlobals.time + WAIT_THINK_DELAY;

  // ── 7. Gameplay flags ────────────────────────────────────────────
  this.pev.fuser4     = 1.0;    // [pev+0x254]
  this.pev.eflags     = 0x4;    // [pev+0x250]: cleared, then |= 0x4
  this.pev.spawnflags |= 0x80;  // [pev+0x118]: |= 0x80 (TS-specific flag)
}
```
