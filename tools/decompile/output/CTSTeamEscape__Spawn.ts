/**
 * CTSTeamEscape::Spawn — initialise a CTSTeamEscape (TS team-escape
 * zone) when it is first placed in the world.
 *
 * Field offsets are taken directly from the disassembly. Field-name
 * assignments to SOLID/MOVETYPE enums and to the class members are
 * inferred from GoldSrc conventions and the class context; see TODOs
 * where the disassembly is ambiguous.
 *
 * @param this  The CTSTeamEscape entity instance
 */
export function Spawn(this: CTSTeamEscape): void {
  const pev = this.pev as any;

  // ---- SET_MODEL --------------------------------------------------------
  // The disassembly performs two distinct operations here:
  //   (a) compute a model-string offset = (string_ptr - gpGlobals.stringBase)
  //       and store the result at pev + 0x00;
  //   (b) call an engine-side function (via [ebx+0x1aa8]+0x8) with
  //       args (pev + 0x208, gpGlobals.stringBase + pev->0xb8),
  //       i.e. pass the edict-like pointer at pev+0x208 plus the
  //       model string reconstructed from pev+0xb8 (treated as a
  //       string_t).
  // The model filename string at [ebx - 0x6cd6e] and the meaning of
  // pev+0x208 are NOT recoverable from this chunk; abstracted to a
  // single engine call.
  engineSetModel(pev);

  // ---- Bounding box + origin -------------------------------------------
  // UTIL_SetSize(pev, &pev.mins, &pev.maxs). mins is at pev+0xdc,
  // maxs at pev+0xe8 in this build (non-standard offsets — TS may
  // have an extended entvars_t; verify in D.5).
  UTIL_SetSize(pev, pev.mins, pev.maxs);

  // UTIL_SetOrigin(pev, &pev.origin) — origin is at pev+0x08.
  UTIL_SetOrigin(pev, pev.origin);

  // ---- Engine physics / state ints -------------------------------------
  // Disassembly order: 0x118=0x80, 0x10c=1, 0x1a4=0, 0x108=5.
  // Reordered here for readability (independent stores).
  //
  // TODO: value5 at pev+0x108 conflicts with HLSDK's SOLID_BSP=4.
  //       Verify the field name `solid` and the enum value against
  //       TS's actual entvars_t / Solid enum definitions before
  //       committing to this mapping. Likely candidates: SOLID_PORTAL
  //       (some forks) or a TS-specific solid type.
  // TODO: value 1 at pev+0x10c conflicts with HLSDK's MOVETYPE_NONE=0.
  //       Likely candidates: MOVETYPE_WALK, MOVETYPE_PUSH, or a  //       TS-specific movetype.
  pev.solid = 5;          // pev + 0x108
  pev.movetype = 1;       // pev + 0x10c
  pev.field_0x118 = 0x80; // pev + 0x118 — int field, semantics unclear
  pev.field_0x1a4 = 0;    // pev + 0x1a4 — int field, cleared

  // ---- Class-internal flag ---------------------------------------------
  // *(uint8*)(this+0x64) = 0 (disassembly 7d43b).
  // The class has an EnableObjective(bool) method, so this is plausibly
  // m_bObjectiveActive / m_bEnabled. Renamed as a placeholder.
  this.objectiveActive = 0;

  // ---- Two (sentinel, fn-pointer) pairs --------------------------------
  // Disassembly stores (sentinel=0xFFFF0000, fnptr) at offsets
  // (this+0x14, this+0x18) first, then (this+0xc, this+0x10).
  // TODO: 0xFFFF0000 is a negative NaN as float32, -65536 as int32,
  //       and {0x0000, 0xFFFF} as two packed int16s. Do NOT assume
  //       "time" semantics — the disassembly does not support them.
  //       Field names below use "sentinel" to stay honest about the
  //       ambiguity.
  this.scheduleB_sentinel = 0xFFFF0000; // this + 0x14
  this.scheduleB_fn = 0;                // this + 0x18, GOT-resolved [ebx+0x196c]
  this.scheduleA_sentinel = 0xFFFF0000; // this + 0xc
  this.scheduleA_fn = 0;                // this + 0x10, GOT-resolved [ebx+0x1a34]

  // ---- First scheduled think -------------------------------------------
  // pev.nextthink = gpGlobals.time + delay.
  // The delay is an 8-byte double constant at [ebx - 0x6f018] in
  // binary rodata — NOT recoverable from this chunk. Replace `0`
  // with the actual constant (cross-reference D.5 / data-symbol
  // listing for the double at .rodata offset -0x6f018) or wire it
  // through a named parameter.
  // pev + 0x104 is stored as a 32-bit float.
  pev.nextthink = (gpGlobals as any).time + 0; // TODO: delay constant

  // ---- Zero internal state ---------------------------------------------
  // 33 dwords (132 bytes) at this+0x6c via `rep stosd`, plus a
  // single dword clear at this+0xf0.
  memset(this.internalState, 0, 132);
  this.field_0xf0 = 0;
}
