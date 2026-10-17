```typescript
/**
 * CTSPowerUp::Fall — per-tick gravity + auto-removal for a falling powerup.
 *
 * Two regimes:
 *   - Heavy gravity: triggered when in slow-motion, or when a global
 *     round-mode byte is in {2, 3}. Adds the heavy-gravity delta to
 *     pev.velocity.z, stamps a flag at pev+0x118, and returns immediately.
 *   - Normal gravity: adds the light-gravity delta to pev.velocity.z,
 *     optionally settles the entity on the ground via OnGround() if
 *     pev+0x1a5 has bit 0x02 set, and finally UTIL_Removes the entity
 *     when:
 *       (a) the entity has no attached owner (this+0x80 byte is zero), and
 *       (b) its origin Z (this+0x88 float) is below the world kill-floor.
 *
 * @param this  The CTSPowerUp instance.
 * @returns     void
 */
export function Fall(this: CTSPowerUp): void {
  const pev = this.pev;

  // ---- Branch decision ----
  // (a) FPU "<=" idiom: fld <cap>; fcomp [singleton+0xc]; fnstsw;
  //     test ah,0x40; jne. MSVC's typical emit for `<=`-comparison.
  //     TODO(asm-ambiguous): confirm the exact predicate polarity at runtime.
  const slowMoActive =
    (g_slowMoCap as number) <= ((g_runtimeState as any)[0xc] as number);
  // (b) Round-mode byte ∈ {2, 3} — encoded as `(byte - 2) unsigned <= 1`,
  //     so fall-through after `sub byte,2; cmp al,1; ja END` means
  //     byte ∈ {2, 3} triggers the heavy path.
  const modeIs2Or3 =
    (((g_roundModeByte as number) & 0xff) === 2) ||
    (((g_roundModeByte as number) & 0xff) === 3);

  if (slowMoActive || modeIs2Or3) {
    // ===== Heavy-gravity path =====
    // pev.velocity.z += heavyGravityDt
    //   ASM emits this as: fld heavy_dt(double); fadd [velocityZRef(float)];
    //   fstp [pev+0x104]. The GOT-aliased `velocityZRef` resolves to the
    //   same address as pev+0x104 — semantically just an `+=` on velocity.z.
    pev.velocity.z = (pev.velocity.z as number) + (g_heavyGravityDt as number);
    // Stamp the per-tick flag at pev+0x118 = 0x80.
    // TODO: pev offset 0x118 — likely FL_GRAPHED / animation-frame flag.
    (pev as any).heavyGravFlag = 0x80;
    return;
  }

  // ===== Normal-gravity path =====
  pev.velocity.z = (pev.velocity.z as number) + (g_lightGravityDt as number);

  // Settle on the ground if the ground-contact bit (pev+0x1a5, bit 0x02)
  // is set. TODO: pev offset 0x1a5 — TS-specific ground-contact byte.
  if (((pev as any).groundContactByte & 0x02) !== 0) {
    this.OnGround();
  }

  // Skip removal if the powerup has an attached owner (this+0x80 ≠ 0).
  // TODO: offset 0x80 — CTSPowerUp-specific owner flag (e.g. "owned by
  //      a player who hasn't picked it up yet, so don't despawn it").
  if (((this as any).hasAttachedOwner ?? 0) !== 0) {
    return;
  }

  // Otherwise, auto-remove when origin Z (this+0x88) is below the world
  // kill-floor.  ASM: fld [this+0x88]; fcomp [worldMinZ]; sahf; jae END
  // (i.e., skip removal when origin.z >= worldMinZ).
  // TODO(asm-ambiguous): confirm `jae via sahf` polarity vs runtime trace.
  if (((this as any).originZ ?? 0) >= (g_worldMinZ as number)) {
    return;
  }

  UTIL_Remove(this);
}
```
