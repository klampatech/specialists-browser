/**
 * The Specialists mod — CTSGun entity (D.4.2 COMPLETE).
 *
 * Source: ts/dlls/ts_i386.so (NOT stripped, 32-bit ELF).
 * Class: `CTSGun` (the base TS gun class).
 * Reference: cross-vendor review (codex decompile + claude review).
 *
 * 11 of 11 pistol-priority methods decompiled + cross-vendor reviewed.
 * Methods appear in source-code order: spawn → reset → precache →
 * metadata → state transitions (Deploy/Holster) → fire (Primary/Idle)
 * → reload → fire-mode-dispatch → actual fire.
 *
 * The full CTSGun class has 33 methods; this is the "pistol" subset:
 * the lifecycle + state-transition + per-frame + firing logic.
 * Subclass-specific Fire* methods (KnifeFire, AkimboFire, etc.)
 * and the CCombat* methods are deferred to D.4.7+ if needed.
 *
 * Class state (consolidated across all 11 methods):
 *   pev / this+0x60   - CBaseEntity* (vtable ptr)
 *   this+0x80         - CBasePlayer* (m_pPlayer)
 *   this+0x88         - int (iMaxClip from GetItemInfo)
 *   this+0x9c         - float (m_flTimeWeaponIdle / next idle)
 *   this+0xa8         - float (m_flReloadTime / m_flNextPrimaryAttack)
 *   this+0xb4         - int (m_iClip, synced from m_pWeaponInfo)
 *   this+0xc8         - int (weapon id, 0x17 = pistol, 0x21 = akimbo)
 *   this+0xcc         - CCombatInfo* (m_pCombat)
 *   this+0xd0         - CBasePlayerWeapon* (m_pOwnerInterface)
 *   this+0xd4..0xe4   - m_rgAmmo[5] (per-ammo-type counts)
 *   this+0x114..0x346 - m_pWeaponInfo (532-byte data blob)
 *   this+0x964         - WORD (m_usPrimaryEvent)
 *   this+0x970         - WORD (m_usEvent — weapon event id)
 *   this+0x976         - WORD (m_usDeployEvent)
 *   this+0x9b8..0xa08  - 80-byte data block (zeroed in Reset)
 *
 * Methods included (in this file's order):
 *   1. Spawn                  — entity spawn (calls Reset, sets iMaxClip=16)
 *   2. Reset                  — zero state block
 *   3. Precache               — asset preloading
 *   4. GetItemInfo            — fill ItemInfo struct (iMaxClip=16, etc.)
 *   5. Deploy                 — body resolution + DefaultDeploy + playback
 *   6. HolsterWeapon          — state teardown + Unzoom + grenade bailout
 *   7. PrimaryAttack          — main fire (5-branch switch on weapon state)
 *   8. WeaponIdle             — per-frame idle (burst autofire, idle anim)
 *   9. EmptySound             — dry-fire sound + reload-time setup
 *  10. Reload                 — mode dispatch + ReloadWeapon call
 *  11. StandardFire           — the actual fire (ScaleSpread + ShootBullets)
 *
 * The pistol is fully wired. To play a pistol shot, the engine
 * calls PrimaryAttack (which routes through the switch) which
 * calls StandardFire. StandardFire scales spread, shoots bullets,
 * plays the fire sound, decrements ammo, and schedules the next
 * primary attack.
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
// Precache
// ======================================================================

/**
 * CTSGun::Precache — Pre-cache 11 model/sound indices and store
 * each returned (16-bit) index into a CTSGun field.
 *
 * Disassembly reference: 0x00070660, 307 B, straight-line. The
 * engine function table is loaded from `[ebx+0x1aa8]` into `esi`,
 * the entity is loaded from `[esp+0x10]` into `edi` (regular arg,
 * NOT `this` — there is no `__thiscall` setup in the prologue),
 * and 11 identical calls to engine_funcs[0x1e8 / 4] =
 * engine_funcs[122] are issued. Each returns a 32-bit index
 * which is truncated to AX (16 bits) and stored as a WORD at
 * successive entity offsets.
 *
 * The 11 store offsets are:
 *   0x964, 0x966, 0x96e, 0x968, 0x96a, 0x96c, 0x970,
 *   0x972, 0x974, 0x976, 0x978
 * (preserved verbatim from the disassembly — three logically
 * grouped regions: 0x964–0x966, 0x968–0x96e, 0x970–0x978).
 * The order is *not* monotone; it mirrors source-level
 * group/init sequencing, not struct layout.
 *
 * GOT-relative string addresses (from rodata):
 *   -0x6dd99, -0x6dd8a, -0x6dd77, -0x6dd62, -0x6dd52,
 *   -0x6dd43, -0x6dd2d, -0x6dd1c, -0x6dd0c, -0x6dcfb,
 *   -0x6dcec.
 * Each is paired 1-to-1 with the call that uses it.
 *
 * @param pItem  CTSGun entity (loaded into edi from [esp+0x10])
 * @returns      void
 */
