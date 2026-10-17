```typescript
// TODO: CTSAmmoPack, Vector, VEC_AMMO_MIN/MAX, GLOBAL_1/2, UTIL_SetOrigin,
// and UTIL_SetSize are defined elsewhere — minimal `any` placeholders
// below so this file compiles in isolation. Real class layout is a
// separate D.4 task.

type CTSAmmoPack = any;
type Vector = { x: number; y: number; z: number };

declare const VEC_AMMO_MIN: Vector;
declare const VEC_AMMO_MAX: Vector;
declare const GLOBAL_1: number; // [ebx+0x1554] in the disassembly
declare const GLOBAL_2: number; // [ebx+0x1e08] in the disassembly

declare function UTIL_SetOrigin(pev: any, origin: Vector): void;
declare function UTIL_SetSize(pev: any, mins: Vector, maxs: Vector): void;

/**
 * CTSAmmoPack::OnGround — called when the ammo pack has come to rest
 * on the ground. Stops the pack's fall/bounce, re-snaps the origin,
 * fixes the bounding box to its resting size, and resets local
 * motion state.
 *
 * @param this  The CTSAmmoPack entity instance (this in the original C++)
 * @returns     void
 */
export function OnGround(this: CTSAmmoPack): void {
  const pev = this.pev;

  // Clear a pev visual/state field, then mark the entity as on-ground.
  // The value 1 at offset 0x10c strongly suggests an on-ground flag
  // (HL1's FL_ONGROUND / pev->onground is value 1).
  // TODO(asm-ambiguous): the offsets 0x198 and 0x10c are guesses at
  // pev field positions — confirm against the TS server SDK entvars.
  pev.field0x198 = 0;
  pev.field0x10c = 1;

  // Re-commit the current origin to the world. In HL1, pev->origin
  // changes only become visible after an explicit UTIL_SetOrigin call.
  // The 2nd arg is &pev->origin (pev + 8) — i.e., re-snap to whatever
  // origin the engine already computed for the ground contact.
  UTIL_SetOrigin(pev, pev.origin);

  // Set the resting bounding box. mins = (M, M, M) from one global,
  // maxs = (X, X, Z) from two more globals. For a typical TS ammo
  // box these resolve to (0, 0, 0) and (16, 16, 16).
  // TODO(asm-ambiguous): the three constants come from separate GOT
  // entries — confirm against the TS rodata and the constant dump
  // in `tools/decompile/analysis/strings-n5.txt`.
  UTIL_SetSize(pev, VEC_AMMO_MIN, VEC_AMMO_MAX);

  // Reset 4 dwords of local motion state on the class.
  // TODO(asm-ambiguous): the offsets 0xc, 0x10, 0x14, 0x18 on `this`
  // and the literal 0xffff0000 (not a normal float — likely a packed
  // short pair or a 32-bit int sentinel) need the CTSAmmoPack class
  // layout to disambiguate. Best read: clearing two custom 3D
  // vectors (likely velocity + avelocity), with the Y components
  // pulled from globals [ebx+0x1554] and [ebx+0x1e08].
  this.field0x0c = 0xffff0000;
  this.field0x10 = GLOBAL_1;
  this.field0x14 = 0xffff0000;
  this.field0x18 = GLOBAL_2;
}
```
