// Standalone stubs so this file compiles in isolation.
// The full class lives elsewhere; declared `any` per the
// conversion guidance ("use `any` for unknowns").
type CTSGroundWeapon = any;
type CRestore        = any;
declare function CBaseEntity_Restore(
  self: CTSGroundWeapon,
  restore: CRestore,
): number;

// ---------------------------------------------------------------------------
// CTSGroundWeapon::Restore(CRestore&)
//
// Faithfully restored from:
//   tools/decompile/chunks/Restore__15CTSGroundWeaponR8CRestore.chunk.md
// Demangled: `CTSGroundWeapon::Restore(r CRestore)`
// ---------------------------------------------------------------------------

/**
 * Restore this CTSGroundWeapon's saved state.
 *
 *  1. Defer to CBaseEntity::Restore for base-entity fields.
 *  2. If that succeeded, read the 3 CTSGroundWeapon-specific typed
 *     fields via CRestore::ReadFields, returning its result verbatim.
 *
 * @param this    The CTSGroundWeapon instance being restored.
 *                The asm carries this in `esi`, as expected for a
 *                non-static instance method.
 * @param restore The engine's CRestore helper for this save/restore pass.
 * @returns       0 if CBaseEntity::Restore failed; otherwise the value
 *                CRestore::ReadFields returned (0 = fail, non-0 = ok).
 */
export function Restore(
  this: CTSGroundWeapon,
  restore: CRestore,
): number {
  // (1) Parent (base-entity) restore must succeed before we proceed.
  if (CBaseEntity_Restore(this, restore) === 0) {
    return 0;
  }

  // (2) CTSGroundWeapon-specific typed fields.
  //
  // The class-name string and the TYPEDESCRIPTION[3] array below
  // correspond to the asm's PIC-relative references:
  //     lea  eax, [ebx-0x6b6ac]   ->  class-name string
  //          [ebx+0x1b78]        ->  TYPEDESCRIPTION[3] table
  // They are static data symbols emitted next to
  // CTSGroundWeapon::Save. Their *contents* are deferred to D.4
  // (TS-specific gameplay); the asm is unambiguous about the call
  // shape (ReadFields(className, entity, typedDesc, 3)).
  const className:  string = "CTSGroundWeapon";
  const typedDesc:  any    = null; // TYPEDESCRIPTION[3] — D.4
  const fieldCount: number = 3;

  return (restore.ReadFields(
    className,
    this,
    typedDesc,
    fieldCount,
  ) as unknown) as number;
}
