I have enough context now. Here's my review of the decompiled `CTSGroundWeapon::GetWeapon` function:

---

```
VERDICT: FAIL

⚠️  CHECKLIST-MISMATCH NOTE (read first):
The review checklist is specifically designed for the 4 GoldSrc
engine↔mod interface entry points (GiveFnptrsToDll, GetEntityAPI,
GetEntityAPI2, GetNewDLLFunctions). The function under review,
`CTSGroundWeapon::GetWeapon(CBaseEntity*)`, is a C++ gameplay
method on a world-entity class — NOT an interface entry point.

Therefore, items 2 (version check), 3 (interfaceVersion assignment-back),
and 4 (memcpy success path) are N/A for this function. The "what to
check" reduces to: signature, logic correctness vs. disassembly, field
naming consistency with the rest of the project, no fabricated paths,
and compile-in-isolation.

Checklist (re-mapped for a C++ gameplay method):
1. Signature — ✅ — matches demangled `CTSGroundWeapon::GetWeapon(p
   CBaseEntity)` exactly: returns void, takes `this` (CTSGroundWeapon*)
   + `pEntity` (CBaseEntity*). The `ts_i386.so` is __cdecl-mangled for
   member funcs (this on stack), so the TS's positional `(this, pEntity)`
   shape is correct. Note the symbol size is 932 B, not a trivial method.
2. Version check — N/A — not an interface entry point.
3. interfaceVersion assignment-back — N/A.
4. Success path — N/A.
5. No fabricated paths — ❌ — see Issue 1 (pev[0x118] check order),
   Issue 2 (TSHudMessageOne 6th arg), Issue 3 (FireTargets 1st arg).
   These are not pure-fabricated; they are mis-reads of the asm.
6. No TODO body — ✅ — the body is fully expressed; TODOs are scoped
   to specific ambiguous lines, which is correct.
7. Field names — ⚠️ — partial. `m_iWeaponId` / `m_iAmmoCount` /
   `m_iRespawnDelay` / `m_iTeam` / `m_bRequireTeam` are sensible
   inferred names. But `m_iCash` (ebp+0x540), the cluster
   `field_0xc / field_0x10 / field_0x14 / field_0x18` (timers/flags
   the asm touches but the TS can't name), and the raw offset
   reads `pev[0x118] / pev[0x1a0] / pev[0x1d4] / pev[0x1c8]` are
   not tied to the established CTS class state map (see HANDOFF.md
   "CTSGun class state"). Acceptable for D.4 as long as these get
   folded in during D.4.8 cross-class consolidation.
8. Compiles in isolation — ❌ — the function references `CashBased`,
   `g_TeamId`, `get_weapon_info`, `get_ammo_info`, `GetTeamIndex`,
   `TSHudMessageOne`, `g_szWrongTeamMsg`, `g_szNoCashMsg`,
   `g_iRespawnInterval`, `g_pGameRules`, `FLOAT_RESPAWN_CONSTANT_A/B`,
   `gpGlobals`, `AddAmmo`, `EMIT_SOUND_DYN`, `g_szPickupSound`,
   `g_flPickupVolume`, `g_flPickupAttenuation`, `USE_TOGGLE`,
   `FireTargets` — none of which are declared anywhere in the file.
   The existing `weapons.ts` (D.4.2/6/7) and `slowmo.ts` (D.4.1) put
   `declare` statements at the bottom of the file. This file has
   none. In strict TS, won't compile; in non-strict, will spew
   implicit-any warnings. **Must add a `declare` block.**

Issues to fix:

  Issue 1 — pev[0x118] check order is REVERSED.
  ─────────────────────────────────────────────
  Disassembly (lines 92373–9238b):
      92373:  mov eax, [esi]            ; esi = pEntity (arg2, pCaller)
      92375:  cmp BYTE [eax+0x118], 0   ; pEntity->pev[0x118]
      9237c:  js  exit
      92382:  mov ecx, [edi]            ; edi = this (arg1, the ground weapon)
      92384:  cmp BYTE [ecx+0x118], 0   ; this->pev[0x118]
      9238b:  js  exit
  TS has them in the opposite order:
      if ((this.pev[0x118] as int8) < 0) return;
      if ((pEntity.pev[0x118] as int8) < 0) return;
  The asm checks pEntity FIRST, then this. Swap these two lines in
  the TS.

  Issue 2 — Third TSHudMessageOne call's 6th arg is wrong
  (the "if (this.pev[0x1d4] !== 0)" branch).
  ──────────────────────────────────────────────────────
  Disassembly (lines 92668–9267e):
      92668:  mov eax, [ebx+0x1600]     ; gpGlobals_ptr
      9266e:  mov eax, [eax]            ; eax = gpGlobals
      92672:  mov eax, [eax+0x98]       ; eax = gpGlobals->pStringBase
      92678:  add eax, [edx+0x1d4]      ; eax += this->pev->[0x1d4]
      9267e:  push eax                  ; push const char* (STRING() result)
  This is the GoldSrc `STRING()` macro exactly:
  `gpGlobals->pStringBase + string_t_offset`. The 6th arg is a
  const char*, NOT an int.

  TS computes:
      const displayTime = g_pGameRules.GetTime() + this.pev[0x1d4];
      TSHudMessageOne(0, 0, 0, 0x8, 0x1e, displayTime, pEntity.pev);
  That's wrong in BOTH the value (uses g_pGameRules time instead of
  gpGlobals->pStringBase) and the type (passes int instead of
  char*).

  The established pattern in `src/mod/slowmo.ts:273` is:
      TSHudMessageAll(0, 0xff, 0x00, 0x08, 0x1e, STRING(this.pev.message));
  Mirror it:
      TSHudMessageOne(0, 0, 0, 0x8, 0x1e, STRING(this.pev[0x1d4]), pEntity.pev);

  Also: the demangler says `UcUcUciiPcP9entvars_s` = 7 args
  (Uc, Uc, Uc, i, i, Pc, P9entvars_s). The TS comment "demangled sig
  has 6" is wrong — it's 7, and all 7 are passed in the asm. The
  ambiguity is just about what the 6th arg's value is.

  Issue 3 — FireTargets 1st arg missing STRING() conversion.
  ─────────────────────────────────────────────────────────
  Disassembly (lines 926a5–926bb):
      926a5:  mov eax, [ebx+0x1600]     ; gpGlobals_ptr
      926ab:  mov eax, [eax]            ; eax = gpGlobals
      926af:  mov eax, [eax+0x98]       ; eax = gpGlobals->pStringBase
      926b5:  add eax, [edx+0x1c8]      ; eax += this->pev->target
      926bb:  push eax                  ; push const char*
  Same STRING() pattern. Asm push order:
      push 0, push 3, push this, push this, push string
  which in cdecl right-to-left is:
      FireTargets(STRING(this->pev[0x1c8]), this, this, USE_TOGGLE, 0)
  Matches the slowmo.ts:279 convention exactly.

  TS:
      FireTargets(this.pev[0x1c8], this, this, USE_TOGGLE, 0);
  Passes the raw string_t offset, not the converted const char*.
  Should be:
      FireTargets(STRING(this.pev[0x1c8]), this, this, USE_TOGGLE, 0);

  Issue 4 — EMIT_SOUND_DYN missing 8th arg (TS already flags as TODO).
  ───────────────────────────────────────────────────────────────────
  Disassembly (lines 92627–9264f) pushes 8 dwords; demangler shows 7.
  The 8th push is `[ebx-0x6ec2c]` (a GOT-relative pointer to some
  global — likely a sender index / "from" pointer, or a delegate
  sound-dyn variant). TS has:
      EMIT_SOUND_DYN(pEntity.edict(), 3, g_szPickupSound, g_flPickupVolume,
                     g_flPickupAttenuation, 0, 100);
  Missing the 8th arg. The `declare function EMIT_SOUND_DYN` in
  weapons.ts:774 already shows 8 args (it has the `pad4` slot);
  the call site just needs to actually pass it.

  Issue 5 — AddAmmo: 4 stack values pushed, demangler says 2.
  ────────────────────────────────────────────────────────────
  Disassembly (lines 925f6–9261b) does this for AddAmmo's call site:
      sub esp, 0x4           ; homing
      push m_iAmmoCount
      sub esp, 0x4           ; homing
      push m_iWeaponId
      call get_weapon_info
      add esp, 0x8           ; pop homing (keeps the 2 prior pushes on stack)
      movzx eax, [eax+0x8]   ; ammoType
      push ammoType
      push [ebp+0xa10]       ; pEntity->m_rgAmmo base
      call AddAmmo
      add esp, 0x10
  The compiler reuses the homing space — the 2 prior pushes
  (m_iAmmoCount, m_iWeaponId) are still on the stack at
  [esp+0xc, esp+0x10] relative to AddAmmo's frame, alongside
  AddAmmo's 2 actual pushes (ammoType, pEntity+0xa10) at
  [esp+0x4, esp+0x8].

  Two interpretations of the call signature:
    (a) The demangler is right: AddAmmo takes (unsigned char, int) and
        only reads the top 2 stack args — ammoType and pEntity+0xa10.
        Then m_iWeaponId and m_iAmmoCount below are dead space.
    (b) The demangler is wrong: AddAmmo actually takes 4 args
        (pEntity+0xa10, ammoType, m_iWeaponId, m_iAmmoCount), matching
        the 4 stack values.

  TS uses 2 args:
      pEntity.AddAmmo(this.m_iAmmoCount, ammoType);
  which doesn't match either interpretation cleanly. If (a) is
  right, the arg order is `(ammoType, pEntity+0xa10)` and the TS
  has the wrong arg order. If (b) is right, the TS is missing 2 args.
  **This needs a closer look — possibly cross-vendored with the
  CTSGun::AddAmmo decompile (also a candidate for D.4.8).**

  Issue 6 — No `declare` block at the bottom of the file.
  ──────────────────────────────────────────────────────
  The function references ~20 globals/functions that aren't
  declared. weapons.ts:93-102, 304-313, 761-786, 1208-1210 show
  the project's pattern. Add a `declare` block.

  Issue 7 — Second `get_weapon_info` call was elided.
  ──────────────────────────────────────────────────
  The asm calls `get_weapon_info` twice (at 0x92435 and 0x9248c).
  TS calls it once and reuses `wpnInfo`. This is a safe
  optimization (the function is a pure lookup, no side effects),
  but it's a small departure from literal asm. Acceptable.

  Issue 8 — PickUpWeapon: demangler says 5 args, TS uses 4.
  ─────────────────────────────────────────────────────────
  Demangled: `PickUpWeapon__11CBasePlayer10tsweapon_tPvibT4` =
  (tsweapon_t, void*, int, bool, T4). The T4 is opaque but
  there's clearly a 5th arg. TS drops it:
      pEntity.PickUpWeapon(this.m_iWeaponId, null, gameMode,
                           this.m_iWeaponId !== 0x1d);
  Asm pushes 5: ebp, m_iWeaponId, 0, gameMode, ax. In cdecl
  right-to-left: arg1=ax, arg2=gameMode, arg3=0, arg4=m_iWeaponId,
  arg5=ebp. If this is __cdecl member: this=ebp (=pEntity), args are
  (ax, gameMode, 0, m_iWeaponId). That's 4 args. The 5th from
  the demangler is the `this` (folded into the cdecl member case).
  So TS might actually be right here — T4 is probably noise from
  the demangler (e.g., demangler added it for `this` even though
  it's implicit). Lower-priority, just verify on the next cross-
  vendor pass.

Suggested rewrite (full TS function):

```typescript
/**
 * CTSGroundWeapon::GetWeapon — handles a player attempting to pick up this ground weapon.
 *
 * Performs eligibility checks, optional team/cash validation (in cash-based game modes),
 * the actual pickup, ammo top-up, sound + HUD message emission, respawn scheduling,
 * and target firing.
 *
 * Generated from asm at 0x00092328 (932 B). Base class method —
 * CTSBigPistolWeapon::GetWeapon (0xb9cd0) calls into this.
 */
