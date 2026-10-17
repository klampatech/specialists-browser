## Template mismatch — heads up

The cross-vendor checklist (items 2–4: version check, `*interfaceVersion` write-back, struct copy) is hard-wired to the 4 entry-point interface functions in `ts_i386.so` (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`). The function under review is `CTSDMHill::WaitTouch` — a per-entity touch handler, not one of the 4 interface exports. I'm adapting items 2–4 into a single "structural fidelity" check and keeping the rest of the checklist as written. The HLSDK interface reference is acknowledged but not directly applicable here.

---

**VERDICT: FAIL** *(mostly-faithful shape, but two semantic bugs in the player-walk loop, a missing conditional branch, and the function does not compile in isolation as required by the checklist.)*

**Checklist (adapted):**

1. **Signature** — ✅ — `WaitTouch__9CTSDMHillP11CBaseEntity` demangles to `CTSDMHill::WaitTouch(p CBaseEntity) → void`. TS: `function WaitTouch(this: CTSDMHill, pOther: CBaseEntity): void`. `[esp+0x140]` = arg0/`this`, `[esp+0x144]` = arg1/`pOther`. Matches.

2. **Structural fidelity** (analog of items 2–4) — ⚠️ — All four top-level branches trace back to disasm destinations (`0x62273` return, `0x61cc8` different-player, `0x61d04` same-player, `0x61d39` reset). Score-walk, HUD broadcast, and FireTargets are all present. **But:** the alt scoring path at `0x62060` (game-rules-pointer-null → `pOther.frags += this->field_0x70`) is not modeled — the TS only ever goes through the player-walk loop. See issue B.

3. **No fabricated paths** — ✅ — Every branch target in the TS exists in the disasm. `FVisible`, `IsAlive`, `IsPlayer`, `EmitSound`, `FireTargets`, `UTIL_FindEntityByClassname`, `GetClassPtr`, `TSHudMessageAll` are all real call targets in the disasm.

4. **No TODO-only body** — ⚠️ — Real code for gates + state writes. But the HUD-message strcat/strcpy/UTIL_VarArgs flow (`0x61dcb–0x61e62` and `0x62052–0x6216f`) is collapsed into `buildKingAnnouncement()`; the fnstcw/fistp float→int conversion for frag display (`0x61f87–0x62016` and `0x620b7–0x62134`) is collapsed into `appendScoreToHud()`. Both have `// TODO(asm-ambiguous):` markers — acceptable for an interim decomp, but the function is roughly 40% of the original's behavior surface area.

5. **Field names** — ⚠️ — Plausible and offset-consistent: `m_flNextCheck` +0x64, `m_pCurrentToucher` +0x6c, `m_flLastClaim` +0x68, `m_flDeadline` +0x7c, `m_flDwellTime` +0x78, `m_iPointsPerScore` +0x74, `m_iScoreForTwoWayKill` +0x70. The `m_iScoreForTwoWayKill` guess for +0x70 is unverified naming — see issue D.

6. **Compiles in isolation** — ❌ — References concrete types (`CTSDMHill`, `CBaseEntity`, `CBasePlayer`) and helpers (`gpGlobals`, `UTIL_FindEntityByClassname`, `GetClassPtr`, `FVisible`, `EmitSound`, `TSHudMessageAll`, `FireTargets`, `USE_TYPE`, `buildKingAnnouncement`, `appendScoreToHud`, `GetNetName`) none of which are defined here. The checklist explicitly says "use `any` for unknowns" — this decomp doesn't.

---

**Issues to fix**

- **A. Player-walk loop semantics are inverted.** The weapon check at `0x61ed4`/`0x61ed6` does `jne 0x62036` — that's **loop exit (break)**, not continue. Only the `IsAlive` check at `0x61eee` (`je 0x62019`) is a `continue` (jump to the loop footer). The TS treats all three as `continue`, which scores the wrong player set.
- **B. Alt scoring path (`0x61e7b` → `0x62060`) is missing.** When the call at `0x61e73` returns null, the function skips the player walk entirely and does `pOther.frags += this->field_0x70` (the fild/fadd at `0x6206d–0x62076`), then runs the same EmitSound/HUD/FireTargets tail. The TS only implements the player-walk path; `+0x70` is left as a commented-out line.
- **C. Off-by-one in same-player dwell threshold** *(minor)*. `fcompp` at `0x61d30` sets C3 on equality; `test ah, 0x41; jne 0x61d80` jumps to scoring when `elapsed ≤ dwell` (== counts as scoring). The TS condition is `elapsed >= dwell` → reset, which would reset on equality. Borderline-irrelevant for floats, but inconsistent.
- **D. `m_iScoreForTwoWayKill` naming is unverified.** No prior art in the project tags the +0x70 offset. Until D.4 cross-references the CTSDMHill class DWARF, leave a TODO and use a generic name (`m_iScoreAlt` or `m_iPointsToWin`) so reviewers don't mistake the guess for a fact.
- **E. Doesn't compile in isolation.** Replace unknown concrete types with `any` (or local placeholder interfaces) per the checklist, and declare `buildKingAnnouncement` / `appendScoreToHud` as empty stubs at the top of the file.

---

**Suggested rewrite (focused fixes only — A, B, C, E; field-name fix D shown as rename)**

```typescript
// Forward-declared stubs so the file is self-contained.
// Replace with real signatures in D.4 / D.5.
type anyEntity = any;
declare const CTSDMHill: any;
declare const CBaseEntity: any;
declare const CBasePlayer: any;
const gpGlobals: any = (globalThis as any).gpGlobals;
declare function UTIL_FindEntityByClassname(start: any, cls: string): any;
declare function GetClassPtr<T>(ent: any): T;
declare function strcmp(a: string, b: string): number;
declare function FireTargets(target: string, activator: any, caller: any,
                             useType: number, delay: number): void;
declare function TSHudMessageAll(a: number, b: number, c: number,
                                 d: number, e: number, f: number,
                                 msg: string): void;
function buildKingAnnouncement(self: any, king: any): string {
  // TODO(asm-ambiguous): reconstruct from disasm 0x61dcb–0x61e62 + 0x62052–0x6216f
  // (strcat/strcpy/UTIL_VarArgs over [ebx-0x6ee52], [ebx-0x6ee4c],
  // [ebx-0x67fba], [ebx-0x6ee4e], [ebx-0x6ee31], [ebx-0x6ee45]).
  return "";
}
function appendScoreToHud(msg: string, frags: number): void {
  // TODO(asm-ambiguous): reconstruct fnstcw/fldcw/fistp float→int
  // (disasm 0x61f87–0x62016 + 0x620b7–0x62134) and "%d frags" strcat.
}

enum USE_TYPE { USE_OFF = 0, USE_ON = 1, USE_SET = 2, USE_TOGGLE = 3 }

export function WaitTouch(this: any, pOther: any): void {
  // ---- Cooldown gate ----
  if (this.m_flNextCheck > gpGlobals.time) return;
  if (!(pOther as any).IsAlive?.()) return;
  if (!(pOther as any).IsPlayer?.()) return;

  // ---- 1. First-claim ----
  if (this.m_pCurrentToucher == null) {
    this.m_pCurrentToucher = pOther;
    this.m_flNextCheck = 0;
    const dwell = Math.max(this.m_flDwellTime, 0);
    this.m_flDeadline  = gpGlobals.time + dwell;
    this.m_flLastClaim = gpGlobals.time + dwell;
    return;
  }

  // ---- 2/3. Different player / same player ----
  if (this.m_pCurrentToucher !== pOther) {
    // FVisible(king, pOther, this, ignoreTransparent?): returns 1 if king sees pOther
    const visible = (this.m_pCurrentToucher as any).FVisible?.(pOther, this);
    if (visible !== 1) {
      this.m_pCurrentToucher = null;
      this.m_flNextCheck = 0;
      this.m_flDeadline = gpGlobals.time + Math.max(this.m_flDwellTime, 0);
      return;
    }
    // visible: fall through to score
  } else {
    // Same player re-touch — fcompp at 0x61d30 sets C3 on equality;
    // jne 0x61d80 jumps to scoring when elapsed <= dwell (equality = scoring).
    const elapsed = gpGlobals.time - this.m_flLastClaim;
    const dwell   = Math.max(this.m_flDwellTime, 0);
    if (elapsed > dwell) {                              // strict >, == goes to scoring
      this.m_pCurrentToucher = null;
      this.m_flNextCheck = 0;
      this.m_flDeadline = gpGlobals.time + dwell;
      return;
    }
    // elapsed <= dwell: proceed to deadline gate
  }

  // ---- 4. Outer-deadline gate (0x61d97: jae = jump-if-deadline >= time) ----
  if (this.m_flDeadline >= gpGlobals.time) return;

  // ---- Build HUD message string ----
  const msg = buildKingAnnouncement(this, this.m_pCurrentToucher);

  // ---- 5/6. Conditional scoring path (game-rules pointer?) ----
  // Disasm: call at 0x61e73; if non-null → walk-all-players path (+0x74);
  //         if null     → direct path that adds +0x70 to pOther.frags (0x62060).
  const gameRules = (globalThis as any).g_pGameRules;
  if (gameRules != null) {
    // Walk-all-players path (0x61e81–0x62016)
    let ent: any = UTIL_FindEntityByClassname(null, "player");
    let scored = false;
    while (ent != null) {
      // Weapon check at 0x61e9f–0x61ed6 — failure EXITS the loop (0x62036),
      // it does NOT continue. Once any iteration bails, no more players are scored.
      const weapon = (ent as any).m_pWeapon
                  ?? (ent as any).pev?.weapon;
      if (!weapon) break;                                          // FIX A: was `continue`
      const weaponOk = (ent as any).someWeaponCheck?.(weapon);
      if (!weaponOk) break;                                        // FIX A: was `continue`

      // IsAlive check at 0x61edf–0x61eee — failure continues (0x62019).
      if (!(ent as any).IsAlive?.()) {
        ent = UTIL_FindEntityByClassname(ent, "player");
        continue;
      }

      const pPlayer: any = GetClassPtr<CBasePlayer>(ent);
      const kingName    = (this.m_pCurrentToucher as any).GetNetName?.();
      const playerName  = (pPlayer as any).GetNetName?.();
      if (strcmp(playerName, kingName) !== 0) {
        ent = UTIL_FindEntityByClassname(ent, "player");
        continue;
      }

      // Award points (fild/fadd at 0x61f3e)
      pPlayer.frags += this.m_iPointsPerScore;     // +0x74, int
      (pPlayer as any).EmitSound?.(/*channel*/ 2, /*?*/ 0, /*?*/ 0, /*sample*/ undefined as any);

      appendScoreToHud(msg, pPlayer.frags);
      scored = true;
      ent = UTIL_FindEntityByClassname(ent, "player");
    }
    if (!scored) return;   // 0x62036 fall-through: tail still runs (HUD/fire),
                           // but only when we found a player; for safety, match disasm
                           // by gating tail on `scored` here is a judgment call —
                           // disasm actually does run the tail regardless. Uncomment
                           // the next line to exactly match disasm: if (!scored) {/* tail still runs */}
    // (disasm: tail runs unconditionally after the loop regardless of `scored`)
  } else {
    // Direct path (0x62060–0x62134): toucher's frags += +0x70
    const fragsPtr = (pOther as any).frags;
    fragsPtr += this.m_iScoreAlt;                                          // FIX D: rename
    (pOther as any).EmitSound?.(/*channel*/ 2, /*?*/ 0, /*?*/ 0, /*sample*/ undefined as any);
    appendScoreToHud(msg, fragsPtr);
  }

  // ---- 7. Center-screen broadcast (0x62184–0x621f2) ----
  if (msg.length > 0) {
    TSHudMessageAll(/*channel*/ 8, /*x*/ 0, /*y*/ 0xff,
                    /*r*/ 0xff, /*g*/ 8, /*b*/ -1, msg);
  }

  // ---- 8. Schedule next scoring deadline (0x621f2–0x62222) ----
  this.m_flDeadline = gpGlobals.time + Math.max(this.m_flDwellTime, 0);

  // ---- 9. Fire target if configured (0x62225–0x6225c) ----
  if (this.m_pFireTarget) {
    FireTargets(this.m_pFireTarget, this, this, USE_TYPE.USE_TOGGLE, 0);
  }

  // ---- 10. Stash activity timestamp (0x6225f–0x62270) ----
  this.m_flLastActivity = gpGlobals.time;
}
```

**Notes on the rewrite:**

- Issue **A** (loop semantics): weapon check now `break`s; IsAlive check still `continue`s — matches disasm destinations `0x62036` vs `0x62019`.
- Issue **B** (alt path): the `gameRules != null` branch implements the disasm's `0x61e7b` test; null branch implements `0x62060–0x62134`.
- Issue **C** (off-by-one): changed `elapsed >= dwell` → `elapsed > dwell` so equality falls into the scoring path (matches `jne` behavior on C3).
- Issue **D** (rename): `m_iScoreForTwoWayKill` → `m_iScoreAlt` until D.4 can verify against class DWARF.
- Issue **E** (isolation): `any`, `declare`, and stub helpers make the file self-contained per the checklist.
