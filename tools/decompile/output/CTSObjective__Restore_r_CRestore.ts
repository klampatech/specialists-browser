/**
 * CTSObjective::Restore — restore a CTSObjective entity from a
 * save buffer.
 *
 * Demangled: `CTSObjective::Restore(CRestore&)`
 * Address:   0x0007c260   Size: 80 bytes
 *
 * Flow (per disassembly at 7c260–7c2af):
 *   1. Save registers; set EBX = GOT base via
 *      `call; pop ebx; add ebx, 0xe9ba8`.
 *   2. ESI = this (CTSObjective); EDI = restore (CRestore&).
 *   3. Call CBaseEntity::Restore(this, restore).
 *   4. If EAX == 0, return 0 (failure).
 *   5. Otherwise call CRestore::ReadFields(restore, className,
 *      this, saveData, 1); return its result.
 */
export function Restore(this: any, restore: any): number {
  // (3) Base-class restore.
  const baseResult = (CBaseEntity.prototype as any).Restore.call(this, restore);

  // (4) Base-class failed — propagate the failure return.
  if (baseResult === 0) {
    return 0;
  }

  // (5) Read back CTSObjective-specific saved fields via the
  //     static TYPEDESCRIPTION[1] table and the class-name key.
  //
  // TODO(asm-ambiguous): the two data arguments are accessed via
  //   PIC-relative addressing:
  //     - `[ebx + 0x1fe8]` (load)  → a pointer in the .data
  //       area; conventional name `m_SaveData`. Verify against
  //       nm.
  //     - `[ebx - 0x6cce9]` (lea)  → an address in the .rodata
  //       area; likely the class-name string used by
  //       CRestore::ReadFields to look up this entity's save
  //       block. Name `m_RestoreKey` is a guess; could equally
  //       be a global `const char *` or a `gClassName` entry.
  return (CRestore.prototype as any).ReadFields.call(
    restore,
    (CTSObjective as any).m_RestoreKey,   // const char* — class-name key
    this,                                 // void*      — destination
    (CTSObjective as any).m_SaveData,     // TYPEDESCRIPTION*
    1,                                    // field count
  );
}
