/**
 * CTSWorldGun::WaitTouch — pickup-wait touch handler for
 * world-placed guns. Fires GetWeapon when the gun is in a
 * sentinel "ready / match-any" state, or when the touching
 * entity carries a TS-specific pev flag.
 *
 * Demangled : CTSWorldGun::WaitTouch(CBaseEntity*)
 * Compiled to: WaitTouch__11CTSWorldGunP11CBaseEntity
 *              at 0x00091250 (62 bytes)
 * Calling   : cdecl / thiscall (caller pushes this + pOther)
 *
 * @param this    The CTSWorldGun instance (world-placed gun).
 * @param pOther  The entity that just touched this gun.
 */
export function WaitTouch(this: any, pOther: any): void {
  // cmp DWORD [this+0x88], 0x1d; je GetWeapon
  //   — TS-specific sentinel field on the *derived*
  //     CTSWorldGun layout; 0x88 is past stock CBaseEntity
  //     size, 0x1d is a TS enum value.
  // TODO(asm-ambiguous): confirm against TS source — likely a
  //   STATE_READY / "match-any weapon" wildcard enum.
  const selfReadyOrMatchAny: boolean = this.field_0x88 === 0x1d;

  // mov eax, [pOther]; test BYTE PTR [eax+0x180], 0x20; je skip
  //   — `pOther[0]` is `pev` (MSVC CBaseEntity offset 0).
  //     byte at pev+0x180 is past stock entvars_t end (~0x110),
  //     so it lives in the TS-extended entvars region.
  // TODO(asm-ambiguous): confirm against TS-extended entvars —
  //   probably a "valid-toucher / carrying / not-dead" bit.
  // TODO(port): when this lands in the Babylon/WASM build,
  //   replace with `memory.readUint8(pOther.pev + 0x180)`.
  //   The current form treats pev as a buffer base, which is
  //   wrong in absolute-address terms.
  const pevByteAt0x180: number = (pOther.pev as Uint8Array)[0x180];
  const otherFlagBit: boolean = (pevByteAt0x180 & 0x20) !== 0;

  if (selfReadyOrMatchAny || otherFlagBit) {
    // sub esp,0x8; push edx; push ecx; call GetWeapon@plt;
    // add esp,0x10
    //   — non-virtual PLT dispatch at 0x00091198 (verified via
    //   the @plt suffix and the static symbol address).
    this.GetWeapon(pOther);
  }
  // Implicit ret. Frame teardown elided (push ebx; sub esp,0x8;
  //   pop ebx; add esp,0x8) is pure ABI/mechanics. The PIC thunk
  //   at entry (call next; pop ebx; add ebx,GOT) is also elided
  //   — the function body makes no [ebx+offset] accesses, so the
  //   computed GOT base is unused.
}
