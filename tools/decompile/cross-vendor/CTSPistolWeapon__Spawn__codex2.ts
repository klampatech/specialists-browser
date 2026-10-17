// --- Minimal forward decls so this compiles in isolation. ---
type EdictLike = any;
type CTSPistolWeapon = any;

/**
 * CTSPistolWeapon::Spawn — resolve the owning player's pistol variant
 * (via an indirect dispatch the disassembly doesn't name), store it on
 * the weapon, then delegate placement to CTSGroundWeapon::Spawn.
 *
 * Disassembly map (address 0x000b9ae0, 54 bytes):
 *   [esi+0x60]          -> this->field_at_0x60  (likely owner/player ptr)
 *   call [eax+0x11c]    -> owner->vtable_slot_0x11c(this)
 *   [esi+0xa4]          -> this->field_at_0xa4  (written with that return)
 *   call PLT 0x57210    -> CTSGroundWeapon::Spawn(this)
 *
 * Everything below the TODOs is conservative inference, not certainty.
 */
export function Spawn(this: CTSPistolWeapon): void {
  // [esi+0x60] — pointer dereferenced and then used as a vtable base.
  // TODO(asm-ambiguous): HLSDK convention for a weapon's owner pointer is
  // `m_pPlayer` (CBasePlayer*) or `m_hOwner` (edict handle). The name
  // `m_pOwner` is a placeholder until D.4 cross-references the class layout.
  const owner = (this as any).m_pOwner as any;

  // call [eax+0x11c] with `this` as the explicit arg.
  // TODO(asm-ambiguous): this is a vtable slot (or function-pointer field)
  // on the owning player. The method's name, return semantics, and side
  // effects are NOT recoverable from this chunk alone. Treated as an
  // unknown dispatch that returns a value stored at +0xa4 below.
  const variant: unknown = (owner as any).__owner_slot_0x11c?.(this);

  // [esi+0xa4] — destination for the dispatch result.
  // TODO(asm-ambiguous): type (int vs enum vs short) is unknown; the `m_`
  // prefix is HLSDK-idiomatic but the specific name (`m_iPistolType`,
  // `m_iPistol`, `m_iVariant`) needs D.4 confirmation.
  (this as any).m_pistolVariant = variant;

  // PLT call to CTSGroundWeapon::Spawn(this) — non-virtual parent spawn.
  // TODO: import or define Spawn_CTSGroundWeapon (PLT-resolved external).
  Spawn_CTSGroundWeapon(this);
}

// Forward decl — the original is a PLT-resolved external call. Real
// definition lands when CTSGroundWeapon is ported in D.4.
declare function Spawn_CTSGroundWeapon(self: CTSPistolWeapon): void;
