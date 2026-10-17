/**
 * CTSTrigger::Spawn — initialize a CTSTrigger entity on level load.
 *
 * Disassembly:  0x000609b8 (286 B), GCC thiscall (this on
 * the stack at [esp+0x20] after the 3-push + sub-esp,0x10
 * prologue). No other parameters; void return.
 *
 * Sub-stages, by asm offset:
 *   0x609d8–0x609e4   pev->classname = staticStr - gpGlobals->pStringBase
 *   0x609eb–0x60a09   gEngfuncs->pfnSetModel(pContainingEdict,
 *                       gpGlobals->pStringBase + pev->model)
 *   0x60a0c–0x60a23   UTIL_SetSize(pev, pev->mins, pev->maxs)
 *   0x60a23–0x60a2e   UTIL_SetOrigin(pev, pev->origin)
 *   0x60a33–0x60a35   pev->effects |= 0x80            (bit 7, semantics TBD)
 *   0x60a3f–0x60a41   pev->solid    = 1               (SOLID_BBOX)
 *   0x60a4b–0x60a4d   pev->movetype = 5               (MOVETYPE_PUSH)
 *   0x60a57–0x60a73   instance state init (4 fields)
 *   0x60a7a–0x60acf   pev->nextthink = this->m_flNextFire
 *                       = gpGlobals->time + max(this->m_flDelay, 0.1)
 *
 * Field-name TODO: instance-field names below (m_iState,
 * m_pGoalEnt, m_iCount, m_iOtherState, m_flDelay,
 * m_flNextFire) are guesses derived from ops + offsets.
 * Confirm in D.4 against CTSTrigger class declaration.
 */
export function Spawn(this: any /* TODO(D.4): CTSTrigger */): void {
  const pev = this.pev;

  // --- Module globals (PIC-resolved via [ebx+offset] in the asm) ---
  // From the C level these are normal pointers; the PIC indirection
  // (GOT → symbol value) hides one extra deref at runtime.
  const gpGlobals: any = gpGlobals;
  const gEngfuncs: any = gEngfuncs;
  const defaultGoalGlobal: any = defaultGoalGlobal;   // [ebx+0x1cc4]
  const staticClassnameAddr: number = staticClassnameAddr; // [ebx-0x6eed5]
  const minThinkDelay = 0.1;                          // [ebx-0x6f010] (double)

  // 1. pev->classname = staticClassnameAddr - gpGlobals->pStringBase
  //    (GoldSrc string_t indirection: idx = &str - pStringBase).
  pev.classname = staticClassnameAddr - gpGlobals.pStringBase;

  // 2. gEngfuncs->pfnSetModel(pContainingEdict,
  //                            gpGlobals->pStringBase + pev->model).
  gEngfuncs.pfnSetModel(
    pev.pContainingEdict,
    gpGlobals.pStringBase + pev.model,
  );

  // 3. UTIL_SetSize(pev, pev->mins, pev->maxs)
  //    Asm passes pev+0xDC (mins) and pev+0xE8 (maxs); verify
  //    offsets against TS entvars in D.4 (HLSDK uses 0xA0/0xAC).
  UTIL_SetSize(pev, pev.mins, pev.maxs);

  // 4. UTIL_SetOrigin(pev, pev->origin)
  UTIL_SetOrigin(pev, pev.origin);

  // 5. Entity flags (canonical HLSDK constants; asm offsets 0x118,
  //    0x10C, 0x108 — field offsets may differ in TS's extended
  //    entvars, names are canonical).
  pev.effects |= 0x80;   // bit 7 of effects; semantics TBD (D.4)
  pev.solid = 1;         // SOLID_BBOX
  pev.movetype = 5;      // MOVETYPE_PUSH

  // ---- CTSTrigger instance fields (names guessed, offsets from asm) ----
  // Verify against CTSTrigger class declaration in D.4.
  this.m_iState      = 0xffff0000;       // [this+0x14] mask/state word
  this.m_pGoalEnt    = defaultGoalGlobal; // [this+0x18] goal pointer
  this.m_iCount      = 0;                // [this+0x0C] counter
  this.m_iOtherState = 0;                // [this+0x10] state word

  // 6. pev->nextthink = this->m_flNextFire
  //    = gpGlobals->time + max(this->m_flDelay, 0.1)
  //    (Same compute done twice in asm — once each for the two
  //    destinations. The MAX uses fcom/jae + faddp.)
  //    Note: if KeyValue was never called, m_flDelay defaults to 0
  //    and the max-clamp still gives 0.1 s.
  const delay = this.m_flDelay;          // [this+0x10C]; set in KeyValue
  const effectiveDelay = delay < minThinkDelay ? minThinkDelay : delay;
  const nextFire = gpGlobals.time + effectiveDelay;
  pev.nextthink     = nextFire;          // [pev+0x104]
  this.m_flNextFire = nextFire;          // [this+0x104]
}
