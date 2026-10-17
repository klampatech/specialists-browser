/**
 * CTSEmitter::InitThink — validates the linked target entity on first
 * activation. Looks up the entity targeted by this emitter's
 * `m_szTargetname`, confirms it is a `ts_particle`, and self-removes
 * otherwise.
 *
 * Called as the entity's first think after Spawn(). Has no success
 * work — the absence of removal is the signal to Spawn/InitThink's
 * caller that the link is valid.
 *
 * @param this  The CTSEmitter entity instance (this in the original C++)
 * @returns     void
 */
export function InitThink(this: CTSEmitter): void {
  // [edi + 0x80] is dereferenced as a const char* and pushed straight
  // to UTIL_FindEntityByTargetname — NO STRING() resolution is applied.
  // Therefore this is NOT pev->targetname (which is a string_t int at
  // entvars_t offset 0x80 and would require STRING()). It is a cached
  // `char* m_szTargetname` member that CTSEmitter stores as the
  // already-resolved target name, populated earlier (likely from
  // KeyValue / Spawn).
  const targetname: string = (this as any).m_szTargetname;

  // Walk the engine entity list from the start, looking for a targetname
  // match. NULL start means "from the beginning of the list".
  const target: any = UTIL_FindEntityByTargetname(null, targetname);

  // gpGlobals + 0x98 = pStringBase (the engine string table base).
  // Inlined as: *gpGlobals → *(gpGlobals + 0x98) →
  //   pStringBase + target->pev->classname.
  //
  // target->pev is at CBaseEntity offset 0; pev->classname is at
  // entvars_t offset 0 (so [edx] == classname for edx = pev).
  function resolveClassname(t: any): string {
    return STRING(t.pev.classname);
  }

  const expectedClassname = "ts_particle"; // .rodata: GOT-0x6ec79

  if (target === null) {
    // .rodata at GOT-0x6eb10 — content not surfaced by
    // strings-n5.txt; requires a `.rodata` dump to resolve.
    // TODO(asm-ambiguous): pull the actual format string from .rodata.
    ALERT(4, /* TODO_FMT_NO_TARGET */ "%s", targetname);
    UTIL_Remove(this);
    return;
  }

  if (resolveClassname(target) !== expectedClassname) {
    // Resolved from tools/decompile/analysis/strings-n5.txt line 4469.
    ALERT(4, "'%s' is definitely not a ts_particle.", targetname);
    UTIL_Remove(this);
    return;
  }

  // Success: target exists and is a ts_particle. No-op return —
  // any downstream think/install is the caller's job.
  // (Disassembly: `je 0x643a3` jumps straight to the epilogue.)
}
