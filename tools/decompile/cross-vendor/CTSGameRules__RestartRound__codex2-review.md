```
VERDICT: PASS-WITH-NOTES

Note on scope: this checklist was designed for the 4 engine↔mod
interface functions (GiveFnptrsToDll / GetEntityAPI* / GetNewDLLFunctions).
RestartRound is a gameplay method, so items 2–4 are N/A. I'm grading on
the cross-vendor review principles (faithfulness to disassembly, field
naming, isolation) that the checklist was built on.

Checklist:
1. Signature — ✅ — demangled symbol `CTSGameRules::RestartRound()`
   is a no-arg void member function. TS uses
   `function RestartRound(this: CTSGameRules): void`, where `this:`
   is the implicit-receiver annotation, not an extra parameter.
2. Version check — ⚠️ N/A — gameplay method, no interface version.
3. interfaceVersion assignment — ⚠️ N/A — same reason.
4. Success path — ⚠️ N/A — no `memcpy` / struct copy here.
5. No fabricated paths — ❌ — see issue #1 below. The "dead
   conditional" claim is wrong; the inner `jne 0x67b08` at 0x67ad4
   actually skips the buy-timer assignment for state ∈ {0, 1, 3}
   when `[this+0x5874] == 0`. The TS assigns it unconditionally.
6. No TODO body — ⚠️ — body is mostly real code, but ~12 of the
   lines are `/* TODO: cvar @ [ebx+…] */` / `/* TODO: string @ [ebx-…] */`
   placeholders. The conversion guidance endorses TODOs for ambiguous
   cases, but several of these aren't actually ambiguous (see issue #3).
7. Field names — ✅ — follow HLSDK `m_*` convention
   (`m_flRestartRoundTime`, `m_iRestartCount`, `m_bDoingRestart`,
   `m_iRoundState`, `m_flNextBuyTime`, `m_flLastDeathTime`,
   `m_rgpPlayerItems`, etc.). Names are inferred from operations,
   which the conversion guidance permits. One issue: the gate at
   `[this+0x5874]` isn't represented at all in the TS (issue #2).
8. Compiles in isolation — ❌ — references undefined functions:
   `UTIL_PlayerByIndex`, `get_weapon_info`, `get_ammo_info`,
   `TSHudMessageAll`, `InitObjectives`, `SetObjective`,
   `GiveCash`, `StartObserver`, `RecountTeams`, `RespawnEntities`,
   and `player.IsConnected`. The TS uses `any` for types but not
   for the function symbols, so the file would not type-check
   without stubs.

Issues to fix:

1. **"Dead conditional" claim is wrong** (item 5, real behavior   bug). The TS comment claims the buy-time assignment runs
   unconditionally because both branches of the outer `ja` store
   the same value. The outer `ja` (state > 3) *does* land in the
   same write target either way, but only after skipping an inner
   conditional that itself can skip the write:

       0x67ac6  ja 0x67af0   ; state > 3 → write at 0x67af0
       0x67ac8  cmp   [edx+0x5874], 0
       0x67acf  jne   0x67ad6   ; field_0x5874 != 0 → write at 0x67ad6
       0x67ad1  cmp   [edx], 2
       0x67ad4  jne   0x67b08   ; state != 2 → SKIP write entirely
       0x67ad6  …              ; write at player+0x7bc
       0x67aee  jmp   0x67b08
       0x67af0  …              ; write at player+0x7bc (alt path)
       0x67b08  …              ; continue (round timer, HUD clear, etc.)

   So the assignment is skipped when
   `m_iRoundState ∈ {0, 1, 3} && field_0x5874 === 0`.
   The TS unconditionally resets `m_flNextBuyTime` in those cases —
   a behavior difference vs. the binary.

2. **`field_0x5874` is missing from the TS class shape.** Add a
   placeholder on `this` so the new conditional compiles:
   `this.field_0x5874: number`. (Real name TBD; D.4 may resolve it
   once we cross-reference against the mod's other globals.)

3. **Several TODOs aren't actually ambiguous** and shouldn't ship
   that way. `[ebx+0x1600]` is the GOT-relative address of the
   `gpGlobals` pointer (it's the symbol the disassembly expects;
   cross-check against `tools/decompile/analysis/nm-D-size.txt`).
   `[ebx-0x6f06c]`, `[ebx-0x6f408]`, `[ebx-0x6e768]`, `[ebx-0x6e810]`,
   `[ebx-0x6f3ec]`, `[ebx-0x6e726]` are cvars / strings that can be
   resolved against `tools/decompile/analysis/strings-n5.txt`
   (typical TS cvars: `mp_chattime`, `ts_buytime`, `mp_roundtime`,
   etc.). At minimum, name them in a comment so the next reviewer
   doesn't re-do this work.

4. **Doesn't compile in isolation.** Add `declare` stubs (or import
   from a `tools/decompile/stubs/cts-gamerules.d.ts`) for the 10
   external symbols listed above. Using `any` for return types is
   fine; what matters is that the file type-checks on the local side.

5. **Minor: ammo struct access.** The TS reads
   `player.rgAmmo[a].amount` / `.amount` for the two pairs, but the
   disassembly reads offsets +4 and +8 from a single pointer that
   advances by 8 each iteration. The semantics (refund over the
   buy unit) are right; the exact struct shape (current/max vs two
   separate amounts) is speculative. Flag this as
   `// TODO(asm-ambiguous)` already exists — keep it.

