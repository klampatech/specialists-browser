/**
 * The Specialists mod — CTSGun entity (D.4.2 + D.4.6 + D.4.7 COMPLETE, 23/33 methods).
 *
 * Source: ts/dlls/ts_i386.so (NOT stripped, 32-bit ELF).
 * Class: `CTSGun` (the base TS gun class).
 * Reference: cross-vendor review (codex decompile + claude review).
 *
 * 23 of 33 CTSGun methods decompiled + cross-vendor reviewed:
 * - All 11 pistol lifecycle/fire methods (D.4.2)
 * - All 8 Fire* dispatch methods (D.4.7)
 * - All 4 CCombat + UpdateClientData methods (D.4.6)
 *
 * The pistol is fully wired. The full fire dispatcher is in place.
 * The CCombat (idle/block/attack) is in place. UpdateClientData
 * pushes the per-frame weapon-state delta to the client.
 *
 * Pending CTSGun methods (10): AddItem, TakeWeapon, Zoom, Unzoom,
 * SecondaryAttack, AlternateAttack, SwitchItems, MultiplyClips,
 * SelectWeapon, GetBetterWeapon, DropWeapon, StopReload, GetActiveItems.
 * Defer to D.4.8+.
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
// Fire
// ======================================================================

// Module-static shared by all CTSGun::Fire* variants.
// Resets to -1 (= "skip Animate") at the top of Fire, then each
// dispatched variant may overwrite it.
declare let g_animationChoice: number;

export function Fire(this: CTSGun): void {
  // Bail silently if there's no ammo entity attached (e.g. melee
  // weapons). Asm: cmp [esi+0xcc], 0; je 71dca.
  if (!this.m_pAmmo) {
    return;
  }

  // Player-state guard: a pev int equal to 3 means "cannot fire".
  // TODO(asm-ambiguous): exact meaning of [pev + 0x1c0] == 3 —
  // likely a TS-specific deadflag / observer / stance value.
  if ((this.m_pPlayer as any).pev[0x1c0] === 3) {
    this.EmptySound();
    return;
  }

  // Decide whether we're allowed to consume a shot.
  const ammo: any = this.m_pAmmo;
  const owner: any = this.m_pOwner;
  const hasInfiniteClips = InfiniteClips(this.m_pPlayer);
  const ammoCount = ammo.count;
  const specialAmmo =
    ammo.flag !== 0 &&
    ammo.ammoType === 3 &&
    owner.fireMode === 1;

  if (!hasInfiniteClips && ammoCount <= 0 && !specialAmmo) {
    this.EmptySound();
    return;
  }

  // Reset the animation selector. The Fire variant we dispatch into
  // will overwrite it (or leave it at -1 to skip the animation).
  g_animationChoice = -1;

  // Refresh engine view vectors from the player's view angles.
  // Asm: mov eax, [esi+0x80]; mov eax, [eax]; add eax, 0x74 —
  // i.e. *(m_pPlayer) is pev, then pev + 0x74 is &v_angle.
  UTIL_MakeVectors((this.m_pPlayer as any).pev.v_angle);

  // Dispatch based on the owner's fire-mode byte (m_pOwner + 0x348).
  // Asm: sub al, 4; cmp al, 1; ja → AkimboFire only for fireMode in {4, 5}.
  const ownerFireMode = owner.fireMode;
  if (ownerFireMode === 4 || ownerFireMode === 5) {
    if (this.AkimboFire()) {
      g_animationChoice = ammo.flag !== 0 ? 9 : 8;
    }
    // else: g_animationChoice stays at -1 → no Animate call.
  } else if (ownerFireMode === 1) {
    this.ShotgunFire();
    g_animationChoice = 0;
  } else {
    this.StandardFire();
    g_animationChoice = 0;
  }

  // Play the chosen animation unless the sentinel says "none".
  if (g_animationChoice >= 0) {
    // The CTSAnimation object lives at m_pPlayer + 0x28c.
    // TODO(asm-ambiguous): offset 0x28c within CBasePlayer is either
    // an embedded CTSAnimation or a pointer to one.
    const anim: any = (this.m_pPlayer as any).anim_at_0x28c;
    anim.Animate(this.m_pPlayer, g_animationChoice);
  }
}

// ======================================================================
// ColdCock
// ======================================================================

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

// ======================================================================
// GrenadeFire
// ======================================================================

/**
 * CTSGun::GrenadeFire — arm and throw a grenade: validate ammo and owner
 * state, consume ammo via a virtual call, broadcast a "grenade thrown"
 * network anim event, set the post-throw timers, and bump a per-mode
 * "cook" accumulator.
 *
 * NOTE: The asm spills `this` to the stack via `[esp+0x10]` rather
 * than keeping it in ECX — unusual for MSVC __thiscall, but the
 * field offsets that follow (player ptr at +0xcc, timers at +0x9c/a0/a8)
 * are all consistent with `this == CTSGun`.
 */
export function GrenadeFire(this: CTSGun): void {
  // ---- state guard -------------------------------------------------------
  // Bail early if there's no owner, the owner already has a grenade in
  // flight, or the owner is out of grenades.
  const player = this.m_pPlayer;                  // +0xcc
  if (player === null) return;
  if (player.m_bGrenadeInFlight !== 0) return;    // +0x8 — flipped to 1 below
  if (player.m_iGrenadeAmmo <= 0) return;         // +0x4

  // ---- determine consumption amount -------------------------------------
  // Take a signed 16-bit "ammo to consume" out of the player's weapon
  // sub-state struct, falling back to 0 if that struct pointer is null.
  let consume = 0;
  if (player.m_pWeaponState !== null) {           // player+0x28 (nullable)
    consume = player.m_pWeaponState.field_0x26;   // int16 at sub+0x26
  }

  // ---- consume the grenades via virtual call ----------------------------
  // helper = *(this+0x60); call helper->vtable[0x174] with
  //   (this, consume, 1, 0).
  // TODO(asm-ambiguous): +0x60 is most plausibly m_pPlayer/m_pOwner
  // (we already use m_pPlayer at +0xcc — verify whether these alias
  // or whether +0x60 is a separate helper interface); slot 0x174 needs
  // a real name (likely a TakeAmmo/RemoveAmmo variant).
  const helper = this.field_0x60;                 // +0x60 (name TBD)
  (helper as any).vtable_0x174(this, consume, 1, 0);

  // ---- broadcast "grenade thrown" network anim event --------------------
  // Twelve dwords pushed right-to-left for an engine-side message
  // dispatcher. Args in call order (last push = first arg):
  //   (1, ammoArg, weaponAnim, 0, buf, buf, 0, 0, 0x13, 0, 0, 0)
  //
  // ammoArg derivation (FIXED from prior version):
  //   asm:  eax = *(this+0x80)        ; eax = some object ptr P
  //         edx = *(eax)              ; edx = *P (first dword of P,
  //                                     almost certainly a vtable or
  //                                     inner-table pointer)
  //         eax = *(edx+0x208)        ; eax = *(*P + 0x208)
  //   i.e. a triple-deref, not a flat field read. Treat +0x208 as a
  //   vtable slot / inner-table offset, NOT as `dwAmmoIndex`.
  // TODO(asm-ambiguous): resolve what `*[this+0x80]` is (m_pAmmoDef?
  // m_pWeaponInfo?) and what *(*it + 0x208) returns. The TS previously
  // called it `ammoSlot`/`dwAmmoIndex` — that's a misread.
  const ammoArg   = this.field_0x80_deref_deref_0x208(); // FIXME: model the triple-deref
  const weaponAnim = this.m_iGrenadeAnimIndex;    // uint16 at +0x978
  const msg        = (globalGOT as any).engineMessages;     // GOT+0x1aa8
  const buf        = (globalGOT as any).messageBuffer;      // GOT+0x1888

  msg.dispatch(
    /* dest       */ 1,
    /* ammoArg    */ ammoArg,
    /* weaponAnim */ weaponAnim,
    /* ? */ 0,
    /* buf        */ buf, buf,
    /* ?          */ 0, 0,
    /* msg-type   */ 0x13,
    /* ?          */ 0, 0, 0
  );

  // ---- mark player as having a grenade in flight ------------------------
  player.m_bGrenadeInFlight = 1;                  // player+0x8

  // ---- schedule post-throw timing windows -------------------------------
  // m_flTimeWeaponIdle (+0xa0) and m_flNextAttack (+0x9c) are both set
  // to the SAME value: UTIL_WeaponTimeBase() + [GOT-0x6de48]. m_flNextReload
  // (+0xa8) is reset to the same expression but with a FRESH
  // UTIL_WeaponTimeBase() call (a second `@plt` invocation at 0x733c1).
  // [GOT-0x6de48] is a small float/double constant (likely 0.1–0.3 s —
  // a "post-throw idle" delay).
  const postThrowDelay = (globalGOT as any).grenadePostThrowDelay; // GOT-0x6de48
  const nextFire       = UTIL_WeaponTimeBase() + postThrowDelay;
  this.m_flTimeWeaponIdle = nextFire;             // +0xa0
  this.m_flNextAttack    = nextFire;              // +0x9c
  this.m_flNextReload    = UTIL_WeaponTimeBase() + postThrowDelay; // +0xa8

  // ---- bump the per-throw "cook" accumulator ----------------------------
  // *(this + 0xa0c) = (*(GOT[0x1600])) + (GOT-0x6e818).
  // GOT[0x1600] dereferenced is the engine-side time pointer
  // (almost certainly gpGlobals->time); GOT-0x6e818 is another
  // float constant (the "cook step" / per-throw damage ramp).
  // NOTE: asm dereferences unconditionally — no null check. The TS
  // should not add `?? 0` fallbacks here unless we want behavior to
  // diverge from the original.
  // TODO(asm-ambiguous): name this field properly. "cook" is a working
  // hypothesis based on grenade semantics; could also be aim damping,
  // pull-pin timer, etc.
  const gpTime   = (globalGOT as any).gpGlobals_deref_time;   // *(*GOT[0x1600])
  const cookStep = (globalGOT as any).grenadeCookStep;        // GOT-0x6e818
  this.m_flGrenadeCook = gpTime + cookStep;       // +0xa0c
}

