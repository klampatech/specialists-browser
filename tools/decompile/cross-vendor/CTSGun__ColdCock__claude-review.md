into a buffer" pattern, not a no-arg getter. The codex's
  `m_pPlayer.field_0x60.vfunc_0x168()` simplification drops the
  signature. Semantically equivalent for the TS port, but worth a
  comment so a future reader doesn't infer `field_0x60` is a
  pure-data sub-object.

- **CVars / EngineGlobals / globalGOT names are speculative.** The
  codex uses friendly names (`coldCock_initA`, `slowmo_path_cvar`,
  `coldcock_ammo_cvar`, `reload_delay_q`, `cockSoundPath`,
  `engineMessages`, `messageBuffer`). They are all `any`-typed and
  the addresses are explicit, so this is fine — but the names will
  need to be revisited when D.4 wires the class members to real
  cvars. Worth a top-of-function `// NAMING-TBD` note so we don't
  bake them in.

- **The 0.7f constant `0x3f39999a` is exactly 0.7 in IEEE-754 single
  precision.** The codex writes `0.7`, which is fine in TS but worth
  a one-line comment that the asm literal is *literally* 0.7f (so
  no precision concerns if we ever switch to f32 buffers).

- **`pev` is a HALF-1 alias used loosely.** The codex reads
  `m_pPlayer.pev[0x250]`, `m_pPlayer.pev.v_angle`, and
  `m_pPlayer.pev.engineRef_0x208`. In HLSDK, `pev` is
  `entvars_t*`. The `v_angle` (offset 0x74) and the engine-edict
  ref (offset 0x208) are both real `entvars_t` fields, so the
  access shape is correct. The 0x250 probe is a TS-extended
  user-data field, not vanilla `entvars_t` — the codex correctly
  flags this. The `.pev` indirection is a slight style choice; if
  the D.4 CTSGun class ends up flattening `m_pPlayer->pev` into
  the entity itself (the way some TS code does), the indirection
  will need to drop.

- **Step 5's `m_pAmmoTracker` access shape.** The codex reads
  `ammoTracker.mode` (offset 0x348) and `ammoTracker.field_0x10`.
  The asm at 71e80 is `cmp BYTE PTR [eax+0x348], 0x2` — a single
  byte compare. The codex's `mode: number` is correct, and the
  `=== 2` comparison is the literal asm check. No issue.

- **SFX section engine vfunc at `[GOT+0x1aa8]+0x168` is called with
  3 args `(0, 0x1f, 0.5)`.** The codex writes
  `engineFunc_0x168(0.5, 0x1f, 0)` — same args, but the order
  shown is the *push order*, not the cdecl arg order. This is
  purely cosmetic; the function is a TODO stub so the order is
  immaterial. If the order matters later, the call needs to be
  reversed to `(0, 0x1f, 0.5)`.

- **The `add esp, 0x30` cleanup after the ColdCockAttack call.**
  Cdecl convention says the caller cleans the stack. The 0x30
  (48 bytes) = 12 dwords of args. The codex doesn't model this
  (since the call is a `declare function` stub), so no fix
  needed, but a future caller-side binding should `add esp, 0x30`
  or use a `(...args)` spread.

- **ColdCockAttack signature.** The demangler says
  `(G6Vector, N21, int, float, int, bool, N37)`. The codex
  expands this to 11 args + m_pPlayer = 12 dwords. The four
  trailing zero-dwords (the `N37`) are correctly identified as
  MSVC stack padding for a TS-extended struct. The codex models
  them as `pad1..pad4: number`. This is the right call — without
  the original C++ headers, we can't say what N37 contains, and
  the asm proves only that four zero dwords are pushed. Keep
  the TODO.

- **M_flReloadTime assignment uses `qfloat([GOT-0x6de50])`.**
  The asm is `fld QWORD PTR [ebx-0x6de50]` — that's an 8-byte
  load of a *double*, not a qword float. The codex correctly
  reads it as a double-precision value (TS `number` is double).
  The `globalGOT.reload_delay_q` naming is a stub. No fix.

- **One genuine miss: the `BYE` early-return paths.** The asm has
  *two* `je 720fd` early-exits: one at 71e2a (m_pAmmo == 0) and
  one at 71e45 (weapon_info[0x10] == 0). Both are merged in the
  codex as "if (!self.m_pAmmo) return; ... if (weaponInfo === null
  || weaponInfo[0x10] === 0) return;". That is correct — the asm
  merges to the same exit label. No fix needed; flagging only
  because the merge is non-obvious.

- **Playback-event gate at 720a0/720ab.** The codex checks
  `self.m_pAmmo !== null && (self.m_pAmmo as any)[0] !== 0`. The
  asm is `cmp DWORD PTR [ebp+0xcc], 0; je; mov eax, [ebp+0xcc];
  cmp BYTE PTR [eax], 0; je`. Note the *first* check is a DWORD
  compare against 0, not a null-pointer check — it's a "is the
  ammo entity alive and well" check, not a "is the pointer
  null" check. The codex conflates them. The semantic is
  identical for any sane pointer, but the strict asm-faithful
  form would distinguish.

- **`m_pAmmo` is read at `+0x10` (asm 720c5) and at `+0` (asm
  720a8, byte).** The codex models this as `m_pAmmo[0x10]` and
  `m_pAmmo[0]`. That's correct, but the type stub for
  `m_pAmmo` only declares `field_0x10`. The `[0]` access
  requires `(self.m_pAmmo as any)[0]`. The codex already does
  this with the `as any` cast. Acceptable.

Suggested rewrite (full TS function):

```typescript
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
```
