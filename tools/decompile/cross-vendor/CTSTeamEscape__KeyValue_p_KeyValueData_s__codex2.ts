/**
 * CTSTeamEscape::KeyValue — entity string-key handler for a
 * team-escape objective. If the key matches the property the
 * subclass owns, parse the value as a decimal int and store it in
 * this->field_0xf4; otherwise delegate to CTSObjective::KeyValue.
 *
 * Demangled: CTSTeamEscape::KeyValue(KeyValueData_s*)
 * Binary:    0x0007d700, 97 B, GCC Itanium ABI (this on stack).
 */
export function KeyValue(
  this: CTSTeamEscape,
  pKeyValueData: KeyValueData_s,
): void {
  // String constant is at PIC base (0x7d708 + 0xe8708 = 0x1665e10)
  // minus 0x6cd60 = ~0x0FF90B0, likely in .rodata. Real name
  // (points / score / limit / goal) TBD via strings-n5.txt.
  const szTeamEscapeKey = readStringFromGot(GOT_BASE - 0x6cd60);

  if (strcmp(pKeyValueData.szKeyName, szTeamEscapeKey) === 0) {
    // glibc: long __strtol_internal(const char *nptr, char **endptr,
    //                              int base, int group)
    const value = __strtol_internal(
      pKeyValueData.szValue, // nptr,   [pKvd+0x8]
      null,                  // endptr, NULL 10,                    // base,   decimal
      0,                     // group,  no thousands grouping
    );
    // Offset 0xf4 on this — class-specific int. Rename to m_iPoints
    // / m_iScore / m_iLimit / m_iGoal in D.4 once CTSTeamEscape's
    // field map is reconstructed.
    (this as CTSTeamEscape).m_iSomeProperty = value;
    pKeyValueData.fHandled = 1; // [pKvd+0xc], mirrors C BOOL
  } else {
    // Direct parent call (PLT, non-virtual dispatch) — Itanium ABI
    // passes this as the first stack arg, NOT in ECX.
    CTSObjective.prototype.KeyValue.call(this, pKeyValueData);
  }
}

// ---- forward declarations (move to a shared .d.ts in D.5) ----
declare const GOT_BASE: number;
declare function readStringFromGot(offsetFromPicBase: number): string;
declare function __strtol_internal(
  nptr: string,
  endptr: unknown, // char** in C; null here  base: number,
  group: number,
): number;
declare function strcmp(a: string, b: string): number;

// CTSTeamEscape — see D.4 for full layout. The 0xf4 offset is the
// only field this function touches.
declare class CTSTeamEscape {
  // offset 0xf4 — class-specific int (TODO: real name)
  m_iSomeProperty: number;
}

declare class CTSObjective {
  KeyValue(this: CTSObjective, pKeyValueData: KeyValueData_s): void;
}

// KeyValueData_s — GoldSrc key/value record, mirrors the C layout:
//   +0x00 szClassName : string
//   +0x04 szKeyName   : string
//   +0x08 szValue     : string
//   +0x0c fHandled    : int (BOOL: 0/1)
declare interface KeyValueData_s {
  szClassName: string;
  szKeyName: string;
  szValue: string;
  fHandled: number;
}
