/**
 * CTSObjectiveManager::KeyValue — entity key/value parser. Compares
 * pkvd.szKeyName against 15 known keys; on match, parses pkvd.szValue
 * as an int (via the engine's atoi-shaped helper loaded through the
 * GOT at [ebx+0x1aa8] and called as [eax+0x10c]) and stores it into
 * the matching this field. Sets pkvd.fHandled=1 on match, 0 otherwise.
 * No base-class call: the engine's keyvalue loop walks the class chain
 * itself, so CTSObjectiveManager can own every key it cares about.
 *
 * Field offsets come from the disassembly's [edi+offset] stores; full
 * class layout is reconstructed in D.4. Key strings live in the binary's
 * .rodata at PIC-relative offsets -0x6cfae .. -0x6cf08 — resolve against
 * tools/decompile/analysis/strings-n5.txt.
 */
export function KeyValue(
  this: any, // TODO(asm-ambiguous): CTSObjectiveManager
  pkvd: any, // TODO(asm-ambiguous): KeyValueData_s { pev, szKeyName, szValue, fHandled }
): void {
  // 15-way strcmp dispatch in the order the binary issues them.
  // Field-offset groups suggest: high block 0x74..0x90, low block
  // 0x64..0x70, misc 0x94..0x9c — names pending D.4 class reconstruction.

  if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cfae */") {
    this.m_iValue_0x74 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cfa2 */") {
    this.m_iValue_0x78 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf96 */") {
    this.m_iValue_0x7c = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf8a */") {
    this.m_iValue_0x80 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf7e */") {
    this.m_iValue_0x84 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf72 */") {
    this.m_iValue_0x88 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf66 */") {
    this.m_iValue_0x8c = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf5a */") {
    this.m_iValue_0x90 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf4e */") {
    this.m_iValue_0x64 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf45 */") {
    this.m_iValue_0x68 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf3c */") {
    this.m_iValue_0x6c = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf33 */") {
    this.m_iValue_0x70 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf2a */") {
    this.m_iValue_0x94 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf19 */") {
    this.m_iValue_0x98 = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else if (pkvd.szKeyName === "/* TODO(asm-ambiguous): key @ -0x6cf08 */") {
    this.m_iValue_0x9c = parseInt(pkvd.szValue, 10);
    pkvd.fHandled = 1;
  } else {
    pkvd.fHandled = 0;
  }
}
