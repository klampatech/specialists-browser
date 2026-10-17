// --- Stubs so this file compiles in isolation ---
// PIC base (runtime: 0x67f6c + 0xfdea4 = 0x167c10). The disassembly
// references rodata/data via [ebx+offset]; we model them as a typed
// `globals` object. Every offset is left as a comment for traceability.

interface TeamSlot {
  // [0x00..0x04) int — color (written from globals.colorSource.field0xc
  // as a float, then FTOL'd to int via the fnstcw/or 0xc/fldcw dance).
  // TODO(asm-ambiguous): purpose inferred from operation, not from a
  // named field in the disassembly.
  color: number;
  // [0x04..0x08) int — purpose unknown. Zeroed in InitTeams.
  // TODO(asm-ambiguous).
  unknown_0x04: number;
  // [0x08..0x0c) int — purpose unknown. Zeroed in InitTeams.
  // TODO(asm-ambiguous).
  unknown_0x08: number;
  // [0x0c..0x4c) char[64] — long team name (sprintf'd with
  // globals.fmtLongName and i+1).
  // TODO(asm-ambiguous): 64-byte size inferred from the next field's
  // offset; not asserted by the disassembly.
  nameLong: string;
  // [0x4c..0x6c) char[32] — short team name (sprintf'd with
  // globals.fmtShortName and i+1).
  // TODO(asm-ambiguous): 32-byte size inferred.
  nameShort: string;
  // [0x6c..0x88) char[28] — model list. The per-team loop copies 23
  // bytes from globals.defaultModelList; the post-loop mode-2/3 branch
  // overwrites the first 18 bytes from globals.modeModelList0.
  // TODO(asm-ambiguous): 28-byte size inferred.
  modelList: Uint8Array;
}

declare class CTSGameRules {
  // [this+0x00] byte — game mode. 2 and 3 trigger the post-loop
  // override block. Could be a base CBaseEntity field (pev->team,
  // pev->solid) or a TS-specific m_iGameMode; the disassembly only
  // tells us a byte is read at offset 0.
  // TODO(asm-ambiguous).
  modeByte: number;
  // [this+0x1c..this+0x24c) — the 4-team roster, each slot 0x8c bytes.
  teams: TeamSlot[];
}

type Globals = {
  // [ebx+0x1ba8] = pointer to a struct whose [0xc] is a float color.
  // TODO(asm-ambiguous): which global (HUD, team config, singleton)?
  readonly colorSource: { readonly field0xc: number };
  // [ebx-0x6e700] = rodata, fmt string for the long team name.
  // TODO(asm-ambiguous): exact contents (likely "Team %d" or similar).
  readonly fmtLongName: string;
  // [ebx-0x6e6f9] = rodata, fmt string for the short team name.
  // TODO(asm-ambiguous): exact contents.
  readonly fmtShortName: string;
  // [ebx-0x6e7e0] = 23-byte blob (5 dwords + 1 word + 1 byte) copied
  // into every team.modelList. Probably a base model entry plus a
  // null terminator. TODO(asm-ambiguous): exact contents.
  readonly defaultModelList: Uint8Array;
  // [ebx-0x63a30] = 4-entry table of C-strings, 512 bytes per entry.
  // The disassembly reads a pointer at i*0x200 stride; we model the
  // result as a 4-string array.
  // TODO(asm-ambiguous): the 512-byte stride and the C-string
  // assumption are inferred from how SetTeamModelList consumes it.
  readonly modelPathTable: readonly [string, string, string, string];
  // [ebx-0x6e6e6] = mode-2/3 override for team 0's model list.
  // TODO(asm-ambiguous): exact contents.
  readonly modelOverride0: string;
  // [ebx-0x6cee6] = mode-2/3 override for team 1's model list.
  // TODO(asm-ambiguous): exact contents.
  readonly modelOverride1: string;
  // [ebx-0x6e6e1] = mode-2/3 team list string.
  // TODO(asm-ambiguous): exact contents.
  readonly teamListString: string;
  // [ebx-0x6e7c9] = 18-byte mode-2/3 model list (4 dwords + 1 word)
  // written over the first 18 bytes of team[0].modelList.
  // TODO(asm-ambiguous): exact contents.
  readonly modeModelList0: Uint8Array;
};

declare const globals: Globals;

