```typescript
// TODO(decompile): CTSGun class not yet decompiled; stubbed here so this
// file stands alone. The real interface comes from the D.4 task.
type CTSGun = any;

// TODO(decompile): HolsterWeapon signature inferred from this assembly;
// verify against the actual HolsterWeapon disassembly chunk.
declare function HolsterWeapon(arg1: number): void;

/**
 * CTSGun::Holster — thin wrapper that forwards the holster command to
 * HolsterWeapon. The compiler emits a PIC/GOT-base prologue even though
 * no globals are read in this body; the setup is hoisted for HolsterWeapon.
 *
 * @param this  The CTSGun entity instance (implicit in __thiscall; lives in ECX)
 * @param arg1  Holster context argument (slot index, animation type, etc.)
 * @returns     void
 */
export function Holster(this: CTSGun, arg1: number): void {
  // TODO(asm-ambiguous): [esp+0x1c] is the first explicit stack arg under
  // __thiscall. If the caller uses __cdecl-style explicit-this push instead,
  // this slot would hold `this`. Most likely `arg1` given the demangled
  // signature and standard MSVC convention.
  HolsterWeapon(arg1);
}
```
