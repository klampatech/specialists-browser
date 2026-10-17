/**
 * CTSWorldGun::Use — invoked when a player touches / triggers a world-spawned
 * weapon entity. The C++ signature accepts a `float flValue` for compatibility
 * with `CBaseEntity::Use`, but this override drops it: `flValue` is not
 * forwarded to GetWeapon, and GetWeapon itself doesn't take a float.
 *
 * Demangled:    CTSWorldGun::Use(CBaseEntity *p, USE_TYPE useType, float flValue)
 * Address:      0x00091158  Size: 0x40 (64 bytes)
 * External:     GetWeapon__11CTSWorldGunP11CBaseEntity@plt @ 0x00059f90
 * External:     PIC/GOT base in ebx (call/pop/add at 0x9115c..0x91162)
 *
 * Logic: only grant the weapon when the global game time has advanced past
 * a per-activator cooldown timestamp stored at `[p + 0xcc]`. When it has,
 * delegate to `GetWeapon(pActivator, useType)`.
 */
export function Use(
  this: CTSWorldGun,
  p: any, // TODO(asm-ambiguous): CBaseEntity — not yet defined
  useType: any, // TODO(asm-ambiguous): USE_TYPE enum — not yet defined
  flValue: number, // accepted by signature; intentionally NOT forwarded
): void {
  // PIC/GOT base in ebx, computed via call/pop/add at 0x9115c..0x91162.
  // [ebx + 0x1600] → ptr → ptr → float. Most plausibly gpGlobals->time, but
  // the indirection depth needs a CBaseEntity/engineglobals header to confirm.
  // TODO(asm-ambiguous): identity of the [ebx+0x1600] global chain
  const globalTime: number =
    (((globalBase as any) + 0x1600) as any)[0][0] as number;

  // [p + 0xcc] is a float on the activator — likely a pickup-cooldown
  // timestamp (e.g. `m_flLastUseTime` or `m_flNextPickupTime`).
  // TODO(asm-ambiguous): offset 0xcc on CBaseEntity; needs class layout
  const activatorCooldown: number = (p as any)[0xcc] as number;

  // FPU compare via fcomp + fnstsw + test ah,0x41 + jne at 0x91176..0x91181.
  // Falls through to the call only when ST(0) > [p+0xcc]; otherwise jumps
  // to 0x91193 (epilogue: add esp,0x8 / pop ebx / ret).
  if (globalTime > activatorCooldown) {
    // Call-site args verified from disassembly:
    //   0x91183: sub esp, 0x8              ; cdecl spill / stack alignment
    //   0x91186: push DWORD PTR [esp+0x1c] ; useType (was [esp+0x8] pre-prologue)
    //   0x9118a: push edx                  ; p (= edx, loaded at 0x91168)
    //   0x9118b: call GetWeapon@plt
    //   0x91190: add esp, 0x10              ; cdecl: 8 (spill) + 4 + 4 (args)
    //
    // `flValue` is NOT pushed. The empty 8 bytes of `sub esp,0x8` are not
    // a hidden 3rd-arg slot — they're stack alignment for the cdecl call.
    GetWeapon.call(this, p, useType);
  }
}
