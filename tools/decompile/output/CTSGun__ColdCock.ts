/**
 * CTSGun::ColdCock — pump/cock a weapon. Triggered from
 * `AlternateAttack` (or per-weapon dispatch) when the held weapon has a
 * live ammo tracker; runs the per-weapon "chamber a round" sequence
 * and emits a `coldcock` event so clients sync their view-model cock
 * animation.
 *
 * Pipeline (faithful to asm at 0x00071dd0, 821 B, thiscall):
 *   1. Lazy-init 3 GOT statics (one-shot init flags).
 *   2. Bail if m_pAmmo is null or s_weapon_info[0x10] == 0.
 *   3. Sample a pev[0x250] bitmask (mask 0x70c30) → playerFlag byte.
 *   4. Refresh engine view vectors from the player's v_angle.
 *      If m_pAmmoTracker is set, and its mode byte == 2 (grenade
 *      idle), call GrenadeIdle(1); then call StopReload().
 *   5. cockDelay = 0.7f; if playerFlag, scale by [GOT-0x6deec] cvar.
 *   6. Unzoom(); set this+0x9c/+0xa0/+0xa4/+0x12c to
 *      UTIL_WeaponTimeBase() + cockDelay; set this+0xa8 to
 *      UTIL_WeaponTimeBase() + [GOT-0x6de50] (double).
 *   7. Cache player spread cone into m_vecRecoil ([GOT+0x7c44]);
 *      cache engine base spread ([GOT[0x1600]][0]+0x28) into
 *      m_vecSpreadBase ([GOT+0x7c50]).
 *   8. ammoMul = (float)m_pAmmoTracker[0x10], scaled by
 *      [GOT-0x6def0] cvar if playerFlag.
 *   9. dir = m_vecRecoil + 35 * m_vecSpreadBase (3-dword stack copy).
 *      spreadBaseOut = snapshot of m_vecSpreadBase.
 *  10. Call ColdCockAttack(this=m_pPlayer, &aimVec, &dir,
 *      &spreadBaseOut, 3, ammoMul, playerFlag?-1:0x27, 0,0,0,0).
 *  11. If hit, play the cocking SFX via EMIT_SOUND_DYN.
 *  12. If m_pAmmo is alive (dword non-zero) and m_pAmmo[0] != 0,
 *      dispatch the coldcock playback event (12 dword args).
 *
 * NOTE: ColdCockAttack's true prototype in CBasePlayer takes 2 more
 * args than the demangler's `(G6Vector, N21, int, float, int, bool,
 * N37)` shows; the trailing `N37` is the 4-dword zero padding
 * (MSVC struct-align). Modeled here as pad1..pad4.
 *
 * NAMING-TBD: CVars.* / EngineGlobals.* / globalGOT.* names below are
 * speculative and will be reconciled with the cvars table in D.4.
 */

// ── stubs for compile isolation ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPtr = any;

interface CTSGun {
  m_pPlayer: AnyPtr;               // [+0x80] CBasePlayer*
  m_iWeaponType: number;           // [+0xc8] tsweapon_t
  m_pAmmo: AnyPtr;                 // [+0xcc] CBasePlayerAmmo* (alive-flag at [0])
  m_pAmmoTracker: AnyPtr | null;   // [+0xd0] s_weapon_info* (mode byte at +0x348)
  m_flNextPrimaryAttack: number;   // [+0x9c]
  m_flNextSecondaryAttack: number; // [+0xa0]
  m_flTimeWeaponIdle: number;      // [+0xa4]
  m_flReloadTime: number;          // [+0xa8]
  m_usEventColdCock: number;       // [+0x966] playback-event id (movzx WORD)

  GrenadeIdle(forceState: number): void;
  StopReload(): void;
  Unzoom(): void;
}