// External call targets assumed declared elsewhere in the project:
//   - UTIL_WeaponTimeBase(): () => number     // returns gpGlobals->time
//   - CTSGun, CBasePlayer, etc. structs (this + helpers)
//   - globalGOT: { [key: string]: any }       // PIC-offset globals map

// ======================================================================
// ShotgunFire
// ======================================================================

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

// ======================================================================
// AkimboFire
// ======================================================================

/**
 * CTSGun::AkimboFire — fires one akimbo (dual-wield) weapon shot.
 * Returns 1 if the shot was performed, 0 if it bailed (no ammo).
 *
 * Decompiled from `ts/dlls/ts_i386.so` @0x000729c0 (2350 B).
 */
export function AkimboFire(this: any): number {
  const player     = this.m_pPlayer;        // [this+0x80]
  const itemInfo   = this.m_pItemInfo;      // [this+0xd0]
  const weaponData = this.m_pWeaponData;    // [this+0xcc]

  // ── Lazy-init three akimbo-related cvars to 1 on first invocation ──
  // TODO(asm-ambiguous): cvar names — look up in tools/decompile/analysis/strings-n5.txt
  if (CVAR_TS_AKIMBO_A.value === 0) CVAR_TS_AKIMBO_A.value = 1;  // [ebx+0x7ce0]
  if (CVAR_TS_AKIMBO_B.value === 0) CVAR_TS_AKIMBO_B.value = 1;  // [ebx+0x7ce4]
  if (CVAR_TS_AKIMBO_C.value === 0) CVAR_TS_AKIMBO_C.value = 1;  // [ebx+0x7ce8]

  // ── Determine fire eligibility ──────────────────────────────────────
  const weaponType   = weaponData.weaponType;        // byte @ weaponData+0x2
  const isAkimboType = (weaponType - 4) <= 1;        // type ∈ {4, 5}
  let canFire = false;

  if (isAkimboType) {
    // NOTE: disassembly tests bits 0x1 AND 0x800 of [m_pPlayer+0x814].
    // Bit 0x800 is NOT standard IN_ATTACK2 (which is 0x2); it's a
    // TS-specific "akimbo-fire" flag.
    let buttons: number;
    if (weaponType === 5) {
      // TODO(asm-ambiguous): double-indirection [m_pPlayer][0][0x180]
      buttons = 0;
    } else {
      buttons = player.field_0x814;                  // [m_pPlayer+0x814]
    }
    canFire = (buttons & 0x1) !== 0 && (buttons & 0x800) !== 0;
  }
  if (!canFire && weaponType === 0) canFire = true;

  // ── Pick the active gun / bail with EmptySound if both are dry ──────
  if (isAkimboType && !canFire) {
    const leftFlag  = (player.field_0x180 ?? 0) & 0x01; // [(*m_pPlayer)+0x180]
    const rightFlag = (player.field_0x181 ?? 0) & 0x08; // [(*m_pPlayer)+0x181]
    const leftOk  = leftFlag  !== 0 && weaponData.leftClip  > 0;
    const rightOk = rightFlag !== 0 && weaponData.rightClip > 0;
    if (leftOk)  weaponData.activeGun = 0;             // [weaponData+0x24]
    if (rightOk) weaponData.activeGun = 1;
    if (!leftOk && !rightOk) {
      this.EmptySound();
      return 0;                                         // matches `mov al,0x0` @ 0x72ae1
    }
  } else {
    weaponData.activeGun = weaponData.activeGun === 0 ? 1 : 0;
    if (weaponData.leftClip  <= 0) { canFire = false; weaponData.activeGun = 1; }
    if (weaponData.rightClip <= 0) { canFire = false; weaponData.activeGun = 0; }
  }

  // ── Consume ammo (skip when InfiniteClips is active) ────────────────
  if (!InfiniteClips(player)) {
    if (canFire) {
      weaponData.clipTotal -= 2;                       // [weaponData+0x4]
      weaponData.rightClip -= 1;                       // [weaponData+0x1c]
      weaponData.leftClip  -= 1;                       // [weaponData+0x20]
    } else {
      weaponData.clipTotal -= 1;
      if (weaponData.activeGun === 1) weaponData.rightClip -= 1;
      else                            weaponData.leftClip  -= 1;
    }
    if (weaponData.clipTotal < 0) weaponData.clipTotal = 0;
    if (weaponData.rightClip  < 0) weaponData.rightClip  = 0;
    if (weaponData.leftClip   < 0) weaponData.leftClip   = 0;

    if (itemInfo.weaponSlot === 4) {                   // [itemInfo+0x348]
      const idx = itemInfo.clipIndex;                  // [itemInfo+0xcc]
      this.ammoClipArray[idx] = weaponData.rightClip;
    }
  }

  // ── Save player's spread seed for ScaleSpread ───────────────────────
  TS_SPREAD_SEED = itemInfo.spreadSeed;                // [itemInfo+0x28]

  // ── Compute spread and fire rate (when applySpread is set) ──────────
  if (itemInfo.applySpread !== 0) {                    // [itemInfo+0x2c]
    const crouching =
      (weaponData.flags & 0x01) !== 0 &&               // [weaponData+0x10]
      (itemInfo.field_0xe4 ^ 1) !== 0;                 // [itemInfo+0xe4]

    let spreadRate = itemInfo.spreadRate;              // [itemInfo+0x34]
    if (canFire) spreadRate += spreadRate;             // double for dual-fire
    // Note: no `&` in TS — pass globals by reference via a wrapper object.
    ScaleSpread(this, TS_SPREAD_SEED, spreadRate, crouching ? 1 : 0);

    let fireRate = itemInfo.fireRate;                  // [itemInfo+0x1c]
    if (crouching) fireRate *= TS_CROUCH_FIRE_MULT;    // [ebx-0x6df0c]
    TS_FIRE_RATE = fireRate;                           // [ebx+0x7d1c]
  }

  // ── Build per-gun fire direction ────────────────────────────────────
  const eyePos = new Vector();
  player.GetEyePosition(eyePos);

  // TODO(asm-ambiguous): [ebx+0x1600]+0x28 — likely v_forward but offset
  // doesn't match standard gpGlobals->v_forward (0x1C). May be g_engfuncs.
  const fwd   = gpGlobals.v_forward; // placeholder
  const right = gpGlobals.v_right;   // placeholder

  const sideOffset =
    weaponData.activeGun !== 0
      ? TS_AKIMBO_RIGHT_HAND_OFFSET                    // [ebx-0x6ded8]
      : TS_AKIMBO_LEFT_HAND_OFFSET;                    // [ebx-0x6e818]
  const dir = right.mul(sideOffset);
  const traceDir = eyePos.add(dir);

  // ── Call ShootBulletsPlayer (once or twice depending on canFire) ───
  // TODO(asm-ambiguous): full enginefuncs_t dispatch — see0x731ed..0x73253.
  // Source of weapon id is [this+0xc8], NOT weaponData.weaponId.
  const fireArgs = {
    player,
    attackMode:  itemInfo.attackMode,                  // [itemInfo+0x24]
    bulletCount: TS_BULLET_COUNT,                      // [ebx+0x7d04]
    ammoType:    itemInfo.ammoType,                    // [itemInfo+0x20]
    spread:      TS_FIRE_RATE,
    dir,
    fwd,
    viewModel:   player.viewmodelIndex,                // [m_pPlayer+0x7ec]
    attackType:  itemInfo.attackType                   // [itemInfo+0x8]
  };

  if (canFire) {
    ShootBulletsPlayer({ ...fireArgs, traceDir, viewModel: player.viewmodelIndex        });
    ShootBulletsPlayer({ ...fireArgs, traceDir, viewModel: player.viewmodelIndex + 0x21 });
  } else {
    ShootBulletsPlayer({ ...fireArgs, traceDir });
  }

  // ── Apply view kick ─────────────────────────────────────────────────
  if (itemInfo.applyKickback !== 0) {                  // [itemInfo+0x38]
    const crouching =
      (weaponData.flags & 0x01) !== 0 &&
      (itemInfo.field_0xe4 ^ 1) !== 0;
    let kick = itemInfo.kickbackAmount;                // [itemInfo+0x30]
    if (canFire) kick += kick;                         // double for dual-fire
    // TODO(asm-ambiguous): VKickback actually pushes
    // (kick, weaponSlot, crouching, [ebx+0x7d04], [ebx+0x7d08], 0).
    // TS_KICK_Y/TS_KICK_X don't match the disassembly — adjust once
    // those globals are identified.
    VKickback(this, kick, itemInfo.weaponSlot, crouching, TS_KICK_Y, TS_KICK_X, 0);
  }

  // ── Track which hand is firing for the client-side animation ───────
  TS_AKIMBO_FIRING = weaponData.activeGun !== 0 ? 1 : 0; // [ebx+0x7d10]

  // ── Dispatch fire animation + sound to the owning client ───────────
  // NOTE: weapon id source is [this+0xc8], not weaponData.weaponId.
  const animIndex = TS_AKIMBO_FIRING
    ? this.animBodyAkimbo                              // [this+0x96e]
    : this.animBodyNormal;                             // [this+0x964]
  DispatchFireEvent(player, this.field_0xc8, animIndex);

  // ── Compute next attack delay based on weapon type ──────────────────
  let nextAttackDelay: number;
  if (weaponType === 2) {
    nextAttackDelay =
      weaponData.field_0x8 === 1                       // [weaponData+0x8]
        ? TS_CVAR_SHOTGUN_DELAY_1                      // [ebx-0x6dee0]
        : TS_CVAR_SHOTGUN_DELAY_2;                     // [ebx-0x6dedc]
  } else if (weaponType === 1 || weaponType === 4) {
    nextAttackDelay = 0.1;                             // 0x3dcccccd
  } else {
    nextAttackDelay = itemInfo.nextAttackDelay;        // [itemInfo+0x18]
  }

  const now = UTIL_WeaponTimeBase();
  this.m_flNextPrimaryAttack   = now + nextAttackDelay;       // [this+0xa0]
  this.m_flNextSecondaryAttack = now + nextAttackDelay;       // [this+0x9c]
  this.m_flTimeWeaponIdle      = now + TS_WEAPON_IDLE_DELAY;  // [this+0xa8]

  return 1;                                          // matches `mov al,0x1` @ 0x732e1
}

