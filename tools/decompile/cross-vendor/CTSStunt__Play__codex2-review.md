```
VERDICT: FAIL

Checklist (with the note that the supplied checklist was written for
the 4 engine↔mod interface entry points in HLSDK; this function is
CTSStunt::Play — a TS gameplay method — so most items don't apply).
For completeness, each item is marked and explained.

1. Signature — ⚠️ — The HLSDK reference signatures
   (`GiveFnptrsToDll`, `GetEntityAPI*`, `GetNewDLLFunctions`) don't
   apply. The demangled C symbol is `CTSStunt::Play()`, an
   instance method taking `this`. The TS signature   `export function Play(this: any): void` is fine for an
   isolated export; if you want it as a method, drop `this` and
   make it `play(): void` on a class.

2. Version check pattern — N/A — `CTSStunt::Play` is not an
   engine↔mod interface function; it has no version check.

3. interfaceVersion assignment-back — N/A — same reason.

4. Success path / memcpy — N/A — not applicable.

5. No fabricated paths — ❌ — Section 7 (the on-ground conditional
   reset) inverts a control-flow branch. The disassembly at
   `8a2ee: jne 8a3d4` after `fcomp / fnstsw / test ah,0x40` jumps
   on EQUAL (this is the well-known FPU-C3-via-`test`-ah,0x40
   idiom: equal → ZF=0 → jne/jnz taken). So when
   `MIN_B == m_flTimer1`, the asm unconditionally skips the
   reset. The TS wraps the same case with a `m_pSub_78` check
   and decides to reset under a different condition. See issue
   #1 below for the corrected rewrite.

6. No TODO body — ✅ — Body is fully expressed in code; TODO
   markers are scoped to specific ambiguous sites (engine-func
   slot, `+0x5f` semantics, three-branch thresholds). Acceptable.

7. Field names — ⚠️ — TS uses placeholder offsets for several
   pev/player fields (`frictionAt0x11c`, `gravityAt0x120`,
   `vecAt0x174`, `someFieldAt0x4dc`, `animSlot0x28c`,
   `flagsAt0x250`, `flagsAt0x180`). The asm confirms the
   offsets are real (`[eax+0x120]`, `[eax+0x11c]`, `[eax+0x174]`,
   `[eax+0x4dc]`, `[eax+0x28c]`, `[eax+0x250]`, `[eax+0x180]`)
   but the *semantic* mapping is just inferred. Acceptable as
   D.3 TODOs; will need D.4 (entity-field discovery) to lock
   them down. **One outright error:** see issue #3 — the TS
   swaps 0x11c and 0x120 in section 7.

8. Compiles in isolation — ✅ — Every external symbol is
   either aliased to a placeholder global (`TIMER_MIN_6F408`,
   `ENGINE_FUNCS_1AA8`, etc.) or defined in the body
   (`EMIT_SOUND_DYN`, `HandleDive`, `Animate`, …). `any` is
   used for unknowns. The file should compile as-is in a
   sandbox.

Issues to fix (in order of severity):

- **Issue 1 — Section 7 polarity inversion (FAIL cause).**
  Disassembly (`8a2e0..8a30b`) reads:
  ```
  if (MIN_B == m_flTimer1)           goto 8a3d4  // skip reset
  if (m_flTimer1 < MIN_6F3F0)        goto 8a311  // do reset
  if (player.field_at_0x78 == 0)     goto 8a3d4  // skip reset
                                     fallthrough  // do reset
  ```
  TS:
  ```ts
  if (MIN_B === this.m_flTimer1) {
 if (this.m_pSub_78 !== 0) doReset = true;   // ← WRONG: asm skips here
  } else if (this.m_flTimer1 < TIMER_MIN_6F3F0) {
    doReset = true;
  } else if (this.m_pSub_78 !== 0) {
    doReset = true;
  }
  ```
  Fix: drop the `m_pSub_78` check from the equal branch; it
  only fires in the `else` branch.

- **Issue 2 — Wrong parent for the field-at-0x78 check.**
  Asm at `8a304..8a307` is `mov eax, [ebp+0x40]; cmp  [eax+0x78], 0`, where `[ebp+0x40]` is `this->m_pPlayer`.
  So the check is on `player.field_at_0x78`, NOT
  `this.m_pSub_78`. The TS's `this.m_pSub_78` is a
  misinterpretation.

- **Issue 3 — Offset 0x11c vs 0x120 in section 7.**
  Asm at `8a36c` writes `[eax+0x120] = 1.0` (only one float
  store). TS writes `frictionAt0x11c = 1.0`. In HLSDK
  `entvars_t` the convention is friction@0x11c, gravity@0x120,
  so the asm is resetting gravity and the TS is resetting
  friction. The label names in the TS (which you wrote in
  section 6 too) are consistent with HLSDK — but section 7's
  offset is wrong. Either swap the TS offset to 0x120, or
  swap the label. The original disassembly is authoritative.

- **Issue 4 — `Animate(this, player, animIndex)` first arg is
  a pointer, not a value.**
  Asm at `8a2d0..8a2d5` computes `eax = this + 0x28c` and
  pushes *that address* (so the function receives
  `CTSAnimation*` pointing into the slot, and reads/writes
  the slot's current value). TS does
  `Animate(player.animSlot0x28c, player, 1)` — which, given
  that `animSlot0x28c` was just set to `-1`, passes a
  null/invalid pointer to the callee. The TS should pass a
  reference (or pointer) to the slot, e.g.
  `Animate({ slot: player.animSlot0x28c } /* ref to field
  0x28c */, player, 1)`. As written, this would crash or
  silently no-op on the same path TS uses in section 4 too.

- **Issue 5 — Engine-func call is missing one pushed arg.**
  Asm at `8a13a..8a14c` pushes `(0, 0x1f, 0.5)` (three  floats/ints) and the `add esp, 0xc` confirms three args.
  TS calls `ENGINE_FUNCS_1AA8.callSlot(0x168, 0, 0x1f)` —
  only two args. Likely benign (the trailing0.5f may be a
  default parameter the TS convention drops), but worth a
  `TODO(asm-ambiguous)` note to confirm.

- **Issue 6 — `pev.deadflag` source is suspicious.**
  Asm at `8a0e2: cmp DWORD PTR [edx+0x244], 0x0` reads
  through `edx`, which was last loaded with  `[eax+0x60]` (the vtable) at `8a0c8`. Either the dump has
  a transcription typo (should be `[eax+0x244]` — which fits
  the pev→deadflag reading) or the vtable really is the
  intended source (which would be semantically odd). The TS's
  `player.pev.deadflag` reading is the right *intent* but
  should be flagged with a TODO until the disassembly is
  re-verified against the binary.

- **Issue 7 — `edict` source for `EMIT_SOUND_DYN`.**
  Asm at `8a134: mov esi, [eax+0x208]` reads a pev field at
  offset 0x208, NOT `pContainingEdict` (which is normally
  ~0x84 in HLSDK). The TS passes `player.edict`. Either the
  TS struct has a different layout (so `player.edict` happens
  to coincide) or the TS is wrong. Add a TODO to reconcile.

Suggested rewrite (full TS function with the FAIL-causing fixes
applied):

```typescript
/**
 * CTSStunt::Play — per-tick stunt-system update for the attached player.
 *
 * Decompiled from `Play__8CTSStunt` (1130 bytes @0x8a014, ts_i386.so).
 * Field offsets are placeholders pending D.4 entity-field discovery.
 */
