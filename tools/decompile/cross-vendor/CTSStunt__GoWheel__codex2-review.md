# Cross-vendor review — `CTSStunt::GoWheel`

**Up front:** the function under review is `CTSStunt::GoWheel`, a 1580-byte gameplay method on `CTSStunt` — **not** one of the 4 mod↔engine interface entry points the checklist was designed for (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`). Items 2 and 3 don't apply; items 1, 4–8 are adapted below.

```
VERDICT: FAIL

Checklist:
1. Signature — ⚠️ — name + return type match (`number` for `int` is fine). The
   function is a class method, not a free function — `export function GoWheel(this:
   CTSStunt)` works but loses class binding. No explicit args other than `this`.
2. Version check — N/A — no engine interface version involved.
3. *interfaceVersion assignment — N/A — no engine interface pointer involved.
4. Success path — ❌ — high-dive / low-dive / failure branches are roughly
   identified, but the field-by-field writes (pev-style flag ORs, position copy,
   Animate() call) use fabricated field names; pfnWriteByte arg semantics are
   wrong (it takes a value, not an edict).
5. No fabricated paths — ❌ — many fabricated globals (`ts.stuntSpeedThreshold`,
   `ts.stuntRetryDelay`, `ts.stuntDirScale`, `ts.stuntMinSpeed`,
   `ts.stuntFallbackZ`, `ts.stuntMelee1/2`, `ts.stuntTimeMult`, etc.) and many
   fabricated field names; control flow mostly preserved but with several wrong
   comparisons and offset polarities (see Issues).
6. No TODO body — ❌ — multiple `TODO(asm-ambiguous):` comments on real checks
   (Check 3 flag mask, Check 7 0.4 s threshold, several constant identities);
   checks 1, 4, 6 are written with the wrong field/comparison entirely, then
   papered over by reading like a TODO.
9. Field names — ❌ — almost every field name is a guess: `m_flLastWheel`,
   `m_flNextDive`, `m_flMinInterval`, `m_flAnotherInterval`, `m_vecDiveDir`,
   `m_pAnimation`, `position174`, `someFloat11c`, `someFloat120`,
   `someTimeGetter`, `someStateByte`, `airFinishedTime`, `m_flMeleeDamage`,
   `m_flMeleeBonus`, `m_bMeleeFlag`, `m_iMeleeCounter`. None verified against
   the real CTSStunt / CBasePlayer class layout.
10. Compiles in isolation — ❌ — references undefined types (`CTSStunt`,
    `CBasePlayer`), undefined globals (`gpGlobals`, `engfuncs`, `ts`, `globals`),
    undefined constants (`ts.stuntThreshold`, `ts.stuntRetryDelay`, …) and
    undefined helpers (`UTIL_MakeVectors`, `GetDirection`, `EMIT_SOUND_DYN`,
    `Animate`).
```

---

## Specific issues to fix

### 1. Wrong field / comparison in checks 1, 4, 6 (asm `8c9f2`, `8ca32`, `8ca5c`)
The assembly compares a **constant** `[ebx-0x6f408]` (a small float, probably `0.0`) against a `this` field, with `<` (the `fcomp + sahf + jae` form). The TS instead compares `gpGlobals.time` against `this.m_flNextDive` / `m_flMinInterval` / `m_flAnotherInterval` using `===`. All three of these are wrong on three axes: the LHS is a constant not `gpGlobals.time`; the field offsets are `[ebp+0x0]`, `[ebp+0x4]`, `[ebp+0x8]` (not the named fields); the comparison is `<` not `===`.

### 2. Wrong field in check 2 (asm `8ca05`–`8ca1c`)
Assembly compares `[ebp+0x10]` against `gpGlobals.time`. The TS uses `this.m_flLastWheel` (wrong field name) and `===` (wrong comparison — should be `<`).

### 3. Wrong offset in check 3 (asm `8ca1c`–`8ca2b`)
Assembly tests `[eax+0x250]` against `0x130c30`. The `eax` here is the player class base after `[ebp+0x40]→first_member`. Entvars_t (which `eax` is `pev*` to) ends around `0x100`, so `+0x250` is past the end of entvars_t — meaning this is **not** `pev.flags`. It's likely a player-class flag field, but possibly reached via an accidental aliasing through the embedded `pev*`. The TS translating it to `pev.flags & 0x130c30` is unsafe without resolving the layout.

### 4. Check 7 polarity is inverted (asm `8ca6f`–`8cab8`)
Assembly: `test [eax+0x1a5], 0x2; jne 8cab8` — **if bit 0x2 is SET, jump to the success path** (skip the time check). The TS inverts this: `if (!(player.someStateByte & 0x2))` runs the check when the bit is clear. The semantic intent is "if player is not in `just-left-water` state, additionally require ≥0.4 s since the last water-exit event". Also, `[edx+0xb88]` is **not** `pev.airFinishedTime` — it's some player-class field at offset `0xb88`.

### 5. Speed² threshold direction inverted (asm `8cac2`–`8cb3c`)
Assembly: `if (speed² < CONST_6F3F8)` → **slow path** (view-aligned, `diveVariant=3`). Else → high-speed path (derive from velocity). The TS has the polarity and the comparison flipped: `if (speed2D === ts.stuntSpeedThreshold)` — wrong comparison (`===` of a float), wrong polarity (the slow path should be `<`, not `===`).

### 6. Failure path early-return vs fall-through
Assembly evaluates **all** precondition checks (each just sets `esi=0`, no early exit), then branches at `8caba`. The TS early-returns on the first failure. Semantically equivalent here (the checks are pure), but unfaithful to the assembly's control flow and a poor pattern for future refactors.

### 7. `rep movsd` 3-dword vector copy → not object property assignment
Two copies of this pattern (`8ccfb-8cd01`, `8ceb3-8ceb9`) copy 3 floats (12 bytes) from `[ebx+0x1888]` (the stunt-position vector constant) into `player.field_0x174`. The TS uses `pev.position174 = ts.stuntPosVector` — wrong (this is a player field, not pev) and wrong syntax (object spread doesn't match a 3-dword memcpy).

### 8. `pfnWriteByte` arg is wrong (asm `8cc78`)
Assembly pushes `[eax+0x208]` (some byte-sized field on the player) to `pfnWriteByte`. The TS passes `player.edict, …` — semantically wrong; `pfnWriteByte` takes a value, not an edict. The value field is unknown (`player.field_0x208`) but it's **not** the edict.

### 9. `NextDive()` result writes to `[ebp+0x0]`, not `[ebp+0x10]` (asm `8cd3f`, `8cf11`)
After `NextDive()`, the assembly does `fstp [ebp+0x0]` — overwrites the field at offset `0x0`. The TS never reflects this overwrite. (This also explains why check 1 reads `[ebp+0x0]` — it's the "next-dive delay" used as input to the next precondition pass.)

### 10. Failure path writes `[ebp+0x10]`, not `[ebp+0x0]` (asm `8cfd8`)
The retry-time update is `fstp [ebp+0x10]`. The TS uses `this.m_flLastWheel = …` — wrong field name (the field is at `+0x10`, not the `+0x0` field).

### 11. Animate() target
Assembly pushes `[ebp+0x28c]` as the first arg. The TS uses `this.m_pAnimation` — plausible but unverified. The sequence IDs `0x31` / `0x32` match (`push 0x31`, `push 0x32`).

### 12. Size — 1580 bytes for one function
Not strictly a decompilation error, but the binary packs guard + decide + execute into a single function. Consider splitting into private `pickDiveVariant`, `applyHighDive`, `applyLowDive` once the field layout is resolved.

---

## Suggested rewrite

Faithful to the assembly's control flow and data flow. Field names are offset-based placeholders until D.4 cross-references the real CTSStunt layout. Constants are named by their `ebx`-relative offsets. Compiles in isolation (types / globals / helpers defined locally).

```typescript
/**
 * CTSStunt::GoWheel — Attempt to start a "wheel" stunt.
 * Decompiled from ts/dlls/ts_i386.so @ 0x0008c9bc (1580 B).
 * Field names are offset-based placeholders; constants are named by their
 * PIC-relative offsets. Resolve via D.4 (CTSStunt class cross-reference).
 */

// ---- Local stubs (replace once D.4 wires real types) ------------------------
type CTSStunt = any;
type CBasePlayer = any;

const gpGlobals: { time: number } = { time: 0 };
const globals: { vForward: { x: number; y: number; z: number } } = {
  vForward: { x: 0, y: 0, z: 0 },
};
const engfuncs: any = {};
const ts: any = {};

const MSG_ONE = 4;

function UTIL_MakeVectors(_angles: any): void { /* engine */ }
function GetDirection(_a: any, _b: any, _c: number, _d: number): number { return 0; }
function EMIT_SOUND_DYN(..._args: any[]): void { /* engine */ }
function Animate(_self: any, _player: any, _seq: number): void { /* engine */ }

// ---- Decompiled function ---------------------------------------------------
export function GoWheel(this: CTSStunt): number {
  //8c9cf: ebp = this (passed on stack at [esp+0x80]).
  const player: any = (this as any).m_pPlayer; // [ebp+0x40]
  const pev: any = player.pev;                 // first member of CBasePlayer

  // 8c9d6-8c9e9: speed2D = sqrt(velocity.x² + velocity.y²); stored at [esp+0x20].
  const speed2D: number = Math.sqrt(
    pev.velocity.x * pev.velocity.x +
    pev.velocity.y * pev.velocity.y
  );

  // 8c9ed-8cab8: precondition checks. Each sets canWheel=false; no early exit.
  // The result is tested at 8caba.
  let canWheel = true;

  // Check 1 (8c9f2): if (CONST_6F408 < this.field_0x0) canWheel = false.
  // TODO(asm-ambiguous): value of CONST_6F408 (likely 0.0).
  if (ts.CONST_6F408 < (this as any).field_0x0) {
    canWheel = false;
  }

  // Check 2 (8ca05): if (this.field_0x10 < gpGlobals.time) canWheel = false.
  if ((this as any).field_0x10 < gpGlobals.time) {
    canWheel = false;
  }

  // Check 3 (8ca1c): test [eax+0x250] & 0x130c30.
  // TODO(asm-ambiguous): the read goes through what looks like pev*, but
  // +0x250 is past entvars_t. Likely a player-class flag field, not pev.flags.
  if ((player.field_250 & 0x130c30) !== 0) {
    canWheel = false;
  }

  // Check 4 (8ca32): same pattern as Check 1, field at offset 0x4.
  if (ts.CONST_6F408 < (this as any).field_0x4) {
    canWheel = false;
  }

  // Check 5 (8ca45): IsOnLadder() → fail.
  if (player.IsOnLadder()) {
    canWheel = false;
  }

  // Check 6 (8ca5c): same pattern, field at offset 0x8.
  if (ts.CONST_6F408 < (this as any).field_0x8) {
    canWheel = false;
  }

  // Check 7 (8ca6f-8cab8): polarity — jne on bit SET skips the time check
  // (i.e., the "just exited water" bit allows the stunt regardless). Only
  // when bit 0x2 of player.field_1a5 is CLEAR do we additionally require
  // (gpGlobals.time - player.field_0xb88) > 0.4.
  // TODO(asm-ambiguous): which player-state bit 0x2 represents; what
  // field_0xb88 holds (likely last-water-exit time, NOT pev.airFinishedTime).
  if (!(player.field_1a5 & 0x2)) {
    const timeSinceEvent = gpGlobals.time - player.field_0xb88;
    if (timeSinceEvent <= 0.4) {
      canWheel = false;
    }
  }

  // 8caba-8cabc: branch to failure path if !canWheel.
  if (!canWheel) {
    // 8cfc8: this.field_0x10 = time + CONST_6DE58; return 0.
    (this as any).field_0x10 = gpGlobals.time + ts.CONST_6DE58;
    return 0;
  }

  // ---- Pick dive direction (8cac2-8cc14) ----------------------------------

  // 8cac2: speed² threshold. Slow path (variant 3) when speed² < CONST_6F3F8;
  // high-speed path otherwise.
  let diveVariant: number;
  if (speed2D < ts.CONST_6F3F8) {
    // ---- Slow path (8cad1-8cb35) ---------------------------------------
    UTIL_MakeVectors(pev.angles);
    const vf = globals.vForward;
    // 8cafb-8cb1a: negate each axis (XOR sign bit), then rep movsd 3 →
    // this.field_0x20 (m_vecDiveDir).
    (this as any).field_0x20.set(-vf.x, -vf.y, -vf.z);
    diveVariant = 3;
  } else {
    // ---- High-speed path (8cb3c-8cc11) ---------------------------------
    const vel = pev.velocity;
    const speed3D = Math.sqrt(
      vel.x * vel.x + vel.y * vel.y + vel.z * vel.z
    );
    if (speed3D < ts.CONST_6F408) {
      // Fallback: vertical-only direction.
      (this as any).field_0x20.set(0, 0, ts.CONST_6F3FC);
    } else {
      // Normalized velocity scaled by CONST_6F3FC.
      const inv = ts.CONST_6F3FC / speed3D;
      (this as any).field_0x20.set(vel.x * inv, vel.y * inv, vel.z * inv);
    }
    // 8cbc6-8cc0d: refine via GetDirection(m_vecDiveDir, angles, 0.4, 0.6)
    // — result stored to local [esp+0x24]. (Constants0x3e99999a, 0x3f19999a.)
    const angles = pev.angles;
    (this as any).field_0x24 = GetDirection(
      (this as any).field_0x20, angles, 0.4, 0.6
    );
    diveVariant = 0;
  }

  // ---- Timing-gated setup messages (8cc14-8cc9d) -------------------------

  // 8cc32: call [edx+0x10] where edx = [player+0x60] (some vtable/subscript).
  // TODO(asm-ambiguous): which player method this is — a "get time-like value"
  // or some other getter.
  const playerTime: number = (player as any).getTimeLikeValue_vtable_0x10();
  const randFloat: number = engfuncs.pfnRandomFloat(0, 10);

  // 8cc42-8cc9d: if (randFloat * CONST_6F06C + playerTime >= CONST_6DEA0),
  // send 3 setup messages.
  if (randFloat * ts.CONST_6F06C + playerTime >= ts.CONST_6DEA0) {
    // pfnMessageBegin(MSG_ONE, msg_type, origin, NULL).
    engfuncs.pfnMessageBegin(
      MSG_ONE,
      ts.stuntSetupResource_at_1d38[0], // first byte of resource as msg_type
      pev.origin,                       // pOrigin = pev+8
      null                              // edict = NULL
    );
    // pfnWriteByte takes a value, not an edict. [eax+0x208] is some byte field.
    // TODO: which field at player+0x208.
    engfuncs.pfnWriteByte(player.field_0x208);
    engfuncs.pfnWriteShort(2);
    engfuncs.pfnMessageEnd();
  }

  // ---- Try high-dive first (8cca1-8ce63) ---------------------------------

  if (this.CanDiveHigh()) {
    // 8ccb1: if (diveVariant === 3) → canHigh = true.
    // 8ccbd-8ccc9: else require angles.x < CONST_6C320.
    let canHigh = false;
    if (diveVariant === 3) {
      canHigh = true;
    } else if (pev.angles.x < ts.CONST_6C320) {
      canHigh = true;
    }

    if (canHigh) {
      // Set high-dive state bits on player.field_250.
      player.field_250 |= 0x4;
      player.field_250 |= 0x400;

      // 8cced-8cd01: rep movsd 3 — copy ts.stuntPosVector_at_1888 into
      // player.field_174 (3 dwords = Vector).
      const stuntPos = ts.stuntPosVector_at_1888;
      player.field_174.set(stuntPos[0], stuntPos[1], stuntPos[2]);

      // 8cd06-8cd14: Animate(this.field_0x28c, player, 0x31).
      Animate((this as any).field_0x28c, player, 0x31);

      // Set additional state bits.
      player.field_250 |= 0x100;
      player.field_0x11c = 0.75; // 0x3f400000

      // 8cd3a-8cd42: NextDive() result → this.field_0x0 (NOT field_0x10).
      (this as any).field_0x0 = this.NextDive();

      // Network message: pfnMessageBegin(MSG_ONE, stuntDiveResource_at_168c,
      //   NULL, 0) → pfnWriteShort((this.field_0x0 * CONST_6F06C) | 0) →
      //   pfnMessageEnd.
      engfuncs.pfnMessageBegin(
        MSG_ONE, ts.stuntDiveResource_at_168c[0], null, 0
      );
      engfuncs.pfnWriteShort(((this as any).field_0x0 * ts.CONST_6F06C) | 0);
      engfuncs.pfnMessageEnd();

      // 8cda5-8cddc: EMIT_SOUND_DYN(edict, 4, ts.stuntWheelSound_at_6c378,
      //   1.0, 0.8, pitch=0x5f + RandomLong(0,31), 0.5).
      const edict = player.edict();
      const pitch = 0x5f + engfuncs.pfnRandomLong(0, 31);
      EMIT_SOUND_DYN(
        edict, 4, ts.stuntWheelSound_at_6c378, 1.0, 0.8, pitch, 0.5
      );

      // 8cde4: clear this.field_0x10 (next-attempt time).
      (this as any).field_0x10 = 0;

      // 8cdee: if diveVariant === 3, apply melee/kungfu bonuses.
      if (diveVariant === 3) {
        // UpdateMeleeBar(CONST_6DE8C * CONST_6DEEC)
        player.UpdateMeleeBar(ts.CONST_6DE8C * ts.CONST_6DEEC);
        // 8ce1f-8ce2f: KungFu() doubles the melee bonus.
        const kfMult = player.KungFu() ? 2.0 : 1.0;
        player.field_0x79c = 0.4;               // 0x3e99999a
        player.field_0x7a0 = ts.CONST_6DE8C * kfMult;
        player.field_0x7a4 = 0;                 // byte
        player.field_0x7a8 = 0;
      }

      return 1;
    }
  }

  // ---- Try low-dive (8ce6b-8cfc5) -----------------------------------------

  if (this.CanDiveLow()) {
    // 8ce7c-8ce81: low-dive is invalid if diveVariant === 3.
    if (diveVariant !== 3) {
      // Set low-dive state bits.
      player.field_250 |= 0x4;
      player.field_250 |= 0x800;

      // rep movsd 3 — same stunt position vector.
      const stuntPos = ts.stuntPosVector_at_1888;
      player.field_174.set(stuntPos[0], stuntPos[1], stuntPos[2]);

      // Animate(this.field_0x28c, player, 0x32).
      Animate((this as any).field_0x28c, player, 0x32);

      player.field_250 |= 0x80;
      player.field_0x11c = 0.75;

      // 8cef2-8cf07: if diveVariant === 2, set field_0x120 = 0.25.
      if (diveVariant === 2) {
        player.field_0x120 = 0.25; // 0x3e800000
      }

      // NextDive() → this.field_0x0.
      (this as any).field_0x0 = this.NextDive();

      // Network message + sound (same shape as high-dive path).
      engfuncs.pfnMessageBegin(
        MSG_ONE, ts.stuntDiveResource_at_168c[0], null, 0
      );
      engfuncs.pfnWriteShort(((this as any).field_0x0 * ts.CONST_6F06C) | 0);
      engfuncs.pfnMessageEnd();

      const edict = player.edict();
      const pitch = 0x5f + engfuncs.pfnRandomLong(0, 31);
      EMIT_SOUND_DYN(
        edict, 4, ts.stuntWheelSound_at_6c378, 1.0, 0.8, pitch, 0.5
      );

      (this as any).field_0x10 = 0;
      return 1;
    }
  }

  // ---- Total failure (8cfc8-8cfdb) ----------------------------------------
  (this as any).field_0x10 = gpGlobals.time + ts.CONST_6DE58;
  return 0;
}
```

---

## Recommendation

Take the rewrite above as a starting point, then for D.4 (CTSStunt / CBasePlayer class cross-reference):

1. Replace every `field_0xNN` / `m_xxx` placeholder with the real CTSStunt / CBasePlayer member name (or at least a D.4-tagged `// TODO(D.4):` block listing the candidates).
2. Resolve the constant identities by reading the `strings-n5.txt` cvar list and the binary's `.rodata` — particularly `CONST_6F408` (likely `0.0`), `CONST_6F3F8` / `CONST_6F3FC` (stunt speed threshold / scale), `CONST_6F06C` (frame-time scale), `CONST_6DEA0` (timer threshold), `CONST_6C320` (high-dive pitch max), `CONST_6DE58` (retry delay).
3. Resolve Check 3 (`[eax+0x250] & 0x130c30`) — likely a TS-specific player flag field, but the offset aliasing through `pev*` is suspicious and worth verifying with `nm` / `objdump` against a debug build if available.
4. Resolve the `m_pPlayer` pointer-vs-embedded question for CBasePlayer — the disassembly pattern `[ebp+0x40]→[...].pev` works whether `m_pPlayer` is embedded or pointed-to as long as the first member is `pev*`, but the `+0x250` offset depends on it.