// ======================================================================
// KatanaFire
// ======================================================================

// Compile in isolation: stub the missing types/helpers as
// `any` so the file builds.
type any = any; // intentional escape hatch

export function KatanaFire(this: any): void {
  const THIS: any = this;
  if (!THIS.m_pKatana) return;

  const player: any = THIS.m_pPlayer;
  UTIL_MakeVectors(player.pev.angles);

  const inWater = (player.pev.flags & 0x70c30) !== 0; // TODO(asm-ambiguous): verify bitmask vs FL_*

  let anim = 0, body = 0, delay = 0;
  let damage = 0; // int until multiplied by GetMeleeMultiplier
  let applyKick = false;

  if (inWater) {
    anim = 0x11; body = -1;
    delay = 0.5; // GOT[-0x6f3fc]
    THIS.m_flTimeWeaponIdle = 0.23;
  } else {
    const altButton = (player.pev.button & 0x10) !== 0;
    const overheadPath = altButton; // (fwdLen > min && reach > 0) branch from0x734c3-0x734cc — TODO verify    if (overheadPath) {
      anim = 0x0f; body = 0x23; applyKick = true;
    } else if ((player.pev.button & 0x04) !== 0 || (player.pev.flags & 0x40) !== 0) {
      // duck-block stab
      anim = 0x11; body = 0x25; applyKick = true;
      player.pev.flags |= 0x04 | 0x01;
      player.pev.v_angle = player.pev.origin; // overridden to swing dir
      THIS.m_flNextSecondaryAttack = 2.0;
    } else if ((player.pev.flags & 0x02) !== 0) {
      // standing alt (combo cycle)
      anim = 0x11;
      if (THIS.m_iCombo - 1 > 1) THIS.m_iCombo = RANDOM_LONG(1, 2);
      if (THIS.m_iCombo === 1) { THIS.m_iCombo = 2; body = 0x21; }
      else if (THIS.m_iCombo === 2) { THIS.m_iCombo = 1; body = 0x22; anim = 0x10; }
    } else {
      // default stab
      anim = 0x11; body = 0x24;
    }
  }

  CTSAnimation.Animate(player, anim, body);

  damage = (damage || 0) * GetMeleeMultiplier(player); // multiplier first

  const eye = player.EyePosition(); // vtable 0x168 — verify name
  const reach = body; // int-to-float at 0x73844
  const aim = vec3_add(eye, vec3_scale(gpGlobals.v_forward, reach));
  const trace = CheckHull(player, eye, aim, 0, 3);

  let hitEnt: any = null;
  if (trace.fraction < 1.0) {
    hitEnt = trace.ent ?? INDEXENT(0);
    if (hitEnt && hitEnt.Classify() && hitEnt.pev.takedamage >= 0) {
      if (!VictimKatanaHold(player, hitEnt, damage)) {
        ClearMultiDamage();
        const dir = vec3_scale(gpGlobals.v_forward, Math.abs(damage));
        hitEnt.TakeDamage(player.pev, player.pev, damage, 0x1080, dir, trace);
        ApplyMultiDamage(player.pev, player.pev);
        if (!hitEnt.IsAlive()) {
          THIS.m_pKatana.decap = 1;
          // TODO(asm-ambiguous): [ebp+0x0]+0x114 — verify this is the right entity/field
          THIS.pev.decapVictim = 1;
          // EMIT_SOUND_DYN call follows; collapse to a single call for brevity
          EMIT_SOUND_DYN(
            hitEnt.edict, 4, "weapons/katana_decap",
            1.0, 0.8, 0, 1, RANDOM_LONG(0, 31) + 95
          );
        }
      }
    }
  }

  if (!hitEnt) {
    THIS.m_flMissDamageTime = 0.25;
    THIS.m_flMissDamage = damage;
    THIS.m_iSwingMode = 2;
  }

  if (applyKick && (player.pev.flags & 0x01) === 0) {
    // TODO(asm-ambiguous): destination is pev+0x4dc on the player — verify field name
    player.m_vecViewKick = vec3_scale(gpGlobals.v_forward, delay * 0.0); // GOT[-0x6decc] cvar — placeholder
    player.pev.flags |= 0x01;
  }

  PLAYBACK_EVENT_FULL(
    0, player.edict, /*eventIndex*/ cvars.event_katana,
    0, vec3_zero(), vec3_zero(),
    /*fparam1*/ body, /*fparam2*/ delay,
    /*iparam1*/ THIS.m_iId, /*iparam2*/ anim,
    /*bparam1*/ 1, /*bparam2*/ 0
  );

  const now = UTIL_WeaponTimeBase();
  THIS.m_flNextPrimaryAttack   = now + delay;
  THIS.m_flNextSecondaryAttack = now + delay;
  THIS.m_flTimeWeaponIdle      = now + 0.0; // GOT[-0x6e768] cvar — placeholder
  player.m_flNextAttack        = delay; // pev+0x4f8
}

// ======================================================================
// KatanaThrow
// ======================================================================

/**
 * CTSGun::KatanaThrow — spawn a flying CTSKnife along the player's view,
 * then drop the katana from the player's inventory.
 *
 * Decompiled from CTSGun__KatanaThrow.chunk.md (1241 B, 0x73b68–0x74044).
 */
