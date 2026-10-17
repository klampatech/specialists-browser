/**
 * CTSObjective::KeyValue — handles a single recognized key/value pair from the
 * level editor for a CTSObjective entity.
 *
 * Compares pkvd.szKeyName against a string literal in rdata; on match, parses
 * pkvd.szValue as a base-10 integer via __strtol_internal, stores the result
 * at this->offset_0x68, and marks pkvd as handled. Otherwise marks pkvd as
 * not handled (and the engine will pass this key to the base class).
 *
 * Calling convention note: compiled with GCC thiscall-on-stack, so `this` is
 * the first stack argument and `pkvd` is the second. The `this:` parameter
 * typing below expresses that the function is meant to be invoked as a
 * method on a CTSObjective instance.
 *
 * NOTE: CTSObjective + KeyValueData_s types are not yet defined — using
 * `any` per the D.4 protocol (full class reconstruction is out of scope for
 * this slice).
 *
 * @param this   The CTSObjective entity instance (passed by the engine)
 * @param pkvd   Engine key/value data (szKeyName, szValue, fHandled)
 * @returns      void
 */
export function KeyValue(
  this: any /* CTSObjective */,
  pkvd: any /* KeyValueData_s */,
): void {
  // PIC / GOT base computed at runtime: 0x7c2ba + 0xe9b56 = 0x166010.
  // Key-name string literal sits at (GOT_BASE - 0x6eeee) = 0xF7122 in rdata.
  // TODO(asm-ambiguous): the literal key string is not visible in this
  // chunk; resolve via strings-n5.txt cross-ref (likely something like
  // "objective_id" or "m_iObjective"). Until then, this is a behavioral
  // placeholder — every incoming key will hit the `else` branch.
  const keyNameLiteral: string = "" /* GOT_BASE - 0x6eeee */;

  if (pkvd.szKeyName === keyNameLiteral) {
    // __strtol_internal(pkvd.szValue, NULL /* endptr */, 10 /* base */, 0 /* group */).
    // For ASCII-digit strings without leading whitespace, '+' signs, or trailing
    // garbage, this is equivalent to parseInt(value, 10).
    const parsed: number = parseInt(pkvd.szValue, 10);

    // Dword write to this->offset_0x68.
    // TODO(asm-ambiguous): field purpose unclear without the full CTSObjective
    // layout; offset 0x68 is written with the parsed integer. Plausibly an
    // int field like m_iObjectiveId / m_iGoal — resolve in D.4.
    (this as any)[0x68] = parsed;

    pkvd.fHandled = 1;
  } else {
    pkvd.fHandled = 0;
  }
}
