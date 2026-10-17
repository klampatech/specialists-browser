// External dependencies (declare locally if you want strict in-isolation compilation)
type CTSShotgunAmmo = { ammoCount: number };

declare class CTSGroundAmmo {
  static spawn(self: CTSShotgunAmmo): void;
}

declare function getAmmoInfo(ammoType: number): {
  // TODO(asm-ambiguous): confirm "maxCarry" vs "max" from TS ammo-info struct
  maxCarry: number;
};

/**
 * CTSShotgunAmmo::Spawn — Initializes a shotgun-shell ammo pickup entity.
 * Forwards to CTSGroundAmmo::Spawn for shared ground-ammo setup, then sets
 * this pickup's ammo count to half the shotgun-shell carry maximum.
 *
 * Disassembly: `tools/decompile/chunks/Spawn__14CTSShotgunAmmo.chunk.md`
 *   - Calls CTSGroundAmmo::Spawn via PLT.
 *   - Calls get_ammo_info(3), reads field at offset 0xc (max carry).
 *   - Stores (max/2) to `this` field at offset 0x74 (ammo count).
 */
export function Spawn(this: CTSShotgunAmmo): void {
  CTSGroundAmmo.spawn(this);
  const info = getAmmoInfo(3);
  this.ammoCount = Math.trunc(info.maxCarry / 2); // offset 0x74 = ammoCount
}