export function GetWeapon(this: any /* CTSGroundWeapon */, pEntity: any /* CBaseEntity */): void {
  // ── Basic eligibility checks ───────────────────────────────────────
  if (!pEntity.IsPlayer()) return;                        // virtual: [pEntity+0x60] vtable+0xc8
  if (!pEntity.IsAlive()) return;                         // virtual: [pEntity+0x60] vtable+0xb4

  // "Being-removed" status byte on the pev of both entities — abort if negative.
  // (asm order: pEntity first, then this)
  // TODO(asm-ambiguous): exact entvars field meaning unclear; 0x118 is past
  //   standard entvars_t — likely a TS-specific extension.
  if ((pEntity.pev[0x118] as int8) < 0) return;
  if ((this.pev[0x118] as int8) < 0) return;

  // Clamp ammo count to non-negative (branchless "max(x, 0)" pattern in asm:
  //   shr 31; dec; and → if (x<0) x=0 else x unchanged)
  if (this.m_iAmmoCount < 0) this.m_iAmmoCount = 0;

  // ── Cash-based mode: team + affordability checks ──────────────────
  let cost = 0;
  const gameMode = pEntity.pev[0x1a0] as number;           // pev iuser1-style field

  if (CashBased(gameMode) && this.m_bRequireTeam !== 0) {
    const teamId = g_TeamId;                              // [ebx+0x14f0]

    // asm: sub al,2; cmp al,1; ja → team check fires only when the low byte
    // of [g_TeamId] is in {2, 3} (the wrap-around cases al=0,al=1 also ja-jump,
    // which is the same as "al ∈ {2,3}"). m_iTeam == -1 means "no team restriction".
    if (((teamId & 0xff) === 2 || (teamId & 0xff) === 3) && this.m_iTeam !== -1) {
      const playerTeamName = pEntity.GetTeamNumber();    // virtual: [pEntity+0x60] vtable+0xd0
      // TS order (esi, eax) matches the asm push order
      // (esi = g_TeamRules = [ebx+0x14f0], eax = team name from GetTeamNumber).
      if (GetTeamIndex(teamId, playerTeamName) !== this.m_iTeam) {
        TSHudMessageOne(0, 0, 0, 0x10, 0x1e, g_szWrongTeamMsg, pEntity.pev);
        return;
      }
    }

    // Compute total cost: base + per-flag premiums + ammo cost.
    // asm flags are 0x1/0x2/0x4/0x8 of gameMode (gameMode saved at [esp+0x4]
    // before the CashBased() call to survive across it).
    const wpnInfo = get_weapon_info(this.m_iWeaponId);
    cost = wpnInfo.m_iCost;                               // wpnInfo+0xd8
    if (gameMode & 0x1) cost += 0x384;
    if (gameMode & 0x2) cost += 0x320;
    if (gameMode & 0x4) cost += 0x1f4;
    if (gameMode & 0x8) cost += 0x708;
    // asm calls get_weapon_info again to read ammoType; TS optimizes to reuse
    // the cached wpnInfo (pure lookup, no side effects).
    const ammoInfo = get_ammo_info(wpnInfo.m_iAmmoType);   // ammoType at wpnInfo+0x8
    cost += ammoInfo.m_iCost * this.m_iAmmoCount;         // ammoInfo+0x4 per-round cost

    if (pEntity.m_iCash < cost) {                          // [pEntity+0x540]
      TSHudMessageOne(0, 0, 0, 0x10, 0x1e, g_szNoCashMsg, pEntity.pev);
      return;
    }
  }

  // ── Pickup ────────────────────────────────────────────────────────
  // asm push order: ebp(=pEntity), m_iWeaponId, 0, gameMode, ax.
  // cdecl right-to-left: arg1=ax, arg2=gameMode, arg3=0, arg4=m_iWeaponId, arg5=ebp.
  // If __cdecl member, this=ebp=pEntity, and the 4 explicit args are below.
  // 0x1d is the kick weapon id — PickUpWeapon treats it differently (allow
  // pickup as primary even if it conflicts).
  // TODO(asm-ambiguous): demangler has 5 args + T4 (opaque); cross-vendor with
  //   the PickUpWeapon body to confirm whether the T4 is `this` (folded) or
  //   a real 5th arg.
  const picked = pEntity.PickUpWeapon(
    this.m_iWeaponId,
    null,
    gameMode,
    this.m_iWeaponId !== 0x1d
  );
  if (!picked) return;

  // ── Post-pickup effects ───────────────────────────────────────────
  pEntity.GiveCash(-cost);

  // TODO(asm-ambiguous): fields at 0x14/0x18 are written but unnamed.
  this.field_0x14 = 0;
  this.field_0x18 = 0;
  this.pev[0x118] |= 0x80;                                // FL_NOTARGET-ish

  // ── Schedule respawn ──────────────────────────────────────────────
  // asm: do respawn unless (m_iRespawnDelay <= 0 AND al ∈ {2, 3}).
  // The TS's `> 0 || < 2 || > 3` is the same condition.
  const teamModeByte = (g_TeamId & 0xff) as number;
  if (this.m_iRespawnDelay > 0 || teamModeByte < 2 || teamModeByte > 3) {
    this.field_0xc = 0xFFFF0000;                          // -65536 (packed flag/countdown)
    this.field_0x10 = g_iRespawnInterval;                 // [ebx+0x1a20]

    const baseTime = g_pGameRules.GetTime();
    let delaySeconds: number;
    if (this.m_iRespawnDelay > 1) {
      delaySeconds = Math.min(this.m_iRespawnDelay, 180); // cap at 180s
    } else if (this.m_iRespawnDelay === 1) {
      delaySeconds = FLOAT_RESPAWN_CONSTANT_A;            // [ebx-0x6f018] double
    } else {
      delaySeconds = FLOAT_RESPAWN_CONSTANT_B;            // [ebx-0x6e760] double
    }
    this.pev[0x104] = baseTime + delaySeconds;            // next-think
  } else {
    this.field_0xc = 0;
    this.field_0x10 = 0;
  }

  // ── Ammo top-up + pickup sound ────────────────────────────────────
  if (this.m_iAmmoCount > 0) {
    const ammoType = wpnInfo.m_iAmmoType;
    // [pEntity+0xa10 + ammoType*4 + 0xd4] — base m_rgAmmo at 0xa10, offset 0xd4
    // is the standard CBasePlayer ammo array.
    if (pEntity.m_rgAmmo[ammoType] <= 0) {
      // TODO(asm-ambiguous): asm reuses homing space — 4 stack values are
      //   left on the stack at call-time (m_iAmmoCount, m_iWeaponId, ammoType,
      //   pEntity+0xa10). Demangler only sees 2 args. The actual signature
      //   needs cross-vendoring with CTSGun::AddAmmo.
      const added = pEntity.AddAmmo(this.m_iAmmoCount, ammoType);
      if (added > 0) {
        // TODO(asm-ambiguous): 8th arg [ebx-0x6ec2c] is unaccounted for in
        //   the demangled 7-arg signature. Possibly a sender-index / delegate
        //   variant flag. weapons.ts:774 already declares EMIT_SOUND_DYN with
        //   8 args; just need the value here.
        EMIT_SOUND_DYN(
          pEntity.edict(),                                // [pEntity->pev + 0x208]
          3,                                              // channel
          g_szPickupSound,                                // [ebx-0x6c8da]
          g_flPickupVolume,                               // [ebx-0x6f3fc]
          g_flPickupAttenuation,                          // [ebx-0x6e7e4]
          0,                                              // flags
          100,                                            // pitch (push 0x64)
          /* [ebx-0x6ec2c] */ g_szSoundDelegate            // 8th arg (sender / delegate)
        );
      }
    }
  }

  // ── HUD pickup message ────────────────────────────────────────────
  if (this.pev[0x1d4] !== 0) {
    // 6th arg is the STRING() expansion of this->pev->[0x1d4] — the standard
    // GoldSrc pStringBase+offset pattern. Matches slowmo.ts:273 convention.
    // asm:  eax = gpGlobals->pStringBase; eax += [this->pev + 0x1d4]
    TSHudMessageOne(0, 0, 0, 0x8, 0x1e, STRING(this.pev[0x1d4]), pEntity.pev);
  }

  // ── Fire target entities ──────────────────────────────────────────
  if (this.pev[0x1c8] !== 0) {
    // 1st arg is the STRING() expansion of this->pev->target. Matches the
    // slowmo.ts:279 convention. asm: eax = gpGlobals->pStringBase; eax += [this->pev + 0x1c8]
    FireTargets(STRING(this.pev[0x1c8]), this, this, USE_TOGGLE, 0);
  }
}

