// === Ambient declarations for in-isolation compilation ===
declare function UTIL_PlayerByIndex(i: number): any;
declare function UTIL_FindEntityByClassname(prev: any, className: string): any;
declare const engineTime: number;        // gpGlobals->time (offset 0x00)
declare const maxPlayers: number;        // gpGlobals->maxClients (offset 0x90)
declare const slowAmtThreshold: number;  // cvar at [ebx-0x6f408]
declare const cvarDelta: number;         // cvar/global at [ebx-0x6f010]
declare function engineFn(arg: any): number;  // enginePtr (at [ebx+0x1aa8]) + 0x118
declare const className_0x696dc: string;
declare const className_0x6e62b: string;
declare const className_0x6b6c5: string;

/**
 * CTSGameRules::GlobalSlowMotion2 — broadcast a slow-motion state to every
 * player and to entities of three target classes. Likely invoked from the
 * server's per-tick handler.
 *
 * @param this        The CTSGameRulesfb instance. Holds a "next due time"
 *                    float at offset 0x56c.
 * @param slowAmount  Slow-motion factor to push to each entity.
 * @param resetFlag   When transitioning a player into the slowed state,
 *                    this byte is recorded at player offset 0x175.
 * @returns void
 */
export function GlobalSlowMotion2(
  this: any,
  slowAmount: number,
  resetFlag: boolean,
): void {
  // Early-out: do_work iff (accumulator <= engineTime) OR (slowAmount === threshold).
  //   asm: fcomp [edx]; test ah,0x41; jne do_work   → jump on (accumulator <= engineTime)   [C3|C0]
  //        fcomp [ebx-0x6f408]; test ah,0x40; je end → jump on (slowAmount != threshold)   [C3]
  //   Equivalent: do_work iff accumulator <= engineTime || slowAmount === threshold.
  if (this.accumulator_0x56c > engineTime && slowAmount !== slowAmtThreshold) {
    return;
  }

  // Advance the per-instance accumulator: this.accumulator = cvarDelta + engineTime.
  // asm: fld QWORD [ebx-0x6f010]; fadd DWORD [eax]; fstp DWORD [ecx+0x56c]
  this.accumulator_0x56c = cvarDelta + engineTime;

  // ---- Player sweep (i = 1..maxPlayers) ----
  for (let i = 1; i <= maxPlayers; i++) {
    const player: any = UTIL_PlayerByIndex(i);
    if (player == null) continue;
    // vtable+0xc8 — IsAlive predicate
    if (player.vtable[0xc8](player) === 0) continue;

    // vtable+0x18 — query slow-motion state; only apply when not already slowed.
    if (player.vtable[0x18](player) === 0) {
      // vtable+0x14 — SetSlowMotionFactor(this, slowAmount, 0)
      player.vtable[0x14](player, slowAmount, 0);
      player.field_0x175 = resetFlag ? 1 : 0;
    }
    // asm: fld slowAmount; fcomp threshold; test ah,0x40; je skip
    //   → do release iff slowAmount === slowAmtThreshold.
    if (slowAmount === slowAmtThreshold) {
      player.vtable[0x14](player, 1.0, 0);
    }
  }

  // ---- Three entity-class sweeps ----
  // Each loop walks entities via UTIL_FindEntityByClassname. On the first
  // entity whose vtable[0x208] is null OR whose engineFn(listener) returns 0,
  // the inner loop bails out for that class (asm: jne end-of-class).
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

      // Skip check: edx = vtable[0x208]; engineFn returns 0 if invalid.
      // asm: mov eax, [esi]; mov edx, [eax+0x208]
      const listener = ent.vtable[0x208];
      const valid = listener != null && engineFn(listener) !== 0;
      if (!valid) break;

      // Same per-entity slow-motion logic as in the player sweep.
      if (ent.vtable[0x18](ent) === 0) {
        ent.vtable[0x14](ent, slowAmount, 0);
      }
      if (slowAmount === slowAmtThreshold) {
        ent.vtable[0x14](ent, 1.0, 0);
      }
    }
  }
}