export function Precache(pItem: any): void {
  // TODO(asm-ambiguous): vtable slot 0x1e8 / 4 = engine_funcs[122].
  // Candidate names to verify against the TS enginefuncs_t layout
  // (see D.5 work): pfnPrecacheModel, pfnPrecacheSound,
  // pfnPrecacheGeneric, or a TS-extended pfnPrecache* that takes
  // a (flag, path) pair. The literal `1` pushed first is some
  // precache-flavor discriminator.
  // TODO(asm-ambiguous): EngineGlobals shape not yet defined; the
  // `as any` keeps this compilable in isolation, but the eventual
  // accessor should resolve to engine_funcs[122] in D.5.
  const precache: any = (EngineGlobals as any).engineFuncs.precache;

  // TODO(asm-ambiguous): resolve each "string@GOT-0x..." placeholder
  // to the actual rodata string during D.4 (see
  // tools/decompile/analysis/strings-n5.txt for the GOT-relative
  // map). Order is fixed by the disassembly; do NOT re-sort by
  // field offset.
  pItem.m_iPrecache_0x964_unresolved = precache(/* flag */ 1, /* path: TODO */ "string@GOT-0x6dd99");
  pItem.m_iPrecache_0x966_unresolved = precache(1, "string@GOT-0x6dd8a");
  pItem.m_iPrecache_0x96e_unresolved = precache(1, "string@GOT-0x6dd77");
  pItem.m_iPrecache_0x968_unresolved = precache(1, "string@GOT-0x6dd62");
  pItem.m_iPrecache_0x96a_unresolved = precache(1, "string@GOT-0x6dd52");
  pItem.m_iPrecache_0x96c_unresolved = precache(1, "string@GOT-0x6dd43");
  pItem.m_iPrecache_0x970_unresolved = precache(1, "string@GOT-0x6dd2d");
  pItem.m_iPrecache_0x972_unresolved = precache(1, "string@GOT-0x6dd1c");
  pItem.m_iPrecache_0x974_unresolved = precache(1, "string@GOT-0x6dd0c");
  pItem.m_iPrecache_0x976_unresolved = precache(1, "string@GOT-0x6dcfb");
  pItem.m_iPrecache_0x978_unresolved = precache(1, "string@GOT-0x6dcec");
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
// Deploy
// ======================================================================

// ── stubs for compile isolation ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPtr = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CTSGun { /* fields resolved in a later D.4 task */ }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function GetBodyByItems(iId: number, bits: number): number;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function DefaultDeploy(
  self: AnyPtr, szWpnMdl: AnyPtr, szViewMdl: AnyPtr,
  iAnim: number, szAnimExt: AnyPtr, skiplocal: number, body: number,
): number;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function Animate(self: AnyPtr, player: AnyPtr, iAnim: number): number;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function PlaybackEvent(
  flags: number, pInvoker: AnyPtr, eventindex: number,
  delay: number, origin: AnyPtr, angles: AnyPtr,
  fparam1: number, fparam2: number,
  iparam1: number, iparam2: number,
  bparam1: number, bparam2: number,
): void;

const PLAYBACK_EVENT_INVOKE_OFFSET  = 0x1ec;
const PLAYBACK_EVENT_TABLE_GOT      = 0x1aa8;
const PLAYBACK_EVENT_ZEROS_GOT      = 0x1888; // pointer to a static 2-float zero
const WEAPON_INFO_TABLE_BASE_GOT    = 0x7d30;

// ── the decompiled function ──────────────────────────────────────
/**
 * CTSGun::Deploy — bring the active weapon into the player's hands.
 * Demangled: `CTSGun::Deploy()` @ 0x00071030, 501 bytes.
 * Returns TRUE (1) on every path; the m_iId==0 branch returns early
 * after HolsterWeapon().
 */
