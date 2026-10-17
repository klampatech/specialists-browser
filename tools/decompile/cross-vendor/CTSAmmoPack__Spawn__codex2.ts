/**
 * CTSAmmoPack::Spawn — initialize a CTSAmmoPack entity on spawn.
 *
 * @param this  The CTSAmmoPack entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: any): void {
  // PIC / GOT base: ebx is set to 0x101e10 by the prologue. All
  // [ebx±offset] accesses below are globals (cvars, the engine
  // function table, and string/float constants in rodata).

  // 1. Call a parent-class virtual function. The vtable is at
  //    [esi+0x60] (a secondary base class), invoked at vtable[0x28/4] = [10].
  // TODO(asm-ambiguous): exact parent method unclear without the full vtable.
  (this as any).callBaseVFunc(0x28, this);

  // 2. SET_MODEL: g_engfuncs.pfnSetModel(*(pev + 0x208), model_name).
  //    The first arg is a 4-byte value loaded from pev+0x208 — a
  //    TS-specific pev field, NOT a field on `this`.
  // TODO(asm-ambiguous): pfnSetModel first-arg semantics — looks odd
  // against the standard HL1 pfnSetModel(ENT(pev), m) signature; verify
  // against the TS-specific enginefuncs_t layout.
  (g_engfuncs as any).pfnSetModel((this.pev as any)[0x208], MODEL_NAME_RODATA);

  // 3. Set colormap and skin on the engine-side pev.
  this.pev.colormap = 6;
  this.pev.skin = 2;

  // 4. UTIL_SetOrigin(pev, &pev->origin) — sync engine origin.
  //    [esi+0] is the pev pointer; [esi+0]+8 is &pev->origin.
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // 5. UTIL_SetSize(pev, mins, maxs) — set bounding box to a uniform
  //    cube. The half-extent is the constant at [ebx-0x6f408].
  // TODO(asm-ambiguous): name the constant — likely a TS-specific size cvar.
  const halfExtent: number = AMMO_PACK_HALF_EXTENT;
  const cube: any = { x: halfExtent, y: halfExtent, z: halfExtent };
  UTIL_SetSize(this.pev, cube, cube);

  // 6. Compute m_flWaitTime: clamp(base, lower, upper) + gpGlobals->time.
  //    The disassembly does:
  //      ST = min(base, FIRST_CONST)   ; FIRST_CONST  = upper bound
  //      ST = max(ST,    SECOND_CONST) ; SECOND_CONST = lower bound
  //      ST = ST + gpGlobals->time     ; [ebx+0x1600] = gpGlobals (a globalvars_t*)
  //      *(this+0xa4) = ST
  const baseWait = CVAR_AMMO_PACK_BASE_WAIT;
  const minWait  = CVAR_AMMO_PACK_MIN_WAIT;
  const maxWait  = CVAR_AMMO_PACK_MAX_WAIT;
  (this as any).m_flWaitTime =
    Math.max(minWait, Math.min(maxWait, baseWait)) + gpGlobals.time;

  // 7. Initialize custom state fields (offsets 0xc, 0x10, 0x14, 0x18).
  //    0xffff0000 is a bit-pattern flag (low 16 bits = 0, high = 0xffff).
  //    field 0x10 is loaded directly from a global at [ebx+0x1a14] —
  //    not a cvar deref; purpose unclear without the full class context.
  // TODO(asm-ambiguous): field 0x10 source is a global memory location,
  // could be a const, struct field, or vtable-derived value.
  (this as any)[0xc]  = 0xffff0000;
  (this as any)[0x10] = AMMO_PACK_FIELD_10_VALUE;
  (this as any)[0x14] = 0;
  (this as any)[0x18] = 0;

  // 8. Schedule the first think: pev->nextthink = 2.5 + gpGlobals->time.
  //    2.5 is the double constant at [ebx-0x6ecd8]; gpGlobals comes
  //    from the same [ebx+0x1600] deref as step 6.
  this.pev.nextthink = (gpGlobals as any).time + 2.5;

  // 9. Initialize additional flag fields on pev.
  // TODO(asm-ambiguous): pev offsets 0x198, 0x1bc, 0x250 are past the
  // end of standard HL1 entvars_t — likely TS-specific extensions.
  (this.pev as any)[0x250] = 0;
  (this.pev as any)[0x250] |= 0x2;
  (this.pev as any)[0x1bc]  = 0;
  (this.pev as any)[0x198]  = 0;
}
