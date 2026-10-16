/**
 * The Specialists mod — CTSGun entity (D.4.2 PARTIAL, 6/11 pistol methods).
 *
 * Source: ts/dlls/ts_i386.so (NOT stripped, 32-bit ELF).
 * Class: `CTSGun`.
 * Reference: cross-vendor review (codex decompile + claude review).
 *
 * 6 of 11 pistol-priority methods decompiled. Methods appear in
 * source-code order: lifecycle first, then state-transition, then
 * per-frame behavior.
 *
 * This is the BASE CTSGun class (not subclass-specific Fire* methods
 * like KnifeFire / AkimboFire / KatanaFire / ShotgunFire / etc —
 * those are deferred to D.4.7+ if needed for Phase 1 MVP).
 *
 * Class state (consolidated across the 6 methods — see each
 * function's review doc in tools/decompile/cross-vendor/<name>__claude-review.md):
 *   this+0x60     — CBaseEntity* (the parent class, gives virtual table)
 *   this+0x80     — CBasePlayer* (m_pPlayer)
 *   this+0x88     — int (iMaxClip from GetItemInfo)
 *   this+0x97a    — byte flag
 *   this+0x9b8..0x9de — 38 B of zeroed state (Reset)
 *   this+0xa08    — dword (end of zero block, also reset)
 *   this+0xa8     — float (m_flReloadTime, m_flTimeWeaponIdle, m_flNextPrimaryAttack)
 *   this+0xb4     — int (m_iClip — synced from m_pWeaponInfo.m_iAmmo)
 *   this+0xc4..0xcc — int (m_iAmmo, m_pWeaponInfo, m_iClip)
 *   this+0xc8     — int (weapon id, 0x17 = pistol)
 *   this+0xd0     — CBasePlayerWeapon* (m_pOwnerInterface)
 *   this+0x114..  — large data block (m_pWeaponInfo + 0x214 bytes)
 *
 * Methods included (in this file's order):
 *   1. Spawn                  — entity spawn (calls Reset + setup state)
 *   2. Reset                  — zero state block
 *   3. EmptySound             — dry-fire sound
 *   4. GetItemInfo            — fill ItemInfo struct
 *   5. PrimaryAttack          — main fire mode dispatch
 *   6. WeaponIdle             — per-frame idle behavior
 *
 * Pending for D.4.2: Precache, Reload, Deploy, HolsterWeapon,
 * StandardFire (the big one — 1307 B).
 */

/**
 * CTSGun::Spawn — initialize a freshly-spawned CTSGun weapon entity.
 *
 * Pipeline (in order):
 *   1. Reset() — wipe transient state from any prior life.
 *   2. pev->classname = string-offset for "weapon_tsgun"
 *      (computed against the engine's pStringBase as
 *       `szClassname - pStringBase`, NOT via pfnAllocString;
 *       see engine/eiface.h `STRING()` macro for the reference).
 *      TODO(asm-ambiguous): pStringBase accessor at `[gpGlobals+0x98]`
 *        doesn't match stock HLSDK — confirm whether TS patches
 *        globalvars_t or uses a different helper.
 *   3. this->Precache() via the dispatch table at +0x60 (NOT the
 *      C++ vtable — `this` is passed on the stack, which rules out
 *      standard ECX-based virtual dispatch. Treat +0x60 as a manual
 *      dispatch pointer).
 *      TODO(disambiguation): verify which entry of the dispatch
 *        table `Precache` lives in. The current code assumes
 *        `[table+0x28]/4 = 10`, which should be confirmed against
 *        the constructor's `GetClassPtr` write.
 *   4. g_engfuncs.pfnSetModel(pev, "models/w_glock18.mdl")
 *   5. Initialize mode/state fields on the instance.
 *      All writes here set sane defaults for weapons that exist on
 *      the ground before any Deploy() ever happens; Deploy() will
 *      re-touch some of these.
 *      Offset hypotheses (verify in D.4):
 *        0x88  ← m_iClip (default 16, also zeroed by Reset)
 *        0xb4  ← m_bSomeFlag (byte, dword-zero-extended)
 *        0xc4  ← m_bSomeFlag (byte, dword-zero-extended)
 *        0xc8  ← m_iFireMode / m_iWeaponState (also written by Deploy)
 *        0x9e4 ← tail-end counter / sub-ammo bookkeeping
 *        0x9e8 ← tail-end counter / sub-ammo bookkeeping
 *   6. CBasePlayerItem::FallInit() — start the standard
 *      "this item is falling to the ground" animation/state.
 *
 * Generated from asm at 0x0007053c (164 B).
 */
