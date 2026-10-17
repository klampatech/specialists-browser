/**
 * CTSBigPistolWeapon::Spawn — spawns the big-pistol weapon entity.
 * Resolves the weapon ID via an indirect call through a function
 * pointer inside the owning player, stores the result in m_iId, then
 * chains to the parent CTSGroundWeapon::Spawn.
 *
 * @param this  The CTSBigPistolWeapon instance (implicit `this` in C++).
 */
export function Spawn(this: any): void {
  // Disassembly sequence (0xb9c98):
  //   1. eax = this->field_0x60          ; load owning player pointer
  //   2. push esi                        ; arg = this (the weapon)
  //      call [eax+0x11c]                ; indirect call through a
  //                                       ;   function-pointer member
  //                                       ;   at player+0x11c
  //   3. this->field_0xa4 = eax          ; store resolved weapon ID
  //   4. call Spawn__15CTSGroundWeapon@plt ; static chain to parent
  //
  // TODO(inferred): field names m_pPlayer (0x60) and m_iId (0xa4) are
  //   guessed from HLSDK conventions. To be confirmed against the
  //   CTSBigPistolWeapon class layout in D.4.
  // TODO(asm-ambiguous): player+0x11c — is this a direct function-pointer
  //   member, or a vtable dispatch where the player stores its vptr at
  //   offset 0x11c rather than 0 (slot 0x47)? The disassembly does NOT
  //   load a vptr before reading it, so the most faithful reading is
  //   "direct function-pointer member". Revisit after CBasePlayer's
  //   layout is known.
  // TODO(types): CTSBigPistolWeapon / CTSGroundWeapon / m_pPlayer /
  //   m_iId will be defined in D.4. Local `any` aliases below keep this
  //   snippet compiling in isolation.

  const player: any = (this as any).m_pPlayer;
  const resolveWeaponId: (weapon: any) => number =
    (player as any).f0x11c /* function pointer at player+0x11c */;

  (this as any).m_iId = resolveWeaponId(this);

  // PLT-resolved (not vtable), so a direct static call — not super().
  (CTSGroundWeapon as any).Spawn(this);
}

// Local `any` aliases so this snippet compiles without the D.4 type
// definitions. Delete these declarations once CTSBigPistolWeapon /
// CTSGroundWeapon exist as real types.
declare const CTSBigPistolWeapon: any;
declare const CTSGroundWeapon: any;
