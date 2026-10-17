/**
 * CTSPhysicObject::Precache — no-op.
 *
 * The compiled body is a single `ret` (1 byte at 0x6babc per the
 * disassembly chunk). This entity has no static resources to precache;
 * any content it needs is loaded at runtime or by its owning entity.
 * The no-op function is retained for skeleton fidelity with the
 * original C++ class shape.
 */
export function Precache(this: any): void {
  // intentionally empty
}