export function Spawn(this: any /* TODO: CTSGun */): void {
  // 1. Wipe transient state from any prior life.
  this.Reset();

  // 2. Compute the string-table offset for the classname.
  //    In C: pev->classname = (string_t)(szClassname - pStringBase)
  //    Where pStringBase is fetched from globalvars_t (TS engine
  //    reportedly at +0x98; verify).
  this.pev.classname = MAKE_STRING_FROM_PTR("weapon_tsgun");

  // 3. Dispatch Precache via the table at [this+0x60], index 0x28/4.
  //    TODO: collapse to `this.Precache();` once CTSGun is reconstructed (D.4).
  const __dispatchTable = this[0x60] as { [k: number]: (self: any) => void };
  __dispatchTable[0x28 / 4](this);

  // 4. Set the world model via the engine's pfnSetModel.
  g_engfuncs.pfnSetModel(this.pev, "models/w_glock18.mdl");

  // 5. Mode/state defaults.
  this["0x88"]  = 0x10;   // ← m_iClip?
  this["0xb4"]  = 1;      // ← m_bSomeFlag?
  this["0xc4"]  = 1;      // ← m_bSomeFlag?
  this["0xc8"]  = 0;      // ← m_iFireMode / m_iWeaponState?
  this["0x9e4"] = 0;      // ← tail counter?
  this["0x9e8"] = 0;      // ← tail counter?

  // 6. Standard "falling to the ground" initializer.
  this.FallInit();
}

// STUBS — replaced by the engine-bindings module (g_engfuncs) and the
// reconstructed CTSGun class. Do NOT treat this declaration as
// authoritative for the runtime g_engfuncs shape.
declare const g_engfuncs: {
  pfnSetModel: (pev: any, model: string) => void;
  // ...other engine funcs added in D.5.
};

// TODO(asm-ambiguous): pStringBase accessor. The assembly reads
//  `pStringBase` from `[gpGlobals_double_derefed + 0x98]`. The TS engine
//  may expose it as `gpGlobals.pStringBase` directly, or it may require
//  a runtime helper. Wire this up to whatever the TS engine exposes.
declare function MAKE_STRING_FROM_PTR(sz: string): number;

// ======================================================================
// Reset
// ======================================================================

/**
 * CTSGun::Reset — wipe transient runtime state on the CTSGun entity.
 *
 * Selectively zeroes several member-field ranges plus a handful of
 * standalone dword / byte fields, leaving other regions of the object
 * intact.  Called when the weapon's bookkeeping should be discarded
 * without destroying the entity (e.g. on deploy, mode switch, or
 * idle re-entry).
 *
 * Generated from asm at 0x000705e0 (128 B).
 */
export function Reset(this: { [key: string]: any }): void {
  // Three dword fields at offsets 0xc8 / 0xcc / 0xd0.
  // TODO(asm-ambiguous): likely a cluster of timers / counters sitting just
  //   before the next zeroed region; semantic name comes from class
  //   reconstruction in D.4.
  this["0xc8"] = 0;
  this["0xcc"] = 0;
  this["0xd0"] = 0;

  // 64-byte sub-struct at 0xd4..0x113.
  // TODO(asm-ambiguous): what sub-struct lives here?
  this["0xd4"] = this.zeroMemory?.(0xd4, 0x40) ?? null;

  // 2128-byte sub-struct at 0x114..0x963 — the largest block in this
  // function. Size is consistent with bulk combat / sequence state of the
  // weapon (CCombatAttack, AkimboFire, KatanaFire, KnifeFire, etc.).
  // TODO(asm-ambiguous): what sub-struct lives at 0x114?
  this["0x114"] = this.zeroMemory?.(0x114, 0x850) ?? null;

  // Single-byte flag at 0x97a. The 22-byte gap 0x964..0x979 between the
  // previous block and this byte is preserved.
  // TODO(asm-ambiguous): flag name.
  this["0x97a"] = 0;

  // 56-byte sub-struct at 0x97c..0x9b3.
  // TODO(asm-ambiguous): what sub-struct lives here?
  this["0x97c"] = this.zeroMemory?.(0x97c, 0x38) ?? null;

  // Dword at 0x9b4 (immediately after the previous block).
  // TODO(asm-ambiguous): field name.
  this["0x9b4"] = 0;

  // 38-byte region at 0x9b8..0x9dd. The assembly emits this as two
  // distinct `rep stos` ops (9 dwords + a trailing word); we collapse
  // to a single contiguous zeroing.
  // TODO(asm-ambiguous): the trailing 2-byte field is likely a word
  //   (uint16 / int16 / enum) — confirm when class is reconstructed.
  this["0x9b8"] = this.zeroMemory?.(0x9b8, 0x26) ?? null;

  // Final dword at 0xa08. The 42-byte gap 0x9de..0xa07 is preserved.
  // TODO(asm-ambiguous): field name.
  this["0xa08"] = 0;
}

