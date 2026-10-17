```typescript
/**
 * CTSGameRules::SetTeamList — tokenize a team-list string and populate
 * the 4 team slots in CTSGameRules (with optional "default teams" override).
 *
 * @param this  The CTSGameRules entity instance (this in the original C++)
 * @param pList Whitespace-delimited list of team names
 *              (e.g. "blue red green yellow")
 * @returns     void
 */
export function SetTeamList(this: CTSGameRules, pList: string): void {
  // Clear the first byte of each of the 4 team slots.
  // (Slots live at this+0x28, +0xb4, +0x140, +0x1cc; each 0x8c bytes apart.)
  writeByte(this, 0x1cc, 0);
  writeByte(this, 0x140, 0);
  writeByte(this, 0x0b4, 0);
  writeByte(this, 0x028, 0);

  // Copy pList into a stack-local buffer so strtok can mutate it.
  // TODO: original C does `char buf[N]; strcpy(buf, pList);` with N unknown.
  const localBuf: string = pList;

  // Tokenize. Delimiter is a global string at [ebx-0x6ed73] (likely a space).
  // TODO(asm-ambiguous): confirm literal from tools/decompile/analysis/strings-n5.txt.
  let token: string | null = strtok(localBuf, " ");

  // Max teams: 4 if *teamCountCvar == 0, else 2.
  // (Cvar pointer at [ebx+0x12cc]; value is read via indirection.)
  // TODO(asm-ambiguous): identify the cvar (likely mp_teamlimit or similar).
  const teamCountCvarPtr: number = (this as any).__cvar_teamcount;
  const maxTeams: number = (*teamCountCvarPtr === 0) ? 4 : 2;

  let i = 0;

  // Early exit: no token, empty token, or counter already at max.
  if (token === null || token === "" || i >= maxTeams) {
    return;
  }

  // curAddr → slot to write this iteration; prevAddr → slot written last iter.
  // (prevAddr starts one entry below slot 0 so the first += 0x8c lands on slot 0.)
  let curAddr: number = (this as any).address + 0x28;
  let prevAddr: number = (this as any).address - 0x64;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (i === 0 && *teamCountCvarPtr !== 0) {
      // First slot: install built-in default name + model ptrs instead
      // of copying the first token. Skip the strcpy.
      // Default name at [ebx-0x6e6c9]; default model at [ebx-0x6e6c5].
      // TODO(asm-ambiguous): confirm the default strings.
      writeDword(this, 0x28, (this as any).__default_team_name);
      writeDword(this, 0x2c, (this as any).__default_team_model);
      prevAddr = (this as any).address + 0x28; // slot 0
      curAddr = (this as any).address + 0xb4;  // slot 1 (next)
      i = 1;
    } else {
      // Copy the current token into the current slot's name buffer.
      strcpy(curAddr, token);
      prevAddr += 0x8c;
      curAddr += 0x8c;
      i++;
    }

    // Fetch the next token.
    token = strtok(null, " ");

    // Notify a global team object via vtable.
    // Object at [ebx+0x1aa8]; vtable entry at offset 0xf4.
    // Format/template string at [ebx-0x6e6c1].
    // TODO(asm-ambiguous): identify the global (likely a team manager or
    // HUD entity) and what the dispatched method actually does.
    callVTableMethod(
      /* object */ (this as any).__team_global_obj,
      /* vtable */ 0xf4,
      /* a1 */ 1,
      /* a2 */ (this as any).__team_fmt_str,
      /* a3 */ prevAddr
    );

    // Loop exit conditions.
    if (token === null || token === "") break;
    if (i >= maxTeams) break;
  }
}
```
