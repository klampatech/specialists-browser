I have enough context. Here's the review of the Codex decompilation of `CTSGun::WeaponIdle`:

```
VERDICT: FAIL

Checklist (adapted for a CTSGun gameplay method — interface-function
items marked N/A):
1. Signature — ✅ — Demangled symbol is `CTSGun::WeaponIdle()` (no
   args, void). TS `WeaponIdle(this: CTSGun): void` matches the
   prologue: `[esp+0x10]` is loaded into `esi` as `this`, no other
   args are read, no return value written.
2. Version check — N/A — not an interface function.
3. interfaceVersion assignment-back — N/A.
4. Success path — N/A.
5. No fabricated paths — ✅ — every control-flow branch traces back
   to the disassembly:
     - `[esi+0xcc]==0` → CCombatIdle, jmp epilogue (754f1-75503) ✓
     - sync m_iClip from m_pWeaponInfo+0x4 (75508-75511) ✓
     - ammo-source pointer: 0x252 if flag==0 else 0x28c → store at
       m_pWeaponInfo+0x28 (75517-7553d) ✓
     - player+0x348==1 AND m_pWeaponInfo+0x8!=0 → vtable[0x188/4],
       jmp epilogue (75540-75568) ✓
     - m_pWeaponInfo+0x2==2 (burst mode) AND timer expired:
       if +0x8>0 Fire and dec; else zero (75570-755b2) ✓
     - UTIL_WeaponTimeBase < this+0xa8 → jmp epilogue (755b9-755c9) ✓
     - player+0x348==2 → GrenadeIdle(0), jmp epilogue (755cf-755e9) ✓
     - InfiniteClips(this+0x80)==0 AND m_pWeaponInfo+0x4<=0 → vtable
       [0x188/4], jmp epilogue (755ec-7561a) ✓
     - m_pWeaponInfo+0x4==0 → jmp epilogue (7561c-75626) ✓
     - this+0xa8 = UTIL_WeaponTimeBase + cvar; pick animId from
       *(short*)m_pWeaponInfo+0x28; call vtable[0x174/4] with 4 args
       (75628-75663) ✓
   No invented branches.
6. No TODO body — ⚠️ — body has actual code (not just TODOs), but
   carries 6 `// TODO(asm-ambiguous):` markers. The PrimaryAttack
   convention used only 2; 6 is heavier than the D.4 norm but not
   blocking on its own.
7. Field names — ❌ — three real bugs (see issues below) plus
   inconsistency with the PrimaryAttack convention:
     - `m_pWeaponInfo` (+0xcc), `m_iClip` (+0xb4), `m_iAmmo` (+0x4)
       — plausible, OK.
     - `m_pPlayer` (+0xd0) — plausible.
     - **`m_pPlayer` (+0x80) — INCONSISTENT with PrimaryAttack
       convention**, which uses `m_pOwner` for +0x80 (paired with
       `flag0x814`). Same offset, different name. Pick one. Use
       `m_pOwner` for +0x80 to match PrimaryAttack.
     - `m_pWeaponInfo.m_bUseAmmo2` (+0x2c) — speculative but
       plausible.
     - `m_pWeaponInfo.m_bFireMode` (+0x02) — speculative; the byte
       is compared against 2 for "burst," which fits a fire-mode
       enum. Acceptable.
     - `m_pWeaponInfo.m_iShotsRemaining` (+0x08) — speculative;
       plausible for a burst counter. Acceptable.
     - **`m_pWeaponInfo.m_pAmmoSource` AND `m_pWeaponInfo.m_pAnimSeq`
       BOTH at +0x28** — same offset, two different names. See
       issue #2.
     - `m_pPlayer.m_iWeaponState` (+0x348) — speculative. The byte
       is compared against 1 (firing) and 2 (grenade). OK but       PrimaryAttack calls the same offset `weaponCategory`. Pick
       one.
     - `m_pPlayer.m_rgAmmo` (+0x252 / +0x28c) — see issue #3.
     - `this.m_pOwnerInterface.playFireAnim` / `playReloadAnim` /
       `playIdleAnim` (virtual calls via [esi+0x60]+0x188 / 0x174) —
       speculative method names; the actual call targets are not
       visible in this chunk. Acceptable as placeholders, but flag
       with TODO.
     - **`this.someField[0x114]` (4th arg to playIdleAnim)** — see
       issue #1.
     - `m_flTimeWeaponIdle` (+0x9c) — speculative; the float is
       compared against a global cvar at [ebx-0x6de68], which may
       or may not be the idle timer.
     - `m_flNextPrimaryAttack` (+0xa8) — speculative; the float is
       `currentTime + cvar` written back. Acceptable as a guess
       for "next primary attack time."
     - `TS_IDLE_RANDOM_INTERVAL` — invented constant name; the
       source is the global at [ebx-0x6e768]. Use a TODO marker,
       not a fake identifier.
