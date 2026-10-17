// ─── Ambient declarations so the file resolves in isolation.
// Remove or expand once the broader project tree is wired up (D.5).

declare class CTSGameRules {
  // Game state byte at offset 0. Allowed input values to this function: 2
  // and 3 (per the gate below); the function transitions to 2 on failure,
  // 3 on success.
  m_iGameState: number;

  // 32-slot objective pointer array, base at this+0x250. Each slot is a
  // dword pointer; the array is rep stosd-zero-filled at the top.
  m_Objectives: Array<any | null>;

  // Count of valid entries in m_Objectives, base at this+0x24c.
  m_iNumObjectives: number;

  // Field at offset 0x554: zeroed at the start of InitObjectives, never
  // read again in this chunk. Purpose unknown.
  // TODO(asm-ambiguous): cross-reference with class siblings (SetObjective,
  // SelectRandomTheOne, RestartRound) before assigning a semantic name.
  m_pField_0x554: number;
}

declare const engine_globals: {
  // Vtable-relative function pointers resolved from a gpGlobals-style
  // singleton ([ebx+0x1aa8]). Slot offsets (in bytes) reconstructed from
  // the disassembly; the underlying C function names are unknown.
  // vtable[0x46] = call site at offset 0x118 — see block 5 below.
  // vtable[0x47] = call site at offset 0x120 — see block 8 below.
  // vtable[0x45] = call site at offset 0x114 — see block 9 below.
  vtable: Array<(...args: any[]) => any>;
};

// Mirror of this->m_iGameState, exposed as a global so the engine can
// observe the transition. Backed by [ebx+0x210c] in the disassembly.
declare const g_iGameState: { value: number };

// Loop bound at [ebx+0x1600] → [eax+0x94]; gpGlobals-style indirection.
declare const maxPlayers: { value: number };

declare function UTIL_FindEntityByClassname(
  prev: any,
  classname: string,
): any;

/**
 * CTSGameRules::InitObjectives — collect objective entities for the round
 * and notify each player's goal.
 *
 * Disassembly reference: address 0x000685d8, 375 bytes. Class context:
 * CTSGameRules. See tools/decompile/chunks/InitObjectives__12CTSGameRules.chunk.md.
 *
 * Resets the 32-slot objective pointer array, walks every entity matching
 * the objective classname, validates each via an engine callback, and
 * stores up to 32 valid pointers. If none are found, transitions the game
 * state to 2 (failure) and exits. Otherwise transitions to state 3
 * (success), asks the engine to start the round, and walks every player
 * slot, calling each live goal's notification methods.
 *
 * @param this  The CTSGameRules instance
 */