declare function UTIL_WeaponTimeBase(): number;
declare function UTIL_MakeVectors(vec: AnyPtr): void;
declare function get_weapon_info(weaponType: number): AnyPtr;
declare function ColdCockAttack(
  player: AnyPtr,
  aimVec: AnyPtr,
  dir: AnyPtr,
  spreadVec: AnyPtr,
  intArg1: number,
  floatArg: number,
  intFlagArg: number,
  pad1: number, pad2: number, pad3: number, pad4: number,
): number;
declare function EMIT_SOUND_DYN(
  edict: AnyPtr,
  channel: number,
  sample: AnyPtr,
  vol: number,
  attn: number,
  flags: number,
  sampleExt: AnyPtr,
  ext: number,
): void;

declare const CVars: any;
declare const EngineGlobals: any;
declare const globalGOT: any;

// ── the decompiled function ──────────────────────────────────────
export function ColdCock(this: CTSGun): void {
  const self = this as any;

  // ── 1. Lazy-init GOT statics (one-shot init flags) ────────────────
  if (CVars.coldCock_initA === 0) CVars.coldCock_initA = 1; // +0x7c38
  if (CVars.coldCock_initB === 0) CVars.coldCock_initB = 1; // +0x7c3c
  if (CVars.coldCock_initC === 0) CVars.coldCock_initC = 1; // +0x7c40

  // ── 2. Early bail ────────────────────────────────────────────────
  if (!self.m_pAmmo) return;
  const weaponInfo = get_weapon_info(self.m_iWeaponType);
  if (weaponInfo === null || weaponInfo[0x10] === 0) return;

  // ── 3. Sample pev[0x250] bitmask → playerFlag ────────────────────
  // TODO(asm-ambiguous): pev offset 0x250 is a TS-extended user-data
  //   field, not vanilla entvars_t. The mask 0x70c30 likely probes a
  //   player-state condition (frozen / in water / observing).
  const playerFlag: boolean =
    (((self.m_pPlayer as any).pev[0x250] & 0x70c30) !== 0);

  // ── 4. Refresh engine view vectors from player's v_angle ─────────
  UTIL_MakeVectors((self.m_pPlayer as any).pev.v_angle);

  // ── 5. Optional pre-cock teardown (grenade idle / stop reload) ───
  const ammoTracker: any = self.m_pAmmoTracker;
  if (ammoTracker != null) {
    if (ammoTracker.mode === 2) self.GrenadeIdle(1);
    self.StopReload();
  }

  // ── 6. cockDelay = 0.7f (asm literal 0x3f39999a), scaled by cvar ─
  let cockDelay = 0.7;
  if (playerFlag) cockDelay *= globalGOT.slowmo_path_cvar; // [GOT-0x6deec]
  CVars.m_flColdCockDelay = cockDelay;                      // [GOT+0x7c68]

  // ── 7. Unzoom and push out next-attack timers ───────────────────
  self.Unzoom();
  const t0 = UTIL_WeaponTimeBase();
  const cockAt = t0 + cockDelay;
  self.m_flTimeWeaponIdle = cockAt;        // [+0xa4]
  self.m_flNextSecondaryAttack = cockAt;   // [+0xa0]
  self.m_flNextPrimaryAttack = cockAt;     // [+0x9c]
  (self.m_pPlayer as any).field_0x12c = cockAt;
  self.m_flReloadTime =
    UTIL_WeaponTimeBase() + globalGOT.reload_delay_d; // [GOT-0x6de50] (double)

  // ── 8. Cache player spread cone into m_vecRecoil ────────────────
  // Asm: call [m_pPlayer[0x60].vtable+0x168](&temp, m_pPlayer)
  //      rep movsd m_vecRecoil ← temp  (3 dwords = 12 bytes)
  const temp: [number, number, number] = [0, 0, 0];
  (self.m_pPlayer as any).field_0x60.vfunc_0x168(temp, self.m_pPlayer);
  const recoil = CVars.m_vecRecoil as [number, number, number];
  recoil[0] = temp[0]; recoil[1] = temp[1]; recoil[2] = temp[2];

  // Cache engine base spread into m_vecSpreadBase.
  const baseSpread =
    EngineGlobals.vec_0x1600_at_0x28 as [number, number, number];
  const spreadBase =
    CVars.m_vecSpreadBase as [number, number, number];
  spreadBase[0] = baseSpread[0];
  spreadBase[1] = baseSpread[1];
  spreadBase[2] = baseSpread[2];

  // ── 9. ammoMul = (float)ammoTracker[0x10], cvar-scaled ──────────
  let ammoMul: number = ammoTracker.field_0x10;
  if (playerFlag) ammoMul *= globalGOT.coldcock_ammo_cvar; // [GOT-0x6def0]

  // ── 10. Compute dir = m_vecRecoil + 35 * m_vecSpreadBase ────────
  // 0x23 = 35 in asm.
  const dir: [number, number, number] = [
    recoil[0] + 35 * spreadBase[0],
    recoil[1] + 35 * spreadBase[1],
    recoil[2] + 35 * spreadBase[2],
  ];

  // spreadBaseOut is a snapshot of the current m_vecSpreadBase.
  const spreadBaseOut: [number, number, number] = [
    spreadBase[0], spreadBase[1], spreadBase[2],
  ];

  // aimVec points to the stack-local copy of m_vecRecoil that the
  // asm set up at 71f62-71f84 (written to [esp+0x40], pointer saved
  // at [esp+0x8], and read back as [esp+0x30] at the call site).
  // In the TS port we just pass `recoil` directly — semantically
  // identical, no need to materialize a stack copy.
  const aimVecPtr: AnyPtr = recoil;

  // ── 11. ColdCockAttack — 12 dword arguments (cdecl) ────────────
  const hit = ColdCockAttack(
    self.m_pPlayer,    // this (CBasePlayer*)
    aimVecPtr,         // &aimVec
    dir,               // &dir
    spreadBaseOut,     // &spreadBaseOut
    0x3,               // intArg1
    ammoMul,           // floatArg
    playerFlag ? -1 : 0x27,
    0, 0, 0, 0,        // 4-dword N37 padding
  );

  // ── 12. Play the cock SFX on hit ────────────────────────────────
  if (hit !== 0) {
    const edict: AnyPtr = (self.m_pPlayer as any).pev.engineRef_0x208;
    // Engine vfunc at [GOT+0x1aa8]+0x168 — returns base path, +0x3c
    // gives the engine-prefixed sound sample path. Args in cdecl
    // order: (0, 0x1f, 0.5).
    const soundPathExt: AnyPtr =
      EngineGlobals.engineFunc_0x168(0, 0x1f, 0.5) + 0x3c;
    const sample: AnyPtr = globalGOT.cockSoundPath; // [GOT-0x6dcc7]
    EMIT_SOUND_DYN(
      edict,
      0x4,        // channel
      sample,
      1.0,        // attn
      0.8,        // vol
      0,          // flags
      soundPathExt,
      0,          // ext
    );
  }

  // ── 13. Engine dispatch — coldcock playback event ──────────────
  // Gate: m_pAmmo must be a non-zero dword AND m_pAmmo[0] must be
  // a non-zero byte. Asm reads the dword as alive-flag (not just
  // a null-pointer check); TS port treats it the same.
  if (self.m_pAmmo !== 0 && (self.m_pAmmo as any)[0] !== 0) {
    const edict: AnyPtr = (self.m_pPlayer as any).pev.engineRef_0x208;
    const eventId: number = self.m_usEventColdCock & 0xffff;
    const msg = (globalGOT as any).engineMessages;       // [GOT+0x1aa8]
    const vecBuf = (globalGOT as any).messageBuffer;     // [GOT+0x1888]
    (msg as AnyPtr)[0x1ec /* PLAYBACK_EVENT_INVOKE_OFFSET */](
      1,                          // flags
      edict,                      // invoker
      eventId,                    // eventindex
      0,                          // delay
      vecBuf,                     // origin
      vecBuf,                     // angles
      CVars.m_flDamageOrScale_0x7c5c, // fparam1
      CVars.m_flDamageOrScale_0x7c60, // fparam2
      self.m_iWeaponType,         // iparam1
      self.m_pAmmo[0x10],         // iparam2
      0,                          // bparam1
      0,                          // bparam2
    );
  }
}
