/**
 * CTSObjectivePointer::Spawn — initialize the objective-pointer entity.
 *
 * Faithful decompilation of the 147-byte body at 0x0007bb44 in
 * ts/dlls/ts_i386.so. The function is unconditional: no branches,
 * returns void, writes nine fields in a fixed order, then schedules
 * the first delayed think.
 *
 * @param this  The CTSObjectivePointer instance (`pev` lives at offset 0
 *              of the entity, as in vanilla CBaseEntity).
 */
export function Spawn(this: any /* CTSObjectivePointer */): void {
  // ── PIC / GOT setup ─────────────────────────────────────────────────
  // `call $+5; pop ebx; add ebx, GOT_OFF` produces EBX = the GOT base.
  // The four GOT-relative operands we care about:
  //   [ebx + 0x1600]  — slot holding the address of `gpGlobals`
  //   [ebx - 0x6cebf] — address of the classname string literal
  //   [ebx - 0x6ecd0] — 8-byte double-precision delay constant
  // gpGlobals[0x98] is a relocation adjustment slot (linker-written),
  // not a meaningful field.
  const gpGlobals: any =
    /* [GOT + 0x1600] — pointer to globalvars_t; resolved by the loader */
    null as any; // TODO(decompile): wire up to the engine singleton

  // 0.1 s — verify by reading the 8 bytes at [ebx - 0x6ecd0] in the binary.
  const NEXT_THINK_DELAY_SEC = 0.1;

  // ── pev = this[0] (entvars_t*, first field of every CBaseEntity) ─────
  const pev: any = this.pev ?? this[0];

  // ── pev->classname = "<classname literal>" (PIC-fixed at load time) ──
  // Disassembly: lea eax, [ebx - 0x6cebf] ; sub eax, [gpGlobals + 0x98]
  // The value is a pointer into the engine's string table.
  pev.classname = 0 /* TODO(decompile): resolve by reading the literal at
                       [ebx - 0x6cebf] against tools/decompile/analysis/
                       strings-n5.txt; */;

  // ── pev[0x118] = 0x80 ────────────────────────────────────────────────
  // TS-specific flag/identity. TODO(decompile): confirm whether this is a
  // bit-flag or a small integer field; verify against TS headers.
  pev[0x118] = 0x80;

  // ── zero three pev fields: 0x10c, 0x1a4, 0x108 ──────────────────────
  // Order in disassembly: 0x10c, 0x1a4, 0x108.
  pev[0x10c] = 0;
  pev[0x1a4] = 0;
  pev[0x108] = 0;

  // ── zero four this-side fields (vec3_t + one dword) ────────────────
  // Disassembly order: this[0x14], this[0x18], this[0x0c], this[0x10].
  // The first three are likely a vec3_t (cached origin / m_vecGoal1);
  // the last is a single dword (m_iGoalIndex or a state byte).
  this[0x14] = 0;
  this[0x18] = 0;
  this[0x0c] = 0;
  this[0x10] = 0;

  // ── pev->nextthink = gpGlobals->time + NEXT_THINK_DELAY_SEC ─────────
  // Disassembly: fld QWORD [ebx - 0x6ecd0]; fadd DWORD [gpGlobals + 0];
  //              fstp DWORD [pev + 0x104]
  // gpGlobals->time sits at offset 0 of vanilla globalvars_t. The store
  // offset 0x104 is the TS-extended nextthink field (vanilla nextthink
  // is ~0x84; TS has clearly grown entvars_t).
  pev[0x104] /* nextthink (TS-extended) */ =
    (gpGlobals.time as number) + NEXT_THINK_DELAY_SEC;
}
