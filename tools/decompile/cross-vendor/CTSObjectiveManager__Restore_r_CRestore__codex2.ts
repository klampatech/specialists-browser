/**
 * CTSObjectiveManager::Restore — restore entity state from a saved game.
 *
 * Standard GoldSrc save/restore pattern: delegate to CBaseEntity first;
 * if that succeeds, pull this class's own typed fields from the save
 * buffer via CRestore::ReadFields.
 *
 * @param this    The CTSObjectiveManager entity instance
 * @param restore Reference to the CRestore helper driving the load
 * @returns       0 if the base-class restore failed; otherwise the
 *                result of CRestore::ReadFields
 */
export function Restore(
  this: CTSObjectiveManager,
  restore: CRestore,
): number {
  // Delegate to the parent class first. After the PIC/GOT setup in
  // the prologue, esi = `this` and edi = `restore`.
  const status = CBaseEntity.Restore(this, restore);
  if (status === 0) {
    return 0;
  }

  // Read the 13 typed fields for CTSObjectiveManager from the save
  // buffer.
  //   * pClassName string lives at [ebx - 0x6cd33] (string-table
  //     entry resolved off the GOT base computed in the prologue).
  //   * pTypeDesc  pointer lives at [ebx + 0x20ac] (the static
  //     TYPEDESCRIPTION array for this class, also GOT-resident).
  //   * numFields  is the literal 0xd = 13.
  return restore.ReadFields(
    /* pClassName */ "CTSObjectiveManager",
    /* pData      */ this,
    /* pTypeDesc  */ g_CTSObjectiveManager_TypeDescriptions,
    /* numFields  */ 13,
  );
}

// TODO(decompile-types): these engine-side types are produced by
// sibling decompile tasks. Stubbed as `any` so this file compiles
// in isolation.
type CTSObjectiveManager = any;
type CRestore = any;
type CBaseEntity = any;

// TODO(decompile-globals): [ebx + 0x20ac] is the GOT-resident pointer
// to the static TYPEDESCRIPTION array for CTSObjectiveManager
// (13 entries). The field-by-field reconstruction is task D.4; this
// stub stands in until that lands.
declare const g_CTSObjectiveManager_TypeDescriptions: any;