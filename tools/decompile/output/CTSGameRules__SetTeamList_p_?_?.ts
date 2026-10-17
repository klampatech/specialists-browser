// =============================================================================
// D.3 decompile — CTSGameRules::SetTeamList
// =============================================================================
// Original symbol : SetTeamList__12CTSGameRulesPCc
// Demangled       : CTSGameRules::SetTeamList(p ?, ?)
// Address         : 0x000680dc
// Size            : 380 bytes (0x17c)
// Class           : CTSGameRulesPCc (gameplay entity; sibling methods
//                   include SetTeamModelList, GetTeamIndex)
//
// NOTE: This is a gameplay class method, NOT one of the 4 HLSDK
// engine<->mod entry points. The HLSDK reference doc
// (hlsdk-goldsrc-interface.md) does not describe it. The version-check
// and interfaceVersion-assignment patterns in the review rubric apply
// to GiveFnptrsToDll / GetEntityAPI* / GetNewDLLFunctions, not here.
//
// Memory model: the disassembly uses `this` as a raw base pointer and
// reads globals via [ebx+offset] (GOT-relative, ebx set up by the
// `call/pop/add` thunk at +0xf). We model `this` with a documented
// `__addr` field and lift all [ebx+offset] reads to module-level consts.
// =============================================================================

// --- D.3 helper stubs (wired up in D.5+) -----------------------------------

interface MemoryObject {
  /** Base address of the object in the emulated address space. */
  __addr: number;
  /** Optional vtable for virtual dispatch. */
  __vtable?: any;
}

interface Cvar {
  value: number;
}

declare function readByte(this_: MemoryObject, offset: number): number;
declare function writeByte(this_: MemoryObject, offset: number, value: number): void;
declare function readDword(this_: MemoryObject, offset: number): number;
declare function writeDword(this_: MemoryObject, offset: number, value: number): void;
declare function strcpy(dstAddr: number, src: string): void;
declare function strtok(s: string | null, delim: string): string | null;
declare function callVtable(obj: any, vtableByteOffset: number, ...args: any[]): void;

// --- Globals (GOT-relative in the original .so) -----------------------------
// Each was read via [ebx+offset] in the disassembly. Offset column shows
// the GOT-relative offset from the PIC thunk at +0xf.

/** [GOT + 0x12cc] Cvar pointer; gates the "default teams" branch and
 *  determines the max-team count (4 if value==0, else 2). */
declare const g_cvar_teamCountPtr: Cvar;

/** [GOT - 0x6e6c9] Default team name string (pointer). */
declare const g_default_team_name: number;

/** [GOT - 0x6e6c5] Default team model string (pointer). */
declare const g_default_team_model: number;

/** [GOT - 0x6ed73] strtok delimiter. Likely a single space. */
declare const g_strtok_delim: string;

/** [GOT + 0x1aa8] Global team object; receives a virtual notification
 *  after each token is written. vtable entry at byte offset 0xf4. */
declare const g_team_global_obj: any;

/** [GOT - 0x6e6c1] Format string passed to the vtable notification. */
declare const g_team_fmt_str: string;

// --- Slot layout on CTSGameRules --------------------------------------------
// 4 team slots, stride 0x8c bytes, starting at this+0x28.
// Within each slot: name at +0x00, model at +0x04 (4-byte pointers).
//   slot 0: this+0x028
//   slot 1: this+0x0b4
//   slot 2: this+0x140
//   slot 3: this+0x1cc

const SLOT_STRIDE = 0x8c;
const SLOT0_OFF   = 0x028;
const SLOT1_OFF   = 0x0b4;
const SLOT2_OFF   = 0x140;
const SLOT3_OFF   = 0x1cc;
const MODEL_OFF   = 0x04; // within a slot

// =============================================================================

/**
 * Tokenize a team-list string and populate the 4 team slots in CTSGameRules.
 * If `g_cvar_teamCountPtr.value !== 0`, the first slot is seeded with
 * `g_default_team_name` / `g_default_team_model` instead of the first token.
 *
 * @param this_  CTSGameRules instance (base addr via `__addr`).
 * @param pList  Whitespace-delimited team-name list, e.g. "blue red green yellow".
 */