// ======================================================================
// EmptySound
// ======================================================================

/**
 * CTSGun::EmptySound — Plays the weapon's empty-magazine click and pushes the
 * next primary attack / weapon-idle / reload timers out.
 *
 * Bypassed for m_iWeaponType == 0x24 (a TS no-ammo weapon — likely a melee).
 *
 * @param this  The CTSGun entity instance.
 * @returns     void
 */
export function EmptySound(this: CTSGun): void {
  // Dry-fire has no meaning for some no-ammo weapons.
  // TODO(asm-ambiguous): 0x24 is a tsweapon_t enum value — identify which TS
  // weapon this guards (cross-reference strings-n5.txt + TS source).
  if (this.m_iWeaponType === 0x24) {
    return;
  }

  // Resolve the owning player (this->m_pPlayer at offset 0x80) and chase the
  // inner pointer to get the engine-internal edict ref. The disassembly does:
  //   mov eax, [esi+0x80]      ; eax = this->m_pPlayer
  //   mov edx, [eax]           ; edx = *player  (typically player->pev)
  //   push [edx+0x208]         ; engine-internal edict ref
  // TODO(asm-ambiguous): verify whether *player resolves to player->pev or
  // some other leading member of CBasePlayer.
  const player = this.m_pPlayer;
  const entRef = readField(*player, 0x208);

  // The sample path is the string constant at [GOT+0x1888] — almost certainly
  // "weapons/dryfire.wav".
  const sample = SAMPLE_DRYFIRE; // [GOT+0x1888]

  // Play the dry-fire sound. The disassembly pushes 12 dwords (0x30 cleanup
  // at 71c3c) and tail-calls through [g_engfuncs + 0x1ec]. Right-to-left push
  // order, so the first C arg is the last push:
  //   arg1  = 0x1                              (channel / entity class flags)
  //   arg2  = [edx+0x208]                      (engine-internal edict ref)
  //   arg3  = WORD [this+0x968]                (sound channel / event index)
  //   arg4  = 0
  //   arg5  = sample                           (pushed twice — likely (path, sample))
  //   arg6  = sample
  //   arg7..12 = 0 (defaults: vol, attn, flags, pitch)
  // TODO(asm-ambiguous): 0x1ec is not vanilla pfnEmitSound (which is around
  // slot 30–40 in HLSDK enginefuncs_t). Likely a TS-extended wrapper.
  emitSound12(
    /* entRef   */ entRef,
    /* channel  */ this.m_usSoundEvent,        // WORD @ this+0x968
    /* sample   */ sample,
    /* entClass */ 0x1,
  );

  // Schedule the next primary attack and weapon idle to
  //   UTIL_WeaponTimeBase() + DRYFIRE_IDLE_DELAY
  // where DRYFIRE_IDLE_DELAY is a constant float at [GOT-0x6ecd8].
  // Disassembly: faddp over UTIL_WeaponTimeBase()'s return, then
  //   fst [esi+0xa0]; fstp [esi+0x9c]  (both store the same value).
  const now = UTIL_WeaponTimeBase();
  const dryFireAt = now + DRYFIRE_IDLE_DELAY;
  // TODO(asm-ambiguous): confirm which field is at 0x9c vs 0xa0 — both equal
  // dryFireAt so behavior is unchanged either way.
  this.m_flTimeWeaponIdle    = dryFireAt;     // [esi+0xa0]
  this.m_flNextPrimaryAttack = dryFireAt;     // [esi+0x9c]

  // Schedule the reload timer to
  //   UTIL_WeaponTimeBase() + DRYFIRE_RELOAD_DELAY
  // where DRYFIRE_RELOAD_DELAY is a constant float at [GOT-0x6f010].
  // Disassembly makes a *second* UTIL_WeaponTimeBase() call here (at 71c5e),
  // not a reuse of the first call's return — keep that distinct for fidelity.
  this.m_flReloadTime = UTIL_WeaponTimeBase() + DRYFIRE_RELOAD_DELAY; // [esi+0xa8]
}

