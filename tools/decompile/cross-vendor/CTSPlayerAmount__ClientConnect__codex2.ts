/**
 * CTSPlayerAmount::ClientConnect — engine hook fired each time a
 * player connects to the server.
 *
 * Disassembly summary (from tools/decompile/chunks/ClientConnect__15CTSPlayerAmount.chunk.md):
 *   1. ++this.field_0x6c; if (new != this.field_0x70) return.
 *   2. if (strcmp(this.field_0x74, literal@ebx-0x6f7b9) == 0) return.
 *   3. fcomp this.field_0x64 vs globalFloat@ebx-0x6f408
 * equal -> jne 62bd0 -> FireTargets direct-fire
 *        not-equal -> fall-through -> spawn one-shot CBaseDelay
 *   4. if (pev.field_0x1a0 & 1) UTIL_Remove(this).
 *
 * Field offsets that don't match any HLSDK CBaseDelay field are marked
 * as TODO — they are TS-mod-specific extensions whose identity requires
 * TS-mod SDK headers we don't have yet.
 */
export function ClientConnect(this: CTSPlayerAmount): void {
  // (1) Bump the per-entity connection counter; bail unless threshold hit.
  this.m_iConnected++;
  if (this.m_iConnected !== this.m_iMaxPlayers) return;

  // (2) Bail if no target configured.
  //     TODO(asm-ambiguous): literal at [ebx-0x6f7b9] is unverified; likely "".
  if (this.m_szTargetName === "") return;

  // (3) Branch on m_flDelay vs. globalFloat. Equal -> direct-fire.
  //     The disassembly's `jne 62bd0` (FireTargets) is the EQUAL branch
  //     because AH bit 6 = C3 in FPU status after `fnstsw ax`.
  //     TODO(asm-ambiguous): globalFloat at [ebx-0x6f408] is unverified;
  //     treat equality as "m_flDelay is still at its initial value".
  if (this.m_flDelay === /* globalFloat @ [ebx-0x6f408] */ 0) {
    // (3a) Direct-fire.
    //      FireTargets signature (HLSDK): 5 args, demangler truncated.
    //      targetName, pActivator=NULL, pCaller=this, useType=USE_TOGGLE, value=0
    FireTargets(this.m_szTargetName, null, this, USE_TYPE.USE_TOGGLE, 0.0);
    // (4) Self-remove on kill-me flag.
    if ((this.pev.engineFlag_0x1a0 & 0x1) !== 0) UTIL_Remove(this);
    return;
  }

  // (3b) Spawn-timer path — one-shot CBaseDelay that fires target after m_flDelay.
  const trig: CBaseDelay = GetClassPtr(new CBaseDelay());

  // pev->classname = string_t offset of classname literal.
  // TODO(asm-ambiguous): literal content at [ebx-0x6edb8] is unverified.
  trig.pev.classname = ((rawClassnameAddr as number) - gpGlobals.pStringBase) as unknown as string_t;

  // pev->nextthink = gpGlobals.time + this.m_flDelay.
  trig.pev.nextthink = gpGlobals.time + this.m_flDelay;

  // entity+0xc, +0x10, +0x180: TS-mod extensions; no HLSDK match.
  // TODO(asm-ambiguous): verify against TS-mod SDK headers.
  trig.entityField_0xc = 0xffff0000;
  trig.entityField_0x10 = engineGlobal_0x18dc;
  trig.pev.engineFlag_0x180 = 3;

  // entity+0x68 = this->m_iszTarget.
  // NOTE: eax is the entity pointer here (returned by GetClassPtr), NOT
  // pev — so this is an entity-relative field, not pev->target.
  // TODO(asm-ambiguous): identify the actual CBaseDelay field at +0x68.
  trig.entityField_0x68 = this.m_iszTarget;

  // entity+0x64 = 0. Likely a TS-mod counter/flag, not standard m_flDelay
  // (which sits at entity+4 in HLSDK).
  // TODO(asm-ambiguous): verify field identity.
  trig.entityField_0x64 = 0;

  // pev+0x1c8 = string_t offset of (this + 0x74), i.e. &this.m_szTargetName.
  // Likely pev->killTarget — same string as the fire target (unusual but
  // matches the disassembly's `(this - pStringBase) + 0x74` computation).
  // TODO(asm-ambiguous): verify offset0x1c8 vs HLSDK killTarget.
  trig.pev.engineFlag_0x1c8 =
    ((this as unknown as number) + 0x74 - gpGlobals.pStringBase) as unknown as string_t;

  // pev+0x198 = 0.
  // TODO(asm-ambiguous): identity of pev+0x198 is unverified.
  trig.pev.engineFlag_0x198 = 0;

  // (4) Self-remove on kill-me flag.
  if ((this.pev.engineFlag_0x1a0 & 0x1) !== 0) UTIL_Remove(this);
}
