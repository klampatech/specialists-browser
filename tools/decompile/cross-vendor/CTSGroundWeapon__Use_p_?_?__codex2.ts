/**
 * CTSGroundWeapon::Use — forward a "use" event through the activator's
 * dispatch table at offset 0x60.
 *
 * The TS override's signature is `(CBaseEntity*, USE_TYPE, float)`,
 * which differs from the standard HLSDK `CBaseEntity::Use` 4-arg virtual.
 * The body reads only the first two args from the stack and forwards them
 * to an indirect call; `flValue` is accepted to match the demangled
 * signature but is intentionally not forwarded.
 *
 * @param this       The CTSGroundWeapon entity instance (the ground weapon)
 * @param pActivator The entity using / picking up this weapon
 * @param useType    USE_TYPE describing how the weapon is being used
 * @param flValue    Float value paired with the use event (unused)
 * @returns          void
 */
export function Use(
  this: any,
  pActivator: any,
  useType: any,
  flValue: number
): void {
  // ASM (thiscall, 3 explicit args):
  //   sub esp, 0x14         ; 20-byte local frame
  //   mov eax, [esp+0x18]   ; eax = pActivator  (arg0, [esp+0x18])
  //   mov edx, [eax+0x60]   ; edx = pActivator->dispatchTable (TS-specific)
  //   push [esp+0x1c]       ; push useType      (arg1, [esp+0x1c])
  //   push eax              ; push pActivator
  //   call [edx+0x118]      ; dispatch(pActivator, useType)
  //   add esp, 0x1c         ; 0x14 (locals) + 0x08 (2 pushed args)
  //   ret
  //
  // `this` (CTSGroundWeapon*) sits in ECX at the call site but is NOT
  // used as `this` of the indirect dispatch — ECX is preserved untouched
  // across the call. So this is a static / free-function indirect call,
  // not a virtual dispatch through a vtable.

  // TODO(asm-ambiguous): CBaseEntity+0x60 is not the standard vtable
  //   slot (single-inheritance classes keep the vtable at offset 0). It
  //   may be a TS-specific dispatch table, a pev-style engine-interface
  //   pointer, or a hidden base subobject.
  // TODO(asm-ambiguous): Identify the function at dispatchTable[0x118].
  //   The 2-arg cdecl layout forces the target's signature to
  //   `(CBaseEntity*, USE_TYPE) -> void` — likely a TS-specific use
  //   fan-out, not a virtual Use override.
  // TODO: Re-type `this`, `pActivator`, `useType` to their real types
  //   once CTSGroundWeapon / CBaseEntity / USE_TYPE are defined in D.4.

  void flValue;
  const dispatchTable = (pActivator as any)[0x60] as Record<
    number,
    (a: any, u: any) => void
  >;
  dispatchTable[0x118](pActivator, useType);
}
