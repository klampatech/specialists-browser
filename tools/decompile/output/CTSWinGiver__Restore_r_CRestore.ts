/**
 * CTSWinGiver::Restore — GoldSrc save/load hook for CTSWinGiver.
 *
 * Disassembly (0x0007bdac, 80 B):
 *   1. CBaseEntity::Restore(this, restore)   // PLT @ 0x59380
 *   2. If it returned 0, return 0 (early-exit; matches *      `test eax,eax; jne; mov eax,0; jmp epilogue`).
 *   3. Otherwise CRestore::ReadFields(
 *        this  = restore,
 *        pcClassName = "CTSWinGiver"  // static at PIC-(0x6cd07)
 *        pv = this
 *        pTypeDesc   = <GOT+0x2030>  // TYPEDESCRIPTION[4]
 *        count       = 4);
 *      Return value flows through `eax` to the caller.
 */
export function Restore(this: CTSWinGiver, restore: CRestore): number {
  if (CBaseEntity.Restore(this, restore) === 0) {
    return 0;
  }
  return CRestore.ReadFields(
    restore,
    'CTSWinGiver',
    this,
    /* TYPEDESCRIPTION[4] @ GOT+0x2030 — recovered in D.4 */
    tsWinGiver_TypeDesc,
    4,
  );
}

// Placeholder for the static TYPEDESCRIPTION[4] table addressed via
// GOT+0x2030 in ts_i386.so. D.4 should replace `null` with the
// recovered table (4 entries, each { fieldName, fieldOffset,
// fieldType, flags }) for CTSWinGiver's serialized fields.
const tsWinGiver_TypeDesc: any = /* @D.4 */ null;
