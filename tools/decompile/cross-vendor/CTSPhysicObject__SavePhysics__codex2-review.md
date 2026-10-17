```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `SavePhysics(this: CTSPhysicObject): void` matches
   `void CTSPhysicObject::SavePhysics()`. The TS `this` parameter is the
   idiomatic receiver convention. Note: this function is a class method,
   not one of the engine↔mod interface functions covered by the HLSDK
   reference; items 2 and 3 below don't apply.

2. Version check — N/A — not an engine↔mod interface function.

3. interfaceVersion assignment — N/A — not an engine↔mod interface
   function.

4. Success path / struct copy — ✅ — The disassembly uses `rep movsd` (a
   3-dword `memcpy`) for the vec3 captures/overwrites; the TS uses
   per-component field assignment, which is the idiomatic equivalent.
   The data flow (engine-state ↔ `this.*`) is preserved in both paths.

5. No fabricated paths — ✅ — Verified by tracing all four cases through
   the disassembly:
     - frameFactor matches, savedVel==ref  → jne 6bbb8 → fall through
       at 6bbf3 (ecx=1) → Path B at 6bbf9..6bcb6
     - frameFactor matches, savedVel!=ref  → jne 6bbb8 → je 6bccb
       at 6bbf3 (ecx=0) → return
     - frameFactor != , savedVel==ref     → fall through at 6baf1 →
       jne 6bbb8 at 6bb2c (ecx=1) → Path B at 6bbf9..6bcb6
     - frameFactor != , savedVel!=ref     → fall through at 6baf1 →
       fall through at 6bb2c (ecx=0) → Path A at 6bb32..6bcb6
   The TS reproduces this exact structure.

6. No TODO body — ✅ — The body is real code; only the docstring has
   TODO-style uncertainty notes (field names, reference vector).

7. Field names — ⚠️ — `pev.velocity` (0x020) and `pev.basevelocity`
   (0x05c) are standard HL1 entvars. `pev.damping` (0x11c) and
   `pev.frameFactor` (0x254) are NOT standard HL1 entvars and are
   explicitly flagged as TODO in the docstring. `this.savedVelocity`,
   `savedBaseVelocity`, `savedDamping`, `lastSavedFrameFactor` at
   offsets 0x64/0x70/0x7c/0x84 line up with the disassembly accesses
   and are reasonable names for the role. The0x254 offset is well
   past the end of vanilla `entvars_t`, which suggests TS extended
   `pev` (or wrapped it) — worth a note in the chunk's design docs but
   not a fail.

8. Compiles in isolation — ⚠️ — The `CTSPhysicObject` type is
   referenced as a type annotation but never defined in the file. The
   prompt allows `any` for unknowns; replacing `CTSPhysicObject` with
   `any` (and removing the `this:` annotation, or using `this: any`)
   would make this self-contained.

Issues to fix (minor):
- Define or stub `CTSPhysicObject`, or relax the `this:` parameter to
  `any`. The current signature makes the file fail to compile in
  isolation against the rules.
- The two `frameFactorSquared` locals are computed inside each branch;
  they could be hoisted above the `if/else` but that's stylistic, not a
  correctness issue.
- Worth flagging in `HANDOFF.md` / chunk docs: `pev +0x254` is past
  vanilla `entvars_t`, suggesting TS added a frame-factor field to its
  entity wrapper. Worth confirming via D.4 (cross-reference against
  `m_fFrameFactor` or similar custom entvars).

Suggested cleanup (only the compile-in-isolation fix is needed; the
logic is correct as-is):

```typescript
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
```

Note: the only change vs. the decompiled TS is replacing the
`CTSPhysicObject` type annotation with `any` (the field accesses were
already on `any` via the `pev: any` cast). The control-flow logic and
all field operations are correct against the disassembly.
```
