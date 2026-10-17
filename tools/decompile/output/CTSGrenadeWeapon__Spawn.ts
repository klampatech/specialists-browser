/**
 * CTSGrenadeWeapon::Spawn — initialize the grenade weapon entity by
 * stamping the grenade's engine-facing weapon id (0x18 / 24) into the
 * id slot at entity offset 0xa4, then delegating the rest of the spawn
 * work to the parent CTSGroundWeapon::Spawn routine.
 *
 * @param this  The CTSGrenadeWeapon entity instance (this in C++)
 * @returns     void
 */
export function Spawn(this: CTSGrenadeWeapon): void {
  // Engine-facing weapon id. Offset 0xa4 is the standard weapon-id slot
  // inherited from the Half-Life weapon entity layout; TS uses 0x18 (24)
  // to identify grenade pickups.
  // TODO: confirm exact field name once the CTSGrenadeWeapon class layout
  // is reconstructed (the disassembly only proves "int at +0xa4 = 0x18").
  this.weaponId = 0x18;

  // Hand off remaining spawn work (ammo defaults, pickup body setup,
  // touch/sound wiring, etc.) to the parent class.
  (this as unknown as CTSGroundWeapon).Spawn();
}

// --- Minimal type stubs so this file compiles in isolation. -----------

interface CTSGrenadeWeapon {
  /** Engine-facing weapon id; entity offset 0xa4. 0x18 (24) for grenades. */
  weaponId: number;
}

interface CTSGroundWeapon {
  Spawn(): void;
}