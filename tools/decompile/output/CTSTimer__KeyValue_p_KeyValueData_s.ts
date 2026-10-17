/**
 * CTSTimer::KeyValue — parses one key/value pair from a CTSTimer entity's
 * level definition.
 *
 * If `pkvd->szKeyName` matches the timer's duration key (the GOT-resolved
 * string at `[ebx - 0x6c69c]`, likely "duration"), the value is parsed as
 * a base-10 integer via `__strtol_internal(pkvd->szValue, NULL, 10, 0)`
 * and stored at `this->m_iDuration` (offset 0x64). On match, sets
 * `pkvd->fHandled = 1`; otherwise marks the key as unhandled by setting
 * `pkvd->fHandled = 0`.
 *
 * @param this  The CTSTimer entity instance
 * @param pkvd  Key/value descriptor (KeyValueData_s)
 * @returns     void
 */
export function KeyValue(this: any, pkvd: any): void {
  // GOT-resolved string constant identifying the duration key.
  // TODO(asm-ambiguous): the literal key name is not embedded in this
  // chunk; verify against tools/decompile/analysis/strings-n5.txt at the
  // binary offset corresponding to GOT - 0x6c69c.
  const durationKey = "duration";

  if (pkvd.szKeyName === durationKey) {
    // `__strtol_internal(pkvd->szValue, NULL, 10, 0)`; the 4th arg
    // (digit-grouping flag) has no JS equivalent. The result is stored
    // as a DWORD at this+0x64, so the field is necessarily an int (a
    // float field would use fld/fst, not mov DWORD).
    this.m_iDuration = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else {
    pkvd.fHandled = 0;
  }
}
