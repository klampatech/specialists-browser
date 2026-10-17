```typescript
/**
 * CTSBomb::KeyValue — Parses a designer-specified key/value pair into the
 * appropriate CTSBomb entity field. Recognizes the team-number keys (e.g.
 * "m_iTeam" and a second TS-specific bomb team/score key); for those,
 * parses the value as base-10 int and stores the result in the matching
 * `this` field, marking `fHandled = 1`. Any unrecognized key falls
 * through to the parent `CTSObjective::KeyValue`.
 *
 * NOTE: The two key-name strings are referenced via the GOT (PIC offsets
 *       `ebx-0x6cde5` and `ebx-0x6cdda`). They are inferred to be the
 *       standard HL "m_iTeam" plus a TS bomb-specific sibling field.
 *       TODO(asm-ambiguous): verify the literal second key name against
 *       `tools/decompile/analysis/strings-n5.txt`.
 *
 * @param this   The CTSBomb entity instance.
 * @param pkvd   KeyValueData: { szKeyName, szValue, fHandled }. We set
 *               fHandled = 1 whenever we consume the key.
 * @returns      void
 */
export function KeyValue(this: CTSBomb, pkvd: KeyValueData_s): void {
  if (pkvd.szKeyName === "m_iTeam") {
    // Standard HL team index. Field lives at offset 0x80 in CTSBomb
    // (matches HL `pev->team` layout).
    this.m_iTeam = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  // TODO: literal string key at GOT offset -0x6cdda is unresolved;
  // see tools/decompile/analysis/strings-n5.txt. Best guess from TS
  // bomb entity layout: "m_iScore" / "m_iOwningTeam" / "m_iGoalNo".
  // One of these is the "second int field immediately after m_iTeam".
  if (pkvd.szKeyName === /* GOT-0x6cdda */ "m_iScore") {
    this.someField_0x84 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
    return;
  }

  // Unhandled key: delegate to CTSObjective::KeyValue(base, pkvd).
  CTSObjective_KeyValue(this, pkvd);
}
```

**Decompilation notes (not part of the output):**

- `[edi+0x80]` and `[edi+0x84]` are both 4-byte int writes (DWORD stores from `strtol`), so they are paired fields of the same type. `m_iTeam` at `0x80` matches the well-known HL `pev->team` offset; the second one is a TS-specific bomb field whose name you should confirm against `strings-n5.txt`.
- `[esi+0x4]` = `pkvd->szKeyName`, `[esi+0x8]` = `pkvd->szValue`, `[esi+0xc]` = `pkvd->fHandled` — standard HL `KeyValueData_s` layout.
- The PIC sequence `call $+5; pop ebx; add ebx, 0xe92a0` is the standard GOT-base setup for reading read-only string constants.
- `__strtol_internal(nptr, NULL, 10, 0)` is glibc's strtol with no endptr, base 10, locale 0 — equivalent to `parseInt(value, 10)` for clean numeric strings; safe enough since the engine has already validated the kv string.
- Both matched branches set `fHandled = 1` and `jmp` straight to the epilogue (no fallthrough into the parent); only the unmatched branch calls `CTSObjective::KeyValue`.
- The trailing `lea esi,[esi+0x0]` is 4-byte NOP alignment padding, not executed logic — omitted.