8. Compiles in isolation — ⚠️ — uses `CTSGun` as a type without
   defining it (same as PrimaryAttack — acceptable for the
   per-function pipeline, but be aware). The `&` (address-of)
   operator on `this.m_pPlayer.m_rgAmmo[...]` would not compile
   in standard TS without a target-pointer context — see issue #3.

Issues to fix:
1. **WRONG: 4th argument to the final virtual call.** At 7563e,
   `eax = [esi]` is `*(this+0)` — the vtable pointer (first 4
   bytes of any C++ object with virtuals). Then `[eax+0x114]`
   reads at byte offset 0x114 into the vtable. So the arg is
   `this->vtable[0x114/4]` — a function pointer loaded from
   `this`'s own vtable. The codex has `this.someField[0x114]`,
   which is unrelated to the assembly. (If0x114 is beyond the
   vtable's size in this class, the value would actually be
   `*(*this + 0x114)` — still derived from `this->vtable`, never
   from a `someField`.)
2. **WRONG: contradictory naming at m_pWeaponInfo+0x28.** The
   same field is called `m_pAmmoSource` (when written) and
   `m_pAnimSeq` (when read). The assembly stores a pointer at
   +0x28 (early in the function) and then dereferences it as a
   `short` (near the end). Either:
     - the original C++ genuinely reuses the field for two
       purposes (unusual but possible), OR
     - one of the offsets is being misread.
   Pick one name. Since the early write sets it to a pointer
   into the player struct, and the late read loads a `short`
   from that pointer, a single name like `m_pSomeShortPtr` or
   honest placeholder `field_0x28` is more faithful. (Don't
   call it both `m_pAmmoSource` and `m_pAnimSeq`.)
3. **WRONG: `&this.m_pPlayer.m_rgAmmo[0x252]`.** The disassembly
   at 75523 does `add eax, 0x252` where `eax = m_pPlayer`. That's
   **byte offset** arithmetic: `(char*)m_pPlayer + 0x252`, NOT an
   array index. The player struct is several KB; 0x252 is
   well within it but is NOT an `m_rgAmmo[594]` index
   (`m_rgAmmo` is typically `short[32]` = 64 bytes). Treat it as
   `*(this.m_pPlayer + 0x252)` (TS pointer arithmetic) and TODO
   the field identity at that offset.
4. **`m_pOwner` vs `m_pPlayer` for offset0x80.** Inconsistent   with the PrimaryAttack convention (which uses `m_pOwner` for
   +0x80 and `m_pPlayer` for +0xd0). Standardize on `m_pOwner`
   for +0x80 to match.
5. **`m_iWeaponState` for player+0x348 conflicts with
   `weaponCategory` in PrimaryAttack.** Same offset. If it's
   genuinely the same byte, pick one name across the codebase.
   PrimaryAttack uses `weaponCategory` based on values 0x2, 0x3,
   0xa, 0xb mapping to weapon types; that semantics also fits
   the WeaponIdle values 1 (firing) and 2 (grenade). Recommend
   `weaponCategory` (or a renamed `playerWeaponState`) — but
   commit to one.