// ======================================================================
// GetItemInfo
// ======================================================================

/**
 * CTSGun::GetItemInfo(p ItemInfo) — populate the ItemInfo HUD/pickup struct
 * for this weapon. Returns 1 once the struct is filled out.
 *
 * Disassembly: 130 B at 0x00075dd0. Fills ~10 fields of ItemInfo and assigns
 * m_iId on `this`. The iMaxClip field at +0x18 is the only runtime-computed
 * one — its value depends on an engine singleton + a subobject pointer.
 */
export function GetItemInfo(this: CTSGun, pItemInfo: ItemInfo): number {
  // ----- HUD slot/position -----
  pItemInfo.iSlot     = 1;          // +0x00 — pistol slot
  pItemInfo.iPosition = 2;          // +0x04 — second weapon in slot

  // ----- ammo (no primary/secondary ammo declared) -----
  pItemInfo.iAmmoIndex  = 0;        // +0x08 — no primary ammo
  pItemInfo.iMaxAmmo    = -1;       // +0x0c
  pItemInfo.iAmmo2Index = 0;        // +0x10 — no secondary ammo
  pItemInfo.iMaxAmmo2   = -1;       // +0x14

  // ----- iMaxClip: runtime-computed (asm) -----
  // TODO(asm-ambiguous): the asm loads `*GOT[0x1600]` (a pointer to some
  // engine singleton), reads at byte offset 0x98 of the struct at that
  // address, and adds `*(*this)` (the first int of the struct pointed to
  // by this[0]). Until GOT[0x1600] is resolved against engine globals,
  // the exact value is unknown. Sentinel -1 keeps the placeholder distinct
  // from a valid count of 0; iMaxClip MUST be resolved before this weapon
  // ships.
  pItemInfo.iMaxClip = -1;          // +0x18 — runtime-computed (placeholder)

  // ----- flags + id -----
  pItemInfo.iFlags    = -1;         // +0x1c — no special flags
  pItemInfo.iId       = 0x10;       // +0x20 — TS weapon id 16
  pItemInfo.iReserved = 0;          // +0x24 — TS-specific (verify name)
  pItemInfo.iFlags2   = 1;          // +0x28 — TS-specific (verify name)

  // ----- mirrored on `this` (asm: [esi+0x88]) -----
  // m_iId is set before the iId write in the asm, but order doesn't matter
  // functionally; both writes happen before return.
  this.m_iId = 0x10;                // +0x88 — TS weapon id 16

  return 1;
}

// --- minimal type stubs so this compiles in isolation ---
class CTSGun {
  m_iId: number = 0;
}

interface ItemInfo {
  iSlot: number;
  iPosition: number;
  iAmmoIndex: number;
  iMaxAmmo: number;
  iAmmo2Index: number;
  iMaxAmmo2: number;
  iMaxClip: number;
  iFlags: number;
  iId: number;
  iReserved: number;
  iFlags2: number;
}

// ======================================================================
// PrimaryAttack
// ======================================================================

/**
 * CTSGun::PrimaryAttack — handle a primary attack press.
 *
 * Routes to GrenadeFire / KnifeFire / KatanaFire based on the player's
 * weapon-category byte, then falls through to a fire-mode dispatcher
 * that ultimately calls Fire(). If the gun has no weapon-info attached,
 * the press is treated as a bare-handed melee (CCombatAttack). Several
 * branches gate the shot behind an owner flag or a DoubleFireRate()
 * check; fire-mode 2 arms a burst accumulator without firing on the
 * priming shot.
 *
 * NOTE: CTSGun field offsets and the weapon-info struct layout are being
 * reconstructed separately (D.4). The type names below are placeholders.
 */
