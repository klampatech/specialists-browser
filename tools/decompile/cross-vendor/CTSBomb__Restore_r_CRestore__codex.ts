```typescript
/**
 * CTSBomb::Restore — restores a CTSBomb entity from a save game via the
 * GoldSrc CRestore reader. Delegates to the parent CTSObjective::Restore
 * first; if that succeeds, reads 2 CTSBomb-specific typed fields from
 * the save buffer into this entity using CRestore::ReadFields.
 *
 * @param this  The CTSBomb entity instance
 * @param restore  The CRestore reader providing the save buffer (by reference)
 * @returns     Non-zero on success, 0 if the parent restore failed
 */
export function Restore(this: any, restore: any): number {
  // TODO(asm-ambiguous): (this: CTSBomb, restore: CRestore) — concrete  //   types not yet defined (class reconstruction is the D.4 task).

  // PIC / GOT base = 0x7c428 + 0xe99e8 = 0xf5e10, computed via the
  // call-pop-add sequence at the function head. All subsequent [ebx ± k]
  // reads are globals (static TYPEDESCRIPTION arrays, string literals).

  // Step 1: delegate to the parent CTSObjective::Restore(this, restore).
  // MSVC x86 ABI pushes args right-to-left (restore last, this first).
  const parentOk: number = (CTSObjective.Restore as any)(this, restore);
  if (parentOk === 0) {
    // Parent failed — propagate 0 and skip the field read.
    return 0;
  }

  // Step 2: read CTSBomb-specific typed fields into this entity.
  // CRestore::ReadFields signature:
  //   int ReadFields(const char* name, void* data,
  //                  TYPEDESCRIPTION* pTypeDesc, int count);
  // Pushed right-to-left: count, pTypeDesc, data, name, restore.
  return (restore as any).ReadFields(
    /* name      */ 'CTSBomb',              // string at [ebx - 0x6ccdb] (TODO: confirm via strings-n5.txt)
    /* data      */ this,                   // this CTSBomb
    /* pTypeDesc */ undefined as any,       // static TYPEDESCRIPTION[] at [ebx + 0x1334] (TODO: offset meaning unclear)
    /* count     */ 2,                      // literal 0x2 — two CTSBomb-specific fields
  );
}
```
