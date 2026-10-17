```typescript
/**
 * CTSWinGiver::KeyValue — dispatch a designer key/value pair into one of
 * four dword-sized integer fields on this entity. Sets
 * `pKeyValueData.fHandled` to 1 if a known key matched, 0 otherwise (so
 * the engine keeps walking up the class hierarchy).
 *
 * Original asm shape:
 *   - Prologue computes GOT base in EBX via `call $+5; pop ebx;
 *     add ebx, 0xea00c`. After that, `[ebx + offset]` reaches globals.
 *   - Four GOT-relative string literals are compared (one per branch)
 *     against `pKeyValueData->szKeyName` via strcmp.
 *   - On match, `__strtol_internal(pKeyValueData->szValue, NULL, 10, 0)`
 *     parses the value as a base-10 integer; the result is stored into
 *     this+0x6c / 0x70 / 0x74 / 0x78 respectively.
 *   - If no key matches, only `pKeyValueData->fHandled` is cleared to 0.
 *
 * The two-byte `mov esi, esi` instructions in the disassembly are
 * alignment NOPs and carry no behavior.
 *
 * @param this          The CTSWinGiver entity instance
 * @param pKeyValueData Pointer to the engine's KeyValueData_s
 * @returns             void
 */
export function KeyValue(this: CTSWinGiver, pKeyValueData: KeyValueData_s): void {
  // TODO(asm-ambiguous): the four key-name strings live at GOT-relative
  // offsets [ebx-0x6ce6c], [ebx-0x6ce60], [ebx-0x6ce84], [ebx-0x6ce55]
  // and are not embedded in this chunk. The placeholders below assume
  // a typical WinGiver field layout; verify against strings-n5.txt.
  const KEY_WINS   = "..."; // [ebx-0x6ce6c] → this.m_iWins   (offset 0x6c)
  const KEY_TEAM   = "..."; // [ebx-0x6ce60] → this.m_iTeam   (offset 0x70)
  const KEY_RADIUS = "..."; // [ebx-0x6ce84] → this.m_iRadius (offset 0x74)
  const KEY_DELAY  = "..."; // [ebx-0x6ce55] → this.m_iDelay  (offset 0x78)

  const key = pKeyValueData.szKeyName;

  if (key === KEY_WINS) {
    this.m_iWins   = parseInt(pKeyValueData.szValue, 10);
    pKeyValueData.fHandled = 1;
  } else if (key === KEY_TEAM) {
    this.m_iTeam   = parseInt(pKeyValueData.szValue, 10);
    pKeyValueData.fHandled = 1;
  } else if (key === KEY_RADIUS) {
    this.m_iRadius = parseInt(pKeyValueData.szValue, 10);
    pKeyValueData.fHandled = 1;
  } else if (key === KEY_DELAY) {
    this.m_iDelay  = parseInt(pKeyValueData.szValue, 10);
    pKeyValueData.fHandled = 1;
  } else {
    // No key matched; leave fHandled = 0 so the engine keeps dispatching
    // up the class hierarchy (this matches the original asm's tail).
    pKeyValueData.fHandled = 0;
  }
}
```