export function PrimaryAttack(this: CTSGun): void {
  const weaponInfo: any = this.m_pWeaponInfo; // +0xcc

  // No weapon-info → bare hands.
  if (weaponInfo === null) {
    this.CCombatAttack();
    return;
  }

  // Player's weapon-category byte at +0x348.
  const category: number = this.m_pPlayer.weaponCategory;
  switch (category) {
    case 0x2: // grenade
      weaponInfo.burstResetFlag = 0; // +0x24 cleared before fire
      this.GrenadeFire();
      return;
    case 0x3: // knife
      weaponInfo.burstResetFlag = 0;
      this.KnifeFire();
      return;
    case 0xa: // katana
      // Note: +0x24 is NOT cleared here (assembly skips it).
      this.KatanaFire();
      return;
    case 0xb: // alt knife — only fires when owner flag bit 1 is set
      if ((this.m_pOwner.flag0x814 & 0x1) !== 0) {
        weaponInfo.burstResetFlag = 0;
        this.KnifeFire();
      }
      // else: skip this shot
      return;
  }

  // Fire-mode dispatch for standard firearms.
  const fireMode: number = weaponInfo.fireMode; // +0x02
  switch (fireMode) {
    case 0x1:
    case 0x4: {
      // Fire when owner flag bit 1 is set, or when DoubleFireRate says
      // the player is allowed to fire again (e.g., burst cadence).
      const allow: boolean =
        (this.m_pOwner.flag0x814 & 0x1) !== 0 ||
        DoubleFireRate(this.m_pOwner) !== 0;
      if (allow) this.Fire();
      return;
    }
    case 0x0:
    case 0x5:
      this.Fire();
      return;
    case 0x2: {
      // Burst-arming: prime the accumulator on the first eligible shot,
      // but do NOT fire on the priming shot itself.
      if ((this.m_pOwner.flag0x814 & 0x1) === 0) return;
      if (weaponInfo.accumulator !== 0) return;
      // +0xc8 == 23 → accumulator=2, else → 3 (setne + add 2 pattern).
      weaponInfo.accumulator = this.m_iSomeInt === 23 ? 2 : 3;
      return;
    }
    case 0x3: {
      // Gate by bit 1 at *(*m_pOwner)+0x180. The chain is:
      //   eax = this.m_pOwner;   eax = *eax;   test *(eax+0x180) & 1
      // TODO(asm-ambiguous): the inner pointer's identity (active-item?
      // vtable?) is not visible in this chunk; revisit in D.4.
      const inner: any = this.m_pOwner.innerPointer;
      if ((inner.flag0x180 & 0x1) === 0) return;
      this.Fire();
      return;
    }
    default:
      return;
  }
}

// ======================================================================
// WeaponIdle
// ======================================================================

/**
 * CTSGun::WeaponIdle — per-frame idle behavior for a CTSGun weapon.
 *
 * Branches based on the gun's mode, the player's weapon state,
 * ammo, and the idle timer. See the cross-vendor review for the
 * rationale behind each TODO.
 *
 * NOTE: CTSGun field offsets and the weapon-info struct layout
 * are being reconstructed separately (D.4). The type names below
 * are placeholders consistent with the PrimaryAttack convention.
 */
