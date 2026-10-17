/**
 * CTSGroundAmmo::Precache — empty stub; the base class handles
 * precaching. The disassembly is a single `ret` instruction
 * (0x1 byte at 0x000928f0).
 *
 * Typed as `any` for `this` so this file compiles in isolation
 * during D.3; tighten to `CTSGroundAmmo` once that class is
 * defined in D.4.
 */
export function Precache(this: any): void {
  // no-op
}
