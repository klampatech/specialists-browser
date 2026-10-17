/**
 * CTSSniperAmmo::Spawn — Spawns a sniper-rifle ammo pickup entity.
 *
 * Forwards to CTSGroundAmmo::Spawn() to set up the standard
 * ground-ammo properties (model, sounds, pickup bounds), then
 * sets two per-pickup give amounts by halving the cached
 * ammo-info struct's field at +0xc:
 *
 *     ammo id 0x8  →  this[ +0x88 ]   (primary   sniper ammo give)
 *     ammo id 0xd  →  this[ +0x9c ]   (secondary sniper ammo give)
 *
 * The shr/add/sar sequence at 0xb94d5–0xb94dc is the MSVC
 * "signed divide by 2, round-toward-zero" idiom; Math.trunc(x / 2)
 * is exactly equivalent for integer x. The ammo-id ↦ offset
 * bindings above are placeholders — D.4 (TS-specific gameplay)
 * will verify the field names against the actual class layout in
 * `tools/decompile/headers/`.
 *
 * @param this  The CTSSniperAmmo entity instance
 * @returns     void
 */

// ---- Stubs so this file compiles in isolation ----------------------
// Real definitions land in D.4 from `tools/decompile/headers/`.
type CTSSniperAmmo = any;
declare const CTSGroundAmmo: { Spawn(self: any): void };
declare function get_ammo_info(ammoId: number): { readonly maxCarry: number };

export function Spawn(this: CTSSniperAmmo): void {
  // Parent class Spawn — sets model, sounds, pickup bounds.
  CTSGroundAmmo.Spawn(this);

  // Primary sniper ammo (id 0x8): give half the cached max carry.
  // TODO(asm-ambiguous): confirm +0xc in ammo_info_t is the
  // max-carry field, and +0x88 in CTSSniperAmmo is the primary-ammo
  // give count (vs. some other related field).
  this.primaryGive = Math.trunc(get_ammo_info(8).maxCarry / 2);

  // Secondary sniper ammo (id 0xd): give half the cached max carry.
  // TODO(asm-ambiguous): confirm +0x9c in CTSSniperAmmo is the
  // secondary-ammo give count (vs. some other related field).
  this.secondaryGive = Math.trunc(get_ammo_info(0xd).maxCarry / 2);
}
