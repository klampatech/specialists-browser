```
VERDICT: FAIL

Note on scope: the function being reviewed (CTSGun::CCombatBlock) is a class member
method, NOT one of the 4 engine↔mod interface exports that
`hlsdk-goldsrc-interface.md` covers. So the HLSDK reference only provides boundary
context — items 1–4 of the checklist don't directly apply. The remaining items are
checked against the disassembly itself.

What's RIGHT about the decompilation:
- The overall control flow (4 timestamp guards → status-bit guard → threshold guard →
  state-driven event branching → engine dispatch → animation → melee-bar update →
  reschedule) faithfully mirrors the disassembly.
- The 5 wayward branches (one per guard + the early state check) jump to the same
  epilogue target (0x7606e).
- The player-field writes for each branch (0x7a8, 0x7b0, 0x7ac) match the
  disassembly byte-for-byte.
- The mask 0x70c30 is preserved verbatim at the status-bit test.
- The 12-arg push order for the playback event call matches the disassembly
  (including the duplicate `global_eventIndex` pushes for arg5/arg6).
- Animate(player.field_0x28c, player, 0x26) matches 0x76013–0x76027.
- UpdateMeleeBar(player, 33.0) matches the 0x42040000 push at 0x7602f.
- The post-dispatch writes to [edi+0xa0] and [edi+0x9c] both get `t + blockDuration`
  and are emitted in the right order.
- TODO notes are honest and useful (they're annotations, not stand-ins for code).

Checklist:
1. Signature — ⚠️ — Not an interface export; HLSDK reference comparison N/A. The TS
   `(this: CTSGun): void` is plausible for a void-returning member method, but
   `CTSGun` is referenced as a type without being declared (see item 8).
2. Version check — N/A — Not an interface export.
3. *interfaceVersion assignment-back — N/A — Not an interface export.
4. Success path / struct copy — N/A — Function has no success/failure binary
   pattern; it's a void gameplay method.
5. No fabricated code paths — ❌ — See Bug 1 below. The TS fabricates an
   `eventIdx = 0` branch that doesn't exist in the disassembly.
6. No TODO body — ✅ — TODOs are honest annotations of ambiguous paths (status
   deref, cvar names, vfunc identity). The function logic is in actual code, not
   stubs.
7. Field names — ⚠️ — Several field identities are inferred guesses. The
   m_flNextPrimaryAttack / m_flNextSecondaryAttack / m_flTimeWeaponIdle
   ordering may be swapped relative to the offset layout; the post-dispatch
   "m_flNextReload" at offset 0xa8 isn't a verified HLSDK field; `player.field_0x208`
   for the playback arg2 is missing a deref (see Bug 2). The raw-offset-named
   fields (field_0xcc, field_0xd0, field_0xc8, field_0x96c, field_0x28c) are
   appropriately preserved.
8. Compiles in isolation — ❌ — Multiple undefined references: `CTSGun`,
   `UTIL_WeaponTimeBase`, `engineSingleton`, `global_eventIndex`,
   `cvar_blockDuration`, `cvar_blockStaminaThreshold`, `cvar_blockIdleDelay`,
   `Animate`, `UpdateMeleeBar` — needs `declare` statements or stub globals.

Issues to fix:

- **Bug 1 (FAIL — fabricated eventIdx branch):** At 0x75f8d–0x75fc7 the disassembly
  unconditionally sets `esi = 0x12` whenever `[edi+0xd0] != 0`, regardless of
  the stateByte value:
  ```
  75fb9: jne 75fc7                 ; if stateByte ≠ 0x3, jump directly…
  …
  75fc7: mov esi, 0x12             ; …here. Both 0x0a/0x3 and "neither" lands set esi=0x12.
  ```
  The TS instead splits this into three branches:
  ```typescript
  } else if (stateByte === 0x0a) {
    eventIdx = 0x12;
  } else if (stateByte === 0x03) {
    eventIdx = 0x12;
  } else {
    eventIdx = 0;   // ← FABRICATED — should not be here
  }
  ```
  Fix: remove the `else { eventIdx = 0; }` and lift `eventIdx = 0x12;` outside the
  inner if-else so it executes unconditionally when `this.field_0xd0 !== 0`.

- **Bug 2 (FAIL — missing deref level on arg2):** Disassembly 0x75fcc–0x76002:
  ```
  mov  eax, [edi+0x80]            ; eax = this->m_pPlayer
  mov  edx, [eax]                 ; edx = *m_pPlayer  (extra deref)
  …
  push DWORD PTR [edx+0x208]      ; push *(*m_pPlayer + 0x208) as arg2
  ```
  The TS expression `player.field_0x208` is missing this extra level of indirection.
  At minimum, add a TODO asserting the deref; preferably use `(player as any)[0].field_0x208`
  or `player.pev.field_0x208` once `*m_pPlayer` is identified.

- **Bug 3 (FAIL — does not compile in isolation):** Add `declare` statements or
  stub declarations for all referenced symbols. Use `any` for unknown types.

- **Warning 1 (⚠️ — field name ordering):** HLSDK CBasePlayerWeapon typically lays
  out `m_flNextPrimaryAttack`, `m_flNextSecondaryAttack`, `m_flTimeWeaponIdle` in
  source order at consecutive float offsets. The TS reviewer's mapping (0x9c →
  m_flNextSecondaryAttack, 0xa0 → m_flNextPrimaryAttack, 0xa4 → m_flTimeWeaponIdle)
  may have these swapped relative to the TS mod's actual struct. Use raw offset
  names in this phase; verify ordering when integrating against the real TS struct.

- **Warning 2 (⚠️ — engine vfunc identity):** The engine vfunc at offset 0x1ec
  (index 123 in enginefuncs_t) doesn't match the standard `pfnPlaybackEvent` slot
  in HLSDK (~index 56). The 12-arg layout, the dual `global_eventIndex` pushes for
  arg5/arg6, and the high slot index all suggest a TS-custom engine entry. The
  TODO captures this, but the arg naming (`flags`, `who`, `eventIndex`, etc.) is
  one possible reading — preserve the TODO.

- **Warning 3 (⚠️ — m_flNextReload at offset 0xa8):** HLSDK CBasePlayerWeapon has
  no standard `m_flNextReload` field. The disassembly writes to offset 0xa8 (which
  is 4 bytes past the typical end of the three consecutive `m_fl*` fields), so
  the field is likely TS-specific or a struct extension. Mark as `this.field_0xa8`
  until the struct layout is verified.

Suggested rewrite (full TS function):

```typescript
// External symbols — declared as any for cross-vendor isolation-compile.
declare const CTSGun: any;
declare function UTIL_WeaponTimeBase(): number;
declare const cvar_blockDuration: number;
declare const cvar_blockStaminaThreshold: number;
declare const cvar_blockIdleDelay: number;
declare const global_eventIndex: number;
declare const engineSingleton: { vfunc_0x1ec: (...args: any[]) => void };
declare function Animate(thisPtr: any, player: any, sequence: number): void;
declare function UpdateMeleeBar(player: any, value: number): void;