6. **Multiple speculative method names** (`playFireAnim`,
   `playReloadAnim`, `playIdleAnim`, `m_pOwnerInterface`) should
   be flagged with TODOs noting the assembly doesn't reveal what
   these are. They're acceptable as descriptive placeholders,
   but the existing TODOs say "method unknown" — which means
   the call-target is not `playFireAnim`, it's "vtable entry at
   +0x188/4 of `this.m_pOwnerInterface`." Make this distinction
   in the comment.
7. **`TS_IDLE_RANDOM_INTERVAL` is fabricated.** Replace with a
   TODO + literal placeholder (`0` or `/* TODO cvar at
   [ebx-0x6e768] */`).

Suggested rewrite:

```typescript
/**
 * CTSGun::WeaponIdle — per-frame idle behavior for a CTSGun weapon.
 *
 * Branches based on the gun's mode, the player's weapon state,
 * ammo, and the idle timer. See the cross-vendor review for the
 * rationale behind each TODO.
 *
 * NOTE: CTSGun field offsets and the weapon-info struct layout
 * are being reconstructed separately (D.4). The type names below
 * are placeholders consistent with the PrimaryAttack convention.
 */
export function WeaponIdle(this: CTSGun): void {
  // === Branch 1: no weapon info → generic combat idle. ===
  if (this.m_pWeaponInfo === null) {
    this.CCombatIdle();
    return;
  }

  // === Branch 2: sync clip + ammo source from weapon info. ===
  this.m_iClip = this.m_pWeaponInfo.m_iAmmo;

  // The pointer at m_pWeaponInfo+0x28 is set to one of two byte
  // offsets within the player struct (m_pPlayer). The byte at
  // m_pWeaponInfo+0x2c selects which. (0x252 / 0x28c are BYTE
  // OFFSETS into the player struct, not array indices.)
  // TODO(asm-ambiguous): identify the player fields at +0x252 /
  // +0x28c — could be ammo counts, item slots, or anim indices.
  this.m_pWeaponInfo.m_pSomeShortPtr =
    this.m_pWeaponInfo.m_bUseAmmo2 === 0
      ? (this.m_pPlayer + 0x252)
      : (this.m_pPlayer + 0x28c);

  // === Branch 3: per-frame firing animation. ===
  // If the player's weaponCategory byte == 1 and shots remain at
  // m_pWeaponInfo+0x8, dispatch a virtual call via
  // [this.m_pOwnerInterface]+0x188/4 and exit.
  // TODO(asm-ambiguous): identify this->m_pOwnerInterface (vtable?
  // CBasePlayer*?) and the call target.
  if (
    this.m_pPlayer.weaponCategory === 1 &&
    this.m_pWeaponInfo.m_iShotsRemaining !== 0
  ) {
    this.m_pOwnerInterface[0x188 / 4](this);
    return;
  }

  // === Branch 4: burst autofire. ===
  // While m_pWeaponInfo+0x2 == 2 (burst mode) AND the float at
  // this+0x9c is <= the global cvar at [ebx-0x6de68]:
  if (this.m_pWeaponInfo.m_bFireMode === 2) {
    // TODO(asm-ambiguous): identify the cvar at [ebx-0x6de68] —
    //   likely a time threshold (gpGlobals->time? a slowmo cvar?).
    if (this.m_flTimeWeaponIdle <= 0 /* cvar value */) {
      if (this.m_pWeaponInfo.m_iShotsRemaining > 0) {
        this.Fire();
        this.m_pWeaponInfo.m_iShotsRemaining--;
      } else {
        this.m_pWeaponInfo.m_iShotsRemaining = 0;
      }
    }
  }

  // === Branch 5: bail if next-attack time hasn't elapsed. ===
  const currentTime = UTIL_WeaponTimeBase();
  if (currentTime < this.m_flNextPrimaryAttack) {
    return;
  }

  // === Branch 6: grenade state → delegate and exit. ===
  if (this.m_pPlayer.weaponCategory === 2) {
    this.GrenadeIdle(0);
    return;
  }

  // === Branch 7: auto-reload if not infinite-clip and out of ammo. ===
  // Note: offset 0x80 is m_pOwner (per PrimaryAttack convention),
  // not m_pPlayer. Both are CBasePlayer* but offset 0x80 is
  // consistently used with player-method helpers in this class.
  if (
    InfiniteClips(this.m_pOwner) === 0 &&
    this.m_pWeaponInfo.m_iAmmo <= 0
  ) {
    // Same vtable slot as branch 3 (the reload anim vs fire anim
    // dispatch lives in the same vtable entry — the engine    // resolves which to play by inspecting m_pWeaponInfo state).
    this.m_pOwnerInterface[0x188 / 4](this);
    return;
  }

  // === Branch 8: bail if out of ammo (and infinite-clips off). ===
  if (this.m_pWeaponInfo.m_iAmmo === 0) {
    return;
  }

  // === Branch 9: schedule next idle tick + play idle anim. ===
  // this.m_flNextPrimaryAttack = currentTime + cvar at [ebx-0x6e768].
  // TODO(asm-ambiguous): identify the constant — likely a random
  //   jitter or base idle interval.
  this.m_flNextPrimaryAttack = currentTime + 0 /* TODO cvar */;

  // Pick the anim id: m_pWeaponInfo+0x28 is a pointer to a short.
  // When non-null, read the short; otherwise use 0. NOTE this is
  // the SAME field set earlier as m_pSomeShortPtr — the assembly
  // reuses it for anim-id lookup. Either the original reuses the
  // field for two purposes, or one offset is wrong; flag for
  // follow-up in D.4.
  const animId =
    this.m_pWeaponInfo.m_pSomeShortPtr !== null
      ? (this.m_pWeaponInfo.m_pSomeShortPtr as any).short
      : 0;

  // Final virtual call via [this.m_pOwnerInterface]+0x174/4:
  //   arg1 = this
  //   arg2 = animId
  //   arg3 = 0
  //   arg4 = *(this->vtable + 0x114)  ← NOT this.someField[0x114]
  // The vtable pointer is the first 4 bytes of `this` (standard
  // C++ Itanium ABI). Read at byte offset 0x114 in that vtable.
  // TODO(asm-ambiguous): identify the call target and the vtable
  //   entry at +0x114/4.
  const vtable = this[0] as any;
  const arg4 = vtable !== null ? vtable[0x114 / 4] : 0;
  this.m_pOwnerInterface[0x174 / 4](this, animId, 0, arg4);
}
```

Summary: the control flow is faithful (item 5 ✅) — every branch
traces to the disassembly, and the structure cleanly captures all
9 cases (no-weapon-info / sync / fire-anim / burst / bail-on-timer
/ grenade / auto-reload / bail-on-no-ammo / schedule-and-play).
The verdict is FAIL because three items are factual errors, not
speculative naming: (1) the 4th argument to the final call is
`this->vtable[0x114/4]`, not `this.someField[0x114]`; (2) the
same offset `+0x28` is named both `m_pAmmoSource` and
`m_pAnimSeq`, which can't both be right; (3) `m_rgAmmo[0x252]`
treats byte offsets as array indices, which is a misread of the
`add eax, 0x252` pointer arithmetic. Plus, naming for offsets
+0x80 (m_pOwner vs m_pPlayer) and player+0x348 (m_iWeaponState vs
weaponCategory) is inconsistent with the PrimaryAttack convention
and should be standardized. Once those are fixed and the
contradictory naming at +0x28 is resolved, this should be
PASS-WITH-NOTES pending the D.4 struct reconstruction.
```
