/**
 * CTSGun::AlternateAttack — gate the ColdCock animation/state-change on
 * two preconditions read off `this`.
 *
 * Disassembly (0x71ba8, 58 B):
 *   - Read `this` from [esp+0x10].
 *   - Gate 1: cmp [this+0xcc], 0; je epilogue  ⇒  null owning player.
 *   - Gate 2: load [this+0xd0]; cmp [[this+0xd0]+0x10], 0; jle epilogue
 *             ⇒  related count ≤ 0.
 *   - Else: call this->ColdCock().
 *
 * Stack/PIC noise (push ebx; sub esp,0x8; call-next/pop ebx/add ebx,0xf425f;
 * sub esp,0xc/push edx around the ColdCock PLT call) is irrelevant in TS
 * and is correctly omitted. The PIC base in EBX is never dereferenced in
 * the visible body, so its setup is dead code here.
 *
 * Caveat: gate 2 assumes this->field_at_0xd0 is non-null. The asm does
 * not guard the deref — if it were 0, the cmp would fault. D.4 will name
 * this field for real.
 *
 * @param this  The CTSGun entity instance. Typed as `any` so the snippet
 *              compiles in isolation; D.4 will give it a concrete type.
 */
export function AlternateAttack(this: any): void {
  // Gate 1: owning player must exist.
  // TODO(asm-ambiguous): offset 0xcc — most likely HLSDK's
  //   CBasePlayerItem::m_pPlayer, but not verified against the CTSGun header.
  if (this.m_pPlayer == null) return;

  // Gate 2: related count must be positive (`jle` ⇒ ≤ 0 fails).
  // TODO(asm-ambiguous): offset 0xd0 is a pointer; +0x10 is a dword count.
  //   Plausible: an ammo/state struct on the owning player. D.4 will name it.
  const state = this.m_pPlayerAmmoState;
  if (state.count <= 0) return;

  // Both gates passed — perform the cold-cock animation.
  this.ColdCock();
}
