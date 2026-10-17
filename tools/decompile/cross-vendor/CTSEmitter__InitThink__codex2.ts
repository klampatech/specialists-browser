/**
 * CTSEmitter::InitThink — validates the linked target entity on first
 * activation and self-removes if the target is missing or of the wrong
 * class. Faithful port of the 32-bit x86 disassembly at 0x00064308.
 */
export function InitThink(this: any /* CTSEmitter */): void {
  // [edi+0x80] -> pev->targetname (entvars_t::targetname at +0x80, pev at
  // +0 on CBaseEntity, so this is `pev->targetname` — a string_t int).
  // The disassembly passes the raw pointer to UTIL_FindEntityByTargetname;
  // the engine-side macro does STRING() resolution on the candidate
  // entities it iterates.
  const target = UTIL_FindEntityByTargetname(null, this.pev.targetname);

  if (target === null) {
    // Branch 1: no entity with this targetname. Disassembly: alert at
    // level 4 with format string at .rodata (GOT-0x6eb10), then
    // UTIL_Remove(this) at 0x6439b.
    ALERT(4 /* at_warning */, "<fmt @ GOT-0x6eb10>", this.pev.targetname);
    UTIL_Remove(this);
    return;
  }

  // STRING() inlined as the canonical 3-step indirection:
  //   [ebx+0x1600] -> &gpGlobals
  //   *(&gpGlobals) -> gpGlobals
  //   gpGlobals+0x98 -> pStringBase
  //   + target->pev->classname (string_t int) -> const char*.
  const actualClass: string = STRING(target.pev.classname);
  const expectedClass: string = "<literal @ GOT-0x6ec79>"; // e.g. classname

  if (actualClass !== expectedClass) {
    // Branch 2: strcmp returned nonzero. Disassembly: same alert dispatch,
    // then UTIL_Remove(this) at 0x6439b. On success (je 643a3) control
    // falls straight through to the epilogue with no side effects.
    ALERT(4 /* at_warning */, "<fmt @ GOT-0x6eaf0>", this.pev.targetname);
    UTIL_Remove(this);
    return;
  }

  // Success: target exists and class matches; no follow-up think scheduled.
}
