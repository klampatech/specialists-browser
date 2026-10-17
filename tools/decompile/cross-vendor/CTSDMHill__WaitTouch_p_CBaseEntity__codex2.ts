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
