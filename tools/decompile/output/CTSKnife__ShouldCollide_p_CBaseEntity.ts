// Minimal type stub so this file compiles in isolation.
// The full CTSKnife class is reconstructed in D.4.
type CTSKnife = any;

/**
 * CTSKnife::ShouldCollide — unconditionally returns true.
 *
 * Disassembly is `mov eax, 0x1; ret` (6 bytes): no `this` field reads,
 * no `pOther` reads, no branches. The argument is ignored.
 *
 * @param this   The CTSKnife entity instance (pentTouched in the HLSDK
 *               pfnShouldCollide typedef)
 * @param pOther The other entity being tested (pentOther; ignored)
 * @returns      true
 */
export function ShouldCollide(
  this: CTSKnife,
  // TODO: CBaseEntity is a GoldSrc engine type not yet defined in this module.
  pOther: any,
): boolean {
  return true;
}