/**
 * CTSGun::CCombatBlock — execute a combat-block (defensive) action.
 *
 * Validates that no cooldowns are active, the player is in a valid
 * state, and any required stamina threshold is met; then plays the
 * block animation, dispatches the corresponding client event,
 * refreshes the on-screen melee bar, and reschedules the weapon's
 * next attack/idle windows.
 *
 * @param this  The CTSGun entity instance.
 */
export function CCombatBlock(this: any): void {
  const player: any = this.field_0x80; // pointer; likely m_pPlayer.

  // ---- Guard 1: stored timestamps must all be ≤ now. ----
  if (UTIL_WeaponTimeBase() < player.field_0x12c) return;
  if (UTIL_WeaponTimeBase() < this.field_0x9c)   return;
  if (UTIL_WeaponTimeBase() < this.field_0xa0)   return;
  if (UTIL_WeaponTimeBase() < this.field_0xa4)   return;

  // ---- Guard 2: reject if any of a set of player sub-struct status bits is set. ----
  // TODO(asm-ambiguous): deref chain is [[m_pPlayer]+0]+0x250. The 0x70c30 mask is faithful.
  const innerPlayer: any = (player as any)[0]; // first field of player; plausibly pev.
  if (((innerPlayer as any).field_0x250 & 0x70c30) !== 0) return;

  // ---- Guard 3: player stamina/charge must meet the threshold cvar. ----
  // TODO(asm-ambiguous): cvar identity; verify via strings-n5.txt
  // (likely ts_block_stamina_threshold or similar).
  if (player.field_0x774 < cvar_blockStaminaThreshold) return;

  // ---- Load the block-duration cvar once for re-use below. ----
  const blockDuration: number = cvar_blockDuration; // GOT-relative cvar at -0x6ec2c.

  // ---- Pick the event index and which player field to update. ----
  let eventIdx: number = 0;
  if (this.field_0xcc === 0) {
    // Branch A: gun is in a clean state.
    eventIdx = 1;
    player.field_0x7a8 = blockDuration;
  } else if (this.field_0xd0 !== 0) {
    // Branch B/C: gun has a state struct pointer.
    // esi (=eventIdx) is set to 0x12 UNCONDITIONALLY when this branch is entered
    // (see 0x75fb9 jumping directly to 0x75fc7 for the "neither" sub-case),
    // so lift the assignment outside the inner if-else.
    const stateByte: number =
      (this.field_0xd0 as { byte_0x348: number }).byte_0x348 & 0xff;
    if (stateByte === 0x0a) {
      player.field_0x7b0 = blockDuration;
    } else if (stateByte === 0x03) {
      player.field_0x7ac = blockDuration;
    }
    // (No "else" — the "neither" sub-case still reaches esi = 0x12.)
    eventIdx = 0x12;
  }
  // (Else: eventIdx stays 0; the field_0xd0 == 0 sub-case reaches esi unchanged
  //  via the 0x75f8b je → 0x75fcc jmp.)

  // ---- Dispatch the client-side playback event for the block. ----
  // TODO(asm-ambiguous): vfunc identity at engine interface offset 0x1ec (index
  // ~123) doesn't match standard pfnPlaybackEvent; this is a TS-specific engine
  // entry. arg5/arg6 receive the same `global_eventIndex` value (pushed twice in
  // succession — see 0x75ff6/0x75ff7). arg2 is read with one extra deref beyond
  // `player`: *(*m_pPlayer + 0x208) — see Bug 2.
  const playerInnerPtr: any = (player as any)[0]; // re-deref *m_pPlayer.
  engineSingleton.vfunc_0x1ec(
    /* arg1  (flags) */ 1,
    /* arg2  (who) */ playerInnerPtr.field_0x208,
    /* arg3 (eventindex, 16-bit) */ this.field_0x96c & 0xffff,
    /* arg4 */ 0,
    /* arg5 */ global_eventIndex,
    /* arg6 */ global_eventIndex,
    /* arg7 (float) */ this.field_0xc8,
    /* arg8 */ 0,
    /* arg9 */ 0,
    /* arg10 (iparam) */ eventIdx,
    /* arg11 */ 0,
    /* arg12 */ 0,
  );

  // ---- Play the block animation (sequence 0x26 = 38). ----
  Animate(player.field_0x28c, player, 0x26);

  // ---- Refresh the on-screen melee bar to 33.0f (0x42040000). ----
  UpdateMeleeBar(player, 33.0);

  // ---- Schedule the next attack and idle windows. ----
  const t: number = UTIL_WeaponTimeBase();
  const nextAttack: number = t + blockDuration;
  this.field_0xa0 = nextAttack;
  this.field_0x9c = nextAttack;
  this.field_0xa8 = t + cvar_blockIdleDelay; // cvar at GOT -0x6de98.
}
```
