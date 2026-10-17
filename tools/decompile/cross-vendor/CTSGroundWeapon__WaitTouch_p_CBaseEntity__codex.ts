```typescript
/**
 * CTSGroundWeapon::WaitTouch — touch handler that conditionally
 * dispatches a virtual method when the ground weapon's state
 * discriminator matches.
 *
 * Decompiled from disassembly @ 0x000926cc (40 bytes). The TS DLL is
 * built with GCC/i386 cdecl, so `this` is passed on the stack as the
 * first slot rather than in ECX; after the 12-byte local frame, `this`
 * sits at [esp+0x10] and `pOther` at [esp+0x14]. After the secondary
 * 8-byte alignment sub, `pOther` is reachable at [esp+0x1c].
 *
 * Behavior:
 *   1. Test this->field_0xa4 against 0x1d (29). If it does not match,
 *      return without doing anything.
 *   2. Load the callable table pointer at this->field_0x60.
 *   3. Push (pOther, this) and indirect-call through the function
 *      pointer at table offset 0x118.
 *
 * @param this    The CTSGroundWeapon instance (this in C++)
 * @param pOther  The CBaseEntity that touched the weapon
 * @returns void
 */
export function WaitTouch(this: CTSGroundWeapon, pOther: CBaseEntity): void {
  // State discriminator must equal 0x1d (29) for the dispatch to fire.
  if (this.field_0xa4 !== 0x1d) {
    return;
  }

  // TODO(asm-ambiguous): confirm field_0x60 against the TS source —
  // CBaseEntity's vtable is normally at offset 0, so 0x60 is either a
  // secondary dispatch table or a field-specific in this class.
  const callable = this.field_0x60;

  // The original disassembly pushes two args before the call:
  //   push [esp+0x1c]   ; = pOther
  //   push edx          ; = this (already loaded into edx)
  // so the callee receives this as its receiver and pOther as the
  // single argument. vtable slot index = 0x118 / 4 = 0x46.
  callable.virtualMethodAt_0x118(pOther);
}
```
