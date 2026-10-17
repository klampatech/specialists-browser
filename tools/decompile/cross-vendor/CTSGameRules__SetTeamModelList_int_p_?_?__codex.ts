```typescript
/**
 * CTSGameRules::SetTeamModelList — split `modelList` on whitespace and copy
 * up to three model paths into this team's model-name slots, notifying the
 * engine interface after each slot is written.
 *
 * Per-team data layout (each team occupies 140 / 0x8c bytes):
 *   +0x00 .. +0x27 : team header (other fields)
 *   +0x28          : 16-byte team-name / base-path (printf arg)
 *   +0x38, +0x48, +0x58 : three 16-byte model-path slots
 *
 * @param this       The CTSGameRules entity instance
 * @param teamIndex  0-based index of the team whose model list to replace
 * @param modelList  Whitespace-delimited list of up to 3 model paths
 */
export function SetTeamModelList(
  this: CTSGameRules,
  teamIndex: number,
  modelList: string,
): void {
  // Offset to this team's record (140 / 0x8c bytes per team).
  // TODO(asm-ambiguous): team-record layout is inferred from observed offsets.
  const teamBase: any = (this as any) + teamIndex * 140;

  // Clear the three 16-byte model slots at teamBase+0x38 (48 bytes total).
  // The asm does `rep stosDWORD` with ecx=12 (12 dwords = 48 bytes).
  for (let i = 0; i < 48; i++) {
    teamBase[0x38 + i] = 0;
  }

  // Tokenize the model list on whitespace. Bail out on an empty list.
  // TODO(asm-ambiguous): delimiter is a static C string at GOT-0x6ed73.
  let tok: string | null = strtok(modelList, strtokDelimiter);
  if (tok === null || tok === "") return;

  // Engine interface singleton (cached global at GOT+0x1aa8,
  // likely gEngfuncs or similar client interface; vtable slot 0xf4 below).
  const engine: any = g_enginePtr;

  // Process up to three slots, notifying the engine after each write.
  const SLOT_OFFSETS = [0x38, 0x48, 0x58];
  for (let i = 0; i < SLOT_OFFSETS.length; i++) {
    const slotAddr: any = teamBase + SLOT_OFFSETS[i];

    // Copy the current token into slot[i].
    strcpy(slotAddr, tok);

    // Advance the token cursor for the next iteration's exit check.
    tok = strtok(null, strtokDelimiter);

    // Notify the engine: (level=1, format, modelPath, teamPath).
    // TODO(asm-ambiguous): format string is a static C string at GOT-0x6e6ae.
    engine.vfn0xf4(1, modelNotifyFormat, slotAddr, teamBase + 0x28);

    // Stop once the list is exhausted.
    if (tok === null || tok === "") break;
  }
}
```
