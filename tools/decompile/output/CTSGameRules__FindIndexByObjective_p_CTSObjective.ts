/**
 * CTSGameRules::FindIndexByObjective — Linear-search the objective list for
 * the given CTSObjective pointer. Returns the 0-based index on a match,
 * or -1 if the pointer is not present.
 *
 * Disassembly: `FindIndexByObjective__12CTSGameRulesP12CTSObjective`
 *   (0x0006ae20, 154 B). The compiler emits a Duff's-device-style
 *   4-way unrolled loop over a 0x14-byte-per-entry array. Semantically
 *   identical to a plain linear scan.
 *
 * @param this  The CTSGameRules instance (implicit `this` from the C++)
 * @param obj   The CTSObjective pointer to look up in the list
 * @returns     Index of `obj` in the objective list, or -1 if absent
 */

// Placeholder forward declarations — concrete layouts land in D.4 once we
// cross-reference AddObjectiveInList__12CTSGameRulesP12CTSObjectivePi
// (0x0006ac00) which writes the other 16 bytes of each entry.
export interface CTSObjective {
  // TODO(D.4): concrete fields derived from AddObjectiveInList writer.
}
export interface ObjectiveListEntry {
  /** Offset 0x00 — the CTSObjective* this entry refers to. */
  objective: CTSObjective;
  /** Offset 0x04..0x13 — written by AddObjectiveInList, unread here. */
  // (See TODO above; 16 bytes of opaque payload live here.)
}
export interface CTSGameRules {
  /** this+0x2d0 — current number of populated entries in objectiveList. */
  objectiveCount: number;
  /** this+0x2d4 — array of ObjectiveListEntry, stride 0x14. */
  objectiveList: ObjectiveListEntry[];
}

export function FindIndexByObjective(
  this: CTSGameRules,
  obj: CTSObjective
): number {
  const count: number = this.objectiveCount;
  const list: ObjectiveListEntry[] = this.objectiveList;

  for (let i = 0; i < count; i++) {
    if (list[i].objective === obj) {
      return i;
    }
  }
  return -1;
}
