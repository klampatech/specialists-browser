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