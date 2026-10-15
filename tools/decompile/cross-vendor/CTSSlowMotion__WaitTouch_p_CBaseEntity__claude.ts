// TODO(asm-ambiguous): bind to the actual cvar pointer (likely `slowamt`,
// `ts_slowmotion`, or `sv_timescale`). Read at [ebx-0x6f408].
declare const slowmoCvar: any;

// TODO(asm-ambiguous): bind to the engine's player-slot helper singleton.
// Read at [ebx+0x1aa8]; vtable entry at offset 0x11c.
declare const engineGlobal: any;

// Stub classes so the function is self-contained.
declare class CTSSlowMotion {
  // Field offsets inferred from the disassembly. Purpose is tentative —
  // confirm against the TS source in D.4.
  field_0x64: number;        // byte — activation flag
  field_0x68: number;        // float — timer / cached cvar value
  field_0x70: any[];         // ptr[<=32] — tracked players
  field_0xfc: number;        // ptr — passed to vtable[5] on pOther
  field_0x104: number;       // byte — mirrored onto pOther.field_0x175
}
declare class CBaseEntity {
  field_0x175: number;       // byte — receives mirror of this.field_0x104
}

export function WaitTouch(
  this: CTSSlowMotion,
  pOther: CBaseEntity,
): void {
  // Early-out gate: return only when the trigger is fully dormant
  // (timer equals the slowmo cvar AND activation flag is unset).
  //
  // Disassembly: fcomp + test ah,0x40 + je + cmp field_0x64,0 + je
  // → return iff (cvar == field_0x68) && (field_0x64 == 0).
  if (this.field_0x68 === slowmoCvar && this.field_0x64 === 0) {
    return;
  }

  // Only entities passing the vtable[51] check proceed.
  // TODO(asm-ambiguous): vtable entry at offset 0xc8 (index 51) on
  // pOther. Returns non-zero for "yes proceed". Plausibly IsPlayer()
  // but the index is high for IsPlayer — confirm against HLSDK vtable
  // layout.
  if (pOther.vtable_method_51() === 0) return;

  // Reject when vtable[6] returns non-zero.
  // TODO(asm-ambiguous): vtable entry at offset 0x18 (index 6) on
  // pOther. The jne on non-zero means: return when the function
  // returns truthy. Most likely candidates (in HLSDK/TS):
  //   - IsDead()    (1 when dead)
  //   - !IsAlive() (1 when not alive)
  //   - IsObserver(), or a TS-specific validity check.
  // Pick ONE before committing — `if (pOther.IsAlive())` was the
  // original codex choice and is the WRONG direction for any of
  // these (would skip alive players).
  if (pOther.vtable_method_6() !== 0) return;

  // Apply the slow-mo hook to the player.
  // Args (right-to-left on stack): 0, this.field_0xfc, pOther (as this).
  // Vtable entry at offset 0x14 (index 5) on pOther.
  // TODO(asm-ambiguous): exact method name (slowmo hook).
  pOther.vtable_method_5(this.field_0xfc, 0);

  // Mirror this.field_0x104 (byte) onto pOther.field_0x175 (byte).
  // Disassembly: cmp byte + setne → 1 = (this.field_0x104 != 0).
  pOther.field_0x175 = this.field_0x104 !== 0 ? 1 : 0;

  // Resolve the player's engine slot (0..32), then store pOther in
  // this.trackedPlayers[slot]. Slots > 32 are silently rejected (ja
  // branches to the epilogue, so the array write is skipped).
  // TODO(asm-ambiguous): engine global at [ebx+0x1aa8], vtable entry
  // at offset 0x11c (index 71). Arg is `*(pOther) + 0x208` — some
  // pev- or interface-derived field. Plausibly GetPlayerSlot() but
  // confirm.
  const slot = engineGlobal.vtable_method_71(pOther.engineField);
  if (slot <= 0x20) {
    this.field_0x70[slot] = pOther;
  }
}
