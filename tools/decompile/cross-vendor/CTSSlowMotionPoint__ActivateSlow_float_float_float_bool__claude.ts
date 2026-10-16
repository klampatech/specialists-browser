// Stubs for isolation — these come from the engine bindings module
// and the reconstructed CTSSlowMotionPoint class respectively.
declare const gpGlobals: { time: number };

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
 */
export function ActivateSlow(
  this: any, // CTSSlowMotionPoint — class reconstructed separately
  flDuration: number,
  flStartTime: number,
  flSlowAmount: number,
  bReset: boolean,
): void {
  this.m_flStartTime = gpGlobals.time + flStartTime;
  this.m_flDuration = flDuration;
  this.m_flSlowAmount = flSlowAmount;
  this.m_bReset = bReset;
}
