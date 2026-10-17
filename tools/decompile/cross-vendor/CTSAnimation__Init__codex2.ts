/**
 * CTSAnimation::Init — initialize the CTSAnimation instance to safe defaults.
 *
 * Disassembly (90 B at 0x0005b320): 11 DWORD stores + 1 BYTE store
 * to `this`, then `ret`. No branches, no calls, no return value.
 *
 * Calling convention: cdecl-style; `[esp+0x4]` is the only stack
 * arg (`this`). No `push esi; push ebx` prologue — `this` is loaded
 * straight off the stack.
 *
 * Field layout (offsets are literal `[this+offset]` writes; names
 * are best-guess based on CTSAnimation's role and on the parallel
 * CBasePlayer offsets accessed by EnableBulletDance /
 * DisableBulletDance / BulletDance):
 *   [0x00], [0x14]  : two sequence indices; -1 is GoldSrc's "no
 *                     active sequence" sentinel.
 *   [0x04..0x10]    : small-int animation fields (timers, counters,
 *                     blend state) — zero-init on construction.
 *   [0x18]          : gait-style enum; default 1.
 *   [0x1dc..0x1e8]  : BulletDance state block on `this`. Same
 *                     offset range as CBasePlayer's BulletDance
 *                     fields. Zero on construction; EnableBulletDance
 *                     seeds the nonzero values at runtime.
 */
export function Init(this: any): void {
  // Sequence indices.
  this.m_iSequenceA = -1; // [this+0x00] — TODO(asm-inferred-name)
  this.m_iSequenceB = -1; // [this+0x14] — TODO(asm-inferred-name)

  // Small-int animation state fields.
  this.m_iField04 = 0; // [this+0x04] — TODO
  this.m_iField08 = 0; // [this+0x08] — TODO
  this.m_iField0c = 0; // [this+0x0c] — TODO
  this.m_iField10 = 0; // [this+0x10] — TODO

  // Default gait style.
  this.m_iGait = 1; // [this+0x18] — TODO(asm-inferred-name)

  // BulletDance state block on `this`. DWORD width is proven by
  // Init; the float interpretation comes from EnableBulletDance
  // and is unconfirmed as of this function.
  this.m_dwField1dc = 0; // [this+0x1dc] — TODO: float? see EnableBulletDance
  this.m_dwField1e0 = 0; // [this+0x1e0] — TODO: float? see EnableBulletDance
  this.m_dwField1e4 = 0; // [this+0x1e4] — TODO

  // ⚠ 1-byte store. Do NOT widen this to a DWORD write — it would
  // clobber [this+0x1e9..0x1ec].
  this.m_bField1e8 = 0; // [this+0x1e8] — TODO(asm-inferred-name), BYTE
}
