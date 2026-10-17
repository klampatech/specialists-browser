```typescript
/**
 * CTSObjective::KeyValue — handles a single recognized key/value pair from the
 * level editor for a CTSObjective entity. Compares pkvd.szKeyName against a
 * string literal in rdata; on match, parses pkvd.szValue as a base-10 integer
 * via __strtol_internal, stores the result at this->offset_0x68, and marks
 * pkvd as handled. Otherwise marks pkvd as not handled.
 *
 * @param this   The CTSObjective entity instance (passed by the engine)
 * @param pkvd   Engine key/value data (szKeyName, szValue, fHandled)
 * @returns      void
 */
// TODO: CTSObjective + KeyValueData_s types not yet defined — using `any` per// the D.4 protocol (full class reconstruction is out of scope for this slice).
export function KeyValue(
  this: any /* CTSObjective */,
  pkvd: any /* KeyValueData_s */,
): void {
  // PIC / GOT base computed at runtime: 0x7c2ba + 0xe9b56 = 0x166010.
  // Key-name string literal sits at (GOT_BASE - 0x6eeee) in rdata.
  // TODO(asm-ambiguous): the literal key string is not visible in this chunk;
  // would need a strings-n5.txt lookup (e.g. "objective_id"?) to recover it.
  const keyNameLiteral: string = "" /* GOT_BASE - 0x6eeee */;

  if (pkvd.szKeyName === keyNameLiteral) {
    // __strtol_internal(pkvd.szValue, NULL /* endptr */, 10 /* base */, 0 /* group */).
    // For ASCII-digit strings this is equivalent to parseInt(value, 10).
    const parsed: number = parseInt(pkvd.szValue, 10);

    // Dword write to this->offset_0x68.
    // TODO(asm-ambiguous): field purpose unclear without CTSObjective layout;
    // offset 0x68 is written with the parsed integer.
    (this as any)[0x68] = parsed;

    pkvd.fHandled = 1;
  } else {
    pkvd.fHandled = 0;
  }
}
```
