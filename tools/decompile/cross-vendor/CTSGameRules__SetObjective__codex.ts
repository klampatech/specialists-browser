```typescript
/**
 * CTSGameRules::SetObjective — selects and activates a round objective.
 *
 * Always clears the previous objective list. If the game mode is one of the
 * "objective" modes (2 or 3) and at least one objective is registered, picks
 * one via a global random-index helper, activates it through its vtable, and
 * remembers it as the current objective.
 *
 * @param this  The CTSGameRules entity instance (this in the original C++)
 * @returns     void
 */
export function SetObjective(this: any /* TODO: replace with CTSGameRules */): void {
  // Clear any previous objective list unconditionally.
  this.ClearObjectiveList();

  // Only proceed when the game mode is 2 or 3.
  //   asm:  mov al,[edi]; sub eax,2; cmp al,1; ja skip
  //   =>  bail unless this[0] is in {2, 3} (unsigned compare against 1).
  const mode = this.m_iGameMode; // byte at offset 0x0
  // TODO(asm-ambiguous): which TS game modes correspond to values 2 and 3.
  if (mode !== 2 && mode !== 3) return;

  // Reset the current-objective slot.
  this.m_pCurrentObjective = null; // DWORD at offset 0x554

  // Bail if there are no registered objectives.
  const objectiveCount = this.m_iObjectiveCount; // DWORD at offset 0x24c
  if (objectiveCount === 0) return;

  // Pick an objective index via the global function at [GOT+0x1aa8]+0x168,
  // called with args (0, count-1).  The (min, max) arg shape strongly
  // suggests "random index in [0, count-1]".
  // TODO(asm-ambiguous): GOT+0x1aa8 is an unidentified global pointer; the
  //   +0x168 slot is a function pointer on whatever it points to. Without
  //   resolving the global we can't say which engine subsystem this lives in.
  const idx = g_pObjectiveSelector.PickIndex(0, objectiveCount - 1);

  // Load the objective pointer from the in-class array at offset 0x250.
  //   asm:  lea esi,[esi*4+0x250]; mov eax,[esi+edi]
  //   =>  eax = *(this + idx*4 + 0x250)
  const pObjective: any = this.m_pObjectives[idx];

  // Activate the objective through its vtable (vtable ptr at +0x60,
  // method slot at +0x114). The asm pushes pObjective as the implicit
  // `this` argument of the called function.
  pObjective.Activate();
  // TODO(asm-ambiguous): the +0x60 / +0x114 byte offsets need DWARF vtable
  //   info to map to a specific C++ method name.

  // Remember this as the current objective.
  this.m_pCurrentObjective = pObjective;
}

// Stand-in declarations so this file compiles in isolation.
// TODO: replace with the real engine globals once they are defined elsewhere.
declare const g_pObjectiveSelector: {
  /** Function at offset +0x168 of whatever [GOT+0x1aa8] points to. */
  PickIndex(min: number, max: number): number;
};
```