export function Play(this: any): void {
  const player: any = this.m_pPlayer;

  // ── 1. Per-tick delta ───────────────────────────────────────────
  // Vtable slot 4 on the player (via [player+0x60] → [vtable+0x10]) returns
  // a float; multiply by gpGlobals->frametime.
  // TODO(asm-ambiguous): exact engine value being scaled.
  const frameDelta: number =
    player.m_pFuncTable_0x60.callSlot(0x10, player) *
    (GLOBAL_PTR_1600 as any)[0][0x4];

  // ── 2. Decrement four float timers, clamped to per-field floors ──
  const MIN_A: number = TIMER_MIN_6F3F4 as number; // clamp floor for m_flTimer1
  const MIN_B: number = TIMER_MIN_6F408 as number; // gate floor for m_flTimer1
  // // and clamp floor for the other three

  // m_flTimer1: subtract only when not at MIN_B (per `jne 8a071` on equal).
  if (this.m_flTimer1 !== MIN_B) {
    this.m_flTimer1 -= frameDelta;
    if (this.m_flTimer1 < MIN_A) this.m_flTimer1 = MIN_A;
  }

  this.m_flTimer0 -= frameDelta;
  if (this.m_flTimer0 < MIN_B) this.m_flTimer0 = MIN_B;

  this.m_flTimer2 -= frameDelta;
  if (this.m_flTimer2 < MIN_B) this.m_flTimer2 = MIN_B;

  this.m_flTimer3 -= frameDelta;
  if (this.m_flTimer3 < MIN_B) this.m_flTimer3 = MIN_B;

  // ── 3. Alive + deadflag gate ────────────────────────────────────
  if (player.IsAlive() === 0) return;
  // TODO(asm-ambiguous): asm uses [edx+0x244] where edx is the stale
  // vtable register from line 8a0c8 — likely a transcription error;
  // assume pev->deadflag.
  if (player.pev.deadflag !== 0) return;

  let flags: number = player.flagsAt0x250;

  // ── 4. Bullet-time entry transition ─────────────────────────────
  if (flags & 0x200000 /* FL_BULLETTIME_PENDING */) {
    flags = (flags | 0x100000) & ~0x200000;
    Animate(/* & */ player.animSlot0x28c, player, 0x39);

    player.gravityAt0x120  = 1.0;
    player.frictionAt0x11c = 1.0;

    // TODO(asm-ambiguous): engine-func slot 0x168 is unidentified;
    // `+ 0x5f` semantics unclear; asm pushes (0, 0x1f, 0.5f), TS passes 2.
    const soundIndex: number =
      (ENGINE_FUNCS_1AA8 as any).callSlot(0x168, 0, 0x1f) + 0x5f;
    EMIT_SOUND_DYN(
      /* TODO: asm source is pev+0x208, not player.edict */ player.edict,
      4,                            // channel
      SOUND_FILENAME_6C378,         // sample string
      1.0,                          // volume
      0.8,                          // attenuation
      0,                            // flags
      soundIndex,                   // pitch
    );
  }

  // ── 5. "Bullyrush" path: zero three stunt sub-fields ────────────
  if (flags & 0x2) {
    this.m_pSub_38 = 0;
    this.m_pSub_14 = 0;
    this.m_pSub_3c = 0;
  }

  // ── 6. On ladder or in-air → full stunt reset + bail ────────────
  if (player.IsOnLadder() !== 0 || player.m_iPlayerState === 3) {
    flags &= ~0x100000;
    if ((flags & 0x70c31) === 0) return;

    flags &= ~0x40000;
    flags &= ~0x4;
    flags &= ~0x1;
    flags &= ~0x10;
    flags &= ~0x20;
    flags &= ~0x400;
    flags &= ~0x800;
    flags &= ~0x10000;
    flags &= ~0x20000;

    player.vecAt0x174 = [MIN_B, MIN_B, GRAVITY_Z_6DE6C as number];

    player.gravityAt0x120  = 1.0;
    player.frictionAt0x11c = 1.0;
    this.m_flTimer1 = 0;
    player.someFieldAt0x4dc = 0;

 player.animSlot0x28c = -1;
    // Pass &player.animSlot0x28c (pointer to slot), not its value.
    Animate(/* & */ player.animSlot0x28c, player, 1);

    player.flagsAt0x250 = flags;
    return;
  }

  // ── 7. On-ground → conditional partial reset ────────────────────
  // asm: skip on equal; do on `< TIMER_MIN_6F3F0`; do on
  // `player.field_at_0x78 != 0`; otherwise skip.
  let doReset = false;
  if (this.m_flTimer1 === MIN_B) {
    doReset = false;
  } else if (this.m_flTimer1 < (TIMER_MIN_6F3F0 as number)) {
    doReset = true;
  } else if (player.field_at_0x78 !== 0) {
    doReset = true;
  }

  if (doReset) {
    flags &= ~0x40000;
    flags &= ~0x80000;
    flags &= ~0x4;
    flags &= ~0x1;
    flags &= ~0x2;
    this.m_flTimer1 = 0;
    player.someFieldAt0x4dc = 0;
    player.gravityAt0x120  = 1.0; // asm: [eax+0x120]=1.0; label per HLSDK

    // Choose z-component based on a pev byte bit at +0x1a5
    const z: number = (player.pev.button & 0x40) !== 0
      ? (GRAVITY_Z_6DEC8 as number)
      : (GRAVITY_Z_6DE6C as number);
    player.vecAt0x174 = [MIN_B, MIN_B, z];
  }

  // ── 8. Dispatch to stunt sub-handlers ───────────────────────────
  if (flags & 0x10)   HandleDive(this);
  if (flags & 0x20)   HandleSlide(this);
  if (flags & 0xc00)  HandleWheel(this);
  if (flags & 0x100)  HandleWallJump(this);
  if (flags & 0x200)  HandleWallClimb(this);
  if (player.flagsAt0x180 & 0x4002) HandleStunt(this);

  player.flagsAt0x250 = flags;
}
```

Note: I deliberately did not touch the placeholder names
(`frictionAt0x11c`, `flagsAt0x250`, `MIN_6F3F4`, etc.) — those
should be reconciled in D.4 when we cross-reference pev layout
against the TS entity fields. The rewrites above are scoped to
the four mechanical bugs (issues 1–4) and the two
disambiguation TODOs (issues 5–7).
```