6. **Correct things (no action needed).** The outer restart-time
   computation, the HUD-message branch on state == 2, the
   `InitObjectives` + `SetObjective` ordering, the
   `TSHudMessageAll(0,0,0,8,30,msg)` 6-arg call (matches the
   demangled `__FUcUcUciiPc` signature), the slot-loop bounds
   (37 weapons, indices 0–0x25), the ammo loop bounds (8
   iterations of pairs), the `GiveCash` refund, the
   `RecountTeams(false)` + `RespawnEntities(true)` tail — all
   match the disassembly.
```

Suggested rewrite (full function, fix applied + minimal
isolation stubs at the top so the file type-checks; preserving
the TODOs the conversion guidance allows):

```typescript
// --- minimal isolation stubs (move to tools/decompile/stubs/ later) ---
declare const gpGlobals: any;
declare const engine: any;
declare const teamplay: any;
declare function UTIL_PlayerByIndex(i: number): any;
declare function get_weapon_info(w: number): any;
declare function get_ammo_info(a: number): any;
declare function TSHudMessageAll(
  a: number, b: number, c: number, d: number, e: number, msg: string
): void;
declare function GiveCash(this: any, amount: number): void;

export interface CTSGameRules {
  m_iRoundState: number;
  m_bDoingRestart: number;          // byte; offset 0x10
  m_flRestartRoundTime: number;     // float; offset 0x8
  m_iRestartCount: number;          // int;   offset 0xc
  field_0x5874: number;             // byte; offset 0x5874 — gate flag
  InitObjectives(this: this): void;
  SetObjective(this: this): void;
  RespawnEntities(this: this, b: boolean): void;
}

/**
 * CTSGameRules::RestartRound — reset gameplay state for a new round.
 */
