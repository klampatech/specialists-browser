```typescript
/**
 * CTSObjective::Restore — restore the CTSObjective entity from a save buffer.
 *
 * Defers to CBaseEntity::Restore for base-class state; if the base class
 * succeeds, then reads back CTSObjective-specific fields via the static
 * type-description table. Returns 0 if the base class fails; otherwise
 * the int returned by CRestore::ReadFields.
 *
 * @param this    The CTSObjective entity instance
 * @param restore The CRestore helper driving the restore
 * @returns       0 on base-class failure; otherwise CRestore::ReadFields' return value
 */
export function Restore(this: CTSObjective, restore: CRestore): number {
  // Defer to the base class; bail out on failure.
  const baseResult = CBaseEntity.prototype.Restore.call(this, restore);
  if (baseResult === 0) {
    return 0;
  }

  // Read back CTSObjective-specific fields via the static TYPEDESCRIPTION
  // table (size 1).
  //
  // TODO(asm-ambiguous): [ebx+0x1fe8] is a GOT-relative static
  //   TYPEDESCRIPTION[1] entry describing the one CTSObjective-specific
  //   saved field. [ebx-0x6cce9] is a GOT-relative const char* class-name
  //   key used by CRestore to match this entity's block in the save
  //   buffer (e.g. "CTSObjective").
  return CRestore.prototype.ReadFields.call(
    restore,
    CTSObjective.m_RestoreKey,   // &[ebx-0x6cce9]  — restore-block class name
    this,                         // &[entity]       — destination for read fields
    CTSObjective.m_SaveData,      // &[ebx+0x1fe8]   — static TYPEDESCRIPTION[1]
    1,                            // field count
  );
}
```