export function SetTeamList(this_: MemoryObject, pList: string): void {
  // ---- Clear the first byte of each of the 4 team slots. -----------------
  // The asm does this in reverse order (0x1cc, 0x140, 0xb4, 0x28); the rest
  // of each slot is intentionally left intact (relies on strcpy to NUL-
  // terminate names).
  writeByte(this_, SLOT3_OFF, 0);
  writeByte(this_, SLOT2_OFF, 0);
  writeByte(this_, SLOT1_OFF, 0);
  writeByte(this_, SLOT0_OFF, 0);

  // ---- Copy pList into a stack-local buffer so strtok can mutate it. -----
  // TODO(D.4): the original C does `char buf[N]; strcpy(buf, pList);` with
  // N unknown. In TS the string is already mutable, so we just alias.
  const localBuf: string = pList;

  // ---- Tokenize -----------------------------------------------------------
  let token: string | null = strtok(localBuf, g_strtok_delim);

  // ---- Max teams: 4 if cvar == 0, else 2. --------------------------------
  // asm: `sete al; lea eax,[eax+eax*1+0x2]` on `*g_cvar_teamCountPtr == 0`.
  const maxTeams: number = (g_cvar_teamCountPtr.value === 0) ? 4 : 2;

  let i = 0;

  // ---- Initial guard ------------------------------------------------------
  // asm: explicit `test esi; je ret` / `cmp [esi],0; je ret` /
  // `cmp i,maxTeams; jge ret` before the loop. The i>=maxTeams check is
  // dead in practice (i=0, maxTeams>=2) but preserved for fidelity.
  if (token === null || token === "" || i >= maxTeams) {
    return;
  }

  // ---- Loop-local slot cursors --------------------------------------------
  // curAddr  = address of the slot to write this iteration.
  // prevAddr = address of the slot written last iteration; passed to the
  //            vtable notification. Starts one slot below slot 0
  //            (this-0x64) so the first `+= 0x8c` lands on slot 0.
  let curAddr:  number = this_.__addr + SLOT0_OFF;
  let prevAddr: number = this_.__addr - SLOT_STRIDE;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (i === 0 && g_cvar_teamCountPtr.value !== 0) {
      // ---- Default-teams path: install globals, skip strcpy. ------------
      // asm: 681ae..681e2. Writes the default name to slot 0 (+0x28) and
      // the default model to slot 0 (+0x2c), then re-bases the cursors
      // so prevAddr=slot 0 and curAddr=slot 1, with i already at 1.
      writeDword(this_, SLOT0_OFF + 0x00, g_default_team_name);
      writeDword(this_, SLOT0_OFF + MODEL_OFF, g_default_team_model);
      prevAddr = this_.__addr + SLOT0_OFF;
      curAddr  = this_.__addr + SLOT1_OFF;
      i = 1;
    } else {
      // ---- Normal path: strcpy token into current slot's name buffer. ---
      // asm: 681ec..68206. strcpy(curAddr, token) is called with the
      // pre-increment curAddr; then prevAddr and curAddr both += 0x8c.
      strcpy(curAddr, token);
      prevAddr += SLOT_STRIDE;
      curAddr  += SLOT_STRIDE;
      i++;
    }

    // ---- Fetch the next token. -------------------------------------------
    token = strtok(null, g_strtok_delim);

    // ---- Notify the global team object via vtable dispatch. --------------
    // asm: 6821f..6822d. vtable entry at byte offset 0xf4 from the object.
    // Args (cdecl, right-to-left pushes): (1, g_team_fmt_str, prevAddr).
    callVtable(g_team_global_obj, 0xf4, 1, g_team_fmt_str, prevAddr);

    // ---- Loop exit checks. -----------------------------------------------
    if (token === null || token === "") break;
    if (i >= maxTeams) break;
  }
}