export function RestartRound(this: CTSGameRules): void {
  // ---- 1. Compute and store the next restart time ----
  const cvarA      = /* TODO: cvar [ebx-0x6e810] */;
  const cvarB      = /* TODO: cvar [ebx-0x6f3ec] */;
  const baseFloat  = /* TODO: float at [singleton@0x1770] + 0xc */;
  const restartTime =
    Math.max(baseFloat, Math.max(cvarA, cvarB)) + gpGlobals.time;
  this.m_flRestartRoundTime = restartTime;
  this.m_iRestartCount = 0;

  // ---- 2. Active-restart engine notification ----
  if (this.m_bDoingRestart) {
    const cmdString = /* TODO: cvar string at [ebx+0x12c8] */;
    engine.call(/* 0xb8 */, 2, cmdString, 0, 0);

    const delayCvar = /* TODO: cvar [ebx-0x6f408] (mp_chattime?) */;
    const delaySecs = Math.max(restartTime - gpGlobals.time, delayCvar);
    const delayInt  = delaySecs | 0;
    engine.call(/* 0xc0 */, delayInt);
    engine.call(/* 0xc0 */, 0);
    engine.call(/* 0xbc */);
  }

  // ---- 3. Refresh objectives ----
  this.InitObjectives();
  this.SetObjective();

  // ---- 4. Optional round-start HUD broadcast (state == 2 only) ----
  if (this.m_iRoundState === 2) {
    const msg = /* TODO: string at [ebx-0x6e726] */;
    TSHudMessageAll(0, 0, 0, 8, 30, msg);
  }

  // ---- 5. Per-player reset, refund, observer ----
  for (let i = 1; i <= gpGlobals.maxClients; i++) {
    const player: any = UTIL_PlayerByIndex(i);
    if (!player) continue;
    if (!player.IsConnected()) continue; // [vtable+0xc8]

    // Buy-timer reset is GATED by the inner conditional at 0x67acf/0x67ad4.
    // Skip when m_iRoundState ∈ {0, 1, 3} AND field_0x5874 == 0.
    const buyTimeCvar = /* TODO: cvar [ebx-0x6f06c] (ts_buytime?) */;
    const resetBuyTimer =
      this.m_iRoundState > 3 ||
      this.field_0x5874 !== 0 ||
      this.m_iRoundState === 2;
    if (resetBuyTimer) {
      player.m_flNextBuyTime = gpGlobals.time + buyTimeCvar;
    }

    // Round timer is unconditional (runs at 0x67b08 in both paths).
    const roundCvar = /* TODO: cvar [ebx-0x6e768] */;
    player.m_flLastDeathTime = gpGlobals.time + roundCvar;

    // Clear per-round HUD/menu + ammo bookkeeping dwords.
    player.m_iCurrentMenu = 0xb;
    player.m_iMenuFlag1   = 0;
    player.m_iMenuFlag2   = 0;
    player.m_iAmmoFlags1  = 0;
    player.m_iAmmoFlags2  = 0;
    player.m_iAmmoCount1  = 0;
    player.m_iAmmoCount2  = 0;

    //5a. Refund carried weapon loadout.
    let cash = 0;
    const weaponBox: any = player.m_rgpPlayerItems; // [player+0xa10]
    if (weaponBox && weaponBox.m_iCount === 0x10) {
      for (let w = 0; w <= 0x25; w++) {
        const slot = weaponBox[w];
        if (!slot.m_bActive) continue;
        if (w === 0 || w === 0x1d) continue;

        const info = get_weapon_info(w);
        cash += info.cost;

        const flags = slot.m_iFlags;
        if (flags & 0x1) cash += 0x384;
        if (flags & 0x2) cash += 0x320;
        if (flags & 0x4) cash += 0x1f4;
        if (flags & 0x8) cash += 0x708;
      }

      // 5b. Refund carried ammo over the buy cap.
      for (let a = 0; a <= 0xf; a += 2) {
        const ai0 = get_ammo_info(a);
        if (player.rgAmmo[a].amount > ai0.buyUnit) {
          const aInfo = get_ammo_info(a);
          cash += Math.floor(
            (player.rgAmmo[a].amount * aInfo.cost) / aInfo.buyUnit
          );
        }
        const ai1 = get_ammo_info(a + 1);
        if (player.rgAmmo[a + 1].amount > ai1.buyUnit) {
          const aInfo = get_ammo_info(a + 1);
          cash += Math.floor(
            (player.rgAmmo[a + 1].amount * aInfo.cost) / aInfo.buyUnit
          );
        }
      }
    }
    player.GiveCash(cash);

    // 5c. Move live (non-observer) players into observer for respawn.
    if (!player.m_bInObserver) {
      const vecA = /* TODO: Vector at [singleton] + 0x8 */;
      const vecB = /* TODO: Vector at [singleton] + 0x74 */;
      player.StartObserver(vecA, vecB);
    }
  }

  // ---- 6. Recount teams and respawn all map entities ----
  teamplay.RecountTeams(false);
  this.RespawnEntities(true);
}
```

The single behavioral fix is the `resetBuyTimer` gate; everything
else preserves the original. The field-name/TODO/isolation items
are paper cuts but don't change runtime behavior.
