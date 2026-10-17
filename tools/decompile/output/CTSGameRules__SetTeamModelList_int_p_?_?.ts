// --- stubs so this file compiles in isolation ---
// Real definitions land in D.5 / engine wiring.

type CTSGameRules = unknown;

declare const g_enginePtr: { vfn0xf4: (level: number, fmt: string, modelPath: any, teamHeader: any) => void };
declare const strtokDelimiter: string; // PIC @ GOT-0x6ed73
declare const modelNotifyFormat: string; // PIC @ GOT-0x6e6ae

declare function strcpy(dst: any, src: string): void;
declare function strtok(str: string | null, delim: string): string | null;

// --- constants ---

const TEAM_RECORD_SIZE   = 140;          // 0x8c bytes per team record
const TEAM_HEADER_OFFSET = 0x28;         // team-name / format arg
const MODEL_SLOT_OFFSETS = [0x38, 0x48, 0x58];
const MODEL_SLOT_BYTES   = 0x10;         // 16 bytes per model-path slot
const MODEL_SLOTS_TOTAL  = MODEL_SLOT_BYTES * MODEL_SLOT_OFFSETS.length; // 48

/**
 * CTSGameRules::SetTeamModelList — split `modelList` on whitespace and copy
 * up to three model paths into this team's model-name slots, notifying the
 * engine interface after each slot is written.
 *
 * Demangler: `SetTeamModelList__12CTSGameRulesiPCc`
 *   i = int teamIndex
 *   Pc = const char* modelList
 *   c  = ?  (third explicit arg per demangler; see D.4 follow-up —
 *            asm does not dereference [esp+0x24c] on this codepath)
 */
export function SetTeamModelList(
  this: CTSGameRules,
  teamIndex: number,
  modelList: string,
): void {
  // teamBase = this + teamIndex * 140   (asm: lea eax,[edx+edx*8]; shl 2;
  //                                       sub edx; shl 2 → edx*140)
  const teamBase = (this as any) + teamIndex * TEAM_RECORD_SIZE;

  // Clear the three 16-byte model-path slots at teamBase+0x38 (48 bytes).
  // Asm: `rep stosDWORD` with ecx=12 = 48 bytes. Use a bulk fill to match  // the dword-granular intent.
  // (Replace with `teamBase.fill(0, 0x38, 0x38 + MODEL_SLOTS_TOTAL)` once
  // teamBase is modeled as a Uint8Array; for now mirror the asm.)
  for (let i = 0; i < MODEL_SLOTS_TOTAL; i++) {
    (teamBase as any)[0x38 + i] = 0;
  }

  // Preserve the caller's `modelList` across strtok's in-place mutation.
  // Asm: `sub esp,0x8; push modelList; lea esi,[esp+0x2c]; push esi;
  //       call strcpy@plt` — copies modelList into a local stack buffer.
  // In a TS port this is effectively a no-op (strings are immutable) but
  // we mirror the asm for fidelity and so a future C-bridge strtok can't
  // silently corrupt the caller's buffer.
  const localBuf = modelList;

  // First token.
  let tok: string | null = strtok(localBuf, strtokDelimiter);
  if (tok === null || tok === "") return;

  // Engine interface singleton — loaded once (asm: mov eax,[ebx+0x1aa8];
  // saved to local frame).
  const engine = g_enginePtr;

  // Up to three (model-path slot, engine-notify) pairs.
  for (let i = 0; i < MODEL_SLOT_OFFSETS.length; i++) {
    const slotAddr = (teamBase as any) + MODEL_SLOT_OFFSETS[i];

    // Write current token into the slot.
    strcpy(slotAddr, tok);

    // Advance cursor for the next iteration's exit check.
    tok = strtok(null, strtokDelimiter);

    // Engine notification: engine->vfn(level=1, fmt, slotAddr, teamHeader).
    // Asm pushes (1, fmt, slotAddr, teamBase+0x28) then calls [eax+0xf4].
    engine.vfn0xf4(1, modelNotifyFormat, slotAddr, (teamBase as any) + TEAM_HEADER_OFFSET);

    // Exit if the model list is exhausted (null or empty token).
    if (tok === null || tok === "") break;
  }
}
