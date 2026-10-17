// Local stubs — replace with real types in D.4 when CTSBomb is wired up.
// Per checklist #8: compiles in isolation; `any` for unknowns.
// KeyValueData_s is 4-field in HLSDK (szClassName at offset 0) — the asm
// uses +0x4/+0x8/+0xc which confirms this layout.
type CTSBomb = any;
interface KeyValueData_s {
    szClassName: string;
    szKeyName: string;
    szValue: string;
    fHandled: number;
}

// External: parent class method (PLT target in codex callers).
declare function CTSObjective_KeyValue(
    this: CTSBomb,
    pkvd: KeyValueData_s
): void;

/**
 * CTSBomb::KeyValue — Parses a designer-specified key/value pair into
 * the matching CTSBomb entity field. Compares pkvd->szKeyName against
 * two GOT-relative string constants (ebx-0x6cde5, ebx-0x6cdda). On a
 * match, parses pkvd->szValue as base-10 int (via glibc strtol) and
 * stores the result at the matching `this` field offset (0x80 or 0x84),
 * then sets pkvd->fHandled = 1. Unrecognized keys delegate to
 * CTSObjective::KeyValue.
 *
 * @param this   The CTSBomb entity instance.
 * @param pkvd   KeyValueData: { szClassName, szKeyName, szValue, fHandled }.
 * @returns      void
 */
export function KeyValue(
    this: CTSBomb,
    pkvd: KeyValueData_s
): void {
    // Branch 1: GOT offset -0x6cde5.
    // TODO(asm-ambiguous): literal inferred from offset 0x80 matching
    // HL pev->team layout; resolve against strings-n5.txt before merge.
    if (pkvd.szKeyName === /* GOT-0x6cde5, inferred */ "m_iTeam") {
        // this->field_0x80 = (int)strtol(pkvd->szValue, NULL, 10, 0).
        // parseInt(s, 10) is close-enough for engine-validated KV; not
        // strictly equivalent to strtol re: whitespace + overflow.
        this.m_iTeam = parseInt(pkvd.szValue, 10);
        pkvd.fHandled = 1;
        return;
    }

    // Branch 2: GOT offset -0x6cdda.
    // TODO(asm-ambiguous): literal UNKNOWN — the disassembly only
    // exposes the GOT offset, not the string content. Resolve against
    // tools/decompile/analysis/strings-n5.txt before merging. Candidate
    // names from TS bomb entity layout (m_iScore, m_iOwningTeam,
    // m_iGoalNo) are guesses only — do NOT commit any of them as truth.
    // Until resolved, this branch is structurally faithful but
    // literal-blind (compare against empty string will never match
    // real KV data, which is the honest placeholder).
    if (pkvd.szKeyName === /* GOT-0x6cdda, UNKNOWN */ "") {
        this.someField_0x84 = parseInt(pkvd.szValue, 10);
        pkvd.fHandled = 1;
        return;
    }

    // Unhandled: delegate to CTSObjective::KeyValue(this, pkvd).
    // Caller-cleaned (sub esp,8 + 2 pushes + add esp,0x10 in asm).
    CTSObjective_KeyValue(this, pkvd);
}
