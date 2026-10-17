```typescript
/**
 * CTSPhysicObject::SavePhysics — snapshot the entity's current physics state
 * so a later RestorePhysycs() can reconstruct the pre-snapshot frame.
 *
 * Two action paths, picked on whether `this.savedVelocity` (vec3) still
 * matches a global "reference" vector loaded from the GOT (most likely the
 * engine's zero vector — vec3_origin):
 *
 *   Path B — savedVelocity matches reference:
 *     Capture the live pev.velocity / basevelocity / damping into
 *     `this.saved*` slots, then multiply the freshly-captured pev.velocity
 *     and pev.basevelocity by `pev.frameFactor` (component-wise, in place)
 *     and multiply `pev.damping` by `pev.frameFactor²` (in place).
 *
 *   Path A — savedVelocity does not match reference:
 *     Overwrite pev.velocity with `pev.frameFactor * this.savedVelocity`
 *     (component-wise), overwrite pev.basevelocity similarly, and overwrite
 *     pev.damping with `this.savedDamping * pev.frameFactor²`.
 *
 * Both action paths end with: `this.lastSavedFrameFactor = pev.frameFactor`.
 *
 * Early bail: when `frameFactorMatches && !savedVelMatchesReference`, return
 * without modifying anything (don't re-save a state that has drifted away
 * from the reference within the same frame). The disassembly expresses this
 * by jumping past the capture block when the frame-factor check matches the
 * last save AND the saved velocity has drifted away from the reference.
 *
 * Offsets used (TODO: replace with confirmed HL1 entvars_t member names):
 *   pev +0x020  velocity          (vec3)
 *   pev +0x05c  basevelocity      (vec3)
 *   pev +0x11c  damping           (float) — possibly friction
 *   pev +0x254  frameFactor       (float) — possibly m_fTimeMove
 *   this +0x064 savedVelocity          (vec3)
 *   this +0x070 savedBaseVelocity      (vec3)
 *   this +0x07c savedDamping           (float)
 *   this +0x084 lastSavedFrameFactor   (float)
 *
 * @param this  The CTSPhysicObject instance (`this` from the original C++).
 * @returns     void
 */
export function SavePhysics(this: CTSPhysicObject): void {
  // pev layout isn't replicated yet — treat as an opaque record.
  const pev: any = this.pev;

  // Loaded from the GOT at [ebx + 0x1888]; identity is not in this chunk.
  // TODO(asm-ambiguous): verify via tools/decompile/analysis/strings-n5.txt.
  // Almost certainly the engine's vec3_origin zero vector, used as a
  // component-wise equality sentinel ("entity is at its start state").
  const globalReferenceVector: [number, number, number] = [0, 0, 0];

  const savedVelMatchesReference =
    this.savedVelocity[0] === globalReferenceVector[0] &&
    this.savedVelocity[1] === globalReferenceVector[1] &&
    this.savedVelocity[2] === globalReferenceVector[2];
  const frameFactorMatches = this.lastSavedFrameFactor === pev.frameFactor;

  if (frameFactorMatches && !savedVelMatchesReference) {
    // Frame factor unchanged since last save AND saved velocity drifted.
    // Don't disturb the saved state mid-frame.
    return;
  }

  if (savedVelMatchesReference) {
    // Path B — capture pev state into this.*, then scale pev fields in place.
    this.savedVelocity[0]     = pev.velocity[0];
    this.savedVelocity[1]     = pev.velocity[1];
    this.savedVelocity[2]     = pev.velocity[2];
    this.savedBaseVelocity[0] = pev.basevelocity[0];
    this.savedBaseVelocity[1] = pev.basevelocity[1];
    this.savedBaseVelocity[2] = pev.basevelocity[2];
    this.savedDamping         = pev.damping;

    pev.velocity[0]     *= pev.frameFactor;
    pev.velocity[1]     *= pev.frameFactor;
    pev.velocity[2]     *= pev.frameFactor;
    pev.basevelocity[0] *= pev.frameFactor;
    pev.basevelocity[1] *= pev.frameFactor;
    pev.basevelocity[2] *= pev.frameFactor;
    const frameFactorSquared = pev.frameFactor * pev.frameFactor;
    pev.damping         *= frameFactorSquared;
  } else {
    // Path A — rewrite pev with the saved state, scaled by frame factor.
    pev.velocity[0]     = pev.frameFactor * this.savedVelocity[0];
    pev.velocity[1]     = pev.frameFactor * this.savedVelocity[1];
    pev.velocity[2]     = pev.frameFactor * this.savedVelocity[2];
    pev.basevelocity[0] = pev.frameFactor * this.savedBaseVelocity[0];
    pev.basevelocity[1] = pev.frameFactor * this.savedBaseVelocity[1];
    pev.basevelocity[2] = pev.frameFactor * this.savedBaseVelocity[2];
    const frameFactorSquared = pev.frameFactor * pev.frameFactor;
    pev.damping         = this.savedDamping * frameFactorSquared;
  }

  this.lastSavedFrameFactor = pev.frameFactor;
}
```