export function WeaponIdle(this: CTSGun): void {
  // === Branch 1: no weapon info → generic combat idle. ===
  if (this.m_pWeaponInfo === null) {
    this.CCombatIdle();
    return;
  }

  // === Branch 2: sync clip + ammo source from weapon info. ===
  this.m_iClip = this.m_pWeaponInfo.m_iAmmo;

  // The pointer at m_pWeaponInfo+0x28 is set to one of two byte
  // offsets within the player struct (m_pPlayer). The byte at
  // m_pWeaponInfo+0x2c selects which. (0x252 / 0x28c are BYTE
  // OFFSETS into the player struct, not array indices.)
  // TODO(asm-ambiguous): identify the player fields at +0x252 /
  // +0x28c — could be ammo counts, item slots, or anim indices.
  this.m_pWeaponInfo.m_pSomeShortPtr =
    this.m_pWeaponInfo.m_bUseAmmo2 === 0
      ? (this.m_pPlayer + 0x252)
      : (this.m_pPlayer + 0x28c);

  // === Branch 3: per-frame firing animation. ===
  // If the player's weaponCategory byte == 1 and shots remain at
  // m_pWeaponInfo+0x8, dispatch a virtual call via
  // [this.m_pOwnerInterface]+0x188/4 and exit.
  // TODO(asm-ambiguous): identify this->m_pOwnerInterface (vtable?
  // CBasePlayer*?) and the call target.
  if (
    this.m_pPlayer.weaponCategory === 1 &&
    this.m_pWeaponInfo.m_iShotsRemaining !== 0
  ) {
    this.m_pOwnerInterface[0x188 / 4](this);
    return;
  }

  // === Branch 4: burst autofire. ===
  // While m_pWeaponInfo+0x2 == 2 (burst mode) AND the float at
  // this+0x9c is <= the global cvar at [ebx-0x6de68]:
  if (this.m_pWeaponInfo.m_bFireMode === 2) {
    // TODO(asm-ambiguous): identify the cvar at [ebx-0x6de68] —
    //   likely a time threshold (gpGlobals->time? a slowmo cvar?).
    if (this.m_flTimeWeaponIdle <= 0 /* cvar value */) {
      if (this.m_pWeaponInfo.m_iShotsRemaining > 0) {
        this.Fire();
        this.m_pWeaponInfo.m_iShotsRemaining--;
      } else {
        this.m_pWeaponInfo.m_iShotsRemaining = 0;
      }
    }
  }

  // === Branch 5: bail if next-attack time hasn't elapsed. ===
  const currentTime = UTIL_WeaponTimeBase();
  if (currentTime < this.m_flNextPrimaryAttack) {
    return;
  }

  // === Branch 6: grenade state → delegate and exit. ===
  if (this.m_pPlayer.weaponCategory === 2) {
    this.GrenadeIdle(0);
    return;
  }

  // === Branch 7: auto-reload if not infinite-clip and out of ammo. ===
  // Note: offset 0x80 is m_pOwner (per PrimaryAttack convention),
  // not m_pPlayer. Both are CBasePlayer* but offset 0x80 is
  // consistently used with player-method helpers in this class.
  if (
    InfiniteClips(this.m_pOwner) === 0 &&
    this.m_pWeaponInfo.m_iAmmo <= 0
  ) {
    // Same vtable slot as branch 3 (the reload anim vs fire anim
    // dispatch lives in the same vtable entry — the engine    // resolves which to play by inspecting m_pWeaponInfo state).
    this.m_pOwnerInterface[0x188 / 4](this);
    return;
  }

  // === Branch 8: bail if out of ammo (and infinite-clips off). ===
  if (this.m_pWeaponInfo.m_iAmmo === 0) {
    return;
  }

  // === Branch 9: schedule next idle tick + play idle anim. ===
  // this.m_flNextPrimaryAttack = currentTime + cvar at [ebx-0x6e768].
  // TODO(asm-ambiguous): identify the constant — likely a random
  //   jitter or base idle interval.
  this.m_flNextPrimaryAttack = currentTime + 0 /* TODO cvar */;

  // Pick the anim id: m_pWeaponInfo+0x28 is a pointer to a short.
  // When non-null, read the short; otherwise use 0. NOTE this is
  // the SAME field set earlier as m_pSomeShortPtr — the assembly
  // reuses it for anim-id lookup. Either the original reuses the
  // field for two purposes, or one offset is wrong; flag for
  // follow-up in D.4.
  const animId =
    this.m_pWeaponInfo.m_pSomeShortPtr !== null
      ? (this.m_pWeaponInfo.m_pSomeShortPtr as any).short
      : 0;

  // Final virtual call via [this.m_pOwnerInterface]+0x174/4:
  //   arg1 = this
  //   arg2 = animId
  //   arg3 = 0
  //   arg4 = *(this->vtable + 0x114)  ← NOT this.someField[0x114]
  // The vtable pointer is the first 4 bytes of `this` (standard
  // C++ Itanium ABI). Read at byte offset 0x114 in that vtable.
  // TODO(asm-ambiguous): identify the call target and the vtable
  //   entry at +0x114/4.
  const vtable = this[0] as any;
  const arg4 = vtable !== null ? vtable[0x114 / 4] : 0;
  this.m_pOwnerInterface[0x174 / 4](this, animId, 0, arg4);
}
