```
VERDICT: FAIL

Checklist:
1. Signature — ⚠️ — (this is a CTSGun class method, not one of the engine interface
   functions in the HLSDK reference — so checklist items 2/3 about version checks
   and `*interfaceVersion` assignment-back are N/A here; the rest of the review
   is against the disassembly). The signature `CCombatBlock(this: CTSGun): void`
   is plausibly the disassembly's calling convention: `edi = [esp+0x20]` is arg
   #1 (after sub esp,0xc + 4 pushes). The function uses `edi` as its base
   register throughout, consistent with `this` passed as the first stack arg
   (cdecl-style). The codex's choice of `this: CTSGun` is reasonable but not
   strictly confirmed; the function could equally be a non-member helper with
   a typed `pCTSGun` first arg. Mark as TODO.
2. Version check — N/A — (not an engine interface function).
3. interfaceVersion assignment — N/A — (not an engine interface function).
4. Success path — ❌ — **Critical bug.** Branch logic for the state-byte dispatch
   is inverted. The disassembly's control flow is:
       cc == 0                       → esi=1,    player+0x7a8=bp, dispatch
       cc != 0, d0 == 0              → esi=0,    dispatch
       cc != 0, d0 != 0, byte == 0xa → player+0x7b0=bp, GOTO esi=0x12, dispatch
       cc != 0, d0 != 0, byte == 0x3 → player+0x7ac=bp, FALLTHROUGH esi=0x12
       cc != 0, d0 != 0, byte == ?   → GOTO 0x75fc7 → esi=0x12, dispatch
   The last case (byte matches neither 0x0a nor 0x03) is reached via either
   `jne 75fac` falling through to `75fb9: jne 75fc7`, which lands on
   `75fc7: mov esi,0x12`. The codex instead sets `eventIdx = 0` for that case,
   which is wrong.
5. No fabricated paths — ⚠️ — Overall structure is faithful, but the inverted
   fallback above is effectively a fabricated control-flow branch. The
   `eventIdx = 0;` line in the `else` of the inner `if/else if` does not exist
   in the disassembly.
6. No TODO body — ✅ — The function expresses its logic in code; TODO comments
   are appropriately scoped to genuinely ambiguous offsets (`0x250`, `0x774`,
   `0x28c`, GOT cvars, the engine singleton at GOT+0x1aa8).
7. Field names — ⚠️ — Mostly good (uses `m_pPlayer`, `m_flNextPrimaryAttack`,
   `m_flNextSecondaryAttack`, `m_flTimeWeaponIdle`, `byte_0x348`,
   `engineSingleton.vfunc_0x1ec`). The `[ebx+0x1888]` value is pushed twice as
   `arg5` and `arg6` of `pfnPlaybackEventFull`, which are `origin` and `angles`
   pointers — the codex labels both `global_eventIndex`, which is wrong (the
   event *index* is `arg3 = this.field_0x96c`). `arg5`/`arg6` are most likely
   static zero-vec3_t pointers (`g_vecZero` or similar) or a frame-time vector.
   Cvar names (`cvar_blockDuration`, `cvar_blockStaminaThreshold`,
   `cvar_blockIdleDelay`) are reasonable guesses but not verified against
   strings-n5.txt. Likewise, `player.blockStamina` and `player.field_0x7a8`
   / `0x7b0` / `0x7ac` (block-cooldown setters) are reasonable but unverified.
8. Compiles in isolation — ✅ — Uses `any` for unknown shapes; references only
   `this`, helper globals, and the four extern calls (`UTIL_WeaponTimeBase`,
   `Animate`, `UpdateMeleeBar`, `engineSingleton.vfunc_0x1ec`). Will compile.

Issues to fix:
- **eventIdx fallback is wrong.** When neither 0x0a nor 0x03 matches, the
  disassembly still sets `esi = 0x12` via the unconditional `mov esi, 0x12`
  at `0x75fc7` (which both the 0x0a branch's `jmp 75fc7` and the
  no-match-0x03 branch's `jne 75fc7` land on). Only the 0x03 *match* path
  sets a player field; the no-match path doesn't write a player field, but
  the eventIdx is still 0x12. The codex's `eventIdx = 0` is a control-flow
  fabrication.
- **`global_eventIndex` is misleading** — `[ebx+0x1888]` is pushed twice as
  `arg5`/`arg6` (origin/angles of pfnPlaybackEventFull). Rename to
  `global_originAnglesVec` or `g_vecZero` to match usage.
- **Signature caveat**: the disassembly loads `edi` from `[esp+0x20]`
  (first arg slot, not a `thiscall` ECX load). Either annotate the
  function as `extern "C"`-style, or note in a TODO that the calling
  convention is not the standard MSVC `__thiscall`.
- The `this.m_flNextReload = t + cvar_blockIdleDelay` write uses
  `[edi+0xa8]` — verify this is `m_flNextReload` and not some other
  weapon-state timing field (e.g. `m_flTimeWeaponIdle`, which we already
  guards against earlier). The disassembly's `fadd` at `0x7605f-0x76065`
  adds the GOT-0x6de98 cvar to `UTIL_WeaponTimeBase()` and stores to
  `[edi+0xa8]`, which is structurally distinct from `m_flTimeWeaponIdle`
  at +0xa4. Most likely it's a different dedicated block window
  (e.g. `m_flBlockTime`); the codex's `m_flNextReload` is a guess worth
  flagging.
```

