/**
 * CBasePlayer::DeactivateSlowMotionFlow — tears down this player's active
 * slow-motion flow. Calls vtable[5](entity, 1.0f, 0) on this player and
 * every entity that was tracked as part of the flow, then empties the two
 * tracking arrays on the player.
 *
 * @param this  The CBasePlayer instance (this in the original C++)
 * @returns     void
 */
export function DeactivateSlowMotionFlow(this: CBasePlayer): void {
  // Helper — invokes vtable[5](entity, 1.0f, 0).
  // In the binary:
  //   mov eax, [entity+0x60]   ; vtable pointer at offset 0x60
  //   call [eax+0x14]          ; index 5 (0x14 / 4)
  // Args read semantically as "reset rate to neutral 1.0, off".
  const deactivate = (entity: any): void => {
    const vtable = entity[0x60] as any;
    vtable[5].call(entity, 1.0, 0);
  };

  // ── (1) Deactivate this player. ─────────────────────────────────────
  deactivate(this);

  // ── (2) Clear this player's slow-motion bookkeeping fields. ──────────
  (this as any)[0x180] = 0; // dword (int / timer)        — TODO: offset meaning unclear
  (this as any)[0x17c] = 0; // dword (int / timer; occasionally read as float)
  (this as any)[0x175] = 0; // byte flag (flow-active)

  // ── (3) External flow-target array. ─────────────────────────────────
  // Bound comes from a global pointer chain:
  //   [*(GLOBALS + 0x1600)][0x90]
  // Assembly loop is `for (ebp=1; ebp <= count; ++ebp)` with esi
  // advancing by 4 from 0x184, so slot offsets are [this + 0x188 + (i-1)*4].
  // TODO(asm-ambiguous): the global symbol at +0x1600 and the field
  //   at +0x90 are not yet identified — likely a player-array length
  //   (maxClients-style) per the i-from-1 loop convention.
  const extCount =
    (((GLOBALS /* TODO: see strings-n5.txt */ as any)[0x1600] as any)[0] as any)[0x90] as number;
  for (let i = 1; i <= extCount; i++) {
    const slotOffset = 0x188 + (i - 1) * 4;
    const target = (this as any)[slotOffset] as any;
    if (target == null) continue;

    // The original fcomp checks target[0x17c] against a global float at
    // [GLOBALS - 0x6f408] (likely gpGlobals->time). Only on EQUAL do we
    // call vtable[5] and clear the flag; on NOT-EQUAL we just clear the
    // slot. Either way the slot is emptied at the end.
    // TODO(asm-ambiguous): the semantic intent of the equality test
    //   (e.g., "timer just hit zero" vs "already expired" vs
    //   "still at the boundary") is not recoverable from the assembly.
    if (target[0x17c] === (GLOBALS /* TODO */ as any).time) {
      deactivate(target);
      target[0x175] = 0;
    }
    (this as any)[slotOffset] = 0;
  }

  // ── (4) Local flow-target array. ────────────────────────────────────
  // Length is a signed byte on `this` (movsx eax, [this+0x288]).
  // Assembly loop is `for (ebp=0; ebp < count; ++ebp)` with esi
  // advancing by 4 from 0x200, so slot offsets are [this + 0x208 + i*4].
  const localCount = ((this as any)[0x288] as number) | 0;
  for (let i = 0; i < localCount; i++) {
    const slotOffset = 0x208 + i * 4;
    const target = (this as any)[slotOffset] as any;
    if (target == null) continue;
    deactivate(target);
    (this as any)[slotOffset] = 0;
  }
  (this as any)[0x288] = 0;
}

// === External PIC/GOT globals stub ========================================
// ebx-relative globals from the binary. Real symbol names + meanings TBD;
// cross-reference tools/decompile/analysis/strings-n5.txt and the GOT base
// computed at the function prologue (call $+5; pop ebx; add ebx, 0xdf368).
// TODO(asm-ambiguous): +0x1600, -0x6f408 offsets need resolving.
declare const GLOBALS: any;