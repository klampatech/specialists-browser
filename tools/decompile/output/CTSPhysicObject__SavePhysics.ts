export function SavePhysics(this: any): void {
  // pev layout isn't replicated yet — treat as an opaque record.
  const pev: any = this.pev;

  // Loaded from the GOT at [ebx + 0x1888]; identity is not in this chunk.
  // TODO(asm-ambiguous): verify via tools/decompile/analysis/strings-n5.txt.
  // Almost certainly the engine's vec3_origin zero vector.
  const globalReferenceVector: [number, number, number] = [0, 0, 0];

  const savedVelMatchesReference =
    this.savedVelocity[0] === globalReferenceVector[0] &&
    this.savedVelocity[1] === globalReferenceVector[1] &&
    this.savedVelocity[2] === globalReferenceVector[2];
  const frameFactorMatches = this.lastSavedFrameFactor === pev.frameFactor;

  if (frameFactorMatches && !savedVelMatchesReference) {
    // Same frame factor as last save AND we already have a snapshot.
    // Don't disturb the saved state mid-frame.
    return;
  }

  if (savedVelMatchesReference) {
    // Path B — capture pev state into this.*, then scale pev in place.
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
    pev.damping         *= pev.frameFactor * pev.frameFactor;
  } else {
    // Path A — frame factor just changed; rewrite pev from the saved
    // snapshot, scaled by the new frame factor.
    pev.velocity[0]     = pev.frameFactor * this.savedVelocity[0];
    pev.velocity[1]     = pev.frameFactor * this.savedVelocity[1];
    pev.velocity[2]     = pev.frameFactor * this.savedVelocity[2];
    pev.basevelocity[0] = pev.frameFactor * this.savedBaseVelocity[0];
    pev.basevelocity[1] = pev.frameFactor * this.savedBaseVelocity[1];
    pev.basevelocity[2] = pev.frameFactor * this.savedBaseVelocity[2];
    pev.damping         = this.savedDamping * pev.frameFactor * pev.frameFactor;
  }

  this.lastSavedFrameFactor = pev.frameFactor;
}
