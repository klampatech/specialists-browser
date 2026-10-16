The sandbox is read-only — I can't save to disk. I'll deliver the TypeScript code directly in this response (which is what the prompt specifies anyway: "The code will be saved verbatim to `tools/decompile/output/<demangled>.ts`").

```typescript
/**
 * CTSGun::ColdCock — pump/cock a weapon (slide-cock for the .357, pump
 * action for shotguns, generic bolt-rack otherwise). Triggered from
 * `AlternateAttack` when the held weapon has an ammo tracker with positive
 * ammo; runs the per-weapon "chamber a round" animation, plays the
 * cocking SFX, and dispatches the coldcock playback event so clients
 * can sync their view model.
 *
 * Pipeline (faithful to asm at 0x00071dd0, 821 B):
 *   1. Lazy-init 3 GOT statics.
 *   2. Bail if the ammo entity (this+0xcc) is missing or if the weapon's
 *      `s_weapon_info[0x10]` field is zero (the weapon is not usable).
 *   3. Sample a `playerFlag` byte from a pev-style dword at offset 0x250
 *      masked with 0x70c30. The mask almost certainly probes a TS-extended
 *      player-state field; it gates the "hold for an extra bit" behavior
 *      in the engine dispatch below.
 *   4. Refresh engine view vectors from the player's v_angle, and (if
 *      the ammo tracker is present) interrupt an in-flight grenade with
 *      GrenadeIdle(1) and stop any active reload.
 *   5. Compute a 0.7-second base cock delay, optionally scaled by a
 *      player-state cvar at [GOT-0x6deec]. Cache it in `m_flColdCockDelay`
 *      so other CTSGun methods (e.g. Animate) can read it.
 *   6. Unzoom, then push out four next-attack fields
 *      (m_flNextPrimaryAttack, m_flNextSecondaryAttack, m_flTimeWeaponIdle,
 *      and the player's field_0x12c) to `UTIL_WeaponTimeBase() + delay`.
 *      Also bump `m_flReloadTime` to `UTIL_WeaponTimeBase() + [GOT-0x6de50]`
 *      (a qword double cvar).
 *   7. Read the player's current spread cone via the vfunc at
 *      `*(m_pPlayer + 0x60)->vtable[0x168]` and stash it in the cached
 *      `m_vecRecoil`. Copy the engine's base spread vector at
 *      `[GOT[0x1600]][0]+0x28` into `m_vecSpreadBase`.
 *   8. Compute a forward-aim Vector `dir = m_vecRecoil + 35 * m_vecSpreadBase`
 *      and a separate `spreadBaseOut` snapshot.
 *   9. Call `ColdCockAttack(player, ..., dir, spreadBaseOut, 3, ammoMul,
 *      playerFlag?-1:0x27, 0,0,0,0)`. If it returns non-zero, the cock
 *      motion hit something in the trace, so play the cocking SFX.
 *  10. If the ammo entity is still attached AND its first byte is non-zero,
 *      dispatch the coldcock engine event with 12 dwords (pfnPlaybackEvent).
 *
 * NOTE: The four zero-dwords at the end of the ColdCockAttack call are
 * MSVC stack-alignment padding for an N21/N37 type the demangler could
 * not resolve; the actual prototype in CBasePlayer takes 2-3 more args
 * than the demangler's `(Vector, Vector, int, int, float, int, bool, ?, ?)`.
 */

// ── stubs for compile isolation ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPtr = any;

// Minimal CTSGun field stubs. Full definition arrives in D.4.
interface CTSGun {
  m_pPlayer: any;                  // [+0x80] CBasePlayer*
  m_iWeaponType: number;           // [+0xc8] tsweapon_t
  m_pAmmo: null | {                // [+0xcc]
    field_0x10: number;            //        fed into pfnPlaybackEvent
  };
  m_pAmmoTracker: null | {         // [+0xd0] s_weapon_info* (per Fire.ts)
    field_0x10: number;            //        ammo count / type (loaded as int)
    mode: number;                  // [+0x348] weapon-category byte (grenade=2)
  };
  m_flNextPrimaryAttack: number;   // [+0x9c]
  m_flNextSecondaryAttack: number; // [+0xa0]
  m_flTimeWeaponIdle: number;      // [+0xa4]
  m_flReloadTime: number;          // [+0xa8]
  m_usEventColdCock: number;       // [+0x966] playback-event id (movzx WORD)

  GrenadeIdle(forceState: number): void;
  StopReload(): void;
  Unzoom(): void;
}

// Engine-side stubs. Full g_engfuncs binding lives in D.5.
declare function UTIL_WeaponTimeBase(): number;
declare function UTIL_MakeVectors(vec: AnyPtr): void;
declare function get_weapon_info(weaponType: number): AnyPtr;
declare function ColdCockAttack(
  player: AnyPtr,
  aimVec: AnyPtr,
  dirVec: AnyPtr,
  spreadVec: AnyPtr,
  intArg: number,
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

// GOT-backed namespaces. See tools/decompile/analysis/objdump-disasm-full.txt
// for the canonical [ebx ± k] layout.
declare const CVars: any;          // GOT statics in [ebx+0x7c38..0x7c6c]
declare const EngineGlobals: any;  // engine singletons at [ebx+0x1600], 0x1888, 0x1aa8
declare const globalGOT: any;      // generic GOT backing store

// ── the decompiled function ──────────────────────────────────────
export function ColdCock(this: CTSGun): void {
  const self = this as any;

  // ── 1. Lazy-init GOT statics ─────────────────────────────────────
  // Asm pattern: cmp [ebx+0x7cX8], 0; jne; mov [ebx+0x7cX8], 1.
  // The actual stored values are immaterial (they're just one-shot
  // init flags); the body of the block is empty in all three cases.
  if (CVars.coldCock_initA === 0) CVars.coldCock_initA = 1;   // +0x7c38
  if (CVars.coldCock_initB === 0) CVars.coldCock_initB = 1;   // +0x7c3c
  if (CVars.coldCock_initC === 0) CVars.coldCock_initC = 1;   // +0x7c40

  // ── 2. Early bail ────────────────────────────────────────────────
  // Asm 71e23 / 71e45: je 720fd if [this+0xcc]==0 OR get_weapon_info()+0x10==0.
  if (!self.m_pAmmo) return;
  const weaponInfo = get_weapon_info(self.m_iWeaponType);
  if (weaponInfo === null || weaponInfo[0x10] === 0) return;

  // ── 3. Sample a pev-style flag bit ───────────────────────────────
  // Asm 71e4b..71e5d:
  //   mov eax, [esi+0x80]      ; eax = m_pPlayer
  //   mov eax, [eax]            ; eax = *m_pPlayer (pev)
  //   test [eax+0x250], 0x70c30 ; mask vs. pev[0x250]
  //   setne [esp+0xf]            ; stash local flag byte
  // TODO(asm-ambiguous): pev offset 0x250 is in the TS-extended user-data
  //   area. The mask 0x70c30 likely probes a player-state condition (e.g.
  //   "is the player frozen / in water / observing"), not a vanilla
  //   pev->flags bitmask. Cross-reference TS source to name it.
  const playerFlag: boolean =
    ((self.m_pPlayer as any).pev[0x250] & 0x70c30) !== 0;

  // ── 4. Refresh engine view vectors ───────────────────────────────
  // Asm 71e62..71e6e: push eax+0x74 (= &pev->v_angle); call UTIL_MakeVectors.
  UTIL_MakeVectors((self.m_pPlayer as any).pev.v_angle);

  // ── 5. Optional pre-cock teardown ────────────────────────────────
  // Asm 71e71..71ea0: if [esi+0xd0]==0, skip both calls. Otherwise:
  //   if (byte)[eax+0x348]==2   →  GrenadeIdle(this, 1)
  //   StopReload(this)
  // Both run unconditionally (GrenadeIdle is a no-op for non-grenade items
  // because StopReload happens either way).
  const ammoTracker: any = self.m_pAmmoTracker;
  if (ammoTracker != null) {
    if (ammoTracker.mode === 2) {
      self.GrenadeIdle(1);
    }
    self.StopReload();
  }

  // ── 6. Cock-delay = 0.7, optionally scaled by cvar ──────────────
  // Asm 71ea3..71ec0:
  //   mov [ebx+0x7c68], 0x3f39999a   ; +0x7c68 = 0.7f
  //   if (playerFlag) { float_mul([ebx-0x6deec], [ebx+0x7c68]) ; fstp [ebx+0x7c68] }
  // The cvar at [GOT-0x6deec] is the "player slow-mo path" multiplier.
  let cockDelay = 0.7;
  if (playerFlag) {
    cockDelay *= globalGOT.slowmo_path_cvar; // GOT-0x6deec (float cvar)
  }
  CVars.m_flColdCockDelay = cockDelay;

  // ── 7. Unzoom and push out next-attack timers ───────────────────
  // Asm 71ec6..71f0b:
  //   Unzoom(this)
  //   t = UTIL_WeaponTimeBase() + cockDelay
  //   t → this+0xa4 (m_flTimeWeaponIdle)
  //   t → this+0xa0 (m_flNextSecondaryAttack)
  //   t → this+0x9c (m_flNextPrimaryAttack)
  //   t → [m_pPlayer+0x12c] (player-side "next cock" timer)
  //   m_flReloadTime = UTIL_WeaponTimeBase() + qfloat([GOT-0x6de50])
  self.Unzoom();
  const t0 = UTIL_WeaponTimeBase();
  const cockAt = t0 + cockDelay;
  self.m_flTimeWeaponIdle      = cockAt;
  self.m_flNextSecondaryAttack = cockAt;
  self.m_flNextPrimaryAttack   = cockAt;
  (self.m_pPlayer as any).field_0x12c = cockAt;
  self.m_flReloadTime =
    UTIL_WeaponTimeBase() + globalGOT.reload_delay_q; // GOT-0x6de50 (qword float)

  // ── 8. Cache spread cone + engine base spread ───────────────────
  // Asm 71f0b..71f47:
  //   sub esp, 8; push eax; push esi;
  //   call [eax+0x60][0x168] (player spread cone vfunc) returning Vector3
  //   rep movsd es:[edi]←ds:[esi]   ; m_vecRecoil (GOT+0x7c44) ← result
  //   mov esi, [GOT[0x1600]]; add esi, 0x28
  //   rep movsd es:[edi]←ds:[esi]   ; m_vecSpreadBase (GOT+0x7c50) ← engine
  // The caller's add esp,0xc at 71f52 cleans the 8-byte sub+2 args (4 from
  // the two pushes + 4 from the prior sub).
  const cone = (self.m_pPlayer as any)
    .field_0x60.vfunc_0x168() as [number, number, number];
  const recoil = CVars.m_vecRecoil as [number, number, number];   // GOT+0x7c44
  recoil[0] = cone[0]; recoil[1] = cone[1]; recoil[2] = cone[2];

  const baseSpread = EngineGlobals.vec_0x1600_at_0x28 as [number, number, number];
  const spreadBase = CVars.m_vecSpreadBase as [number, number, number]; // GOT+0x7c50
  spreadBase[0] = baseSpread[0];
  spreadBase[1] = baseSpread[1];
  spreadBase[2] = baseSpread[2];

  // ── 9. Ammo-count-as-float, scaled by cvar if playerFlag ─────────
  // Asm 71f49..71f5c:
  //   fild [ammoTracker+0x10]              ; int → float (no pop)
  //   if (playerFlag) fmul [ebx-0x6def0]    ; scale by cvar
  // TODO(asm-ambiguous): the [GOT-0x6def0] cvar is unidentified; it is
  //   *not* the same cvar as [GOT-0x6deec] used above.
  let ammoMul: number = ammoTracker.field_0x10;
  if (playerFlag) {
    ammoMul *= globalGOT.coldcock_ammo_cvar; // GOT-0x6def0 (float cvar)
  }

  // ── 10. Compute `dir = m_vecRecoil + 35 * m_vecSpreadBase` ───────
  // Asm 71f62..71fe6:
  //   lea eax, [esp+0x40]; mov [esp+0x8], eax       ; save pointer
  //   copy m_vecRecoil (3 dwords) into [esp+0x40..0x48]
  //   fld 0x23; push eax; fild [esp]; pop eax        ; load 35.0 onto st(0)
  //   fmul spreadBase.x, fmul spreadBase.y, fmul spreadBase.z
  //   store to [esp+0x20], [esp+0x24], [esp+0x28]
  //   faddp m_vecRecoil.x + 35*spreadBase.x → store at [esp+0x30] (&dir)
  //   similar for y, z
  const dir: [number, number, number] = [
    recoil[0] + 35 * spreadBase[0],
    recoil[1] + 35 * spreadBase[1],
    recoil[2] + 35 * spreadBase[2],
  ];

  // ── 11. Spread-base snapshot (for arg #4 of ColdCockAttack) ──────
  // Asm 71fea..71fff: lea esi, [esp+0x10]; copy spreadBase (3 dwords) into
  // [esp+0x10..0x18]. esi is pushed later as the &spreadBaseOut arg.
  const spreadBaseOut: [number, number, number] = [
    spreadBase[0], spreadBase[1], spreadBase[2],
  ];

  // The [esp+0x8] pointer captured at 71f66 points to the stack-local copy
  // of m_vecRecoil ([esp+0x40]). After the intervening pushes it is
  // accessible as [esp+0x30] at 72038. This is the unknown pointer passed
  // as arg #2 of ColdCockAttack — likely a player-aim snapshot used by
  // the hit trace inside ColdCockAttack.
  // TODO(asm-ambiguous): verify that this is "the spread cone we just
  //   sampled" vs "the player's actual aim direction"; either way it is
  //   the Vector3 passed by reference into the trace.
  const aimVecPtr: AnyPtr = (self as AnyPtr).__stack_aimVecPtr;

  // ── 12. ColdCockAttack — 12 dword arguments ──────────────────────
  // Asm 72003..72047: sub esp,0x6 + 4×(pushw 0 + sub esp,0x2) creates
  // the "four zero-dword" tail padding; add esp,0x30 cleans 48 bytes.
  // Stack arguments (last push = first arg):
  //   (last)   aimVecPtr           ← [esp+0x30] at 72038 = [esp+0x8] before padding
  //   spreadBaseOut              ← esi = &esp+0x10
  //   dir                        ← edi = &esp+0x30
  //   0                          ← [esp+0x30] (post-push) — see below
  //   0x3
  //   ammoMul (float)
  //   (playerFlag ? -1 : 0x27)   ← eax after sete;dec;or 0x27
  //   0, 0, 0, 0                 ← 4× (pushw 0 + sub esp,2)
  //   (first)  m_pPlayer         ← "this" arg of CBasePlayer method
  //
  // TODO(asm-ambiguous): the demangled signature
  //   `ColdCockAttack(Vector, Vector, int, int, float, int, bool, ?, ?)`
  // is missing one Vector and the trailing N21/N37 types. The TS-extended
  // prototype likely takes 2 extra trailing ints or pointers. Model them
  // as `pad1..pad4` here.
  const hit = ColdCockAttack(
    /* this         */ self.m_pPlayer,
    /* aimVecPtr    */ aimVecPtr,
    /* dir          */ dir,
    /* spreadBase   */ spreadBaseOut,
    /* intArg       */ 0x3,
    /* floatArg     */ ammoMul,
    /* intFlagArg   */ playerFlag ? -1 : 0x27,
    /* pad1..pad4   */ 0, 0, 0, 0,
  );

  // ── 13. Play the cock SFX on hit ─────────────────────────────────
  // Asm 7204a..72096: if eax==0 skip; otherwise build the sound.
  //   push 0.5; (alloc 4); push 0x1f; push 0;
  //   call [GOT[0x1aa8] + 0x168]          ; engine vfunc (3 args)
  //     add esp, 0xc; add eax, 0x3c       ; eax = string ptr (game-dir + 0x3c)
  //   EMIT_SOUND_DYN(
  //     edict,                              ; esi = *(*m_pPlayer + 0x208)
  //     0x4,                                ; channel
  //     sample,                             ; GOT-0x6dcc7 ("weapons/357_cock1.wav"
  //                                          ; or per-weapon variant)
  //     1.0,                                ; attenuation
  //     0.8,                                ; volume
  //     0,
  //     sample_ext,                         ; engine-prefixed path from vfunc
  //     0)
  //   add esp, 0x20
  // TODO(asm-ambiguous): engine vfunc at GOT[0x1aa8]+0x168 is not vanilla
  //   pfnGetGameDir (offset ~3 in HLSDK enginefuncs_t). Probably a
  //   TS-extended pfnGetFullSoundPath or similar.
  if (hit !== 0) {
    const edict: AnyPtr = (self.m_pPlayer as any).pev.engineRef_0x208;
    const soundPathExt: AnyPtr =
      EngineGlobals.engineFunc_0x168(0.5, 0x1f, 0) + 0x3c;
    const sample: AnyPtr = globalGOT.cockSoundPath; // GOT-0x6dcc7
    EMIT_SOUND_DYN(
      edict,
      0x4,
      sample,
      1.0,
      0.8,
      0,
      soundPathExt,
      0,
    );
  }

  // ── 14. Engine dispatch — coldcock playback event ────────────────
  // Asm 72099..720fa: skip if [this+0xcc]==0 OR (byte)[*this+0xcc]==0.
  // Otherwise call [GOT[0x1aa8] + 0x1ec] (pfnPlaybackEvent) with
  // 12 dword arguments:
  //   1                                (flags)
  //   *(*m_pPlayer + 0x208)            (engine edict ref)
  //   (uint16)[this+0x966]             (coldcock event id, movzx)
  //   0
  //   [GOT+0x1888]                     (engine vec, pushed twice)
  //   [GOT+0x1888]
  //   float[GOT+0x7c5c]                (pushed twice)
  //   float[GOT+0x7c60]
  //   [this+0xc8]                      (m_iWeaponType)
  //   [this+0xcc]+0x10                 (m_pAmmo[0x10])
  //   0
  //   0
  if (self.m_pAmmo !== null && (self.m_pAmmo as any)[0] !== 0) {
    const edict: AnyPtr = (self.m_pPlayer as any).pev.engineRef_0x208;
    const eventId: number = self.m_usEventColdCock & 0xffff;
    const msg = (globalGOT as any).engineMessages;       // GOT+0x1aa8
    const vecBuf = (globalGOT as any).messageBuffer;     // GOT+0x1888
    (msg as AnyPtr)[0x1ec /* PLAYBACK_EVENT_INVOKE_OFFSET */](
      /* flags       */ 1,
      /* invoker     */ edict,
      /* eventindex  */ eventId,
      /* delay       */ 0,
      /* origin      */ vecBuf,
      /* angles      */ vecBuf,
      /* fparam1     */ CVars.m_flDamageOrScale_0x7c5c,   // GOT+0x7c5c
      /* fparam2     */ CVars.m_flDamageOrScale_0x7c60,   // GOT+0x7c60
      /* iparam1     */ self.m_iWeaponType,
      /* iparam2     */ self.m_pAmmo.field_0x10,
      /* bparam1     */ 0,
      /* bparam2     */ 0,
    );
  }
}
```
