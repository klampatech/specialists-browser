/**
 * CTSAmmoPack::Spawn — initialize a CTSAmmoPack entity on spawn.
 * Mirrors `Spawn__11CTSAmmoPack` @ 0x000913f4 (329 B) in ts_i386.so.
 *
 * @param this  CTSAmmoPack instance.
 */
export function Spawn(this: CTSAmmoPack): void {
  // PIC / GOT setup: ebx = 0x101e10 by the prologue.
  // All [ebx±offset] accesses below resolve to globals (cvars,
  // engine function table, rodata constants).

  // ── 1. Parent-class virtual call ────────────────────────────
  // eax = [esi+0x60] (vtable ptr, possibly a secondary MI base);
  // call [eax+0x28] (vtable[10]) with `this` as arg1.
  // TODO(asm-ambiguous): what exactly is at offset 0x60 — true MI
  // sub-object vtable, or a hand-rolled interface table. D.4.
  this.callBaseVFunc(0x28, this);

  // ── 2. SET_MODEL via g_engfuncs.pfnSetModel ─────────────────
  // Disassembly:
  //   ecx   = *(this+0)               ← first field of `this`, i.e. pev
  //   edx   = *(ebx+0x1aa8)           ← g_engfuncs
  //   eax   = lea [ebx-0x6bcd4]       ← rodata: model name
  //   push eax                        ← arg2 = model name
  //   push [ecx+0x208]                ← arg1 = *(pev+0x208)  (TWO LEVELS)
  //   call [edx+0x8]                  ← pfnSetModel at offset 8
  // The TS as supplied read this as `this.field_0x208` (one level)
  // — fixed below to walk through `pev` first.
  // TODO(decompile-D.4): `pev+0x208` is beyond standard entvars_t;
  // identifies the TS-extended slot and the meaning of the value
  // stored there (likely an entvars_t* to a target entity).
  g_engfuncs.pfnSetModel(this.pev.field_0x208, MODEL_NAME_RODATA);

  // ── 3. Visual properties on pev ─────────────────────────────
  this.pev.colormap = 6;   // pev+0x108 (TS-extended)
  this.pev.skin     = 2;   // pev+0x10c (TS-extended)

  // ── 4. UTIL_SetOrigin(pev, &pev->origin) ────────────────────
  // push (pev+8); push pev; call UTIL_SetOrigin
  // (pev+8 == &pev->origin because origin is the 2nd Vector field
  // at offset 8 in entvars_t.)
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // ── 5. UTIL_SetSize(pev, mins, maxs) — uniform cube ─────────
  // Half-extent is the cvar/constant at [ebx-0x6f408].
  // mins = maxs = (half-extent, half-extent, half-extent).
  // TODO(asm-ambiguous): [ebx-0x6f408] — TS-specific size cvar or
  // compile-time constant. D.4.
  const halfExtent: number = CVAR_AMMO_PACK_SIZE;
  const cube: any = { x: halfExtent, y: halfExtent, z: halfExtent };
  UTIL_SetSize(this.pev, cube, cube);

  // ── 6. Wait-time clamp + random offset ─────────────────────
  // base = float at [ebx+0x16a4]+0xc (cvar/global)
  // min  = float at [ebx-0x6d368]
  // max  = float at [ebx-0x6e818]
  // rand = float at *(*([ebx+0x1600]))         ← double-deref cvar chain
  // Result at this+0xa4 (interpreted here as `m_flWaitTime`).
  // Disassembly: X = clamp(base, min, max); m_flWaitTime = X + rand.
  // TODO(decompile-D.4): resolve those four globals via strings-n5.txt.
  const baseWait = CVAR_AMMO_PACK_BASE_WAIT;
  const minWait  = CVAR_AMMO_PACK_MIN_WAIT;
  const maxWait  = CVAR_AMMO_PACK_MAX_WAIT;
  const randOff  = CVAR_AMMO_PACK_RANDOM;
  this.m_flWaitTime =
    Math.max(minWait, Math.min(maxWait, baseWait)) + randOff;

  // ── 7. Custom CTSAmmoPack state fields ─────────────────────
  // 0x14/0x18  → zero
  // 0xc        → 0xffff0000 (16-bit zero + 16-bit all-ones, set via
  //             `mov ax,0; or eax,0xffff0000`)
  // 0x10       → cvar at [ebx+0x1a14]
  // TODO(decompile-D.4): identify the 0xc/0x10/0x14/0x18 fields.
  this.field_0xc  = 0xffff0000;
  this.field_0x10 = CVAR_AMMO_PACK_STATE;
  this.field_0x14 = 0;
  this.field_0x18 = 0;

  // ── 8. Schedule the first think ───────────────────────────
  // ST0 = double at [ebx-0x6ecd8] (= 2.5); ST0 += float at
  // *(*([ebx+0x1600])) (same indirection as #6's randOff);
  // store to pev+0x104 (nextthink).
  // TODO(decompile-D.4): which cvar — possibly ts_ammo_pack_nextthink?
  this.pev.nextthink = CVAR_AMMO_PACK_NEXT_THINK + 2.5;

  // ── 9. TS-extended flag fields on pev ─────────────────────
  // pev+0x250 : cleared, then OR-ed with 0x2
  // pev+0x1bc : cleared
  // pev+0x198 : cleared
  // All beyond canonical entvars_t (~0x15c).
  // TODO(decompile-D.4): identify each flag field.
  this.pev.field_0x250 = 0;
  this.pev.field_0x250 |= 0x2;
  this.pev.field_0x1bc  = 0;
  this.pev.field_0x198  = 0;
}
