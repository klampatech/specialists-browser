/**
 * CTSGameRules::SendObjectiveToHud — broadcast an objective update to a
 * target entity's HUD. Emits a multi-field HUD net message carrying the
 * objective's world location, its index, and a per-team localized string.
 *
 * Demangled : `CTSGameRules::SendObjectiveToHud(int, CBaseEntity*)`
 * Disasm    : `SendObjectiveToHud__12CTSGameRulesiP11CBaseEntity`
 * Address   : 0x0006ac80, 340 bytes (ends at 0x6add4)
 *
 * NOTE: External types and globals are typed `any` so this function
 * compiles in isolation. Field names inferred from the disassembly
 * (rather than the original C++ source) are flagged with TODO comments.
 */
export function SendObjectiveToHud(
  this: any,                  // CTSGameRules* — implicit `this`
  objectiveIndex: number,     // arg: int
  targetEntity: any,          // arg: CBaseEntity*
): void {
  // (1) Guards: targetEntity must be non-null, objectiveIndex in bounds.
  //     Bounds check uses this+0x2d0 — a count/size field stored
  //     immediately before the m_Objectives array at this+0x2d4.
  // TODO(asm-derive): `m_nObjectiveCount` field name is inferred.
  if (targetEntity == null) return;
  if (objectiveIndex < 0) return;
  if (objectiveIndex >= (this as any).m_nObjectiveCount) return;

  // (2) Locate the objective entry. m_Objectives is a packed 20-byte-per-
  //     entry array at this+0x2d4. Entry layout (inferred from chunk):
  //       [0x00] CTSObjective* m_pObjective
  //       [0x04..0x13] four per-team dword string offsets (4 × 4 bytes)
  // TODO(asm-derive): entry layout is inferred from how the disassembly
  // indexes into it (ebp+0x4 + teamIndex*4). Real C++ struct may differ.
  const objective: any = (this as any).m_Objectives[objectiveIndex];

  // (3) Resolve the target's team. The disassembly calls CBaseEntity
  //     vtable slot +0xd0 (likely GetClassName()), then passes the
  //     classname string to CTSGameRules::GetTeamIndex which maps to a
  //     team id (-1 if not on a team).
  // TODO(asm-derive): vtable slot offsets are inferred.
  const className: string = (targetEntity as any).GetClassName();
  const teamIndex: number = (this as any).GetTeamIndex(className);

  // (4) Build the localized message string. The disassembly uses strncpy
  //     from a cvar string table. The table is reached via a singleton
  //     at [ebx+0x1600] (PIC base + 0x1600); the string-table base lives
  //     at that singleton + 0x98. Up to 64 bytes (0x40) are copied.
  // TODO(asm-derive): g_msgCvarSingleton is a fabricated name; the real
  // cvar identity needs to come from `strings-n5.txt` cross-reference.
  const MSG_BUF_SIZE = 64;
  const msgBuf = new Uint8Array(MSG_BUF_SIZE);

  if (teamIndex >= 0) {
    const teamStringOffset: number = objective.m_TeamStringOffsets[teamIndex];
    if (teamStringOffset !== 0) {
      // Pseudo-strncpy from the cvar string table.
      const stringTableBase: number = (g_msgCvarSingleton as any).stringBase;
      const srcPtr: number = stringTableBase + teamStringOffset;
      for (let i = 0; i < MSG_BUF_SIZE; i++) {
        const b = readU8(srcPtr + i);
        if (b === 0) break;
        msgBuf[i] = b;
      }
      // Force NUL at position MSG_BUF_SIZE-1 (matches disassembly
      // `mov BYTE PTR [esp+0x5f], 0x0` after the strncpy).
      msgBuf[MSG_BUF_SIZE - 1] = 0;
    }
  }

  // (5) Begin the HUD net message. The disassembly pushes (right-to-left):
  //       push [eax+0x208]   ; 4th = ed
  //       push 0x0           ; 3rd = pOrigin = NULL
  //       push [edx]         ; 2nd = msg_type = [ebx+0x1d4c]
  //       push 0x1           ; 1st = msg_dest = MSG_ONE
  //     into pfnMessageBegin at [esi+0xb8]. The TS uses a higher-level
  //     Engine.MessageBegin wrapper whose arg order is documented separately.
  // TODO(asm-derive): g_playerEngineHandle is a fabricated name for the
  // engine-cached handle at [ebx+0x1d4c]. Its real type/semantics
  // (edict_t* vs msg_type int) is not pinned down here.
  Engine.MessageBegin(
    /* msg_id    */ 1,
    /* pToClient */ (g_playerEngineHandle as any),
    /* msg_dest  */ 0,
    /* msg_name  */ (targetEntity as any).pev.message,
  );

  // (6) Fetch & write the objective's world position (3 floats).
  //     CTSObjective vtable slot +0xf8 (= GetLocation(Vector&)) fills the
  //     3-float buffer; engine WriteFloat (offset +0xd4) is then called
  //     once per component.
  // TODO(asm-derive): vtable slot offset is inferred.
  const loc = new Float32Array(3);
  (objective.m_pObjective as any).GetLocation(loc);
  Engine.WriteFloat(loc[0]);
  Engine.WriteFloat(loc[1]);
  Engine.WriteFloat(loc[2]);

  // (7) Objective index (engine offset +0xc0 = WriteShort).
  Engine.WriteShort(objectiveIndex);

  // (8) The localized message string (engine offset +0xd8 = WriteString).
  //     The original pushes &msgBuf directly; WriteString reads a
  //     NUL-terminated string. No TextDecoder wrapping needed.
  Engine.WriteString(msgBuf);

  // (9) End the message (engine offset +0xbc = MessageEnd).
  Engine.MessageEnd();
}

// External helpers — declared as `any` so the function compiles in
// isolation. The real implementations will be wired up in D.5.
declare const Engine: any;
declare const g_msgCvarSingleton: any;
declare const g_playerEngineHandle: any;
declare function readU8(addr: number): number;