// ======================================================================
// STUBS — replaced by the engine-bindings module (g_engfuncs, gpGlobals)
// and the reconstructed CTSGroundWeapon class. Mirrors the declare-block
// pattern in src/mod/weapons.ts and src/mod/slowmo.ts.
// ======================================================================

declare function CashBased(mode: number): boolean;
declare const g_TeamId: number;                     // [ebx+0x14f0]
declare const g_iRespawnInterval: number;           // [ebx+0x1a20]
declare const g_pGameRules: any;                    // g_pGameRules singleton
declare const FLOAT_RESPAWN_CONSTANT_A: number;     // [ebx-0x6f018] double (e.g., 5.0)
declare const FLOAT_RESPAWN_CONSTANT_B: number;     // [ebx-0x6e760] double (e.g., 30.0)
declare const gpGlobals: any;                       // [ebx+0x1600] deref
declare function STRING(offset: number): any;       // gpGlobals.pStringBase + offset
declare function get_weapon_info(weaponType: number): any;
declare function get_ammo_info(ammoType: number): any;
declare function GetTeamIndex(teamRules: any, teamName: any): number;
declare function TSHudMessageOne(
  a: number, b: number, c: number, d: number, e: number,
  msg: any, pev: any
): void;
declare const g_szWrongTeamMsg: any;                // [ebx-0x6b770]
declare const g_szNoCashMsg: any;                   // [ebx-0x6b730]
declare const g_szPickupSound: any;                 // [ebx-0x6c8da]
declare const g_flPickupVolume: number;             // [ebx-0x6f3fc]
declare const g_flPickupAttenuation: number;        // [ebx-0x6e7e4]
declare const g_szSoundDelegate: any;               // [ebx-0x6ec2c]  (TODO: 8th EMIT_SOUND_DYN arg)
declare const USE_TOGGLE: number;                   // USE_TYPE.TOGGLE = 3
declare function FireTargets(
  target: any, pActivator: any, pCaller: any,
  useType: number, delay: number
): void;
```

Quick-reference summary of all 8 issues, in priority order:

  P0  Issue 1  — pev[0x118] order swap (visible logic error)
  P0  Issue 2  — TSHudMessageOne 6th arg wrong (STRING vs displayTime)
  P0  Issue 3  — FireTargets 1st arg missing STRING() (will pass
                 bad pointer to FireTargets — runtime crash candidate)
  P1  Issue 4  — EMIT_SOUND_DYN missing 8th arg (TODO already
                 acknowledged in codex output)
  P1  Issue 6  — Missing `declare` block (TS won't compile in
                 isolation; needs the stubs)
  P2  Issue 5  — AddAmmo arg count (4 stack values vs 2 in
                 demangler; needs cross-vendor with CTSGun::AddAmmo)
  P3  Issue 8  — PickUpWeapon T4 demangler noise (low-impact;
                 verify on next pass)
  P3  Issue 7  — Second get_weapon_info elided (acceptable
                 optimization; mention in commit message)
```

---

A few meta-notes for next session:

1. The review checklist was designed for the 4 engine↔mod interface entry points (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`). This function is a C++ gameplay method — none of the version-check / interfaceVersion / memcpy items apply. If you want me to do a dedicated review pass for the 4 entry points (D.3 final), send those; the existing one (per HANDOFF.md) is already PASS-WITH-NOTES and the codex-only fallback is in effect.

2. I tried to read `HANDOFF.md` and `SPEC.md` first per the `AGENTS.md` protocol. The `exec_command` tool was returning empty output until I forced `shell: sh`; after that it worked. Worth a Hermes note — might be an env issue worth flagging for any future agent on m5.

3. I did **not** write any files (sandbox is read-only anyway). The suggested rewrite above is for you to copy into `tools/decompile/output/CTSGroundWeapon__GetWeapon.ts` (or wherever the codex output goes in your workflow) and re-run review on. After fixing, this becomes a candidate for the `src/mod/pickups.ts` consolidation step in D.4.8 along with `CTSBigPistolWeapon__GetWeapon` (which calls into this method via PLT).
