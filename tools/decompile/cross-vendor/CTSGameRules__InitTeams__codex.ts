```typescript
/**
 * CTSGameRules::InitTeams — initializes the team roster (4 teams) from
 * per-team strings, color cvar, and model-path globals; in 2- and 3-team
 * game modes it also re-points teams 0/1 to alternate model strings and
 * replaces the team-0 model list.
 *
 * @param this  The CTSGameRules entity (this in the original C++).
 * @returns     void
 */
export function InitTeams(this: CTSGameRules): void {
  const teamsBase = this + 0x1c;                 // teams[0] starts at +0x1c
  const colorGlobal = (this.getGlobal /* [ebx+0x1ba8] */ as { field0xc: number });
  const teamListGlobal = (this.getGlobal as { at: (i: number) => string });

  // Zero the 4-team roster (4 × 140 = 560 = 0x230 bytes).
  memset(teamsBase, 0, 0x230);

  // Cache a pointer to this + 0xc (used as base for color writes).
  const thisField0xc = this + 0xc;

  // Format strings read from the rodata table (ebx ± GOT offset).
  // TODO(asm-ambiguous): exact strings — first 7 bytes are "Team %d\0",
  // the second 7 bytes are likely the short form ("team%d\0").
  const fmtName1 = (this.getGlobal as any).fmt_team_full;     // ebx-0x6e700
  const fmtName2 = (this.getGlobal as any).fmt_team_short;    // ebx-0x6e6f9

  // The 23-byte model-list blob copied into every team.model_list.
  // 5 dwords + 1 word + 1 byte — probably (count,skin,?,?,?,?,?) or a
  // fixed 22-char model path + null. Source at ebx-0x6e7e0.
  const modelListBlob = (this.getGlobal as any).teamModelListBlob; // ebx-0x6e7e0

  // Per-team model path table: 4 entries × 512 bytes, base at ebx-0x63a30.
  const modelPathTableBase = (this.getGlobal as any).teamModelPathTable; // ebx-0x63a30

  let teamNumber = 0;                            // ebp (loop counter + 1)
  for (let teamIndex = 0; teamIndex <= 3; teamIndex++) {
    const team = teamsBase.add(teamIndex * 140); // team[i] = this+0x1c+i*140

    // Two fields at offset +4 and +8 are zeroed.
    team.field_0x04 = 0;
    team.field_0x08 = 0;

    // Read the team color from the global's float at offset 0xc and
    // round-trip it through the FPU to land an int in team[0]+0.
    // (Standard MSVC FTOL pattern: fld; fnstcw; or 0x0c; fldcw; fistp; fldcw)
    // TODO(asm-ambiguous): which global — cvar or HUD struct?
    const colorFloat = colorGlobal.field0xc;
    team.color = Math.trunc(colorFloat);         // team[i].color (offset 0)

    // teamNumber = teamIndex + 1 (1..4) — used for the sprintf %d
    // and as the human-readable team number.
    teamNumber = teamIndex + 1;

    // sprintf(team.name1, fmt_team_full, teamNumber)
    //   name1 lives at team+0x0c (64-byte buffer).
    team.name1 = sprintf(fmtName1, teamNumber);

    // sprintf(team.name2, fmt_team_short, teamNumber)
    //   name2 lives at team+0x4c (32-byte buffer).
    team.name2 = sprintf(fmtName2, teamNumber);

    // memcpy(team.model_list, modelListBlob, 23)
    //   model_list lives at team+0x6c (32-byte buffer; first 23 used).
    memcpy(team.model_list, modelListBlob, 23);

    // SetTeamModelList(this, teamIndex, modelPathTableBase[teamIndex])
    //   Each table entry is 512 bytes wide; we read the pointer for slot i.
    const modelPath = modelPathTableBase.add(teamIndex * 512).readCString();
    SetTeamModelList(this, teamIndex, modelPath);
  }

  // Mode-specific extra init: only when the gamemode byte at this[0]
  // is exactly 2 or 3. (cmp al, 0x1; ja = skip if (al-2) > 1.)
  const mode = this.modeByte;                    // *((byte*)this)
  if (mode === 2 || mode === 3) {
    // Override team 0's model path with string1 (ebx-0x6e6e6).
    SetTeamModelList(this, 0, (this.getGlobal as any).teamModelOverride0);
    // Override team 1's model path with string2 (ebx-0x6cee6).
    SetTeamModelList(this, 1, (this.getGlobal as any).teamModelOverride1);
    // Set the team-list string (ebx-0x6e6e1) — replaces the default
    // team roster with a mode-specific one.
    SetTeamList(this, (this.getGlobal as any).teamListString);

    // Overwrite the first 18 bytes of team[0].model_list
    // (4 dwords + 1 word = 18 bytes) with data from another global
    // (ebx-0x6e7c9).  This is mode-specific model info that trumps
    // the per-team blob copied in the loop above.
    const modeModelList = (this.getGlobal as any).modeModelList0; // ebx-0x6e7c9
    memcpy(teamsBase.add(0x6c), modeModelList, 18);
  }
}
```
