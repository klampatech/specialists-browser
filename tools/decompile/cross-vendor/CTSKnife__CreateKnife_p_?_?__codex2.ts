/**
 * CTSKnife::CreateKnife — spawns a thrown-knife entity for the firing
 * player. Allocates a CTSKnife, fills in its origin / velocity /
 * classname / type from the args, then runs a virtual throw method
 * (which itself pulls a throw vector from the player when allowed).
 *
 * Effectively a static factory: `this` is unused.
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x6d9e4 (285 bytes).
 */
export function CreateKnife(
  this: any,           // CTSKnife (unused — function is a static factory).
  pPlayer: any,        // CBasePlayer*
  vecOrigin: any,      // const Vector& — spawn origin (also -> m_vecEnd).
  vecAngles: any,      // const Vector& — throw direction (-> pev->velocity).
  iType: number
): any | null {
  // 1) Allocate CTSKnife via GetClassPtr (class hint = 0).
  const pKnife: any = GetClassPtr(0);
  if (pKnife === null) return null;

  // 2) Cache iType in m_iType (offset 0xa0 in CTSKnife).
  pKnife.m_iType = iType;

  // 3) Virtual call through [pKnife + 0x60] + 0x24. This is plausibly
  //    vtable[9] (4-byte entries) of some TS-specific dispatch table
  //    on CTSKnife. Likely a CBaseEntity post-alloc init step that,
  //    among other things, sets pKnife.pev. (TODO: identify exact slot.)
  //    cdecl-style with explicit `this` push.
  const dispatch: any = (pKnife as any).m_dispatch_0x60;
  dispatch[0x24 / 4 | 0].call(pKnife);

  // 4) Set pev->classname (entvars offset 0) via the engine string
  //    table: eax = (GOT_BASE - 0x6e62b) - engineStringTable.base.
  //    The store goes through [ecx] = [pKnife + 0], which after step 3
  //    should be pKnife.pev, so [ecx] lands on pev->classname.
  //    TODO(asm-ambiguous): exact identity of [pKnife + 0] depends on
  //    the post-init CTSKnife layout.
  pKnife.pev.classname = makeStringOffset("knife");

  // 5) m_field_8c = [pPlayer + 0] + 0x208.
  //    The asm does TWO dereferences: first read [pPlayer + 0] to get
  //    a pointer, then read +0x208 from that. Treat the offset as a
  //    slot index (4-byte entries).
  //    TODO(asm-ambiguous): pointer at pPlayer + 0 is opaque (some
  //    pev/derived-class member); 0x208 is the offset of a CBasePlayer
  //    field whose identity is not yet known.
  pKnife.m_field_8c = (pPlayer[0] as any)[0x208 / 4 | 0];

  // 6) Copy vecOrigin (12 bytes / 3 dwords) into pev->origin (+0x08).
  for (let i = 0; i < 3; i++) pKnife.pev.origin[i] = vecOrigin[i];

  // 7) Sync origin to the engine.
  UTIL_SetOrigin(pKnife.pev, pKnife.pev.origin);

  // 8) Copy vecAngles (12 bytes) into pev->velocity (+0x20).
  for (let i = 0; i < 3; i++) pKnife.pev.velocity[i] = vecAngles[i];

  // 9) Copy vecOrigin (12 bytes) into m_vecEnd (offset 0x94).
  for (let i = 0; i < 3; i++) pKnife.m_vecEnd[i] = vecOrigin[i];

  // 10) Clear m_bActive (1 byte at offset 0x92).
  pKnife.m_bActive = 0;

  // 11) Branch on sv.time == pPlayer.field_0x180.
  //     The asm uses fnstsw / test ah,0x40 / jne, which fires on the
  //     FPU C3 (equal) flag — so the jump fires when the two values
  //     are EXACTLY EQUAL, not on a `>=` comparison.
  //
  //     Equal  branch: pull a throw vector from the player via its
  //                    dispatch[4] slot, then call the throw dispatch
  //                    on the knife with (knife, throwVec, 0).
  //     Unequal branch: pass the field value directly as a hint.
  //
  //     TODO(asm-ambiguous): the `==` check on a "next attack time"
  //     field is unusual; verify against real TS play behavior.
  if (sv.time === (pPlayer as any).field_0x180) {
    const throwVec: any = (pPlayer as any).m_dispatch_0x60[0x10 / 4 | 0](pPlayer);
    (pKnife as any).m_dispatch_0x60[0x14 / 4 | 0](pKnife, throwVec, 0);
  } else {
    (pKnife as any).m_dispatch_0x60[0x14 / 4 | 0](pKnife, (pPlayer as any).field_0x180, 0);
  }

  return pKnife;
}
