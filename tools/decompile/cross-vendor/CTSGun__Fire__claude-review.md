```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `Fire(this: CTSGun): void` matches the demangled
   symbol `CTSGun::Fire()` (no args, void return).
2. Version check — N/A — not an engine API function.
3. interfaceVersion assignment — N/A.
4. Success path — ✅ — the three-way dispatch to
   AkimboFire / ShotgunFire / StandardFire, the sentinel-init to -1,
   and the post-dispatch animation choice all match the disassembly.
5. No fabricated paths — ⚠️ — every branch traces back to the asm,
   BUT the `m_pPlayer.v_angle` access is wrong (see issue #1).
6. No TODO body — ✅ — body is real code; the three TODOs are scoped
   to field-name guesses and don't stand in for logic.
7. Field names — ⚠️ — `m_pPlayer`, `m_pAmmo`, `m_pOwner`, `pev`,
   `v_angle`, `fireMode`, `count`, `flag`, `ammoType` are all
   defensible inferences from offsets, but two are off (see below):
   - **v_angle** is accessed as `m_pPlayer.v_angle` (offset
     0x74 of m_pPlayer itself) instead of `m_pPlayer.pev.v_angle`
     (offset 0x74 of pev). The disassembly dereferences m_pPlayer
     to get pev first, then adds 0x74.
   - The `[m_pPlayer + 0x28c]` CTSAnimation pointer is renamed to
     `anim_at_0x28c`, which is a fine honest "we don't know" label.
8. Compiles in isolation — ❌ — `g_animationChoice` is assigned
   (`= -1`, `= 9`, `= 8`, `= 0`) but never declared. Free-function
   symbols `InfiniteClips` and `UTIL_MakeVectors` are also referenced
   without import. With `declare let g_animationChoice: number;` at
   the top of the file (or `any` cast) it would compile.

Issues to fix:

- **[Critical] `m_pPlayer.v_angle` must be `m_pPlayer.pev.v_angle`.**
  The disassembly does:
    ```
    71d15: mov eax, [esi+0x80]   ; eax = m_pPlayer
    71d1b: mov eax, [eax]         ; eax = *m_pPlayer (= pev)
    71d1d: add eax, 0x74          ; eax = pev + 0x74 (= &v_angle)
    71d20: push eax
    71d21: call UTIL_MakeVectors
    ```
  The current TS does `m_pPlayer.v_angle`, which is offset 0x74 of
  the CBasePlayer object, not of its pev field. The first
  `pev[0x1c0]` access in the same function is *correct* (it goes
  through `.pev`); the v_angle access is an inconsistency, not a
  stylistic difference.

- **[Minor] `g_animationChoice` is undeclared.** Add a top-of-file
  `let g_animationChoice: number = -1;` (or `declare let` if it's
  defined in a shared `weapons.ts` module alongside the other
  Fire-variant globals). The disassembly uses `[ebx+0x7c34]`,
  a single 4-byte module-static. The TS already calls it
  `g_animationChoice` — just declare it.

- **[Minor] `m_pAmmo === null` is too strict.** The disassembly
  uses `cmp [esi+0xcc], 0; je` — i.e. "is the pointer zero". In
  TS that maps to `if (!this.m_pAmmo)` or `if (this.m_pAmmo == null)`.
  Strict `=== null` would skip the early-out if the slot is
  `undefined`. This is a style nit, not a correctness issue.

- **[Style] `g_animationChoice` is read three times in the asm
  but the TS also reads it three times — fine, faithful.**

- **[Style] The TS reads `ownerFireMode` once and branches on it,
  while the asm reloads the byte twice (once for the
  `sub al, 4; cmp al, 1; ja` Akimbo check, once for the
  `cmp ..., 1; jne` Shotgun check). This is a faithful
  simplification, not a bug.

Suggested rewrite (corrected):

```typescript
// Module-static shared by all CTSGun::Fire* variants.
// Resets to -1 (= "skip Animate") at the top of Fire, then each
// dispatched variant may overwrite it.
declare let g_animationChoice: number;

export function Fire(this: CTSGun): void {
  // Bail silently if there's no ammo entity attached (e.g. melee
  // weapons). Asm: cmp [esi+0xcc], 0; je 71dca.
  if (!this.m_pAmmo) {
    return;
  }

  // Player-state guard: a pev int equal to 3 means "cannot fire".
  // TODO(asm-ambiguous): exact meaning of [pev + 0x1c0] == 3 —
  // likely a TS-specific deadflag / observer / stance value.
  if ((this.m_pPlayer as any).pev[0x1c0] === 3) {
    this.EmptySound();
    return;
  }

  // Decide whether we're allowed to consume a shot.
  const ammo: any = this.m_pAmmo;
  const owner: any = this.m_pOwner;
  const hasInfiniteClips = InfiniteClips(this.m_pPlayer);
  const ammoCount = ammo.count;
  const specialAmmo =
    ammo.flag !== 0 &&
    ammo.ammoType === 3 &&
    owner.fireMode === 1;

  if (!hasInfiniteClips && ammoCount <= 0 && !specialAmmo) {
    this.EmptySound();
    return;
  }

  // Reset the animation selector. The Fire variant we dispatch into
  // will overwrite it (or leave it at -1 to skip the animation).
  g_animationChoice = -1;

  // Refresh engine view vectors from the player's view angles.
  // Asm: mov eax, [esi+0x80]; mov eax, [eax]; add eax, 0x74 —
  // i.e. *(m_pPlayer) is pev, then pev + 0x74 is &v_angle.
  UTIL_MakeVectors((this.m_pPlayer as any).pev.v_angle);

  // Dispatch based on the owner's fire-mode byte (m_pOwner + 0x348).
  // Asm: sub al, 4; cmp al, 1; ja → AkimboFire only for fireMode in {4, 5}.
  const ownerFireMode = owner.fireMode;
  if (ownerFireMode === 4 || ownerFireMode === 5) {
    if (this.AkimboFire()) {
      g_animationChoice = ammo.flag !== 0 ? 9 : 8;
    }
    // else: g_animationChoice stays at -1 → no Animate call.
  } else if (ownerFireMode === 1) {
    this.ShotgunFire();
    g_animationChoice = 0;
  } else {
    this.StandardFire();
    g_animationChoice = 0;
  }

  // Play the chosen animation unless the sentinel says "none".
  if (g_animationChoice >= 0) {
    // The CTSAnimation object lives at m_pPlayer + 0x28c.
    // TODO(asm-ambiguous): offset 0x28c within CBasePlayer is either
    // an embedded CTSAnimation or a pointer to one.
    const anim: any = (this.m_pPlayer as any).anim_at_0x28c;
    anim.Animate(this.m_pPlayer, g_animationChoice);
  }
}
```

The only functional change is the `.pev` insertion on the
`UTIL_MakeVectors` argument. Everything else is comment cleanup.
```

One thing I want to flag explicitly: the disassembly does the
`pev + 0x74` walk identically to the `pev + 0x1c0` walk a few lines
earlier, so the `.pev.v_angle` form is required for consistency
with the same function's other `pev` access. If the v_angle access
is intentionally skipping the pev dereference (i.e. the original
codex author was modeling `m_pPlayer` as already having v_angle
flattened into it, which would be a non-standard layout), the
disassembly doesn't support that — it explicitly double-dereferences.
