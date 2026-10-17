```typescript
/**
 * CTSCustomTarget::Use — fire the entity's configured target(s) on Use.
 *
 * Throttled dispatch: an internal frame counter increments on every call;
 * once it reaches m_iFrameLimit it wraps to 0 and the entity actually
 * fires (after optionally broadcasting a class-specific HUD message).
 *
 * Mode dispatch (m_iMode):
 *   - 1: call an engine helper to look up a target entity index, then fire
 *   - 2: cycle through a target list (m_iCycleIndex), wrap at m_iTarget
 *   - otherwise: FireTarget(this, -1) — fire all configured targets
 *
 * @param this        The CTSCustomTarget entity.
 * @param pActivator  The activating entity (unused).
 * @param useType     USE_TYPE (unused).
 * @param value       Float value (unused).
 */
export function Use(
  this: CTSCustomTarget,
  pActivator: any,        // TODO: CBaseEntity
  useType: any,           // TODO: USE_TYPE
  value: number,
): void {
  const self = this as any;

  // Throttle: only fire every m_iFrameLimit-th Use.
  if (++self.m_iFrameCount < self.m_iFrameLimit) {
    return;
  }
  self.m_iFrameCount = 0;

  // Optional class-specific HUD broadcast.
  if (self.m_iHudMessageOffset !== 0) {
    // The HUD message is a slice of a cvar-supplied template string.
    // GOT[0x1600] is a cvar_t**; the template base lives at field
    // offset 0x98 of the dereferenced cvar; m_iHudMessageOffset is
    // the byte offset into that template.
    // TODO(asm-ambiguous): which cvar this points to isn't visible
    //   from this chunk alone.
    const baseStr = ((globalThis as any).__ts_hud_cvar)[0x98 / 4] as number;
    const msg = (baseStr + self.m_iHudMessageOffset) as any;
    TSHudMessageAll(0, 0xff, 0, 1, 0x1e, msg);
  }

  switch (self.m_iMode) {
    case 1: {
      // Engine-helper lookup. GOT[0x1aa8] points to a global engine
      // subsystem; calling its method at vtable offset 0x168 with
      // args (0, m_iTarget - 1) returns a target entity index.
      // TODO(asm-ambiguous): which engine subsystem / method this is.
      const helper = ((globalThis as any).__ts_engine_helper)[0x168 / 4] as
        (a: number, b: number) => number;
      const targetIdx = helper(0, self.m_iTarget - 1);
      FireTarget(this, targetIdx);
      break;
    }
    case 2: {
      // Cycle through targets; wrap m_iCycleIndex at m_iTarget.
      FireTarget(this, self.m_iCycleIndex);
      if (++self.m_iCycleIndex >= self.m_iTarget) {
        self.m_iCycleIndex = 0;
      }
      break;
    }
    default: {
      // Mode 0 / negative / unknown: fire all configured targets.
      FireTarget(this, -1);
      break;
    }
  }
}
```
