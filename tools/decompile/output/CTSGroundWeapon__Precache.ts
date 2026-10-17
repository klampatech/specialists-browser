/**
 * CTSGroundWeapon::Precache — no-op virtual override.
 *
 * The disassembly is a single `ret` instruction (function size = 1
 * byte at 0x00091cd4), so the function body is empty in the
 * original binary. CTSGroundWeapon does not own any precacheable
 * assets: it is a ground-spawned weapon pickup, and the actual
 * weapon model / sounds / sprites are precached by the CTSWeapon
 * entity that is created when a player picks the ground weapon up
 * (see CTSGroundWeapon::GetWeapon). This override is explicitly
 * provided as a no-op to suppress base-class precache behavior.
 *
 * @returns void
 */
export function Precache(this: any): void {
  // Intentionally empty. The original binary contains only:
  //   91cd4: ret
  // The base CBaseEntity::Precache is virtual; this override is
  // present in the vtable but does no work. Precacheable assets
  // belong to the CTSWeapon entity spawned on pickup.
}
