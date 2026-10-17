// Stub: CTSGun is the decompiled TS gameplay entity (full class lands in D.4).
type CTSGun = any;

// HolsterWeapon is also __thiscall on CTSGun (see HolsterWeapon__6CTSGun@plt).
// The ECX `this` is forwarded implicitly by both the disassembly and TS's
// `.call(this, …)` binding.
declare function HolsterWeapon(this: CTSGun, arg1: number): void;

/**
 * CTSGun::Holster — single-call forwarder to HolsterWeapon.
 *
 * Disassembly: PIC/GOT-base prologue (compiler-emitted for the translation
 * unit; no globals are actually read in this body) → push [esp+0x1c]
 * (the first explicit stack arg, since `this` lives in ECX under
 * __thiscall) → call HolsterWeapon@plt → stack teardown → ret.
 *
 * @param this  CTSGun instance (ECX under __thiscall)
 * @param arg1  Holster context (slot index / animation type), forwarded verbatim
 */
export function Holster(this: CTSGun, arg1: number): void {
  HolsterWeapon.call(this, arg1);
}
