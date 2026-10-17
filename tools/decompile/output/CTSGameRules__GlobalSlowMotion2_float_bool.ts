// === Ambient declarations for in-isolation compilation ===
declare class CTSGameRules {}
declare function UTIL_PlayerByIndex(i: number): any;
declare function UTIL_FindEntityByClassname(prev: any, className: string): any;

// Globals (accessed via the GOT-relative base ebx in the original disassembly)
declare const engineTime: number;        // gpGlobals->time (offset 0)
declare const maxPlayers: number;        // gpGlobals->maxClients (offset 0x90)
declare const slowAmtThreshold: number;  // cvar at [ebx-0x6f408]

// FPU promotion: the asm does `fld QWORD 0.0; fadd DWORD [eax]`. The QWORD
// is a compile-time zero used as the identity. Net effect is just
// `accumulator = engineTime`. Pin it to 0 so future readers don't think the
// constant is meaningful.
const cvarDelta = 0;

declare function engineFn(handle: any): number;  // engine[0x118], offset 0x118 from [ebx+0x1aa8]

// Class names used by UTIL_FindEntityByClassname in the 3 entity sweeps
declare const className_0x696dc: string;
declare const className_0x6e62b: string;
declare const className_0x6b6c5: string;

// === Function ===

/**
 * CTSGameRules::GlobalSlowMotion2 — broadcast a slow-motion state to every
 * player and to entities of three target classes. Likely invoked from the
 * server's per-tick handler.
 *
 * Signature: `CTSGameRules::GlobalSlowMotion2(float, bool)` (demangled from
 * `_Z18GlobalSlowMotion212CTSGameRulesFb`).
 *
 * @param this        CTSGameRules instance. Holds a float accumulator at
 *                    offset 0x56c (set to engine time once per call) and a
 *                    dispatch vtable.
 * @param slowAmount  Slow-motion factor to push to each entity. Above the
 *                    cvar threshold, an additional "release to 1.0" call
 *                    is issued per entity.
 * @param resetFlag   Boolean side-channel; stored byte-wise at +0x175 of
 *                    each player that just transitioned into the slowed
 *                    state during this call.
 */
export function GlobalSlowMotion2(
  this: CTSGameRules,
  slowAmount: number,
  resetFlag: boolean,
): void {
  // Early-out when the accumulator still equals engine time AND slowAmount
  // is at-or-below the cvar threshold (no work needed this frame).
  // asm: fld [ecx+0x56c]; fcomp [edx]; test ah,0x41; jne proceed
  //      fld [esp+0x24]; fcomp [ebx-0x6f408]; test ah,0x40; je end
  if (this.accumulator_0x56c === engineTime && slowAmount <= slowAmtThreshold) {
    return;
  }

  // Advance the per-instance accumulator.
  this.accumulator_0x56c = cvarDelta + engineTime;

  // ---- Player sweep (i = 1..maxPlayers) ----
  for (let i = 1; i <= maxPlayers; i++) {
    const player: any = UTIL_PlayerByIndex(i);
    if (player == null) continue;
    // vtable+0xc8 — IsAlive predicate
    if (player.vtable[0xc8](player) === 0) continue;

    const ent = player;
    // vtable+0x18 — query slow-motion state; only apply when not already slowed.
    if (ent.vtable[0x18](ent) === 0) {
      // vtable+0x14 — SetSlowMotionFactor(this, slowAmount, 0)
      ent.vtable[0x14](ent, slowAmount, 0);
      // Mark transition on the player only (entity sweeps do not write this).
      ent.field_0x175 = resetFlag ? 1 : 0;
    }
    // Above the threshold, also push a release-to-1.0 call.
    if (slowAmount > slowAmtThreshold) {
      ent.vtable[0x14](ent, 1.0, 0);
    }
  }

  // ---- Three entity-class sweeps ----
  // Each loop walks entities via UTIL_FindEntityByClassname. On the first
  // entity whose engine-side listener is missing/invalid, the inner while
  // breaks, and the outer for-of advances to the next class — same as the
  // asm's `jne next-class-entry`.
  // TODO(asm-ambiguous): pull exact class names from
  // tools/decompile/analysis/strings-n5.txt.
  const classNames: string[] = [
    className_0x696dc,
    className_0x6e62b,
    className_0x6b6c5,
  ];

  for (const className of classNames) {
    let ent: any = null;
    while (true) {
      ent = UTIL_FindEntityByClassname(ent, className);
      if (ent == null) break;

      // Skip check: edx = **(*ent + 0x208); engineFn returns 0 if invalid.
      // TODO(d4): resolve `field_at_chain_0x208` into a real entity field.
      const listenerHandle = (ent as any).field_at_chain_0x208;
      const valid = listenerHandle != null && engineFn(listenerHandle) !== 0;
      if (!valid) break;

      // Same per-entity slow-motion logic as the player sweep, minus the
      // resetFlag bookkeeping at +0x175 (entities don't carry it).
      if (ent.vtable[0x18](ent) === 0) {
        ent.vtable[0x14](ent, slowAmount, 0);
      }
      if (slowAmount > slowAmtThreshold) {
        ent.vtable[0x14](ent, 1.0, 0);
      }
    }
  }
}
