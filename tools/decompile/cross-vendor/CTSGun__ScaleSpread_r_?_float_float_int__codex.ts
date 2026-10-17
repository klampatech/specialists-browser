```typescript
/**
 * CTSGun::ScaleSpread — scales the current shot's spread by the
 * player's accumulated recoil, with a per-frame cooldown gate and
 * optional special-fire (secondary-attack) handling.
 *
 * @param this     The CTSGun entity instance.
 * @param pSpread  In/out: spread value to be modified (float reference).
 * @param scale    Scale factor; only proceeds when strictly greater
 *                 than an engine-defined cutoff.
 * @param flag     Non-zero triggers special-fire adjustments.
 * @returns        void
 */
export function ScaleSpread(
  this: CTSGun,
  pSpread: number, // TODO(asm-ambiguous): original is float& / float*
  scale: number,
  flag: number,
): void {
  // Special-fire: multiply the input spread by an engine-defined factor.
  if (flag !== 0) {
    pSpread *= 0x68; // TODO: cvar @ GOT[-0x6df10]
  }

  // Caller's scale must be strictly greater than the cutoff; otherwise
  // the original returns immediately. (Compiler emits `fcomp`+`test
  // ah,0x41`+`jne` — jumps to epilogue unless scale > cutoff.)
  if (scale <= 0x68) { // TODO: cvar @ GOT[-0x6f408]
    return;
  }

  // Base recoil scale for this shot, optionally boosted by double-fire
  // and (when applicable) by the special-fire multiplier.
  let recoilScale = 0x68; // TODO: cvar @ GOT[-0x6df4c]
  if (DoubleFireRate(this.m_pPlayer)) {
    recoilScale *= 0x68; // TODO: cvar @ GOT[-0x6ec2c]
  }
  if (flag !== 0) {
    recoilScale *= 0x68; // TODO: cvar @ GOT[-0x6df0c]
  }

  // Time delta since the previous ScaleSpread on this gun. `gpGlobals`
  // is the standard GoldSrc globals pointer.
  const currentTime = gpGlobals.time; // gpGlobals @ GOT[+0x1600]
  const delta = currentTime - this.lastSpreadTime; // field @ [esi+0x9e8]
  const recoilDuration = 0x68; // TODO: cvar @ GOT[-0x6f3fc], e.g., 1.5 s

  // Tiny inter-call delta: clear the spread flag and refresh the
  // timestamp without growing the recoil accumulator.
  if (delta < 0x68) { // TODO: cvar @ GOT[-0x6f3f4], e.g., 0.1 s
    this.spreadFlag = 0; // TODO: field @ [esi+0x9ec]
    this.lastSpreadTime = currentTime;
    return;
  }

  // Add the player's current recoil accumulator to this shot's spread.
  pSpread += this.m_pPlayer.recoilAccumulator; // TODO: field @ [eax+0x778]

  // Pull a stability scalar through a virtual call on m_pPlayer's inner
  // vtable, then multiply by delta to produce a corrected delta. The
  // exact vtable layout at [eax+0x60] and the method at offset 0x10 are
  // not visible from this chunk.
  // TODO(asm-ambiguous): virtual call layout + semantics
  const stability = this.m_pPlayer.getStability();
  let correctedDelta = stability * delta;

  // If the corrected delta is at/over the recoil duration, clear the
  // spread flag and recompute the corrected delta from a smaller factor
  // ("rebound" pass).
  if (correctedDelta >= recoilDuration) {
    this.spreadFlag = 0;
    correctedDelta = 0x68 * recoilDuration; // TODO: cvar @ GOT[-0x6f010]
  }

  // Accumulate recoil iff the corrected delta is still under the recoil
  // duration. The accumulator is clamped to an engine-defined maximum.
  if (correctedDelta < recoilDuration) {
    let accum = recoilDuration - correctedDelta;
    accum *= scale;
    accum *= recoilScale;
    accum += this.m_pPlayer.recoilAccumulator;
    accum = Math.min(accum, 0x68); // TODO: cvar @ GOT[-0x6ecd8]
    this.m_pPlayer.recoilAccumulator = accum;
  }

  // Refresh the timestamp for the next call.
  this.lastSpreadTime = currentTime;
}
```
