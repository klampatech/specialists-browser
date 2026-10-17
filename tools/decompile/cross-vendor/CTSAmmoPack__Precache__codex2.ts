/**
 * CTSAmmoPack::Precache — no-op override of the engine's
 * `Precache()` virtual slot.
 *
 * The compiler emitted a one-byte stub (a single `ret`
 * instruction at 0x91540), so the override intentionally
 * has no body. Asset precache for ammo packs is handled
 * by the parent class or is unnecessary because the ammo
 * pack reuses assets already cached at Spawn() time.
 */
export function Precache(this: any): void {
  // Intentionally empty: the disassembly is one byte (`ret`).
}
