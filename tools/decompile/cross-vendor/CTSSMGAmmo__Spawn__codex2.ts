// Stubs so this file compiles in isolation; replaced by real// definitions in D.4 (CTSAmmo / CTSGroundAmmo layout pass) and
// D.5 (engine↔mod binding pass).
declare class CTSSMGAmmo {}
declare class CTSGroundAmmo {
  static Spawn(self: CTSSMGAmmo): void;
}
declare function getAmmoInfo(id: number): {
  /** Engine ammo registry's `+0xc` field. Inferred as `maxCarry`
   *  from the "halved to make a give amount" usage; TODO(D.4) to
   *  confirm against the TS ammo-info struct layout. */
  readonly maxCarry: number;
};

/**
 * CTSSMGAmmo::Spawn — initialise the SMG ammo pickup entity.
 *
 * Calls up to the parent CTSGroundAmmo::Spawn for base setup, then
 * writes the per-ammo "give amount" fields for the four ammo types
 * this pickup grants. Each give amount is `getAmmoInfo(id)[+0xc] / 2`
 * — the compiler's signed-div-by-2 bit trick
 * `((x + (x >> 31)) >> 1)`, which rounds toward negative infinity
 * (floor) but is identical to truncation for non-negative inputs.
 *
 * Ammo-id → field-offset order from the asm: 2 → 0x70, 1 → 0x6c,
 * 7 → 0x84, 12 → 0x98. Destination-field names depend on the
 * CTSAmmo / CTSGroundAmmo class layout (D.4 task).
 */
export function Spawn(this: CTSSMGAmmo): void {
  // Parent class setup — tail-called in the asm (`sub esp,0xc;
  // push esi; call CTSGroundAmmo::Spawn@plt`).
  CTSGroundAmmo.Spawn(this);

  // Four copies of: load ammo-info[id].maxCarry, halve it (signed
  // div-by-2 via `>> 1` — see header), store to this.field_*.
  // TODO(asm-ambiguous): replace `field_0xNN` with `m_iGiveAmountN`
  //   family names once the CTSGroundAmmo layout is documented (D.4).
  (this as any)["field_0x70"] = getAmmoInfo(2).maxCarry >> 1; // SMG primary
  (this as any)["field_0x6c"] = getAmmoInfo(1).maxCarry >> 1;
  (this as any)["field_0x84"] = getAmmoInfo(7).maxCarry >> 1;
  (this as any)["field_0x98"] = getAmmoInfo(12).maxCarry >> 1;
}