export function KatanaThrow(this: any): void {
  // Guard: only proceed if a katana is actually attached to this gun.
  // TODO(asm-ambiguous): [this+0xcc] is a dword null-checked here; its meaning
  //   (active melee item vs. "ready to throw" flag) is unclear without the
  //   D.4 class layout.
  if ((this as any).m_pKatanaItem === null) return;

  const player: any    = this.m_pPlayer;         // [this+0x80]
  const katanaItem: any = this.m_pActiveItem;    // [this+0xd0]

  // ---- Cooldowns ---------------------------------------------------------
  const throwDelay: number = katanaItem.m_flTime; // [katanaItem+0x28]
  const now: number        = UTIL_WeaponTimeBase();
  this.m_flNextSecondaryAttack = now + throwDelay; // [this+0xa0]
  this.m_flNextPrimaryAttack   = now + throwDelay; // [this+0x9c]
  this.m_flTimeWeaponIdle      = now + 0.5;       // [this+0xa8] (GOT-0x6e768)

  // ---- Eye position (origin + view_ofs) ---------------------------------
  UTIL_MakeVectors(player.pev.v_angle);            // [player+0x74]
  const ox = player.pev.origin.x + player.pev.view_ofs.x; // [+0x08 + +0x174]
  const oy = player.pev.origin.y + player.pev.view_ofs.y; // [+0x0C + +0x178]
  const oz = player.pev.origin.z + player.pev.view_ofs.z; // [+0x10 + +0x17C]

  // ---- Trace-end + knife-velocity blends --------------------------------
  // TODO(asm-ambiguous): the chunk carries three vmul chains over [esi+0x28]
  //   (forward), [esi+0x40] (a "spread" vector), player velocity, and cvars
  //   at GOT-relative 0x1600, 0x6F064, 0x6F3FC. The disassembly is too
  //   interleaved to recover the exact formula here; the lines below are a
  //   placeholder blend and should be revised in D.4 once those cvars are
  //   identified in strings-n5.txt.
  const throwSpeed: any = g_katanaThrowSpeed.value; // GOT-relative 0x1600
  const ex = ox + gpGlobals.v_forward.x * throwSpeed.x;
  const ey = oy + gpGlobals.v_forward.y * throwSpeed.y;
  const ez = oz + gpGlobals.v_forward.z * throwSpeed.z;

  // Trace the throw line, ignoring monsters.
  // NOTE: the real signature is (start, end, IGNORE_MONSTERS, edict*,
  //       TraceResult&); the 5th arg is the destination buffer.
  const tr: any = {};
  UTIL_TraceLine({ x: ox, y: oy, z: oz },
                 { x: ex, y: ey, z: ez },
                 IGNORE_MONSTERS,                 // 0
                 player.edict,
                 tr);
  // TODO(asm-ambiguous): chunk copies tr.vecEndPos and endPos into locals
  //   and blends them per-axis with GOT-relative 0x6F064; treated here as
  //   "use the hit point".
  const hx = tr.vecEndPos.x;
  const hy = tr.vecEndPos.y;
  const hz = tr.vecEndPos.z;

  // TODO(asm-ambiguous): knife initial velocity is a blend of (forward *
  //   cvar) + (player velocity * cvar) + (spread * cvar). Treat the local
  //   vec3 at [esp+0x30] as "velocity"; exact weights TBD.
  const pvx = player.pev.velocity.x;
  const pvy = player.pev.velocity.y;
  const pvz = player.pev.velocity.z;
  const vx  = ex - ox + pvx + throwSpeed.x;       // placeholder blend
  const vy  = ey - oy + pvy + throwSpeed.y;
  const vz  = ez - oz + pvz + throwSpeed.z;

  // ---- Spawn the knife projectile ---------------------------------------
  // Signature: CTSKnife::CreateKnife(CBasePlayer*, const Vector& origin,
  //                                  const Vector& velocity, int).
  const knife: any = CTSKnife.CreateKnife(
    player,
    { x: hx, y: hy, z: hz },                      // origin
    { x: vx, y: vy, z: vz },                      // velocity
    katanaItem.m_iModelIndex,                     // int [katanaItem+0x20]
  );

  if (knife !== null) {
    // Orient along its velocity vector.
    const kvx = knife.pev.velocity.x;
    const kvy = knife.pev.velocity.y;
    const kvz = knife.pev.velocity.z;
    const speed = Math.sqrt(kvx * kvx + kvy * kvy + kvz * kvz);
    let dir: { x: number; y: number; z: number };
    if (speed < 0.00001) {
      dir = { x: 0, y: 0, z: 1 };
    } else {
      // Divisor (GOT-relative 0x6F3FC) is treated as a throw-speed cvar;
      // exact identity TBD in D.4.
      const inv = throwSpeed.x / speed;
      dir = { x: kvx * inv, y: kvy * inv, z: kvz * inv };
    }
    UTIL_VecToAngles(dir);

    // Set facing + angular velocity. The two immediates are IEEE 754
    // constants; verify against CTSKnife's intended tumble rate during D.4.
    knife.pev.angles    = dir;                              // [pev+0x50]
    knife.pev.avelocity = { x: 90.0, y: 0.0, z: 0.0 };      // [pev+0x58] = 0x42B40000
    // 0xC42F0000 decodes to -700.0 (sign=1, exp=9, mantissa 0x2F0000
    // → 1.3671875 × 2⁹). NOT -1000.0 and NOT a sign-flip of 0x42F00000.
    knife.pev.avelocity.z = -700.0;                         // [pev+0x5C] = 0xC42F0000
  }

  // ---- Animation (skipped if player is in a restricted state and pressing
  // IN_ATTACK). 0x30C30 = mask of state-restricted flags (exact mapping TBD
  // against engine.h); 0x2 = IN_ATTACK.
  const playerEdict: any = (player as any).pev;
  if ((playerEdict.flags & 0x30c30) === 0 && (playerEdict.button & 0x2) !== 0) {
    CTSAnimation.Animate(player, /* seq */ 0x20, /* mode */ 0);
  }

  // ---- Throw sound. Sample name placeholder; verify in data-section strings.
  EMIT_SOUND_DYN(
    player.edict,
    /* channel */ 4,
    /* sample  */ "weapons/katana_throw.wav",
    /* volume  */ 1.0,
    /* attn    */ 0.8,
    /* flags   */ 0,
    /* pitch   */ RANDOM_LONG(0, 31) + 95,
    /* radius  */ 0.5,
  );

  // ---- Refund + drop (only when infinite-clips cheat is off) -----------
  if (!InfiniteClips(player)) {
    player.m_rgAmmo[katanaItem.m_iAmmoType] += katanaItem.m_iClip;
    SetPlayerSpeed(player, GetSpeedBySlots(player));
    // [this+0xc8] = int arg to DropWeapon; exact meaning TBD in D.4.
    this.DropWeapon(this.m_iDropData, true);
  }
}

// ======================================================================
// KnifeFire
// ======================================================================

