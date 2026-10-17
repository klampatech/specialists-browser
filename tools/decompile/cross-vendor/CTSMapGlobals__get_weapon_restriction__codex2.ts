/**
 * CTSMapGlobals::get_weapon_restriction — Returns the current weapon
 * restriction value, lazily initializing the table via
 * `InitWeaponRestriction()` on first access.
 *
 * Calling convention: `ts_i386.so` is a Linux GCC x86-32 build, so
 * `this` is the first stack arg (recovered from `[esp+0x10]` after
 * the `push esi; push ebx; sub esp, 0x4` prologue), NOT in ECX.
 * The prologue also sets up `ebx` as the PIC/GOT base via the
 * `call +0xa; pop ebx; add ebx, off` sequence.
 *
 * @param this  CTSMapGlobals instance (untyped here for standalone
 *              compilation; full class layout lands in D.4).
 * @returns     Weapon restriction value (int-sized).
 */
export function get_weapon_restriction(this: any /* CTSMapGlobals */): number {
  // Side effect: lazily initialize the weapon restriction table.
  // Demangled as `void(void)`.
  InitWeaponRestriction();

  // Disassembly tail:
  //   esi  = [esp+0x10]              ; esi = this (1st stack arg, cdecl)
  //   edx  = [esi]                  ; edx = *this (leading dword of the
  //                                 ;   object — vtable under standard C++
  //                                 ;   ABI; possibly a state-struct pointer
  //                                 ;   here, since +0x1a0 is an odd slot)
  //   eax ^= [edx + 0x1a0]         ; XOR the slot at byte offset 0x1a0
  //                                 ;   into eax
  //   ret                           ; return eax
  //
  // Two readings of `eax` on entry to the XOR:
  //   (a) InitWeaponRestriction is genuinely `void(void)`. Under GCC a
  //       void function doesn't define eax; for any reasonable prior
  //       value (often 0) `xor eax, X` collapses to `return X`, i.e.
  //       the function is effectively
  //         `return *(int*)((char*)*(void**)this + 0x1a0)`.
  //   (b) The `__Fv` demangling is hiding an `int` return — short
  //       mangled symbols can drop the return type, and xor-with-a-
  //       data-slot is a deliberate mask. Then the result is
  //         `return init_val ^ vtable[0x1a0]`.
  //
  // The slot at +0x1a0 (offset 104 dwords into a vtable is unusual)
  // suggests `*this` may not be a plain vtable here — possibly a
  // pointer to a global state struct. Full resolution lands in D.4.
  //
  // TODO(asm-ambiguous): vtable-vs-state-struct on `*this`, and the
  //   prior `eax` value consumed by the XOR.
  return 0;
}

// Forward-declare the helper so this file compiles standalone. The
// real signature lands in the D.4 single-fn chunk for InitWeaponRestriction.
declare function InitWeaponRestriction(): void;
