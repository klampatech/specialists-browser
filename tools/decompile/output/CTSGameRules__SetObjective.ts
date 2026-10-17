/**
 * CTSGameRules::SetObjective — selects and activates a round objective.
 *
 * Symbol:        SetObjective__12CTSGameRules
 * Demangled:     CTSGameRules::SetObjective()
 * Address:       0x000690b4, size 124 B
 * Calling conv:  __thiscall, no explicit args, void return
 *
 * Behavior (from asm):
 *   1. Unconditionally invoke this->ClearObjectiveList().
 *   2. If the byte at class offset 0 is not in {2, 3}, return.
 *   3. Zero the 4-byte slot at offset 0x554.
 *   4. If the 4-byte count at offset 0x24c is zero, return.
 *   5. Pick a random index in [0, count-1] via a global helper.
 *   6. Load the idx-th 32-bit word from the array at base offset 0x250.
 *   7. Invoke a virtual method on that pointer (vtable ptr at +0x60,
 *      method slot at +0x114).
 *   8. Store the pointer into the 0x554 slot.
 *
 * Field-name choices below are guesses; offsets are exact. D.4 will
 * pin the names against DWARF / TS source.
 */
export function SetObjective(this: any /* CTSGameRules */): void {
  // (1) asm 0x690cb: ClearObjectiveList(this)
  this.ClearObjectiveList();

  // (2) asm 0x690d0-0x690da: bail unless (byte at offset 0) is in {2, 3}
  //   mov al,[edi]; sub eax,2; cmp al,1; ja 6912c
  //   JA is unsigned "above": taken for {0, 1, 4+}; not taken for {2, 3}.
  // TODO(asm-ambiguous): offset 0 is the first byte of the class — without
  //   DWARF we cannot tell whether this is a vtable-ptr low byte, a
  //   packed enum, or a `m_iGameMode`-style field. The asm's small-
  //   constant compare suggests a small enum / mode selector.
  const mode = this.field_0x000_byte;
  if (mode !== 2 && mode !== 3) return;

  // (3) asm 0x690dc: this->[0x554] = 0
  this.field_0x554_ptr = null;

  // (4) asm 0x690e6-0x690ed: bail when count == 0
  const objectiveCount = this.field_0x24c_count;
  if (objectiveCount === 0) return;

  // (5) asm 0x690ef-0x69108: call [GOT+0x1aa8]+0x168(0, count-1).
  //   The (min, max) signature matches an "int in [min, max]" helper;
  //   very likely g_engfuncs.pfnRandomLong or a TS RNG singleton.
  // TODO(asm-ambiguous): [GOT+0x1aa8] is unidentified; the +0x168 slot is
  //   a function pointer on whatever it points at.
  const idx = g_pRngHelper.PickInt(0, objectiveCount - 1);

  // (6) asm 0x6910a-0x69111: lea esi,[esi*4+0x250]; mov eax,[esi+edi]
  //   eax = *(this + 0x250 + idx*4) — the idx-th 32-bit pointer in an
  //   in-class array. Adjacency with field_0x24c_count suggests
  //   `struct { int32 count; T* arr[]; }`.
  const pObjective = this.field_0x250_ptrArray[idx];

  // (7) asm 0x69114-0x6911f: vtable call.
  //   mov edx,[eax+0x60]       ; vtable of *pObjective
  //   mov [esp],eax            ; arg0 = pObjective (implicit `this`)
  //   call [edx+0x114]         ; vtable slot 0x114/4 = 0x45
  // TODO(asm-ambiguous): vtable slot names need DWARF info. Plausibly
  //   Activate / Begin / Engage / Start, given the gameplay semantics.
  pObjective.vtableMethod_0x114();

  // (8) asm 0x69120-0x69123: this->[0x554] = pObjective
  //   The asm re-reads the slot after the call (defensive against the
  //   vtable method clobbering eax). In TS our local `pObjective` is
  //   stable across the call, so a re-read is unnecessary.
  this.field_0x554_ptr = pObjective;
}

// Stand-in declaration so this file compiles in isolation.
// TODO: replace with the real engine/singleton once [GOT+0x1aa8] is
// resolved during D.4.
declare const g_pRngHelper: {
  /** Function at offset +0x168 of whatever [GOT+0x1aa8] points to. */
  PickInt(min: number, max: number): number;
};