And here is the corrected version.

```typescript
/**
 * CTSGun::CCombatBlock — execute a combat-block (defensive) action.
 *
 * Validates cooldowns, player state bits, and a stamina threshold;
 * then dispatches the playback event for the block, plays the
 * blocking animation, refreshes the on-screen melee bar, and
 * schedules the next primary/secondary/idle windows.
 *
 * Note: the disassembly passes `this` as the first stack arg (cdecl-
 * style), not via ECX as in standard MSVC thiscall. Annotate the
 * caller and the export mechanism accordingly.
 *
 * @param this  The CTSGun entity instance
 * @returns     void
 */
export function CCombatBlock(this: CTSGun): void {
  const player: any = this.m_pPlayer;

  // ---- Guard 1: every relevant timestamp must already be in the past ----
  if (UTIL_WeaponTimeBase() < player.m_flNextAttack) return;
  if (UTIL_WeaponTimeBase() < this.m_flNextPrimaryAttack) return;
  if (UTIL_WeaponTimeBase() < this.m_flNextSecondaryAttack) return;
  if (UTIL_WeaponTimeBase() < this.m_flTimeWeaponIdle) return;

  // ---- Guard 2: reject if any of a set of player status bits is set ----
  // TODO(asm-ambiguous): the deref `[[player]+0x250]` reads past the
  // player struct's first dword (most likely `m_pPlayer->pev->flags`,
  // since CBaseEntity.pev is at offset 0 and entvars_t has flag bits
  // near that range in TS). Mask 0x70c30 is a TS-specific multi-bit
  // status check (frozen / in-water / on-ladder / etc.).
  if ((player.statusBits250 & 0x70c30) !== 0) return;

  // ---- Guard 3: player must meet a stamina / block-meter threshold ----
  // TODO(asm-ambiguous): field at player+0x774 is a float (block meter);
  // cvar at GOT offset -0x6f3f0 — verify name via strings-n5.txt
  // (likely ts_block_stamina_min or similar).
  if (player.blockStamina < cvar_blockStaminaMin) return;

  // ---- Load the block-duration cvar once for re-use below ----
  const blockDuration: number = cvar_blockDuration; // GOT offset -0x6ec2c

  // ---- Pick the event index and the corresponding player field, based
  //      on the current combat/animation state ----
  //
  // Disassembly control flow (esi = eventIdx, default 0):
  //   cc == 0                       → esi = 1,    player+0x7a8 = bp  (jump to dispatch)
  //   cc != 0, d0 == 0              → esi stays 0                       (jump to dispatch)
  //   cc != 0, d0 != 0, byte == 0xa → player+0x7b0 = bp, jmp 0x75fc7 → esi = 0x12
  //   cc != 0, d0 != 0, byte == 0x3 → player+0x7ac = bp, fallthrough → esi = 0x12
  //   cc != 0, d0 != 0, byte == ?   → neither match, jne 0x75fc7 → esi = 0x12
  //                                                                (no player field write)
  let eventIdx: number;
  if (this.field_0xcc === 0) {
    // Branch A: gun is in a clean state.
    eventIdx = 1;
    player.field_0x7a8 = blockDuration;
  } else if (this.field_0xd0 !== 0) {
    // Branches B / C / fallback: gun has a state struct pointer.
    // Whichever (if any) player field gets written, eventIdx is *always* 0x12.
    const stateByte = (this.field_0xd0 as { byte_0x348: number }).byte_0x348 & 0xff;
    if (stateByte === 0x0a) {
      player.field_0x7b0 = blockDuration;
    } else if (stateByte === 0x03) {
      player.field_0x7ac = blockDuration;
    }
    // No write for the fallback case — disassembly does NOT touch
    // player+0x7a8/0x7b0/0x7ac in that path.
    eventIdx = 0x12;
  } else {
    eventIdx = 0;
  }

  // ---- Dispatch the client-side playback event for the block ----
  // TODO(asm-ambiguous): the call lands in `engineSingleton.vfunc_0x1ec`,
  // i.e. the engine's pfnPlaybackEventFull entry in gEngfuncs (GOT+0x1aa8).
  // 12-arg signature: (flags, client, eventindex, delay, origin, angles,
  //                   fparam1, fparam2, iparam1, iparam2, bparam1, bparam2).
  engineSingleton.vfunc_0x1ec(
    /* flags      */ 1,
    /* client     */ player.field_0x208,
    /* eventindex */ this.field_0x96c & 0xffff,
    /* delay      */ 0,
    /* origin     */ global_originVec, // GOT+0x1888 (likely g_vecZero or frame-static vec3)
    /* angles     */ global_originVec, // GOT+0x1888 (same pointer pushed twice)
    /* fparam1    */ this.field_0xc8,
    /* fparam2    */ 0,
    /* iparam1    */ 0,
    /* iparam2    */ eventIdx,
    /* bparam1    */ 0,
    /* bparam2    */ 0,
  );

  // ---- Play the block animation (sequence index 0x26 = 38) ----
  // The CTSAnimation instance is embedded inside the player at offset 0x28c.
  // Animate(CTSAnimation*, CBasePlayer*, int) — thiscall in original.
  Animate(player.field_0x28c, player, 0x26);

  // ---- Refresh the on-screen melee bar to 33.0f (0x42040000) ----
  UpdateMeleeBar(player, 33.0);

  // ---- Schedule the next attack and idle windows ----
  const t = UTIL_WeaponTimeBase();
  const nextAttack = t + blockDuration;
  this.m_flNextPrimaryAttack = nextAttack;
  this.m_flNextSecondaryAttack = nextAttack;
  // TODO(asm-ambiguous): [edi+0xa8] is a *separate* timing field from
  // m_flTimeWeaponIdle (which is at +0xa4 above). Likely a dedicated
  // "block cooldown" window — `m_flBlockFinishTime` or similar.
  // cvar at GOT-0x6de98 — verify name via strings-n5.txt.
  this.m_flBlockFinishTime = t + cvar_blockCooldown;
}
```

Net diff vs. codex output: (a) inverted fallback for the state-byte dispatch is corrected — `eventIdx = 0x12` always in the `d0 != 0` branch with no extra inner `else { eventIdx = 0; }`; (b) `global_eventIndex` renamed to `global_originVec` to match its role as `pfnPlaybackEventFull`'s origin/angles pointers; (c) cvar/field rename hints (`cvar_blockStaminaMin`, `cvar_blockCooldown`, `m_flBlockFinishTime`) to flag the unverified offsets; (d) explicit `extern "C"`/cdecl calling-convention caveat in the doc-comment.
