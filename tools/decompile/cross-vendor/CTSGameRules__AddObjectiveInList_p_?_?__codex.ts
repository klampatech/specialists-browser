```typescript
/**
 * CTSGameRules::AddObjectiveInList — append a CTSObjective entry to the
 * rules' objective list, returning the entry's index. If the objective is
 * already in the list, the existing index is returned (no insert). If the
 * list is at capacity (32 entries), returns -1.
 *
 * Internal layout (offsets from `this`):
 *   +0x2d0  int32    m_iObjectiveCount         // current entry count
 *   +0x2d4  entry    m_Objectives[32]          // fixed-size entry array
 *
 * Each `entry` is a 20-byte record:
 *   +0   CTSObjective*  pObjective              // objective pointer
 *   +4   int32[4]       data                     // 16-byte caller payload
 *
 * @param this        The CTSGameRules instance
 * @param pObjective  The CTSObjective to find or add
 * @param pData       Pointer to 16 bytes (4 int32) copied into the new entry
 * @returns           Index of the (existing or new) entry, or -1 if full
 */
export function AddObjectiveInList(
  this: CTSGameRules,
  pObjective: CTSObjective,
  pData: Int32Array
): number {
  // Look up the objective in the existing list. The disasm invokes
  // FindIndexByObjective via @plt with both `this` and pObjective explicitly
  // pushed onto the stack, rather than using the standard ECX-thiscall ABI.
  // TODO(asm-ambiguous): FindIndexByObjective's calling convention — the @plt
  // stub pushes `this` explicitly. Confirm whether this is a non-virtual
  // instance method or a static helper.
  const existingIndex: number = FindIndexByObjective.call(this, pObjective);
  if (existingIndex >= 0) {
    // Already in the list — return its index without modifying state.
    return existingIndex;
  }

  // Capacity check. `count > 0x1f` (31) ⇒ count >= 32 ⇒ array is at the 32-entry cap.
  // TODO: 0x1f = 31 (max entries = 32, indices 0..31).
  const count = this.m_iObjectiveCount;
  if (count > 31) {
    return -1;
  }

  // Append. The objective pointer lives at this+0x2d4 + count*20; the 16-byte
  // payload lives at this+0x2d8 + count*20. Original asm stores the pointer,
  // then performs `rep movsd` (ecx=4 ⇒ 4 dwords = 16 bytes) from pData.
  this.m_Objectives[count].pObjective = pObjective;
  // TODO(asm-ambiguous): semantics of the 4 dword payload are unknown
  // (touch time? score? flags?). 16 bytes is inferred from the rep movsd count.
  for (let i = 0; i < 4; i++) {
    this.m_Objectives[count].data[i] = pData[i];
  }
  this.m_iObjectiveCount = count + 1;

  return count;
}
```