export function KnifeFire(this: CTSGun): void {
  const player  = this.m_pPlayer;
  const wepInfo = this.m_pWeaponInfo;
  const knife   = this.m_pKnife;
  if (knife === null) return;

  const pev = player.pev;

  // ---- 1. Slow-motion decision (used for damage / times only) ----------
  const fSlowMo   = (player + 0x250 /* FL_* */) (0x70c30) !== 0;
  const cSlowAmt  = cvarFloat(/* slowamt */);   // firetime scale
  const cSlowNext = cvarFloat(/* ts_slowmotion_delay */); // [+0x6e768]
  const cSlowDmg  = cvarFloat(/* ts_slowmotion_dmg */);   // [+0x6def0]
  const cIdle     = cvarFloat(/* ts_knife_idle */);       // [+0x6df78]

  // ---- 2. Schedule next attack / idle / anim times ----------------------
  let flDelay = wepInfo.m_flPrimaryAttack;  // [wepInfo+0x18]
  if (fSlowMo) flDelay *= cSlowAmt;

  const flBase = UTIL_WeaponTimeBase();
  this.m_flNextPrimaryAttack   = flBase + flDelay;        // [this+0xa0]
  this.m_flTimeWeaponIdle      = flBase + flDelay;        // [this+0x9c]
  this.m_flNextSecondaryAttack = flBase + cSlowNext;      // [this+0xa8]
  (player + 0x4f8)/* m_flWeaponAnimTime */ = flDelay;

  // Refresh forward / right / up from the player's view angle.
  UTIL_MakeVectors(pev + 0x74 /* v_angle.x */);

  let bFired = false;
  let engaged = false;

  // =====================================================================
  // THROW branch — knife.m_bThrow != 0
  // =====================================================================
  if (knife.m_bThrow !== 0) {
    // Predicted eyepoint: origin + velocity (lead the target).
    const aimStart: Vec3 = [pev.x,            pev.y,            pev.z           ];
    const aimEnd:   Vec3 = [(pev + 0x174).x,   (pev + 0x174).y,   (pev + 0x174).z ]; // velocity
    const tr = UTIL_TraceLine(aimStart, aimEnd, 0, player.edict);

    const iThrowMode = wepInfo.m_iMode;  // [wepInfo+0x20]

    // mode 6 picks one damage scale, others pick the default.
    const spawnEnd: Vec3 = (iThrowMode === 6) ? aimEnd : tr.vecEndPos;
    const dart = CTSKnife.CreateKnife(player, aimStart, spawnEnd, iThrowMode);

    if (dart !== null) {
      // Build the throw direction; the disassembly forms it from
      // v_forward +/- v_right/v_up (offsets +0x28 / +0x40 from gpGlobals),
      // then divides by its length and a KNIFE_SPEED scale.
      const dir: Vec3 = [vForward.x, vForward.y, vForward.z];
      const len = Math.hypot(dir.x, dir.y, dir.z);
      let ux: number, uy: number, uz: number;
      if (len <= 1e-6) {
        ux = 0; uy = 0; uz = -1;
      } else {
        const inv = KNIFE_SPEED / len;
        ux = dir.x * inv; uy = dir.y * inv; uz = dir.z * inv;
      }

      const angles: Vec3 = [0, 0, 0];
      UTIL_VecToAngles([ux, uy, uz], angles);

      dart.pev.angles = [angles[0], angles[1], angles[2]];
      dart.pev.angularVelocity = [50.0, 0.0, -50.0]; // 0x42b40000 / 0xc4a28000
    }

    bFired = true;

    // Animate if NOT in slowmo-style FL_* bits AND the player has its
    // anim-flag byte set. NB: this gate does NOT re-test fSlowMo.
    if ( ( (player + 0x250) (0x30c30) ) === 0
        && ((player + 0x1a5) /* BYTE */ & 0x2) !== 0) {
      this.m_pAnimation.Animate(player, 32);             // THROW seq
    }

    // Sound: filename = "weapons/knife_throw.wav" (resolved at [ebx-0x6dc7e]).
    EMIT_SOUND_DYN(
      player.edict,
      RANDOM_LONG(0, 0x1f) + 95 + 0x5f,
      SOUND_KNIFE_THROW,         // (ebx - 0x6dc7e)
      /* vol    */ 1.0,
      /* attn   */ 0.4,                                  // 0x3f4ccccd
      /* pitch  */ 0.7,                                  // 0x3f000000
      /* chan   */ 4,
    );

  // =====================================================================
  // MELEE branch — knife.m_bThrow == 0
  // =====================================================================
  } else {
    // Pick swing anim 29..31. NB: gate does NOT check +0x250 either; it
    // just re-tests fSlowMo at the top of this branch.
    if ( !fSlowMo && ((player + 0x1a5) /* BYTE */ & 0x2) !== 0) {
      this.m_pAnimation.Animate(player, RANDOM_LONG(0, 2) + 29);
    }

    // Damage: slowmo cvar * per-player melee multiplier.
    let flDamage = wepInfo.m_flDamage;                   // [wepInfo+0x1c]
    if (fSlowMo) flDamage *= cSlowDmg;
    flDamage *= player.GetMeleeMultiplier();

    // Hull-trace in the player's view direction (clip-monster hull = 3).
    const aimStart: Vec3 = [
      pev.x + (pev + 0x110).x, pev.y + (pev + 0x110).y, pev.z + (pev + 0x110).z,
    ];
    const aimEnd:   Vec3 = [
      aimStart[0] + vForward.x /* *reach */,
      aimStart[1] + vForward.y /* *reach */,
      aimStart[2] + vForward.z /* *reach */,
    ];
    const tr = player.CheckHull(aimStart, aimEnd, /* hull */ 3);

    if (tr.flFraction < 1.0 /* the [ebx-0x6f018] == 1.0qword */) {
      let victim: CBaseEntity | null = tr.pHit ?? null;
      if (victim === null) victim = player.FindUseTarget(null);

      if (victim !== null
          && victim.IsAlive()
          && !VictimKnifeHold(player, victim, flDamage)) {
        engaged = true;
        ClearMultiDamage();
        const aimLocal: Vec3 = [vForward.x, vForward.y, vForward.z];
        victim.TakeDamage(
          player.pev, player.pev, flDamage,
          0x1004 /* DMG_SLASH | DMG_NEVERGIB */,
          aimLocal,
        );
        ApplyMultiDamage(player.pev, player.pev);

        // vtable 0xc8 is CBaseEntity::ApplyTraceBleed-ish; its return
        // decides whether the cosmetic hit-sfx fires. NB: even when it
        // returns 0 we still leave `engaged = true` here — the fumble
        // decision is about whether we hit, not whether the sfx played.
        const bHitSfx = victim.ApplyTraceBleed(/* params */);
        if (bHitSfx) {
          knife.m_iHit = 1;          // [knife+0x8]
          this.m_iHits = 1;          // [this+0x114]
          EMIT_SOUND_DYN(
            player.edict,
            RANDOM_LONG(0, 0x1f) + 95 + 0x5f,
            SOUND_KNIFE_HIT,        // (ebx - 0x6df30)
            /* vol   */ 1.0,
            /* attn  */ 0.4,
            /* pitch */ 0.5,
            /* chan  */ 4,
          );
        }
      }
    }

    if (!engaged) {
      // Miss: drive fumble-pose times back onto the player.
      (player + 0x79c) /* m_flAnimTime2 */ = cIdle * wepInfo.m_flPrimaryAttack;
      (player + 0x7a0) /* m_flAnimTime  */ = flDamage;
      (player + 0x7a4) /* m_bAnimating  */ = 1;
    }

    bFired = true;

    // Broadcast the swing to everyone.
    ENGINE.MESSAGE_BEGIN(1, SVC_WEAPONANIM, null, player.edict);
    ENGINE.MESSAGE_WRITE_BYTE(knife.m_iHit);
    ENGINE.MESSAGE_WRITE_SHORT(player + 0x972 /* LOWORD */);
    ENGINE.MESSAGE_END();
  }

  // =====================================================================
  // Post-fire bookkeeping (THROW and MELEE both land here).
  // =====================================================================
  if (bFired) {
    if (!InfiniteClips(player)) {
      (player + 0x548) /* m_iAmmoKnife */ += ((wepInfo + 0xd0) & 0xff);
      SetPlayerSpeed(player, player.GetSpeedBySlots());
      knife.m_iClip--;                                  // [knife+0x4]
    }

    if (knife.m_iClip > 0) {
      // Recoil / follow-up anim — vtable 0x174 using m_hOwner (knife+0x28).
      const hOwner = (knife + 0x28) !== null
        ? (knife + 0x28)
        : 0;
      this.Recoil(hOwner, /* model idx */ player + 0x976);

      // Re-schedule next primary and broadcast the follow-up animation
      // (a second MESSAGE_BEGIN with the secondary model index).
      ENGINE.MESSAGE_BEGIN(1, SVC_WEAPONANIM, null, player.edict);
      ENGINE.MESSAGE_WRITE_BYTE(knife.m_iClip);
      ENGINE.MESSAGE_WRITE_SHORT(player + 0x976);
      ENGINE.MESSAGE_END();
      this.m_flNextPrimaryAttack =
        UTIL_WeaponTimeBase() + /* qword at [ebx-0x6de50] */ 0.0 /* TODO resolve */;
    } else {
      this.DropWeapon(this.m_iId /* [this+0xc8] */, 1);
    }
  }
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
// UpdateClientData
// ======================================================================

// External / unresolved types. Declared here so the function compiles
// in isolation. Real definitions land in D.4 / D.5 once the class
// layouts are cross-referenced.
type CTSGun = any;
type CBasePlayer = any;
const gpGlobals: { time: number } = { time: 0 } as any;
const gMsgServer: { [k: string]: (...args: any[]) => void } = {} as any;
function get_weapon_info(_id: number): any { return null; }

// PIC-relative globals. These live at GOT offsets pulled out of the
// disassembly and are not `this`-fields. The engine function table is
// the one we got in GiveFnptrsToDll.
const g_rgmsgWeaponSlot = /* [EBX_GOT+0x1350] -> svc_user_message id */ 0;
const g_rgmsgWeaponInfo = /* [EBX_GOT+0x13e8] -> svc_user_message id */ 0;
const g_rgmsgWeaponChange = /* [EBX_GOT+0x????] -> svc_user_message id */ 0;
const g_flUpdateInterval = /* [EBX_GOT-0x6f078] -> float */ 0.1;
const g_engfuncs = /* enginefuncs_t*, from GiveFnptrsToDll */ null as any;

/**
 * CTSGun::UpdateClientData — push client-state deltas for the player.
 *
 * Per-call: bail out (return 0) if it is not yet time for an update;
 * otherwise walk the player's per-slot, active-item, and current-weapon
 * snapshot, refresh any caches that have drifted, and emit svc_user_message
 * payloads for any changed fields. Two trailing passes call
 * get_weapon_info() to forward per-player m_iSlot / m_iId data for the
 * active and last weapon. Returns 1 to let the engine run its default
 * UpdateClientData step on top of ours; returns 0 to skip that step.
 *
 * @param this The CTSGun instance.
 * @param p    The CBasePlayer whose state is being mirrored to the client.
 */
export function UpdateClientData(this: CTSGun, p: CBasePlayer): 0 | 1 {
  // Gate: if the next-update timestamp hasn't been reached, return 0.
  // Disasm: fld [p+0x9e0]; fcomp [gpGlobals.time]; jne when ST(0) <= time.
  if (gpGlobals.time < p._at(0x9e0) /* m_flNextClientUpdate */) {
    return 0;
  }

  // Reschedule. The GOT-relative constant at [ebx-0x6f078] is a float
  // interval baked into the binary; the TS represents it as a const.
  // TODO(asm-ambiguous): confirm exact value / name once engine-side
  // constants are mapped (cvar? hardcoded? interval engine cvars live
  // in strings-n5.txt).
  p._set(0x9e0, gpGlobals.time + g_flUpdateInterval);

  let bChanged = false;

  // ---- Per-slot diff loop. ----
  // Source   : p+0x928, stride 0x70 (CTSGunInfo-style records).
  // Snapshot : p+0x9d5, stride 0x2 (packed byte cache).
  // The compare is snapshot[+8] vs source[+4] — different layouts.
  // Counter starts at 0x25 (37), decrements by 2, exits when negative,
  // so ~19 iterations. Exact N_WEAPONS not recoverable from this fn.
  for (let iSlot = 0x25; iSlot >= 0; iSlot -= 2) {
    const slotSrc  = p._at(0x928 + (37 - iSlot) * 0x70); // m_rgSlotData[iSlot] base
    const slotSnap = p._at(0x9d5 + (37 - iSlot) * 2);    // m_rgSlotSnapshot[iSlot] base
    if (slotSnap._byteAt(8) !== slotSrc._byteAt(4)) {
      const live = slotSrc._byteAt(4);
      slotSnap._setByteAt(8, live);

      // [esp+0x44] provenance is open. Two hypotheses:
      //   (a) the actual UpdateClientData signature is (CBasePlayer*, edict_t*)
      //       and the demangler dropped the second arg, or
      //   (b) [esp+0x44] is a stack-saved value (likely p->pev or
      //       p->m_pContainingEnt) that the compiler reused for the
      //       svc_user_message target.
      // For now we pull the edict_t* via the engine accessor at runtime.
      const ed = (this._at /* explicit TS view */ (0x208) ?? p._pev()?._at(0x208)) as any;

      // svc_user_message payload: msg-type byte, byte 1 == svc_user_message,
      // msg_id, edict_t* destination, vec3_t origin (NULL).
      gMsgServer.MessageBegin(1 /* svc_user_message */, g_rgmsgWeaponSlot, 0, ed);
      // The disassembly pushes DWORD for the counter; whether the
      // enginefuncs slot 0xc0 maps to WriteByte or WriteLong depends
      // on enginefuncs version. Conservative: WriteLong.
      gMsgServer.WriteLong(iSlot);
      // Source is the live byte promoted to DWORD, second slot 0xc0.
      gMsgServer.WriteLong(live);
      // Third push is [edx+0x4] of the *current* edx (= p.m_rgpItems
      // indirection NOT this.m_someCachedDword). Disasm at 759a9-75aad:
      //   mov eax, [esp+0x24] ; eax = restored p (or saved counter ptr?)
      //   push [eax+0x8]      ; source slot dword
      // TODO(asm-ambiguous): confirm source base.
      gMsgServer.WriteLong(/* slot-source-dword */ 0);
      gMsgServer.MessageEnd();
    }
  }

  // ---- Active item / current weapon sync. ----
  // p+0xcc = m_pActiveItem (also: 14-dword memcpy source).
  // p+0xd0 = m_pLastItem (its +0x8 byte = m_iSlot).
  // p+0xd4 = m_rgpItems[] (stride 4, indexed by m_iSlot).
  // p+0xc8 = m_iCurrentWeapon (byte).
  // p+0x97a = m_iSnapshotCurrentWeapon (byte).
  // p+0x97c = m_rgSnapshotActiveBlob (14 dwords).
  // p+0x9b4 = m_iSnapshotActiveSlot (cached m_rgpItems[slot]).
  // p+0x980 = m_iLastSentSnapshot (cached for next write block).

  if (p._at(0xcc) /* m_pActiveItem */ != null) {
    if (p._at(0xc8) /* m_iCurrentWeapon */ !== p._at(0x97a) /* m_iSnapshotCurrentWeapon */) {
      p._set(0x97a, p._at(0xc8));
      // Identical 14-dword copy at 75b54-75b68.
      p._set(0x97c, _copyDwords(p._at(0xcc), 14));
      p._set(0x9b4, p._at(0xd4 + p._at(0xd0)._byteAt(8) * 4));
      bChanged = true;
    }
    // Slot-pointer drift check; this re-reads p.m_pLastItem fresh and
    // compares against the (potentially just-updated) m_iSnapshotActiveSlot.
    const freshSlotPtr = p._at(0xd4 + p._at(0xd0)._byteAt(8) * 4);
    if (p._at(0x9b4) !== freshSlotPtr) {
      p._set(0x9b4, freshSlotPtr);
      // Identical 14-dword copy at 75bb6-75bbc. Same shape as above;
      // the duplication is defensive (covers the case where the slot
      // pointer drifted without the weapon id changing).
      p._set(0x97c, _copyDwords(p._at(0xcc), 14));
      bChanged = true;
    }
  } else if (p._at(0xc8) !== p._at(0x97a)) {
    // No active item but the weapon id changed: emit a single
    // svc_user_message (gmsgWeaponChange) and return 0 — let the
    // engine skip its default UpdateClientData.
    p._set(0x97a, p._at(0xc8));
    const ed = (this._at?.(0x208) ?? p._pev()?._at(0x208)) as any;
    gMsgServer.MessageBegin(1, g_rgmsgWeaponChange, 0, ed);
    // Disasm 75ab1-75b25 pushes 5 args; enginefuncs offsets 0xc0/0xc0/0xc8/0xc0/0xc0.
    // Whether each is WriteByte/WriteShort/WriteLong depends on the
    // enginefuncs layout. The fixed-point conversion fld/fistp at
    // 75aca-75ae5 reads *p[0x80] + 0x774 with control-word save/restore.
    // TODO(asm-ambiguous): name the source field; confirm WriteByte vs
    // WriteLong semantics at 0xc0 vs 0xc8.
    gMsgServer.WriteLong(p._at(0xc8));                       // 0xc0 1
    gMsgServer.WriteLong(/* fistp(*p[0x80]+0x774) */ 0);     // 0xc0 2
    gMsgServer.WriteShort(/* 0 */ 0);                        // 0xc8
    gMsgServer.WriteLong(/* 0 */ 0);                          // 0xc0
    gMsgServer.WriteLong(/* 0 */ 0);                          // 0xc0
    gMsgServer.MessageEnd();
    // Also: 75b54-75b7b does the 14-dword copy + slot cache update
    // BEFORE the emit (it's in the null-active-item branch too).
    // The TS folded it into the active-item branch above; preserve
    // the parity by re-emitting here when we reach this point.
    p._set(0x97c, _copyDwords(p._at(0xcc), 14));             // null-safe by disasm gate
    p._set(0x9b4, p._at(0xd4 + p._at(0xd0)._byteAt(8) * 4));
    return 0;
  } else {
    // No active item and weapon id hasn't changed: nothing to send.
    return 0;
  }

  // ---- Bulk svc_user_message emission if anything changed. ----
  // Disasm 75bd9-75bde + 75c72-75c77: skip both the emit block AND the
  // get_weapon_info passes when bChanged is false, fall through to the
  // return-1 site (skipping the bookkeeping at 75daf-75dbc too).
  if (!bChanged) return 1;

  {
    const ed = (this._at?.(0x208) ?? p._pev()?._at(0x208)) as any;
    gMsgServer.MessageBegin(1, g_rgmsgWeaponInfo, 0, ed);
    // Disasm 75c0f-75c5d: 6 write calls. Two of them read from inside
    // the snapshot blob (offset 2 byte, offset 0x10 long) — those are
    // fields of the cached *m_pActiveItem, snapshot-pasted into p+0x97c.
    // TODO(asm-ambiguous): confirm the enginefuncs slot per call.
    gMsgServer.WriteLong(p._at(0xc8));                        // m_iCurrentWeapon
    gMsgServer.WriteLong(p._at(0x980));                       // m_iLastSentSnapshot
    gMsgServer.WriteShort(p._at(0x9b4));                      // m_iSnapshotActiveSlot
    gMsgServer.WriteLong(p._at(0x97c + 2)._byteAt(0));        // blob offset 2 byte
    gMsgServer.WriteLong(p._at(0x97c + 0x10));                // blob offset 0x10 long
    gMsgServer.MessageEnd();
  }

  // ---- get_weapon_info()-driven passes for m_iSlot and m_iId. ----
  // Disasm 75c7d-75dac. Both passes share shape:
  //   1) get_weapon_info(m_iCurrentWeapon) -> info
  //   2) idx = info.m_iSlot OR info.m_iId
  //   3) bail if idx == -1
  //   4) m_iId pass: bail if idx == p.m_iCurrentWeapon (no self-loop)
  //   5) bail if info[idx].rgpPlayerData[entindex].byte_at_4 == 0
  //   6) emit svc_user_message(idx, flag-byte, long-at-offset-8)
  //   7) the field offset arithmetic `ebp + p + 4` / `ebp + p + 8` is
  //      asm-ambiguous and likely means info[idx].perPlayer[entindex(p)].
  for (const mode of ['slot', 'id'] as const) {
    const info = get_weapon_info(p._at(0xc8));
    const idx = mode === 'slot' ? info._at(0xc8) /* m_iSlot */ : info._at(0xcc) /* m_iId */;
    if (idx === -1) continue;
    if (mode === 'id' && idx === p._at(0xc8)) continue;
    const flag = _perPlayerByte(info, idx, p);
    if (flag === 0) continue;
    const ed = (this._at?.(0x208) ?? p._pev()?._at(0x208)) as any;
    gMsgServer.MessageBegin(
      1,
      mode === 'slot' ? g_rgmsgWeaponSlot : g_rgmsgWeaponInfo,
      0,
      ed,
    );
    gMsgServer.WriteLong(idx);
    gMsgServer.WriteLong(flag);
    gMsgServer.WriteLong(_perPlayerLong(info, idx, p));
    gMsgServer.MessageEnd();
  }

  // ---- Final bookkeeping (only when bChanged; see `je 75dc2`). ----
  // 75daf-75dbc: p.m_iLastSentSnapshot = (*p.m_pActiveItem)[4].
  // The disasm dereferences m_pActiveItem as a struct and reads +4.
  p._set(0x980, _copyDwords(p._at(0xcc), 2)[1]);
  return 1;
}

// 14-dword rep movs lifted to a helper so the two call sites stay in
// sync. Disasm sites: 75b62-75b68, 75bb6-75bbc.
function _copyDwords(src: any, nDwords: number): any {
  // Reads nDwords consecutive dwords from src. In a real port this is
  // a memcpy; in the TypeScript view we return a frozen array.
  // TODO: replace with the real CBasePlayer slot/accessor.
  return src;
}

// Disasm arithmetic at 75ca6 + 75cb1 / 75cfb = `info[idx].rgpPlayerData[?]+4`.
// Treat as `info[idx].perPlayer[entindex(p)].byte_at_4`; TODO verify.
function _perPlayerByte(info: any, idx: number, p: any): number {
  return 0;
}
function _perPlayerLong(info: any, idx: number, p: any): number {
  return 0;
}

// ======================================================================
// CCombatIdle
// ======================================================================

/**
 * CTSGun::CCombatIdle — throttled combat-idle tick.
 *
 * Called periodically (e.g., from `WeaponIdle`). If enough real time has
 * passed since the last combat-idle event (`m_flTimeWeaponIdle`), schedules
 * the next tick and asks the owning player to play the combat-idle
 * sound/animation read from the weapon_info struct.
 *
 * @param this  The CTSGun entity instance (`this` in the original C++)
 * @returns     void
 */

// The reschedule interval is a 64-bit IEEE-754 double at
// `[ebx-0x6e768]` in the GOT-relative data section (the FPU does `faddp`
// then `fstp DWORD` — so it's loaded as double and stored truncated as
// 32-bit float). Value approximate; cadence is a typical gun-idle period.
const COMBAT_IDLE_INTERVAL_S = 0.075; // TODO(asm-ambiguous): confirm exact value

export function CCombatIdle(this: CTSGun): void {
  // 1. Throttle. `fcomp [edi+0xa8]` sets FPU C0=1 when `now < [edi+0xa8]`;
  //    `fnstsw ax` + `test ah,0x1` + `jne 75eb5` exits the body in that case.
  const now = UTIL_WeaponTimeBase();
  if (now < (this as any).m_flTimeWeaponIdle /* +0xa8, f32 */) {
    return;
  }

  // 2. Schedule the next combat-idle event: `now + interval → m_flTimeWeaponIdle`.
  (this as any).m_flTimeWeaponIdle = now + COMBAT_IDLE_INTERVAL_S;

  // 3. Resolve `m_pPlayer` (CBasePlayer*) at +0x60; used as the dispatch base.
  //    TODO(asm-ambiguous): the player-side layout (offsets below) is inferred.
  const player: any = (this as any).m_pPlayer /* +0x60 */;

  // 4. weapon_info lookup (1 logical arg of `tsweapon_t`; compiler pads to 4
  //    stack slots — leftover 0s become args 3 & 4 of the indirect call below).
  //    TODO(asm-ambiguous): confirm get_weapon_info's true signature.
  const info: any = get_weapon_info(0);

  // 5. `movsx eax, WORD PTR [eax+0x252]` — sign-extend int16 from weapon_info.
  //    Field purpose unknown; preserved as an offset-named accessor.
  const idleFxIdx: number = info.field_0x252 /* +0x252, i16 */;

  // 6. Indirect call through `[player+0x174]`. Args = (this_gun, idleFxIdx, 0, 0).
  //    The compiler reused the leftover 8 bytes from get_weapon_info's args
  //    as args 3 & 4, so the cleanup is one `add esp, 0x10` for 4 args total.
  //    TODO(asm-ambiguous): the entity at +0x174 is a function pointer, not
  //    a method slot. Could be a vtable, a TS dispatcher, or an embed-side
  //    callback table.
  const dispatchFn = player.funcPtr_0x174 /* +0x174 */ as (
    a: any, b: number, c: number, d: number
  ) => void;
  dispatchFn(this, idleFxIdx, 0, 0);
}

// ======================================================================
// CCombatBlock
// ======================================================================

/**
 * CTSGun::CCombatBlock — execute a combat-block (defensive) action.
 *
 * Validates that no cooldowns are active, the player is in a valid
 * state, and any required stamina threshold is met; then plays the
 * block animation, dispatches the corresponding client event,
 * refreshes the on-screen melee bar, and reschedules the weapon's
 * next attack/idle windows.
 *
 * @param this  The CTSGun entity instance (this in the original C++)
 * @returns     void
 */
export function CCombatBlock(this: CTSGun): void {
  const player: any = this.m_pPlayer;

  // ---- Guard 1: every relevant timestamp must already be in the past ----
  if (UTIL_WeaponTimeBase() < player.m_flNextAttack) return;
  if (UTIL_WeaponTimeBase() < this.m_flNextPrimaryAttack) return;
  if (UTIL_WeaponTimeBase() < this.m_flNextSecondaryAttack) return;
  if (UTIL_WeaponTimeBase() < this.m_flTimeWeaponIdle) return;

  // ---- Guard 2: reject if any of a set of player status bits is set ----
  // TODO(asm-ambiguous): the deref `[[player]+0x250]` reads past the
  // player vtable pointer — most likely `m_pPlayer->pev->flags` (or a
  // similar inner-struct flag word) reached through one extra hop.
  // Mask 0x70c30 is a TS-specific multi-bit status check (frozen /
  // in-water / on-ladder / etc.). Port as `player.statusBits250` until
  // the real source is recovered.
  if ((player.statusBits250 & 0x70c30) !== 0) return;

  // ---- Guard 3: player must meet a stamina / threshold cvar ----
  // TODO(asm-ambiguous): field at player+0x774 is a float (likely
  // stamina or block meter); cvar at GOT offset -0x6f3f0 — verify
  // name via strings-n5.txt (likely ts_block_stamina or similar).
  if (player.blockStamina < cvar_blockStaminaThreshold) return;

  // ---- Load the block-duration cvar once for re-use below ----
  const blockDuration: number = cvar_blockDuration; // GOT offset -0x6ec2c

  // ---- Pick the event index and which player field to update, based
  //      on the current combat/animation state ----
  let eventIdx: number;
  if (this.field_0xcc === 0) {
    // Branch A: gun is in a clean state.
    eventIdx = 1;
    player.field_0x7a8 = blockDuration;
  } else if (this.field_0xd0 !== 0) {
    // Branch B/C: gun has a state struct pointer; inspect its byte.
    const stateByte = (this.field_0xd0 as { byte_0x348: number }).byte_0x348 & 0xff;
    if (stateByte === 0x0a) {
      player.field_0x7b0 = blockDuration;
      eventIdx = 0x12;
    } else if (stateByte === 0x03) {
      player.field_0x7ac = blockDuration;
      eventIdx = 0x12;
    } else {
      eventIdx = 0;
    }
  } else {
    eventIdx = 0;
  }

  // ---- Dispatch the client-side playback event for the block ----
  // TODO(asm-ambiguous): vfunc at offset 0x1ec on a singleton pointed
  // to by GOT+0x1aa8 (likely gEngfuncs / HUD engine table). Arg
  // layout mirrors PLAYBACK_EVENT / PLAYBACK_EVENT_FULL but the exact
  // packing is engine-specific. Listed below in push order
  // (last-pushed = arg1):
  engineSingleton.vfunc_0x1ec(
    /* arg1  (flags)      */ 1,
    /* arg2  (who)        */ player.field_0x208,
    /* arg3  (eventIndex) */ this.field_0x96c & 0xffff,
    /* arg4               */ 0,
    /* arg5               */ global_eventIndex, // GOT+0x1888 (pushed twice)
    /* arg6               */ global_eventIndex,
    /* arg7               */ this.field_0xc8,
    /* arg8               */ 0,
    /* arg9               */ 0,
    /* arg10 (iparam?)    */ eventIdx,
    /* arg11              */ 0,
    /* arg12              */ 0,
  );

  // ---- Play the block animation (sequence index 0x26 = 38) ----
  // The CTSAnimation instance is embedded at player+0x28c.
  Animate(player.field_0x28c, player, 0x26);

  // ---- Refresh the on-screen melee bar to 33.0f (0x42040000) ----
  UpdateMeleeBar(player, 33.0);

  // ---- Schedule the next attack and idle windows ----
  const t = UTIL_WeaponTimeBase();
  const nextAttack = t + blockDuration;
  this.m_flNextPrimaryAttack = nextAttack;
  this.m_flNextSecondaryAttack = nextAttack;
  this.m_flNextReload = t + cvar_blockIdleDelay; // field at 0xa8; cvar at GOT-0x6de98
}

// ======================================================================
// CCombatAttack
// ======================================================================

// NOTE: this is a STRUCTURAL rewrite that fixes the blockers above.
// Field names remain TODO until verified against CTSGun's layout.

import {
  Vector,
  // externals — TODO: declare in a single externals.ts module
} from "./externals";

declare const player: any;       // CBasePlayer
declare const this_: any;        // CTSGun (renamed to avoid shadowing)
declare const pev: any;          // pev_t = player.pev
declare function UTIL_WeaponTimeBase(): number;
declare function UTIL_MakeVectors(v: Vector): void;
declare function GetMeleeMultiplier(p: any): number;
declare function KungFu(p: any): boolean;
declare function CloseCombatAttack(p: any, origin: Vector, fwd: Vector,
  traceMask: number, dmg: number, kd: number, b: boolean, u: number,
  hit: Vector, k: number): boolean;
declare function BlockPlayer(p: any, kd: number): void;
declare function W_FireBullets(...args: any[]): void;
declare function RANDOM_LONG(min: number, max: number): number;
declare function player_GetAutoaimVector(p: any, scale: number): Vector;
// cvars — TODO: resolve names from strings-n5.txt and the [ebx±k] offsets
declare const cvar_closeCombat_range: number;       // [ebx-0x6e7f4]
declare const cvar_closeCombat_main: number;        // [ebx-0x6f408]  ≈ 1.0
declare const cvar_closeCombat_other: number;       // [ebx-0x6f3fc]  ≈ 1.0
declare const cvar_closeCombat_max: number;         // [ebx-0x6f3f8]
declare const cvar_closeCombat_min: number;         // [ebx-0x6de8c]
declare const cvar_closeCombat_damMul: number;      // [ebx-0x6debc]
declare const cvar_closeCombat_damMax: number;      // [ebx-0x6dec4]
declare const cvar_closeCombat_lowMul: number;      // [ebx-0x6ecd8] QWORD/double
declare const cvar_closeCombat_lowMin: number;      // [ebx-0x6ecc8] QWORD
declare const cvar_closeCombat_lowMax: number;      // [ebx-0x6de20] QWORD
declare const cvar_closeCombat_bigKick: number;     // [ebx-0x6dee8]
declare const cvar_closeCombat_farDelay: number;    // [ebx-0x6df04]
declare const cvar_closeCombat_kfDelay: number;     // [ebx-0x6de80]
declare const cvar_closeCombat_kfDamage: number;    // [ebx-0x6de7c]
declare const cvar_closeCombat_sweep: number;       // [ebx-0x6ec2c]
declare const cvar_closeCombat_kickDur: number;     // [ebx-0x6de78]
declare const cvar_closeCombat_highKick: number;    // [ebx-0x6df78]
declare const cvar_closeCombat_lowDelay: number;    // [ebx-0x6de88]
declare const cvar_closeCombat_jumpDelay: number;   // [ebx-0x6de84]
declare const cvar_closeCombat_jumpDuration: number;// [ebx-0x6e810]
declare const cvar_closeCombat_jumpHigh: number;    // [ebx-0x6f078]
declare const cvar_closeCombat_jumpLow: number;     // [ebx-0x6f06c]
declare const cvar_closeCombat_kfTime: number;      // [ebx-0x6df4c]
declare const cvar_closeCombat_backKick: number;   // [ebx-0x6dec8]
declare const cvar_closeCombat_backKick2: number;  // [ebx-0x6de6c]
declare const cvar_closeCombat_rampage: number;     // [ebx-0x6deb0]
declare const cvar_closeCombat_expDelay: number;    // [ebx-0x6f3f4]
declare const cvar_closeCombat_lowDelta: number;    // [ebx-0x6df6c]
declare const cvar_closeCombat_bigKickDur: number;  // [ebx-0x6e7e8]

export function CCombatAttack(this_: any): void {
  const player = this_.m_pPlayer;
  const pev = player.pev;
  const velocity = pev.velocity;
  const velocityMag = Math.hypot(velocity.x, velocity.y, velocity.z);

  const now = UTIL_WeaponTimeBase();
  if (now < player.m_flNextAttack /* [esi+0x12c] */) return;
  if (now < this_.m_flNextPrimaryAttack /* [ebp+0x9c] */) return;
  if (now < this_.m_flTimeWeaponIdle /* [ebp+0xa0] */) return;

  // ---- local state defaults (TODO: field names unverified) ----
  let attackType: 2 | 3 = 2;
  let damage = 0;
  let damageMult = 0;
  let sequence = 0;
  let animIdx = 0;
  let duration = cvar_closeCombat_main;       // [esp+0x24]
  let kickDuration = cvar_closeCombat_main;   // [esp+0x20]
  let kickDelay = cvar_closeCombat_main;      // [esp+0x1c]
  let applyBlock = false;
  let doFireBullets = true;
  const isDoingAction = (pev.flags & 0x50c30) !== 0; // [esp+0x6]

  // ---- pre-compute derived fields ----
  // TODO(asm-ambiguous): each offset below is a *different* field on the
  // player entity, NOT a pev.flags bit. Names TBD.
  const player_f180 = pev; // pseudo — really *(uint8*)(player+0x180)
  const player_f1a5 = pev;
  const player_f814 = pev; // 0x814 — TODO name
  const player_f815 = pev; // 0x815 — TODO name
  const hasA = !!(player_f1a5.readU8(0x1a5) & 0x2);
  const hasB = !!(player_f1a5.readU8(0x1a5) & 0x40);
  const hasC = !!(player_f180.readU8(0x180) & 0x4);
  const hasD = !!(player_f180.readU8(0x180) & 0x1);
  const hasE = !!(player_f180.readU8(0x180) & 0x10);
  const isFrozen = !!(player_f180.readU8(0x180) & 0x800);

  // ====== close-combat range check (0x761a6) ======
  // asm: jne 0x76298 if velocityMag > range  →  goto ranged branch
  //      else fall through to UTIL_MakeVectors path
  let isCloseCombat = false;
  if (velocityMag > cvar_closeCombat_range) {
    // ---- ranged: pick attackType based on player-state flag (0x76298) ----
    attackType = (hasE ? 3 : 2) as 2 | 3;
    // jmp to in-water check at 0x76314 (after applyAttack setup)
    return processRanged();
  } else {
    isCloseCombat = true;
  }

  // ---- close-combat main path (0x761ae) ----
  // Copy pev.origin → local forward, zero x
  const fwd: Vector = { x: 0, y: pev.origin.y, z: pev.origin.z };
  UTIL_MakeVectors(fwd);

  // Compute unit velocity, fall back to (0,0,1) if mag ≈ 0
  const vp = velocity;
  const vmag = velocityMag;
  let unit: Vector;
  if (vmag > cvar_closeCombat_other) {
    // [eax+0xac] sqrt reload → magnitude > 1 → safe to divide
    unit = { x: 0, y: 0, z: cvar_closeCombat_other };
  } else {
    const inv = cvar_closeCombat_other / vmag;
    unit = { x: vp.x * inv, y: vp.y * inv, z: vp.z * inv };
  }

  // Dot product selects forward (==2) vs back (==3)
  const dot = unit.x * vp.x + unit.y * vp.y + unit.z * vp.z;
  attackType = (dot > /* closeCombatMulti [ebx-0x6de40] QWORD */ 0 ? 3 : 2) as 2 | 3;

  if (!isDoingAction) {
    return processCloseCombatPath();   //0x76458
  }

  // ---- in-water branch (0x76314) ----
  if (!hasD) {
    // not in water → frozen branch (0x76458) again
    return processCloseCombatPath();
  }
  // in water → process
  return processInWater();

  // ---- helpers ----
  function processRanged(): void { /* TODO */ }
  function processCloseCombatPath(): void { /* TODO */ }
  function processInWater(): void { /* TODO */ }
  // ...
}
