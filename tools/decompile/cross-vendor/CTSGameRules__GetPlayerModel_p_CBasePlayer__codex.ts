```typescript
// Ambient engine helpers — normally provided by the specialists-browser runtime.
declare function ptrOf(o: any): number;
declare function readByte(addr: number): number;
declare function readCString(src: any, offset: number): string;
declare function writeU32(addr: number, value: number): void;
declare const engine: { RandomLong(lo: number, hi: number): number };

// Global empty-string fallback used when the team is unknown or has no
// enabled skin slots. Backed by a static "" in the binary at `ebx - 0x6f7b9`.
const DEFAULT_MODEL_PATH: string = "";

/**
 * CTSGameRules::GetPlayerModel — pick a model path for `target` from a
 * per-team skin table baked into the player's record. One of the team's
 * enabled skin slots is chosen at random; if the team is unknown or no
 * slots are enabled, the default empty-string model is returned.
 *
 * As a side effect, the chosen slot index is cached at `viewer + 0x758`
 * (a `m_iLastModelSlot`-style field), so subsequent lookups for the same
 * viewer re-use the slot.
 *
 * @param this     The CTSGameRules entity (method receiver).
 * @param target   The player whose model path is being looked up. The
 *                 per-team skin table lives inside this entity's struct
 *                 (140 bytes per team, three 16-byte slots per team).
 * @param viewer   A CBasePlayer whose team-name field (offset 0xb48)
 *                 selects which team's skin block to pick from.
 * @returns        The chosen model path string, or `DEFAULT_MODEL_PATH`.
 */
export function GetPlayerModel(
  this: any,           // TODO: CTSGameRules — full class shape is D.4
  target: any,         // TODO: CBasePlayer
  viewer: any,         // TODO: CBasePlayer (demangler only listed one arg)
): string {
  // 1) Resolve the team index via the viewer's stored team name.
  //    TODO(asm-ambiguous): confirm whether +0xb48 is an inline char[] or
  //    a char*; HLSDK layout is not authoritative for TS.
  const teamName: string = readCString(viewer, 0xb48);
  const teamIdx: number = this.GetTeamIndex(target, teamName);
  if (teamIdx === -1) {
    return DEFAULT_MODEL_PATH;
  }

  // 2) Count how many of the team's three skin slots are enabled.
  //    The per-team block is 140 bytes; the three slots sit at offsets
  //    +0x38, +0x48, +0x58 within the block (16-byte stride), each
  //    starting with a 1-byte "enabled" flag at the slot base.
  const teamBase: number = ptrOf(target) + teamIdx * 140;
  const slotFlags: number[] = [
    readByte(teamBase + 0x38),
    readByte(teamBase + 0x48),
    readByte(teamBase + 0x58),
  ];
  const enabledCount: number = slotFlags.filter((f) => f !== 0).length;
  if (enabledCount === 0) {
    return DEFAULT_MODEL_PATH;
  }

  // 3) Pick a random enabled slot and cache the choice on the viewer.
  const slotIdx: number = engine.RandomLong(0, enabledCount - 1);
  writeU32(ptrOf(viewer) + 0x758, slotIdx);

  // 4) Return the model path stored at the chosen slot.
  return readCString(ptrOf(target) + teamIdx * 140 + slotIdx * 16 + 0x38);
}
```