export function InitObjectives(this: CTSGameRules): void {
  // 1. Zero-fill the 32-slot objective pointer array at this+0x250.
  //    Assembly: rep stosd with ecx=0x20 → 32 dwords (4 bytes each) =
  //    128 bytes.
  for (let i = 0; i < 32; i++) {
    this.m_Objectives[i] = null;
  }

  // 2. Gate: only proceed when this->byte ∈ {2, 3}.
  //    Assembly: `mov al, [esi]; sub eax, 2; cmp al, 1; ja <end>`.
  //    All other states return without touching anything.
  if (this.m_iGameState < 2 || this.m_iGameState > 3) return;

  // 3. Reset iteration state.
  let prev: any = null;            // previous entity for UTIL_FindEntityByClassname
  this.m_iNumObjectives = 0;
  this.m_pField_0x554 = 0;         // TODO(asm-ambiguous): see declaration note

  // 4. Walk every entity whose classname matches the objective classname.
  //    The classname is a global string at [ebx-0x6e694] in the binary.
  // TODO: confirm against tools/decompile/analysis/strings-n5.txt before
  // committing the literal.
  const OBJECTIVE_CLASSNAME = "info_objective";
  while (true) {
    const ent = UTIL_FindEntityByClassname(prev, OBJECTIVE_CLASSNAME);
    if (!ent) break;
    prev = ent;

    // 5. Validate the candidate entity.
    //
    //    Disassembly:
    //      mov eax, [ebp+0]        ; eax = ent->vtable (offset-0 indirection)
    //      mov edx, [eax+0x208]    ; edx = vtable[0x82]  (function pointer)
    //      test edx, edx
    //      je   <fail>
    //      push edx
    //      call [eax+0x118]        ; engine_globals->vtable[0x46](edx)
    //
    //    The 0x208 read goes through the vtable, NOT a direct entity
    //    member. Read as: vtable[0x208/4] is a function pointer, and it's
    //    the *first argument* to an engine function at vtable slot 0x46.
    //
    // TODO(asm-ambiguous): engine_globals->vtable[0x46] is unnamed. Likely
    // a "validate objective / check trigger" type engine helper.
    const entVtable: Array<any> | undefined = (ent as any).__vtable__;
    const validateFn =
      entVtable !== undefined ? (entVtable[0x208 / 4] as unknown) : undefined;
    let valid = false;
    if (validateFn) {
      const ret = (
        engine_globals.vtable[0x118 / 4] as (a: unknown) => unknown
      )(validateFn);
      if (ret) valid = true;
    }
    if (!valid) {
      // Validation failed → exit the entity walk loop, then check count
      // (matches `test edi,edi; jne 68693` in the disassembly).
      break;
    }

    // 6. Append the valid entity to the objective array, capped at 32.
    //    Assembly: `cmp [esi+0x24c], 0x1f; jg <loop-tail>; mov [...+0x250]`.
    if (this.m_iNumObjectives < 32) {
      this.m_Objectives[this.m_iNumObjectives] = ent;
      this.m_iNumObjectives++;
    }
  }

  // 7. No objectives found → state 2 (failure) and exit.
  if (this.m_iNumObjectives === 0) {
    this.m_iGameState = 2;
    g_iGameState.value = 2;
    return;
  }

  // 8. Objectives found → state 3 (success), ask the engine to start
  //    the round, then walk every player slot.
  this.m_iGameState = 3;
  g_iGameState.value = 3;

  // TODO(asm-ambiguous): engine_globals->vtable[0x47] purpose undocumented.
  // Argument is `1` (constant from the disassembly's `push 0x1`).
  // Likely a round-start or player-array retrieval.
  const players: unknown = (
    engine_globals.vtable[0x120 / 4] as (a: number) => unknown
  )(1);
  if (!players) return;

  // 9. Walk each player slot (stride 0x324 bytes per slot).
  //    Loop bound is loaded from [ebx+0x1600]→[eax+0x94]
  //    (gpGlobals-style singleton → maxClients-style counter).
  for (let i = 1; i < maxPlayers.value; i++) {
    const slot: any = (players as number) + i * 0x324;

    // Skip slots whose first dword is non-zero.
    // TODO(asm-ambiguous): slot[0] semantics — could be a flags or
    // occupancy field. Disassembly: `cmp [esi], 0; jne <inc>`.
    if (slot[0] !== 0) continue;

    // Resolve the player pointer: use the slot itself; if it's null,
    // fall back to the engine index-0 lookup at vtable slot 0x45.
    let player: any = slot;
    if (!player) {
      // TODO(asm-ambiguous): engine_globals->vtable[0x45] purpose unclear.
      player = (
        engine_globals.vtable[0x114 / 4] as (a: number) => unknown
      )(0);
    }
    if (!player) continue;

    // TODO(asm-ambiguous): player+0x7c field — likely m_pGoal or
    // m_pObjective. Cross-reference with CBasePlayer's class layout.
    const goal = (player as any).m_pGoal_0x7c as any | undefined;
    if (!goal) continue;

    // Disassembly: [edi+0x60] is the goal's vtable (or function-table
    // pointer); slots 0x1c and 0x20 are the alive-check and HUD-message
    // functions respectively.
    const goalVtbl: Array<any> = (goal as any).m_pVTable_0x60;
    const isAlive = (goalVtbl[0x1c / 4] as (g: unknown) => boolean)(goal);
    if (!isAlive) continue;
    (goalVtbl[0x20 / 4] as (g: unknown, arg0: number) => void)(goal, 0);
  }
}
