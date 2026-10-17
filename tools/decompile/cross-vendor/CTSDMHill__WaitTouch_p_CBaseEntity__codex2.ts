/**
 * CTSDMHill::WaitTouch — touch handler for the DM Hill (KoTH).
 *
 * Partial decompile — D.3. The message-building and player-
 * iteration bodies are still TODO(asm-ambiguous). The
 * state-machine shell (cooldown → claim / steal / dwell /
 * outer-deadline / score-walk / broadcast / fire-target /
 * restamp) is faithful to the disassembly.
 *
 * Field-name provenance:
 *   +0x64 m_flNextCheck   (float, cooldown) — guess
 *   +0x68 m_flLastClaim   (float, time)           — guess
 *   +0x6c m_pCurrentToucher (ptr, entity)         — guess
 *   +0x70 alt-path points (int)                   — guess
 *   +0x74 main-path points (int)                  — guess
 *   +0x78 m_flDwellTime   (float, dwell) — guess
 *   +0x7c m_flDeadline    (float, scoring ts)     — guess
 *   +0x1c8 m_pFireTarget  (string, target)        — guess
 *   +0x1d4 m_iszMessage   (string, broadcast)     — guess
 *
 * Verify against DWARF + strings-n5.txt before pinning.
 */
export function WaitTouch(
  this: CTSDMHill,
  pOther: CBaseEntity,
): void {
  // ---- Cooldown gate (cmp [eax+0x64] vs gpGlobals->time; je return) ----
  if (this.m_flNextCheck > gpGlobals.time) return;

  // ---- Tatcher must be alive + a player ----
  if (!pOther.IsAlive()) return;
  if (!pOther.IsPlayer()) return;

  // ---- 1. First-claim ----
  if (this.m_pCurrentToucher === null) {
    this.m_pCurrentToucher = pOther;
    this.m_flNextCheck = 0;
    const deadline = gpGlobals.time + Math.max(this.m_flDwellTime, 0);
    this.m_flDeadline = deadline;
    this.m_flLastClaim = deadline;
    return;
  }

  // ---- 2. Different player on the hill ----
  if (this.m_pCurrentToucher !== pOther) {
    // Disassembly: triple-deref [ebx+0x2060] → vtable[0xcc](thisObj,
    // m_pCurrentToucher, pOther). TS is not yet wired to the engine
    // global; modeled as a free function call. Return-value check
    // `cmp eax,1; je score / jmp reset` is preserved.
    const visible = engine_visibility_check(
      g_pEngineGlobal /* [ebx+0x2060] */,
      this.m_pCurrentToucher,
      pOther,
    );
    if (visible !== 1) {
      this.m_pCurrentToucher = null;
      this.m_flNextCheck = 0;
      this.m_flDeadline = gpGlobals.time + Math.max(this.m_flDwellTime, 0);
      return;
    }
    // FVisible -> visible (0xcc returned 1): fall through to outer-deadline.
  } else {
    // ---- 3. Same player re-touch ----
    // fcompp after fxch: ZF only on strict inequality.
    //   - elapsed > dwell  → fall through (reset and return)
    //   - elapsed < dwell → jne taken (continue to scoring)
    //   - elapsed == dwell → jne taken (continue to scoring)
    const elapsed = gpGlobals.time - this.m_flLastClaim;
    const dwell = Math.max(this.m_flDwellTime, 0);
    if (elapsed > dwell) {
      // Reset state, return (do not score this round).
      this.m_pCurrentToucher = null;
      this.m_flNextCheck = 0;
      this.m_flDeadline = gpGlobals.time + dwell;
      return;
    }
    // elapsed <= dwell → continue to outer-deadline gate below.
  }

  // ---- 4. Outer-deadline gate (0x61d80–0x61d97: jae 62273) ----
  //   `fcomp deadline vs time; jae 62273` → SKIP if deadline >= time.
  if (this.m_flDeadline >= gpGlobals.time) return;

  // ---- 5. Build the king announcement (TODO: assembly) ----
  //0x61d9d–0x61e62: gates on this->+0x1d4 (iszMessage) and on the
  // game-rules global, then a 4-step strcat chain building "<prefix>
  // <netname> <sep> <target>". Stubs only.
  const msg = buildKingAnnouncement(this, this.m_pCurrentToucher);

  // ---- 6. Game-rules gate (0x61e65–0x61e7b) ----
  // If the [ebx+0x2060] triple-deref is non-null AND its vtable[0x24]
  // returns non-zero, take the iteration path. Otherwise the alt path
  // at 0x62060 awards points directly to pOther using this->+0x70.
  // The TS does not yet implement the alt path — that is a P0 bug.
  if (!gameRulesPresent()) {
    // ALT PATH (missing — see P0-B). Award points to pOther directly,
    // then broadcast HUD message and fire target.
    // pOther.frags += this->m_iPointsForTwoWayKill;  // fild/fadd at +0x70
    // ...rest of alt path identical to main path...
    return;
  }

  // ---- 7. Player iteration (0x61e81–0x62036) ----
  let ent: CBaseEntity | null = UTIL_FindEntityByClassname(null, "player");
  while (ent !== null) {
    // Weapon probe at 0x61e9f–0x61ed6: if weapon is NULL OR the engine
    // [edx+0x118] probe on the weapon returns 0, **break** the loop
    // (NOT continue). The TS got this wrong as `continue`.
    const weapon = ent.weapon;
    if (weapon === 0) break;
    if (engine_weapon_check(g_pEngineGlobal, weapon) === 0) break;

    if (!ent.IsAlive()) {
      ent = UTIL_FindEntityByClassname(ent, "player");
      continue;
    }

    const pPlayer = GetClassPtr<CBasePlayer>(ent);
    if (strcmp(pPlayer.GetNetName(), this.m_pCurrentToucher.GetNetName()) !== 0) {
      ent = UTIL_FindEntityByClassname(ent, "player");
      continue;
    }

    // fild/fadd at 0x61f3e–0x61f4d: this->+0x74 added to *ent->+0x164
    // as int (via float conversion). frags is a float in TS.
    pPlayer.frags += this.m_iPointsPerScore;

    // EmitSound at 0x61f4d–0x61f7d (channel 2, vol 0, pitch 0).
    pPlayer.EmitSound(/*channel*/ 2, /*vol*/ 0, /*pitch*/ 0, /*snd*/ undefined);

    // appendScoreToHud — TODO(asm-ambiguous). The fnstcw/fldcw/fistp
    // trick at 0x61f8a–0x61fab converts the float frags to int, then
    // a "%d" code-data string is strcat'd.
    appendScoreToHud(msg, pPlayer.frags);

    ent = UTIL_FindEntityByClassname(ent, "player");
  }

  // ---- 8. Center-screen broadcast (0x62184–0x621f2) ----
  // Six-arg TSHudMessageAll(UcUcUciiPc): push sequence is
  //   push msg, push <int-from-fnstcw-trick>, push 8, push 0,
  //   push 0xff, push 0
  // i.e. (uchar1=0, uchar2=0xff, uchar3=0, int1=8, int2=<elapsed>,
  //       char*=msg). The TS previously passed7 args; fixed below.
  if (msg.length > 0) {
    const elapsedInt = Math.floor(this.m_flLastClaim);
    TSHudMessageAll(
      /*uchar1*/ 0,
      /*uchar2*/ 0xff,
      /*uchar3*/ 0,
      /*int1*/   8,
      /*int2*/   elapsedInt,
      /*msg*/    msg,
    );
  }

  // ---- 9. Re-arm scoring deadline (0x621f2–0x62225) ----
  this.m_flDeadline = gpGlobals.time + Math.max(this.m_flDwellTime, 0);

  // ---- 10. Fire target if configured (0x62225–0x6225c) ----
  // STRING(this->m_pFireTarget) is built from pev->target +
  // 0x1c8 + gpGlobals->max_edicts. USE_TOGGLE = 3.
  if (this.m_pFireTarget) {
    FireTargets(this.m_pFireTarget, this, this, USE_TYPE.USE_TOGGLE, 0);
  }

  // ---- 11. Stash last-activity timestamp (0x6225f–0x62273) ----
  this.m_flLastActivity = gpGlobals.time;
}

// ---- Anchors (still TODO — must be wired in D.4/D.5) ----
// TODO(D.4): CTSDMHill, CBaseEntity, CBasePlayer, gpGlobals,
//   g_pEngineGlobal (identity of [ebx+0x2060] triple-deref),
//   USE_TYPE.
// TODO(D.4): verify vtable offsets against DWARF or the engine
//   interface table in tools/decompile/references/hlsdk-goldsrc-interface.md
//   — particularly +0xc8 (IsAlive), +0xb4 (IsPlayer), +0xcc//   (engine visibility check), +0x118 (engine weapon probe),
//   +0x208 (entity.weapon accessor), +0xd0 (GetNetName),
//   +0xb8 (EmitSound), +0xbc (EmitAmbientSound?).
// TODO(D.4): cross-check all field names against DWARF before
//   promotion from "guess" to "verified".
// TODO(D.5): implement buildKingAnnouncement and appendScoreToHud
//   against the actual code-data strings in analysis/strings-n5.txt.
