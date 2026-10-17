/**
 * CTSPlayerAmount::ClientDisconnect — decrements the running player count
 * and, when the count reaches the configured threshold and a target is
 * configured, fires the target either immediately or via a delayed
 * CBaseDelay. Possibly removes self afterwards.
 */
export function ClientDisconnect(this: CTSPlayerAmount): void {
  // 1. Decrement the running player count.
  this.playerCount--;

  // 2. Threshold gate — return if we haven't hit the threshold yet.
  if (this.playerCount !== this.playerThreshold) return;

  // 3. No target configured → nothing to fire.
  // TODO(asm-ambiguous): asm does `if (strcmp(this.field_0xd8, <literal>) == 0) return;`
  //                      We don't know what literal; could be "" or a sentinel.
  //                      Treat as "no target" until symbols resolve it.
  if (this.targetName.length === 0) return;

  // 4. Branch: fire immediately vs. spawn a delayed CBaseDelay.
  // TODO(asm-ambiguous): asm compares a global float ([ebx-0x6f408]) to
  //                      this.delay. If that global is 0.0, condition is
  //                      "delay === 0" → fire immediately. If it's
  //                      gpGlobals.time, condition is different. Resolve
  //                      the global via nm / strings before relying on
  //                      this branch.
  const fireImmediately = /* <asm condition> */ false; // see TODO above

  if (fireImmediately) {
    // 4a. Fire the target now with USE_TOGGLE.
    FireTargets(
      this.targetName,
      /* pActivator */ null,
      /* pCaller   */ this,
      USE_TYPE.USE_TOGGLE,
      /* value     */ 0.0
    );
  } else {
    // 4b. Spawn a CBaseDelay to fire the target later.
    const delay = GetClassPtr(CBaseDelay, /* location */ null);

    // CBaseDelay initialisation — these are asm offset guesses; field
    // names are TODOs until we cross-reference with HLSDK's CBaseDelay:
    //   delay.m_iszKillTarget = ""   (FStringNull, offset new_obj+0xc, ✅ confident)
    //   delay.<unknown>      = ? (offset new_obj+0x10, missing)
    //   delay.<unknown>      = 3     (offset vtable+0x180, missing)
    //   delay.<unknown>      = this->field_0x68   (NOT this.targetName)
    //   delay.m_flDelay? = 0     (offset new_obj+0x64, plausible)
    //   delay.<unknown>      = &this.targetName   (offset vtable+0x1c8)
    //   delay.<unknown>      = 0     (offset vtable+0x198)
    //   delay.pev.nextthink  = gpGlobals.time + this.delay (offset ???)
    delay.killTarget = "";                                  // asm0x62ca5: ✅
    delay.unknown_0x10 = (globalThis as any)[0x18dc]; // asm 0x62ca8: missing
    delay.unknown_0x180 = 3;                                // asm 0x62cad: missing
    delay.unknown_0x68 = (this as any).field_0x68;          // asm 0x62cba: NOT targetName
    delay.m_flDelay = 0;                                    // asm 0x62cbd: plausible
    delay.unknown_0x1c8 = this.targetName;                  // asm 0x62cd8: pointer, not copy
    delay.unknown_0x198 = 0;                                // asm 0x62ce0: missing
    delay.unknown_0x104 = gpGlobals.time + this.delay;      // asm 0x62c8f: not pev->nextthink
  }

  // 5. Remove self if the kill-flag bit is set.
  // TODO(asm-ambiguous): asm tests bit 0 of `[this[0]+0x1a0]`. The vtable
  //                      symbol is only 280 bytes (70 entries); 0x1a0/4=104
  //                      is past the end. So `this[0]` is likely `pev`
  //                      (or a containing pointer) and 0x1a0 is a TS-extended
  //                      field, NOT standard pev->flags (which is at pev+0x7c).
  //                      Resolve before naming this field.
  if (((this as any).killFlag ?? 0) & 0x1) {
    UTIL_Remove(this);
  }
}
