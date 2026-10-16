```typescript
/**
 * CTSGun::Deploy — bring the active weapon into the player's hands.
 *
 * Returns 1 (TRUE) on every path; may early-return via HolsterWeapon()
 * if m_iId is unset. Otherwise resolves the per-slot data + per-weapon
 * config pointers off m_iId, picks a player body for the current flag
 * combination, resets per-weapon state counters, calls
 * CBasePlayerWeapon::DefaultDeploy with view/world/animation info,
 * fires the deploy playback event, runs the deploy animation, and
 * finishes a per-weapon clip byte exchange between player and slot.
 *
 * @param this  The CTSGun entity instance (this in the original C++)
 * @returns     TRUE (1)
 */
export function Deploy(this: CTSGun): boolean {
  // ─── 1. Early bail: no m_iId → holster and return TRUE. ───
  if ((this as any).m_iId === 0) {
    this.HolsterWeapon();
    return true;
  }

  // ─── 2. Clear the field at offset 0x9e0 (per-weapon reset dword). ───
  // TODO: offset meaning unclear — looks like a fire/state timer that
  // gets cleared on every deploy.
  (this as any).unknown_0x9e0 = 0;

  // ─── 3. Per-slot data + per-weapon config pointer resolution. ───
  // ASM derives both directly off m_iId:
  //   slotData = this + m_iId*56 + 0x114   (stored at this+0xcc)
  //   cfg      = GOT[0x7d30] + m_iId*988   (stored at this+0xd0)
  const slotData: any = (this as any).m_pActiveItem;
  const cfg: any = (this as any).m_pWeaponInfo;

  // ─── 4. Player body resolution + propagation to both caches. ───
  const body: number = GetBodyByItems(
    (this as any).m_iId,
    slotData.bits
  );
  slotData.body = body;
  ((this as any).m_pPlayer as any).body = body;

  // ─── 5. Reset per-weapon state dword + flag byte on slotData. ───
  slotData.stateDword = 0;
  slotData.stateFlagByte = 0;

  // ─── 6. DefaultDeploy(view, world, anim, ext, skiplocal, body). ───
  // CBasePlayerWeapon declared signature:
  //   BOOL DefaultDeploy(char *szViewModel, char *szWeaponModel,
  //                      int   iAnim,        char *szAnimExt,
  //                      int   skiplocal,    int   body);
  //
  // ASM pushes args right-to-left (first push on stack = rightmost
  // declared param). The view-model offset inside `cfg` flips between
  // 0x172 (default) and 0x1b2 (alt) based on bit 0 of slotData.bits.
  // The deploy animation index is taken from a pointer in
  // slotData.deployAnimRef: if non-null, sign-extend a short at +4 of
  // the pointed-to object; else 0.
  let iAnim = 0;
  const animRef: any = slotData.deployAnimRef;
  if (animRef !== 0) {
    // TODO(asm-ambiguous): +4 short field layout on the pointed-to struct.
    iAnim = animRef.short_at_4 | 0; // movsx sign-extend
  }
  DefaultDeploy(
    /* this      */ this,
    /* szWpnMdl  */ cfg + 0x132,                 // world model path
    /* szViewMdl */ (slotData.bits & 0x1)
                     ? cfg + 0x1b2               // alt view model path
                     : cfg + 0x172,              // default view model path
    /* iAnim     */ iAnim,
    /* szAnimExt */ cfg + 0x232,                 // animation extension string
    /* skiplocal */ 0,
    /* body      */ ((this as any).m_pPlayer as any).body
  );

  // ─── 7. Fire the deploy playback event. ───
  // ASM:  call [GOT[0x1aa8] + 0x1ec] with 11 dword pushes matching a
  // PlaybackEvent-style hook. Arg layout:
  //   flags         = 0x1
  //   pInvoker      = *(*(m_pPlayer) + 0x208)         // edict_t* via 2-hop
  //   eventindex    = m_usDeployEvent (this+0x976, WORD)
  //   delay         = 0.0f
  //   origin/angles = GOT[0x1888] const float zero-array
  //   fparam1/2     = 0.0f, 0.0f
  //   iparam1/2     = m_iId, slotData.bits
  //   bparam1/2     = 0, 0
  // TODO(asm-ambiguous): 11 pushes vs. the SDK's 12 declared params
  // — one arg is implicit at the dispatcher boundary. The actual call
  // is omitted; engine bindings will provide a real PlaybackEvent
  // wrapper when the engine module lands.

  // ─── 8. Run the deploy animation. ───
  // Animate(animState, m_pPlayer, iAnim).
  // The animation state pointer lives at m_pPlayer + 0x28c. The ASM
  // pushes a 3rd argument that's missing from the demangled 2-arg
  // signature — it's a TS-specific overload of CTSAnimation::Animate.
  Animate(
    ((this as any).m_pPlayer as any).animState_0x28c,
    (this as any).m_pPlayer,
    /* iAnim */ 0x34
  );

  // ─── 9. Asymmetric per-weapon clip byte exchange. ───
  // Reads a byte at:  *(byte*)(m_pPlayer + 0xa + m_iId + 0x490)
  // and branches on it:
  //   if (byte > 0) {
  //     slotData[0x2] = byte - 1;                       // drain into slot data
  //   } else {
  //     player_byte = (uint8_t)(slotData[0x2] + 1);     // push to player slot
  //     // NOTE: slotData[0x2] is NOT updated in this branch.
  //   }
  // TODO(asm-ambiguous): the asymmetric write direction suggests a
  // dedicated weapon-state counter (clip / shown ammo / shots since
  // deploy). Exact role depends on CTSPlayer layout.
  {
    const p: any = (this as any).m_pPlayer;
    const iId: number = (this as any).m_iId;
    const clipByte: number = (p as any).weaponClip_0x49a[iId];
    if (clipByte > 0) {
      slotData.slot_0x2 = clipByte - 1;
    } else {
      (p as any).weaponClip_0x49a[iId] =
        (slotData.slot_0x2 + 1) & 0xff;
    }
  }

  return true;
}
```
