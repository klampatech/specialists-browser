/**
 * CTSKnifeWeapon::Spawn — initializes the knife weapon entity.
 *
 * Disassembly trace (b9de4..b9e19):
 *   1. PIC prologue: call $+5 / pop ebx / add ebx, 0xac022
 *      → ebx = 0x165ed10 (module GOT base).  ebx is never
 *      dereferenced in this body, so the prologue is elided.
 *   2. esi = [esp+0x10] = this     (single arg, void return)
 *   3. eax = [esi+0x60]            ; sub-object pointer
 *   4. push esi; call [eax+0x11c]  ; indirect vtable dispatch
 *      with `this` as the only arg. The vtable slot is at byte
 *      0x11c = vtable slot 71 (32-bit). Slot name `GetWeapon`
 *      is inferred (sister method `CTSKnifeWeapon::GetWeapon`
 *      uses the same 0x11c dispatch on pEntity).
 *   5. [esi+0xa4] = eax            ; cache the matching weapon
 *   6. [esp] = esi; call Spawn__15CTSGroundWeapon@plt(this)
 *
 * Field offsets (ASM-INFERRED, see class layout note below):
 *   this->+0x60   named `m_pPlayer` here    — a CBaseEntity* used
 *                  as the vtable holder for the dispatch in step 4.
 *   this->+0xa4   named `m_pKnife` here     — caches the return
 *                  value of step 4.
 *
 * Layout cross-check: HANDOFF.md pins `m_pPlayer` at +0x80 for
 * CTSGun (same inheritance chain). The +0x60 offset here is
 * therefore suspect — the field might be `m_pResolved` or some
 * other intermediate sub-object. Re-verify against the
 * CTSKnifeWeapon class layout dump when available.
 */

// --- Type stubs so this file compiles in isolation ----------------
// Replace with the real class declarations in D.4 / `weapons.ts`.
class CTSKnifeWeapon {
  // ASM-INFERRED field names (TODO(asm-inferred)):
  m_pPlayer: any;   // [this+0x60]  — sub-object used as vtable holder
  m_pKnife: any;    // [this+0xa4]  — cached matching knife weapon

  // Virtual slot [m_pPlayer + 0x11c] is inferred to be GetWeapon.
  // TODO(asm-inferred): confirm against a CBasePlayer vtable dump.
  GetWeapon(self: any): any;
}

declare const CTSGroundWeapon: {
  Spawn: (self: any) => void;
};
// -----------------------------------------------------------------

export function Spawn(this: CTSKnifeWeapon): void {
  // PIC prologue elided (ebx never dereferenced in this body).

  // [b9dfc..b9dff]  load this->m_pPlayer and push `this` as the
  //                  single argument to the vfn.
  const owner = this.m_pPlayer;

  // [b9e00..b9e06]  indirect dispatch on owner's vtable slot 71,
  //                  cache the returned matching weapon on `this`.
  //
  // TODO(asm-ambiguous): the disassembler omits `mov ecx, eax` for
  //                      the `this` of this vfn; the `__thiscall`
  //                      convention requires it in the binary.
  const matchingKnife = owner.GetWeapon(this);
  this.m_pKnife = matchingKnife;

  // [b9e0c..b9e0f]  delegate to CTSGroundWeapon::Spawn.
  //                  Parent is pinned by the @plt symbol
  //                  `Spawn__15CTSGroundWeapon@plt`.
  CTSGroundWeapon.Spawn(this);
}
