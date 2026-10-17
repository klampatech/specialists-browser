/**
 * CTSKnifeWeapon::Spawn
 *
 * Disassembly summary (from tools/decompile/chunks/Spawn__14CTSKnifeWeapon.chunk.md):
 *   esi = this                                           // [esp+0x10]
 *   eax = this->m_pPlayer                                // [esi + 0x60]
 *   push this; call [eax + 0x11c]                        // virtual on owner
 *   this->m_pKnife = eax                                 // [esi + 0xa4]
 *   push this; call Spawn__15CTSGroundWeapon@plt         // parent Spawn
 *   add esp, 0x14; pop ebx/esi; ret
 *
 *   Prologue sets up EBX as a PIC/GOT base (call $+5; pop ebx;
 *   add ebx, 0xac022) but never dereferences it in this body,
 *   so it is elided in TS.
 */
export function Spawn(this: CTSKnifeWeapon): void {
  // ---- 1. Resolve the owner's knife (their inventory slot for this knife class) ----
  const owner = this.m_pPlayer;
  // m_pPlayer is a CBasePlayer. vtable slot index 0x11c/4 == 71.
  // TODO(asm-ambiguous): the assembly calls an unnamed virtual at
  // vtable[71] of the owner with (this : CBaseEntity*). The slot
  // is INFERRED to be `CBasePlayer::GetWeapon(CBaseEntity*)` from
  // HLSDK + the sibling symbol's signature, NOT from the assembly
  // itself. The sibling `GetWeapon__14CTSKnifeWeaponP11CBaseEntity`
  // is a *different* method (CTSKnifeWeapon's own override, same
  // name + signature, on a different class) and is not what's
  // being called here.
  const matchingKnife = owner.GetWeapon(this);

  // ---- 2. Cache the resolved knife on this ground entity ----
  this.m_pKnife = matchingKnife;

  // ---- 3. Delegate standard ground-weapon spawn to the parent ----
  // PLT-resolved (non-virtual) call to CTSGroundWeapon::Spawn
  // with `this` as the sole argument.
  CTSGroundWeapon.Spawn(this);
}