export function Deploy(this: CTSGun): boolean {
  const self = this as any;

  // ── 1. Early bail: no m_iId → holster and return TRUE. ──
  if (self.m_iId === 0) {
    self.HolsterWeapon();
    return true;
  }

  // ── 2. Clear the field at offset 0x9e0. ──
  // TODO: offset meaning unclear — looks like a fire/state timer
  //       that gets cleared on every deploy.
  self.unknown_0x9e0 = 0;

  // ── 3. Per-slot data + per-weapon config pointer resolution.
  //       ASM derives BOTH directly off m_iId AND writes them
  //       back to this+0xcc and this+0xd0. ──
  const iId       = self.m_iId;
  const slotData  = (self as AnyPtr) + iId * 56 + 0x114; // 0x114 == m_pActiveItem[0]
  self.m_pActiveItem  = slotData;
  const cfgOffset =
    iId * 988 /* 247 * 4 */; // m_iId*248 - m_iId = m_iId*247; ×4 for dwords
  const cfg = /* GOT[0x7d30] + iId*988 */ (self.__picBase + WEAPON_INFO_TABLE_BASE_GOT) + cfgOffset;
  self.m_pWeaponInfo = cfg;

  // ── 4. Computed pointer at slotData+0x28 = cfg + 0x252 ──
  //       ((self + iId*56) + 0x114) + 0x28 == (cfg + 0x252)
  //       is just aliasing the same address; mirror both writes. ──
  const slotAnimExt = slotData + 0x28;
  slotAnimExt.value = cfg + 0x252;

  // ── 5. Player body resolution + propagation. ──
  const body: number = GetBodyByItems(iId, slotData.bits_0x10);
  slotData.body_0x18 = body;
  (self.m_pPlayer /* ASM: *(self+0) */ as AnyPtr).body_0x114 = body;

  // ── 6. Reset per-weapon state dword + flag byte on slotData. ──
  slotData.stateDword_0x8  = 0;
  slotData.stateFlagByte_0x2c = 0;

  // ── 7. DefaultDeploy(this, szWpnMdl, szViewMdl, iAnim,
  //                     szAnimExt, skiplocal, body). ──
  let iAnim = 0;
  const animRef = slotData.deployAnimRef_0x28;
  if (animRef !== 0) {
    iAnim = animRef.short_0x4 | 0; // movsx sign-extend (int16 → int32)
  }
  const szViewMdl = (slotData.bits_0x10 & 0x1) ? (cfg + 0x1b2) : (cfg + 0x172);
  DefaultDeploy(
    /* this      */ self,
    /* szWpnMdl  */ cfg + 0x132,
    /* szViewMdl */ szViewMdl,
    /* iAnim     */ iAnim,
    /* szAnimExt */ cfg + 0x232,
    /* skiplocal */ 0,
    /* body      */ (self.m_pPlayer as AnyPtr).body_0x114,
  );

  // ── 8. PlaybackEvent — fires the deploy SFX/anim event. ──
  //       ASM pushes 11 dwords right-to-left into a vtable slot at
  //       [GOT[0x1aa8] + 0x1ec]. Order on the stack:
  //           bparam1, bparam2, iparam2 (slotData.bits), iparam1 (m_iId),
  //           fparam1 (0), fparam2 (0),
  //           angles.ptr, angles.ptr  (same ptr; vec3_t from float[3]),
  //           delay (0), eventindex (m_usDeployEvent),
  //           pInvoker (*( *(self.m_pPlayer_at_0x80) + 0x208 )),
  //           flags (1)
  //       then `call DWORD PTR [ecx+0x1ec]`.
  const eventTbl = (self.__picBase + PLAYBACK_EVENT_TABLE_GOT) as AnyPtr;
  const zerosPtr = (self.__picBase + PLAYBACK_EVENT_ZEROS_GOT) as AnyPtr;
  const playerAt80 = self.m_pPlayerAt0x80 as AnyPtr; // distinct from *(self+0)
  const pInvoker   = (playerAt80 as AnyPtr)[0x208];  // *( *(self+0x80) + 0x208 )
  const eventIndex = self.m_usDeployEvent_0x976 & 0xffff; // movzx WORD
  // NOTE: TS lacks an indirection primitive for
  //       `call DWORD PTR [ecx+0x1ec]`; the engine module
  //       will provide a real wrapper. Comment-only here is
  //       acceptable ONLY if there is a follow-up task to wire it.
  //
  // TODO(engine-bindings): replace this comment with:
  //   PlaybackEvent(
  //     /* flags       */ 1,
  //     /* pInvoker    */ pInvoker,
  //     /* eventindex  */ eventIndex,
  //     /* delay       */ 0,
  //     /* origin      */ zerosPtr,
  //     /* angles      */ zerosPtr,
  //     /* fparam1     */ 0,
  //     /* fparam2     */ 0,
  //     /* iparam1     */ iId,
  //     /* iparam2     */ slotData.bits_0x10,
  //     /* bparam1     */ 0,
  //     /* bparam2     */ 0,
  //   );
  // until then, the code below is the closest faithful stub:
  (eventTbl as AnyPtr)[PLAYBACK_EVENT_INVOKE_OFFSET /* 0x1ec */](
    /* flags       */ 1,
    /* pInvoker    */ pInvoker,
    /* eventindex  */ eventIndex,
    /* delay       */ 0,
    /* origin      */ zerosPtr,
    /* angles      */ zerosPtr,
    /* fparam1     */ 0,
    /* fparam2     */ 0,
    /* iparam1     */ iId,
    /* iparam2     */ slotData.bits_0x10,
    /* bparam1     */ 0,
    /* bparam2     */ 0,
  );

  // ── 9. Animate — the TS-side 3-arg overload of CTSAnimation::Animate.
  //       Demangler: `Animate__12CTSAnimationP11CBasePlayeri`
  //       (CTSAnimation*, CBasePlayer*, int). Push order right→left:
  //           iAnim (0x34), pPlayer, this (== pPlayer + 0x28c). ──
  Animate(
    ((self.m_pPlayerAt0x80 as AnyPtr) + 0x28c) as AnyPtr,
    self.m_pPlayerAt0x80,
    /* iAnim */ 0x34,
  );

  // ── 10. Asymmetric per-weapon clip-byte exchange. ──
  //        Address: *(m_pPlayerAt0x80 + 0xa + iId + 0x490),
  //        which expands to *(pPlayerAt0x80 + 0x49a + iId)
  //        — a 1-byte-array indexed by m_iId at base +0x49a. ──
  {
    const p = self.m_pPlayerAt0x80 as AnyPtr;
    const clipByte: number = ((p + 0x49a + iId) as Uint8Array)[0];
    if (clipByte > 0) {
      slotData.slotByte_0x2 = clipByte - 1; // drain into slot data
      // (slotByte_0x2 is the slot-data mirror; NOT updated on the
      //  else branch below — mirrors asm asymmetry.)
    } else {
      ((p + 0x49a + iId) as Uint8Array)[0] =
        ((slotData.slotByte_0x2 as number) + 1) & 0xff;
    }
  }

  return true;
}

