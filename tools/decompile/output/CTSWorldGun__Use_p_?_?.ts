/**
 * CTSWorldGun::Use — invoked when a world-spawned weapon entity is
 * "used" (touched or triggered). Reads a global time reference via
 * the PIC/GOT base, compares it to a float field on the activator,
 * and only delegates to GetWeapon to grant the weapon when the
 * global time has advanced past the activator's stored timestamp.
 *
 * @param this       The CTSWorldGun world-weapon entity instance
 * @param p          Activator (the entity trying to pick up the
 *                   weapon)
 * @param useType    USE_TYPE describing how the weapon was
 *                   triggered
 * @param flValue    Float value (inherited from CBaseEntity::Use;
 *                   this override does not reference it)
 */
export function Use(
  this: CTSWorldGun,
  p: any, // TODO: CBaseEntity (not yet defined)
  useType: any, // TODO: USE_TYPE enum (not yet defined)
  flValue: number,
): void {
  // PIC/GOT base in ebx (computed via the call/pop/add pattern at
  // function start). [ebx + 0x1600] is a global pointer; the
  // disassembly then loads [eax] twice more to reach a float —
  // most plausibly gpGlobals->time via a wrapper struct.
  // TODO(asm-ambiguous): identity of the global chain at
  // [ebx+0x1600]
  const _globalPointerAt0x1600: any = 0; // placeholder for the
                                         // PIC global
  const globalTime: number =
    _globalPointerAt0x1600.deref.deref as number;

  // [p + 0xcc] is a float field on the activator — most plausibly
  // a "next pickup time" / cooldown timestamp the activator  // carries.
  // TODO(asm-ambiguous): offset 0xcc meaning unclear without
  // CBaseEntity field layout
  const activatorCooldownTime: number =
    (p as any)[0xcc] as number;

  // The disassembly does
  //   fcomp [p+0xcc]   ; ST(0) = global time, compare against [p+0xcc]
  //   fnstsw ax ; ax = FPU status word
  //   test   ah, 0x41  ; test C0 (bit 0 of AH) and C3 (bit 6 of AH)
  //   jne    91193     ; skip the call if C0 OR C3 set
  // so the call only fires when ST(0) > [p+0xcc] (strict greater,
  // NaN excluded — both FPU and TS `>` agree on NaN behavior).
  if (globalTime > activatorCooldownTime) {
    // The disassembly pushes two stack args before the call:
    //   sub esp, 0x8    //   push [esp+0x1c]  ; = useType (after the second sub:
    //                     ; [esp+0x18]=p, [esp+0x1c]=useType,
    //                     ; [esp+0x20]=flValue)
    //   push edx          ; = p
    //   call GetWeapon
    //   add esp, 0x10    ; clean up sub + 2 pushes
    //
    // The demangled GetWeapon symbol only shows (CBaseEntity*), so
    // useType may be ignored by the callee, but the compiler still
    // emits the push. Forward useType faithfully; do NOT pass
    // flValue (it's at [esp+0x20], never referenced here).
    // TODO(asm-ambiguous): confirm whether GetWeapon actually
    // reads useType, or whether the push is dead
    GetWeapon.call(this, p, useType);
  }
  // flValue is intentionally dropped — neither the comparison nor
  // the GetWeapon call reference it. (It's still in the signature
  // because CBaseEntity::Use requires it.)
}
