/**
 * CTSGameRules::GetPlayerModel — pick a player model variant for the
 * given player based on their current model name → team mapping, stash
 * the chosen variant index on the player, and return a pointer to the
 * model's name string. Falls back to a mod-wide default string if the
 * player's model isn't on any team, or if their team's slot array is
 * empty.
 *
 * ASM source: `tools/decompile/chunks/GetPlayerModel__12CTSGameRulesP11CBasePlayer.chunk.md`
 * Address:    0x00069a08, size 162 B (0xa2)
 */

import { ENGINE } from "../engine/enginefuncs";
import { DEFAULT_PLAYER_MODEL_GOT_OFFSET } from "../game/defaults";

// Inlined stubs so this file compiles standalone. Real definitions land
// in D.4 (TSPlayer, CBasePlayer) — keep these in sync.
interface CBasePlayer {
  /** [0x0b48] char[64] (likely): pev->model / m_szModelName */
  modelName: string;
  /** [0x0758] int: index of the chosen model variant slot (0..2) */
  modelVariant: number;
}
interface CTSGameRules {
  GetTeamIndex(modelName: string): number;
  teams: { models: string[] /* char models[3][16] */ }[];
}

const SLOT_COUNT = 3;
const SLOT_STRIDE = 16;                            // bytes per model slot
// Teams array: each entry is 140 B; starts at this+0x1c (offset of teams[0]).
const TEAM_BASE_OFFSET = 0x1c;
const TEAM_STRIDE = 140;
// Within a team's 140-B struct, the 3 model slots start at +0x38.
const MODELS_BASE_OFFSET = 0x38;
// GOT-relative offset of the default-model string (lea eax,[ebx-0x6f7b9]).
const DEFAULT_MODEL_GOT_OFFSET = 0x6f7b9;

export function GetPlayerModel(
  this: CTSGameRules,
  pPlayer: CBasePlayer
): string {
  // Assembly:
  //   lea  eax,[ebp+0xb48]      ; eax = &pPlayer->modelName
  //   push eax                  ; arg2 = model name (C-string)
  //   push edi                  ; arg1 = this
  //   call GetTeamIndex
  //
  // Returns the team's index in [0, N), or -1 if no team owns this model.
  const teamIndex: number = this.GetTeamIndex(pPlayer.modelName);

  // ASM: `cmp esi, 0xffffffff; je 69a9c` → default-model fallthrough.
  if (teamIndex === -1) {
    return DEFAULT_PLAYER_MODEL;
  }

  // Assembly counts the non-empty slots among the team's 3 model variants.
  // Each slot is 16 bytes; byte 0 doubles as the presence flag (0 = empty).
  // Per-team model-slot region starts at +0x38 (relative to teams[teamIndex]
  // base), so the absolute addresses checked are:
  //   [edi + teamIndex*140 + 0x38], +0x48, +0x58
  let validCount = 0;
  for (let i = 0; i < SLOT_COUNT; i++) {
    // Inline C-string layout (char models[3][16]): byte 0 is the first
    // character of the model path; a leading '\0' means the slot is empty.
    if (this.teams[teamIndex].models[i][0] !== '\0') {
      validCount++;
    }
  }

  // ASM: `test eax, eax; je 69a9c` → default-model fallthrough.
  if (validCount === 0) {
    return DEFAULT_PLAYER_MODEL;
  }

  // Assembly:
  //   mov  edx, [ebx+0x1aa8]    ; edx = enginefuncs_t* (engine func table)
  //   dec  eax                  ; eax = validCount - 1  (max bound)
  //   push eax                  ; push max
  //   push 0                    ; push min
  //   call DWORD PTR [edx+0x168]  ; pfnRandomLong(0, validCount-1)
  //
  // enginefuncs_t entry 0x168/4 = 90 → pfnRandomLong (D.5 verify).
  const chosenIndex: number = ENGINE.RANDOM_LONG(0, validCount - 1);

  // ASM: `mov DWORD PTR [ebp+0x758], edx` — persists the chosen slot index
  // on the player so downstream (model assignment, HUD) knows which variant
  // to render. Happen ONLY on the success path; the two default-model
  // fallthroughs skip this write.
  pPlayer.modelVariant = chosenIndex;

  // ASM address arithmetic:
  //   lea eax,[esi+esi*8]      ; eax = teamIndex*9
  //   shl eax,2                ; eax = teamIndex*36
  //   sub eax,esi              ; eax = teamIndex*35
  //   (later re-does the same)
  //   shl edx,4                ; edx = chosenIndex*16
  //   lea eax,[edx+eax*4]      ; eax = chosenIndex*16 + teamIndex*140
  //   lea eax,[edi+eax*1+0x38] ; eax = &this->teams[teamIndex].models[chosenIndex]
  //
  // Returns a const char* pointing into the chosen slot. TS returns a string
  // copy; for the engine's read-only use that's behaviorally equivalent.
  return this.teams[teamIndex].models[chosenIndex];
}
