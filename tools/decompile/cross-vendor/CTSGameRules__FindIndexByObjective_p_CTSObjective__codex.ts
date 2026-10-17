```typescript
/**
 * CTSGameRules::FindIndexByObjective — Linear-search the objective list for
 * the given CTSObjective pointer. Returns the 0-based index on a match,
 * or -1 if the pointer is not present.
 *
 * @param this  The CTSGameRules instance (the `this` from the original C++ method)
 * @param obj   The CTSObjective pointer to look up in the list
 * @returns     Index of `obj` in the objective list, or -1 if absent
 */
export function FindIndexByObjective(
  this: CTSGameRules,
  obj: CTSObjective
): number {
  // Layout inferred from the disassembly:
  //   this+0x2d0  int32   objectiveCount
  //   this+0x2d4  entry[] objectiveList; each entry is 0x14 bytes wide,
  //                         with the CTSObjective* at offset 0 of each entry.
  //                         The remaining 16 bytes per entry are not read here.
  // TODO(asm-ambiguous): the other 0x10 bytes of each ObjectiveListEntry
  //   are untouched by this function — verify against AddObjectiveInList.
  const count: number = this.objectiveCount;
  const list: { objective: CTSObjective }[] = this.objectiveList;

  for (let i = 0; i < count; i++) {
    if (list[i].objective === obj) {
      return i;
    }
  }
  return -1;
}
```
