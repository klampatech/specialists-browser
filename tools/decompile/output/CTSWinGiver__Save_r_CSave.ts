/**
 * CTSWinGiver::Save — persist CTSWinGiver entity state into a save buffer.
 *
 * Forwards to CBaseEntity::Save first; if that returns 0, this returns 0.
 * Otherwise writes the entity's own persistent fields via CSave::WriteFields,
 * using the "WIN_GIVER" section name and the class's TYPEDESCRIPTION table
 * (4 entries).
 */
export function Save(this: CTSWinGiver, saveData: CSave): number {
  if (CBaseEntity.prototype.Save.call(this, saveData) === 0) {
    return 0;
  }
  // TODO(asm-ambiguous): confirm "WIN_GIVER" against .rodata at [ebx-0x6cd07]
  return saveData.WriteFields(
    "WIN_GIVER",
    this,
    CTSWinGiver.TYPEDESCRIPTION,
    4
  );
}
