```typescript
/**
 * CTSSlowMotionPoint::ActivateSlow — arms this slow-motion point entity
 * with the given parameters. Computes the absolute start time as
 * `gpGlobals.time + flStartTime` and stores the duration, slow amount,
 * and reset flag on the entity.
 *
 * Field offsets inferred from the disassembly (TODO: confirm names
 * against TS source if/when it becomes available):
 *   +0xe8 m_flStartTime  (float, absolute start time)
 *   +0xec m_flDuration   (float)
 *   +0xf0 m_flSlowAmount (float)
 *   +0xf4 m_bReset       (bool)
 *
 * @param this         The CTSSlowMotionPoint entity being activated
 * @param flDuration   How long the slow-motion effect lasts (seconds)
 * @param flStartTime  Time offset until slow-motion begins (seconds from now)
 * @param flSlowAmount Slow-motion intensity (e.g. 0.3 = 30% normal speed)
 * @param bReset       Force-reset any active slow-motion if true
 * @returns            void
 */
export function ActivateSlow(
  this: CTSSlowMotionPoint,
  flDuration: number,
  flStartTime: number,
  flSlowAmount: number,
  bReset: boolean,
): void {
  // gpGlobals is reached via a double-indirect GOT load; in TS it's just the
  // engine's globalvars_t singleton, with `time` as the first field (offset 0).
  // TODO: import / reference the gpGlobals singleton from the engine bindings
  // when those are wired up — for now it is treated as a global like in the .so.
  this.m_flStartTime = gpGlobals.time + flStartTime;
  this.m_flDuration = flDuration;
  this.m_flSlowAmount = flSlowAmount;
  this.m_bReset = bReset;
}
```