// CRT helpers. Modeled as void / typed-buffer writes so the call
// sites are honest about where the data lands.
declare function memset(
  dst: ArrayBufferView | ArrayBuffer | number,
  value: number,
  size: number
): void;
declare function memcpy(
  dst: ArrayBufferView | ArrayBuffer | number,
  src: ArrayBufferView | ArrayBuffer | number,
  size: number
): void;
declare function sprintf(
  buf: ArrayBufferView | ArrayBuffer | number,
  fmt: string,
  ...args: unknown[]
): void;

// Sibling methods (full D.4 implementations are out of scope here).
declare function SetTeamModelList(
  this: CTSGameRules,
  teamIndex: 0 | 1 | 2 | 3,
  modelPath: string
): void;
declare function SetTeamList(this: CTSGameRules, list: string): void;

// --- Function under review ---

/**
 * CTSGameRules::InitTeams — initialize the 4-team roster from per-team
 * format strings, a color float global, a model list blob, and a model
 * path table. When this.modeByte is 2 or 3, also override teams 0/1
 * model lists and replace the team list string.
 *
 * Demangled: `CTSGameRules::InitTeams()` (no args besides `this`).
 * Address:   0x00067f60, 380 bytes.
 */
export function InitTeams(this: CTSGameRules): void {
  // 1) Zero the 4-team roster. Disassembly: `rep stosd` with ecx = 0x8c
  //    starting at this+0x1c → 0x8c dwords = 0x230 bytes.
  memset(this.teams, 0, 0x230);

  // 2) Per-team init, 4 iterations (i = 0..3). The disassembly uses
  //    `ebp` for the sprintf %d (i+1) and [esp+0x10] for the loop
  //    counter; we use a single JS `i` for both since `i + 1` is
  //    trivial to express inline.
  for (let i = 0; i <= 3; i++) {
    const team = this.teams[i];

    // Zero two unknown fields. Disassembly: writes 0 at edx+this+0x10
    // and edx+this+0x14, where edx = i*0x8c + 0x10 — i.e. team+0x04
    // and team+0x08.
    team.unknown_0x04 = 0;
    team.unknown_0x08 = 0;

    // Color: read a float from the global struct, FTOL'd to int. The
    // fnstcw / `or BYTE PTR [esp+0x19], 0xc` / fldcw dance sets
    // truncation rounding, which for normal floats is equivalent to
    // `(x | 0)` or `Math.trunc`.
    team.color = (globals.colorSource.field0xc as number) | 0;

    // Long name. Disassembly: sprintf(this+i*0x8c+0x28, fmtLongName,
    //   i+1). The 0x28 in the `this + i*0x8c` frame is 0x0c within the
    //   team slot.
    sprintf(team.nameLong, globals.fmtLongName, i + 1);
    // Short name. Disassembly: sprintf(this+i*0x8c+0x68, fmtShortName,
    //   i+1). The 0x68 in the `this + i*0x8c` frame is 0x4c within the
    //   team slot.
    sprintf(team.nameShort, globals.fmtShortName, i + 1);
    // Default model list. Disassembly: 5 dwords + 1 word + 1 byte
    // (= 23 bytes) from globals.defaultModelList to this+i*0x8c+0x88
    // (== team+0x6c).
    memcpy(team.modelList, globals.defaultModelList, 23);
    // Set the per-team model path. Disassembly: pointer at
    //   globals.modelPathTable + i*0x200 (512-byte stride).
    SetTeamModelList(this, i as 0 | 1 | 2 | 3, globals.modelPathTable[i]);
  }

  // 3) Mode-specific overrides when this.modeByte is 2 or 3.
  //    Disassembly: `sub al, 2; cmp al, 1; ja <epilogue>`. The `ja`
  //    is unsigned, so we fall through only for al ∈ {2, 3}.
  if (this.modeByte === 2 || this.modeByte === 3) {
    SetTeamModelList(this, 0, globals.modelOverride0);
    SetTeamModelList(this, 1, globals.modelOverride1);
    SetTeamList(this, globals.teamListString);
    // Overwrite the first 18 bytes of team[0].modelList.
    // Disassembly: 4 dwords + 1 word (= 18 bytes) from
    //   globals.modeModelList0 to this+0x88 (== team[0]+0x6c).
    memcpy(this.teams[0].modelList, globals.modeModelList0, 18);
  }
}