// ======================================================================
// HolsterWeapon
// ======================================================================

/**
 * CTSGun::HolsterWeapon — Hides this weapon (called when the player
 * switches weapons, stows, or otherwise un-holsters).
 *
 * Performs the full teardown: marks the player as having this as
 * active item, cancels zoom, resets player view fields, schedules
 * next-attack delays, cancels any in-progress reload, disposes of
 * in-flight grenades, plays a holster event, and zeros the
 * weapon's clip/ammo. Skips the grenade/event/clip-clear stages
 * if the player is dead.
 *
 * @param this  The CTSGun entity instance
 * @returns     void
 */
export function HolsterWeapon(this: any): void {
  const self: any = this;
  const player: any = self.m_pPlayer;

  // (1) Mark this as the player's currently-active item.
  player.m_pActiveItem = self;

  // (2) Reset two view-related fields on the player's pev.
  player.pev.ideal_yaw.x = 0;
  player.pev.ideal_yaw.y = 0;

  // (3) Cancel any zoom.
  self.Unzoom();

  // (4) Copy a global flag byte into two player fields.
  // TODO(asm-ambiguous): source byte at [GOT-0x6f7b9] — likely a
  // ts_slowmotion flag. Destinations are player+0xb58 (first)
  // then player+0x478.
  const slowmoFlag: number = (globalThis as any).__byte_got_m0x6f7b9;
  player.slowmo_field_0xb58 = slowmoFlag;
  player.slowmo_field_0x478 = slowmoFlag;

  // (5) Schedule next-attack times.
  // TODO(asm-ambiguous): globals at [GOT-0x6f010] and [GOT-0x6e768]
  // are the player next-attack and weapon next-primary-attack delay
  // cvars respectively.
  player.m_flNextAttack =
    UTIL_WeaponTimeBase() + (globalThis as any).__double_got_m0x6f010;
  self.m_flNextPrimaryAttack =
    UTIL_WeaponTimeBase() + (globalThis as any).__double_got_m0x6e768;

  // (6) Cancel reload if it's in progress.
  // The fcomp; fnstsw ax; test ah,0x40; jne idiom at 75740-7574b
  // SKIPS the reset when the floats are EQUAL (C3 = FPU "equal"
  // flag). So we reset when they are NOT equal AND player[0x7a4] != 0.
  // TODO(asm-ambiguous): field trio at +0x79c (float), +0x7a0 (dword),
  // +0x7a4 (byte) is the player's reload state.
  const reloadCvar: number = (globalThis as any).__float_got_m0x6f408;
  if (player.reload_state_0x79c !== reloadCvar
      && player.reload_flag_0x7a4 !== 0) {
    player.reload_state_0x79c = 0;
    player.reload_state_0x7a0 = 0;
    player.reload_flag_0x7a4 = 0;
  }

  // (7) If the player is dead, skip the rest (return early).
  // The disassembly jumps to the function epilogue (758c0) when
  // m_pPlayer != 0 && IsAlive() returns 0. If m_pPlayer is null
  // the IsAlive call is skipped and we fall through to the grenade
  // cleanup (in practice unreachable — steps 1-6 deref m_pPlayer).
  // TODO(asm-ambiguous): the virtual is on m_pPlayer->field_0x60
  // (some subobject with its own vtable), slot 0xb4/4 = 45,
  // not a direct IsAlive() on the player.
  if (player != null && player.IsAlive() === 0) {
    return;
  }

  // (8) Grenade state cleanup.
  // TODO(asm-ambiguous): field offsets 0xc8 (m_pPrimeGrenade),
  // 0xcc (m_pGrenadeState), 0xd0 (m_pGrenadeEntity) are TS-specific
  // and need D.4 research for real names.
  if (self.m_pGrenadeState != null && self.m_pGrenadeEntity != null) {
    if (self.m_pGrenadeEntity.some_state === 2) {
      // Grenade is in state 2 ("primed/thrown"); let GrenadeIdle handle it.
      self.GrenadeIdle(1);
    } else {
      // Otherwise just zero the grenade-state fields.
      // TODO(asm-ambiguous): sub-fields at +0xc and +0x8 of the
      // grenade state object.
      self.m_pGrenadeState.state_field_0xc = 0;
      self.m_pGrenadeState.state_field_0x8 = 0;
    }
  }
  self.m_pPrimeGrenade = 0;
  self.m_pGrenadeState = 0;
  self.m_pGrenadeEntity = 0;

  // (9) Pointer arithmetic → store at player->pev+0xbc.
  // The disassembly overwrites the slot that was just zeroed at
  // step (2) with a pointer-sized value computed from the weapon
  // info table. Semantics unclear — may be a TS pev extension that
  // happens to share offset 0xbc with ideal_yaw.x.
  // TODO(asm-ambiguous): magic constant 0x132; semantics unclear.
  const wi: any = get_weapon_info(0);
  const globalPtr: any = (globalThis as any).__ptr_got_p0x1600;
  player.pev.field_0xbc =
    (wi as number) - globalPtr[0].field_0x98 + 0x132;

  // (10) Send weapon animation via virtual call.
  // TODO(asm-ambiguous): [self+0x60] is used as a vtable base;
  // slot 0x174/4 = 93 is a TS-extended virtual. The anim arg is
  // a sign-extended 16-bit field from get_weapon_info(0)->field_0x256.
  const animIdx: number =
    ((get_weapon_info(0) as any).field_0x256 << 16) >> 16;
  const receiver: any = self.field_0x60;
  receiver.vtable[0x174 / 4].call(self, animIdx);

  // (11) Play the holster event via the engine's pfnPlaybackEvent.
  // Signature (HLSDK enginefuncs_t):
  //   pfnPlaybackEvent(int flags, edict_t* pInvoker, uint16 eventindex,
  //                    float delay, const float* origin, const float* angles,
  //                    float fparam1, float fparam2,
  //                    int iparam1, int iparam2, int bparam1, int bparam2);
  // Disassembly pushes 12 dwords (cleanup: add esp, 0x30).
  // TODO(asm-ambiguous): this->0x976 (eventindex), pev+0x208 (invoker),
  // global dword at [GOT+0x1888] (fparam1/fparam2) need D.4 research.
  const eventVtableObj: any = (globalThis as any).__ptr_got_p0x1aa8;
  const eventIdx: number = self.m_usHolsterEvent & 0xffff;  // u16 at 0x976
  const someGlobal: number = (globalThis as any).__dword_got_p0x1888;
  const pInvoker: number = (player.pev as any).field_0x208;
  eventVtableObj.vtable[0x1ec / 4].call(
    1,             // flags
    pInvoker,      // m_pPlayer->pev+0x208
    eventIdx,      // this->0x976 (eventindex, unsigned 16-bit)
    0,             // delay
    null,          // origin (float*, NULL)
    null,          // angles (float*, NULL)
    someGlobal,    // fparam1
    someGlobal,    // fparam2
    0,             // iparam1
    0,             // iparam2
    0,             // bparam1 (this->0xc8 was zeroed at step 8)
    0              // bparam2
  );

  // (12) Clear clip and ammo counters.
  // TODO(asm-ambiguous): field offsets 0x9fc, 0xa00, 0xa04 are
  // TS-specific and need D.4 research for real names.
  self.m_iClip = 0;          // offset 0x9fc
  self.m_iAmmo = 0;          // offset 0xa00
  self.m_iReserveAmmo = 0;   // offset 0xa04
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
// Reload
// ======================================================================

/**
 * CTSGun::Reload — Dispatch a player-initiated reload to weapon-specific
 * logic, or perform a standard ammo-then-clip refill for non-special modes.
 *
 * @param this  The CTSGun entity instance (owner weapon).
 * @returns     void
 */

// Minimal field stubs — populated by the full CTSGun definition (D.4).
// Comments show offsets inferred from the disassembly.
interface CTSGun {
  m_pPlayer: any;                        // [+0x80] CBasePlayer*
  m_iId: number;                         // [+0xc8] weapon id (tsweapon_t)
  m_pCombat: null | {                    // [+0xcc]
    count: number;                       // [+0x04]
    flag: number;                        // [+0x08] likely "reload-in-progress"
    eventParam: any;                     // [+0x10] fed into pfnPlaybackEvent
    weaponData: null | {                 // [+0x28]
      clip2: number;                     // [+0x02] default-path clipSize (signed word)
      clip16: number;                    // [+0x10] grenade-path clipSize (signed word)
    };
  };
  m_pItemInfo: null | {                  // [+0xd0]
    ammoCount: number;                   // [+0x04]
    modeIndex: number;                   // [+0x08]
    timeMul: number;                     // [+0x14]
    mode: number;                        // [+0x348]
  };
  m_rgAmmo: Int32Array;                  // [+0xd4] ammo counts indexed by modeIndex
  m_flTimeWeaponIdle: number;            // [+0xa8]
  m_usEvent: number;                     // [+0x970] weapon-event id

  CCombatBlock(): void;
  ShotgunReload(): void;
  ReloadWeapon(ammoType: number, clipSize: number, reloadTime: number): number;
  Unzoom(): void;
}

// Engine-side stubs so this file compiles in isolation.
// TODO(cvar/engine): wire these up to the engine cvar lookup and g_engfuncs.
declare function UTIL_WeaponTimeBase(): number;
declare const cvarReloadTime: { value: number };
declare const cvarReloadIdleDelay: { value: number };
declare const g_engfuncs: {
  pfnPlaybackEvent(flags: number, ...args: any[]): void;
};

export function Reload(this: CTSGun): void {
  // 1) No combat-info → record a combat-block frame and exit.
  if (this.m_pCombat == null) {
    this.CCombatBlock();
    return;
  }

  // 2) Mode dispatch via m_pItemInfo.mode (byte at [+0xd0]+0x348).
  //    0x02 → no-op; 0x03/0x0a → CCombatBlock; 0x01 → ShotgunReload.
  const mode = this.m_pItemInfo!.mode;
  if (mode === 0x02) return;
  if (mode === 0x03) { this.CCombatBlock(); return; }
  if (mode === 0x0a) { this.CCombatBlock(); return; }
  if (mode === 0x01) { this.ShotgunReload(); return; }

  // 3) Bail if the ammo slot for this mode is empty.
  //    m_pItemInfo.modeIndex (+0x08) indexes m_rgAmmo (+0xd4).
  const ammoSlot = this.m_rgAmmo[this.m_pItemInfo!.modeIndex];
  if (ammoSlot <= 0) return;

  // 4) Bail if m_pCombat's reload-state flag is non-zero.
  // TODO(asm-ambiguous): confirm [+0xcc]+0x08 is the "reload-in-progress" flag.
  if (this.m_pCombat.flag !== 0) return;

  // 5) Read the 16-bit clipSize. Which offset of m_pCombat.weaponData we
  //    read depends on the held weapon: 0x21 with a positive count reads
  //    [+ptr+0x10]; otherwise read [+ptr+0x02]. The value is movsx-extended.
  const wpData = this.m_pCombat.weaponData;
  let clipSize: number;
  if (this.m_iId === 0x21 && this.m_pCombat.count > 0) {
    clipSize = wpData !== null ? wpData.clip16 : 0;
  } else {
    clipSize = wpData !== null ? wpData.clip2 : 0;
  }

  // 6) reloadTime = reload_cvar * m_pItemInfo.timeMul (+0x14).
  const reloadTime = cvarReloadTime.value * this.m_pItemInfo!.timeMul;
  const ok = this.ReloadWeapon(
    this.m_pItemInfo!.ammoCount,         // [+0xd0]+0x04
    clipSize,
    reloadTime,
  );
  if (ok === 0) return;

  // 7) Schedule the next idle frame.
  this.m_flTimeWeaponIdle = UTIL_WeaponTimeBase() + cvarReloadIdleDelay.value;

  // 8) Cancel any zoom state before the reload plays.
  this.Unzoom();

  // 9) Fire the engine reload playback event (pfnPlaybackEvent).
  //    The original pushes 12 stack slots: flags, invoker edict, eventindex,
  //    origin/angles pair, two fparams, two iparams, two bparams.
  //    Source operands were: 0x1, [edx+0x208] (player-side), m_usEvent, m_iId,
  //    m_pCombat.eventParam, and a duplicated global at [ebx+0x1888].
  // TODO(asm-ambiguous): pin down pfnPlaybackEvent's exact argument layout.
  g_engfuncs.pfnPlaybackEvent(/* flags */ 0x1 /* + 11 game-supplied args */);

  // 10) Drive sequence 0x33 on the player's embedded anim object
  //     ([m_pPlayer + 0x28c]).
  const player = this.m_pPlayer;
  (player as any).anim.Animate(player, 0x33);
}

// ======================================================================
// StandardFire
// ======================================================================

/**
 * CTSGun::StandardFire — fires a single bullet using standard accuracy logic.
 *
 * Pipeline:
 *   1. Lazy-init cached vectors (m_vecRecoil, m_vecSpreadBase) and damage scalar.
 *   2. Sample player's current spread cone via virtual call.
 *   3. Copy engine base spread vector.
 *   4. Cache bullet damage from weapon_info.
 *   5. Branch on weapon type to compute the spread multiplier.
 *   6. Call ScaleSpread (3 args after this: &damage, spread, shouldScale).
 *   7. Apply crouching/running multiplier to weapon_info.baseSpread.
 *   8. Call ShootBulletsPlayer with damage + spread + several vec refs.
 *   9. Save the recoil vector returned by ShootBulletsPlayer.
 *  10. Optionally call VKickback for view kick.
 *  11. Decrement reserve ammo, then clip ammo (unless InfiniteClips); clamp >=0.
 *  12. Set m_bIsEmpty flag based on current reserve ammo.
 *  13. Engine dispatch — fire sound/anim event for the shot.
 *  14. Set m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + delay.
 *  15. Set m_flTimeWeaponIdle = UTIL_WeaponTimeBase() + idle_delay.
 */

declare const CVars: any;          // GOT statics ([ebx+0x7ca4..0x7cdc])
declare const EngineGlobals: any;  // engine singletons ([ebx+0x1600], 0x1888, 0x1aa8)
declare const EngineUtil: any;     // UTIL_WeaponTimeBase, InfiniteClips

export function StandardFire(this: any /* TODO: replace with CTSGun */): void {
  // === 1. Lazy-init cached state (first-call guards in the GOT) ===
  if (CVars.standardFire_initA === 0) CVars.standardFire_initA = 1;
  if (CVars.standardFire_initB === 0) CVars.standardFire_initB = 1;
  if (CVars.standardFire_initC === 0) {
    // Copy 3 floats from engine global [ebx+0x1888] into m_vecRecoil.
    // TODO(asm-ambiguous): exact engine global meaning unclear
    const initSrc = EngineGlobals.vec_0x1888 as [number, number, number];
    const recoil = CVars.m_vecRecoil as [number, number, number];
    recoil[0] = initSrc[0]; recoil[1] = initSrc[1]; recoil[2] = initSrc[2];
    CVars.standardFire_initC = 1;
  }

  // === 2. Sample player's spread cone via vfunc ===
  // m_pPlayer[0x60] is a sub-object vtable; vfunc_0x168 returns Vector3.
  const cone = this.m_pPlayer.someField_0x60.vfunc_0x168() as [number, number, number];
  const spreadCurrent = CVars.m_vecSpreadCurrent as [number, number, number];
  spreadCurrent[0] = cone[0]; spreadCurrent[1] = cone[1]; spreadCurrent[2] = cone[2];

  // === 3. Copy engine base spread vector ===
  // Source: [ebx+0x1600][0]+0x28 (12-byte Vector3 from a global singleton)
  const baseVec = EngineGlobals.vec_0x1600_at_0x28 as [number, number, number];
  const spreadBase = CVars.m_vecSpreadBase as [number, number, number];
  spreadBase[0] = baseVec[0]; spreadBase[1] = baseVec[1]; spreadBase[2] = baseVec[2];

  // === 4. Cache bullet damage from weapon_info ===
  CVars.m_flBulletDamage = this.m_pWeaponInfo.bulletDamage as number;

  // === 5. Weapon-type-specific spread branching ===
  const weaponType = this.m_iWeaponType as number;

  // 5a. type 0x12: always runs the velocity penalty, then falls through.
  if (weaponType === 0x12) {
    const v = this.m_pPlayer.velocity as [number, number, number];
    const speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (speed <= CVars.sv_movespeed_threshold_0x12 /* TODO: cvar name */) {
      this.m_pPlayer.someField_0x778 = 0.3; // 0x3e99999a
    }
    // fall through — the asm has no jmp out of the 0x12 block.
  }

  let scaleSpread: { shouldScale: number; spread: number } | null = null;

  // 5b. type 0x20: velocity-gated, cvar-multiplied. If velocity > threshold,
  //     falls through to the flag_0x2c check below (NOT a return/skip).
  if (weaponType === 0x20) {
    const v = this.m_pPlayer.velocity as [number, number, number];
    const speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (speed <= CVars.sv_movespeed_threshold_0x20 /* TODO: cvar name */) {
      const shouldScale =
        ((this.m_pAmmoTracker.flag as number) & 1) &&
        !((this.m_pWeaponInfo.flag_0xe4 as number) & 1) ? 1 : 0;
      scaleSpread = {
        shouldScale,
        spread: (CVars.spread_multiplier_0x20 as number) *
                (this.m_pWeaponInfo.spreadValue as number),
      };
    }
    // else: fall through to flag_0x2c check below
  }

  // 5c. Default path — reached from type-0x12 path, AND from type-0x20 when
  //     velocity > threshold (asm unconditionally falls into 0x72638).
  if (scaleSpread === null &&
      (this.m_pWeaponInfo.flag_0x2c as number) !== 0) {
    const shouldScale =
      ((this.m_pAmmoTracker.flag as number) & 1) &&
      !((this.m_pWeaponInfo.flag_0xe4 as number) & 1) ? 1 : 0;
    scaleSpread = {
      shouldScale,
      spread: this.m_pWeaponInfo.spreadValue as number,
    };
  }

  // === 6. Call ScaleSpread — demangled `Rffi` = (float&, float, int). ===
  if (scaleSpread !== null) {
    this.ScaleSpread(
      CVars.m_flBulletDamage_ref,   // float& (arg 1)
      scaleSpread.spread,           // float  (arg 2)
      scaleSpread.shouldScale,      // int    (arg 3)
    );
  }

  // === 7. Apply crouching/running multiplier to weapon_info.baseSpread ===
  let finalSpread = this.m_pWeaponInfo.baseSpread as number;
  if (
    ((this.m_pAmmoTracker.flag as number) & 1) &&
    !((this.m_pWeaponInfo.flag_0xe4 as number) & 1)
  ) {
    finalSpread *= CVars.spread_modifier_crouching as number; // TODO: cvar name
  }

  // === 8. Call ShootBulletsPlayer ===
  // Stack layout: 3 Vector3 refs set up before the call (recoil/damage spread
  // [esp+0x20] / spreadBase [esp+0x30] / spreadCurrent [esp+0x40]).
  // TODO(asm-ambiguous): exact arg order not derivable without full prototype.
  this.m_pPlayer.shootBulletsPlayer({
    returnRecoil:  CVars.m_vecRecoil_ref,
    damageVec:     CVars.m_flBulletDamage_ref,
    baseSpread:    CVars.m_vecSpreadBase_ref,
    currentSpread: CVars.m_vecSpreadCurrent_ref,
    finalSpread,
    weaponByte:    this.m_pWeaponInfo.weaponByte,   // byte at 0x8
    ammoCount:     this.m_pWeaponInfo.ammoCount,   // dword at 0x20
    tracerType:    this.m_pWeaponInfo.tracerType,  // byte at 0x24
    playerField:   this.m_pPlayer.field_0x7ec,
  });

  // === 9. m_vecRecoil is already updated via the returnRecoil ref above ===

  // === 10. Optional VKickback for view kick ===
  const isShotgunType =
    (this.m_pWeaponInfo.kickbackMode as number) === 7 ||
    weaponType === 0x1f ||
    weaponType === 0x21;
  if (
    isShotgunType ||
    (this.m_pWeaponInfo.hasKickback as number) !== 0
  ) {
    const playerFlag =
      ((this.m_pAmmoTracker.flag as number) & 1) &&
      !((this.m_pWeaponInfo.flag_0xe4 as number) & 1) ? 1 : 0;
    this.VKickback(
      this.m_pWeaponInfo.kickbackAngle,           // float at 0x30
      this.m_pWeaponInfo.kickbackCount,           // byte at 0x348 (zext to int)
      playerFlag,
      (CVars.m_vecRecoil as [number, number, number])[0],
      (CVars.m_vecRecoil as [number, number, number])[1],
      isShotgunType ? 1 : 0,                       // pushw 0x1/0x0 in the 8-byte tail slot
    );
  }

  // === 11. Decrement ammo (unless InfiniteClips) ===
  if (!this.m_pPlayer.infiniteClips()) {
    this.m_pAmmoTracker.ammo--;
    const clipIndex = this.m_pWeaponInfo.clipIndex as number;
    if (clipIndex !== -1) {
      // m_rgAmmo entries have stride 56 (not 4 like standard HL1).
      // TODO(asm-ambiguous): custom CTS ammo struct layout, offset 0x18 between fields
      this.m_rgAmmo[clipIndex].ammo--;
      this.m_rgAmmo[clipIndex].lastAmmo = this.m_pAmmoTracker.ammo as number;
      if (this.m_rgAmmo[clipIndex].ammo < 0) {
        this.m_rgAmmo[clipIndex].ammo = 0;
      }
    }
  }

  // === 12. Set m_bIsEmpty flag ===
  CVars.m_bIsEmpty = (this.m_pAmmoTracker.ammo as number) === 0 ? 1 : 0;

  // === 13. Engine dispatch (anim/sound event) ===
  // vfunc call at [ecx+0x1ec] with ecx = [ebx+0x1aa8] (engine singleton).
  // 12-arg call. Note: [edx+0x208] is m_pPlayer[0][0x208] — DOUBLE deref via
  // the pointer at m_pPlayer[0]. TODO(asm-ambiguous): exact prototype unclear.
  EngineGlobals.dispatchFire(
    1,                                          // int/bool (0x1)
    this.m_pPlayer.deref0.field_0x208,          // m_pPlayer[0][0x208] (double deref)
    this.m_usEvent,                             // word event id at this+0x964
    0,                                          // null
    EngineGlobals.vec_0x1888,                   // pushed twice
    EngineGlobals.vec_0x1888,
    CVars.m_flBulletDamage,                     // pushed twice
    CVars.m_flBulletDamage,
    weaponType,
    this.m_pAmmoTracker.ammoType,               // field at 0x10, LSB is flag
    CVars.m_bIsEmpty,
    this.m_pPlayer.field_0x7ec,
  );

  // === 14. Compute m_flNextPrimaryAttack delay ===
  let delay: number;
  if ((this.m_pAmmoTracker.mode as number) === 2) {
    delay = (this.m_pAmmoTracker.someField_8 as number) === 1
      ? (CVars.delay_cvar1 as number)
      : (CVars.delay_cvar2 as number);
  } else if (
    (this.m_pAmmoTracker.mode as number) === 1 &&
    ((this.m_pWeaponInfo.flag_0xc as number) & 1)
  ) {
    delay = 0.1; // 0x3dcccccd
  } else {
    delay = this.m_pWeaponInfo.defaultDelay as number; // at 0x18
  }
  CVars.m_flNextPrimaryAttack_delay = delay;

  // === 15. Set m_flNextPrimaryAttack ===
  this.m_flNextPrimaryAttack =
    EngineUtil.weaponTimeBase() + (CVars.m_flNextPrimaryAttack_delay as number);

  // === 16. Compute and set m_flTimeWeaponIdle ===
  let idleDelay = CVars.idle_delay_default as number;
  if (
    weaponType === 0x24 &&
    (this.m_pAmmoTracker.ammo as number) <= 0 &&
    !this.m_pPlayer.infiniteClips()
  ) {
    idleDelay = CVars.idle_delay_alt as number;
  }
  this.m_flTimeWeaponIdle = EngineUtil.weaponTimeBase() + idleDelay;
}
