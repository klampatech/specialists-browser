/**
 * CTSGun::ShotgunFire — fire one shotgun shot (pump or auto variant).
 *
 * The auto (mode 3) weapon drives a two-call "prime + fire" sequence:
 * the first call only flips a flag and bails on the bullet path; the
 * second call is the real one with bullets + view kick. Pump-action
 * (mode 1) fires on every call.
 *
 * @param this  The CTSGun entity (first cdecl stack arg, NOT in ecx).
 * @returns     void
 */
export function ShotgunFire(this: any /* TODO: replace with CTSGun */): void {
  // ---- 1. One-time global latches (GOT-relative flags). ----
  // Purpose unknown — likely "cvar already registered" sentinels.
  if (!g_initLatch_7c6c) g_initLatch_7c6c = true;
  if (!g_initLatch_7c70) g_initLatch_7c70 = true;
  if (!g_initLatch_7c74) g_initLatch_7c74 = true;

  const player: any = this.field_0x80;          // [this+0x80]
  const ws:     any = this.pWeaponState;         // [this+0xcc]
  const wd:     any = this.pWeaponClassInfo;     // [this+0xd0]

  // ---- 2. Already-firing short-circuit. ----
  if (ws.field_0x8 !== 0) {
    ws.field_0x8 = 2;
    return;
  }

  // ---- 3. First-shot-of-auto-sequence flag. ----
  // isFirstShot := (mode == 3) AND (pumpArmed != 0).
  const isFirstShot: boolean =
    ws.field_0x2 === 3 && ws.field_0x24 !== 0;
  g_isFirstShot_7c9c = isFirstShot ? 1 : 0;

  // ---- 4. Schedule timing. ----
  // Pump (mode 1) uses a fixed 0.18s cooldown; auto uses wd.field_0x18.
  const fireDelay: number =
    ws.field_0x2 === 1 ? 0.18 : wd.field_0x18;  // 0x3e19999a == 0.18f
  this.field_0x9c = UTIL_WeaponTimeBase() + fireDelay;

  // Secondary timer uses a static double from the GOT (purpose unclear:
  // re-trigger guard? idle threshold?). Not frametime — loaded as a
  // QWORD, not from gpGlobals.
  this.field_0xa8 =
    UTIL_WeaponTimeBase() + g_doubleStatic_6de50;  // [ebx-0x6de50], QWORD

  // ---- 5. Empty-clip early-out. ----
  if (!InfiniteClips(player) && ws.field_0x4 <= 0 && !isFirstShot) {
    return;
  }

  // ---- 6. Decrement clip on the real shot only. ----
  if (!isFirstShot && !InfiniteClips(player)) {
    ws.field_0x4--;
  }

  // ---- 7. Cache muzzle position and view forward. ----
  // m_vecMuzzlePos := player->GetGunPosition(out).
  player.GetGunPosition(g_vecMuzzlePos_7c78);
  // m_vecForward := gpGlobals->field_0x28 (likely v_forward; exact
  // offset in globalvars_t is TODO — see chunk note about +0x28).
  g_vecForward_7c84.copyFrom(g_gpGlobals_1600.deref().field_0x28);

  // ---- 8. Fire bullet spread (skipped on the priming pump). ----
  if (!isFirstShot) {
    // Vec3 broadcast of wd.field_0x28 — passed as 3rd Vector to
    // ShootBulletsPlayer. Distinct from muzzle/forward; likely a
    // "spread distance" or "aim origin" parameter.
    const aimSrcVec: Vec3 = {
      x: wd.field_0x28, y: wd.field_0x28, z: wd.field_0x28,
    };

    // NOTE: cdecl this, not thiscall. Player is the first stack arg.
    ShootBulletsPlayer(
      player,              // this (cdecl, 1st stack arg)
      wd.field_0x24,       // [wd+0x24] BYTE — silenced flag (pushed widened)
      g_shotDirOut_7c90,   // OUT vec3 (ptr — written by callee)
      g_vecMuzzlePos_7c78, // vec3 (ptr)
      g_vecForward_7c84,   // vec3 (ptr)
      aimSrcVec,           // vec3 (ptr)
      wd.field_0x1c,       // float
      wd.field_0x20,       // float
      wd.field_0x8,        // BYTE (bulletsToFire, pushed widened)
      player.field_0x7ec,  // tracerFreq-ish
    );

    // Copy 3 dwords from the OUT slot at [esp+0x38] back to
    // g_shotDirOut_7c90 — this is the post-call `rep movs` at 0x72350.
    g_shotDirOut_7c90.copyFrom(g_shotDirOut_7c90); // (the OUT pointer is edi)

    // ---- 8b. View kick, gated by wd.field_0x38. ----
    if (wd.field_0x38 !== 0) {
      // Spread selection (CORRECTED — was inverted + had a fabricated
      // m_bAttackActive conjunct):
      //   useWide := (wd.field_0xc & 0x3) != 0 AND mode != 1
      const useWide: boolean =
        (wd.field_0xc & 0x3) !== 0 && ws.field_0x2 !== 1;
      const cvarSpread: number = useWide
        ? g_cvar_6df04        // wider
        : g_cvar_6f3fc;       // tighter
      const kickScale: number = cvarSpread * wd.field_0x30;

      // VKickback(this, float, int, bool, float, float, T3).
      // T3 is a 12-byte struct (or 10-byte + padding) passed by value
      // on the stack — exact layout is asm-ambiguous.
      // Args in callee order: scale, byteFlag, 0, fwdX, fwdY, 1.
      VKickback(
        this,             // this (cdecl, 1st stack arg)
        kickScale,
        wd.field_0x348,   // [wd+0x348] BYTE
        0,                // pushw 0
        g_shotDirOut_7c90.x,
        g_shotDirOut_7c90.y,
        1,                // pushw 1 (T3 trailing byte)
      );
    }
  }

  // ---- 9. Engine event call (different event index per branch). ----
  // Both branches land at 0x7246b and tail-call into
  // enginefuncs[0x1ec], with different arg lists. The codex
  // abstracts this as playWeaponEvent(); the full arg layout is
  // branch-dependent (see disassembly 0x723c0–0x72474).
  const evtIdx: number = isFirstShot
    ? this.field_0x96a    // m_usEventPump
    : this.field_0x964;   // m_usEventShoot
  playWeaponEvent(this, evtIdx);

  // ---- 10. Toggle the pump-armed flag. ----
  ws.field_0x24 = ws.field_0x24 ? 0 : 1;
}