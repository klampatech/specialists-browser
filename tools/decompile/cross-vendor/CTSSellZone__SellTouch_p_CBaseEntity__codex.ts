Based on my analysis of the disassembly, here is the decompiled TypeScript:

```typescript
/**
 * CTSSellZone::SellTouch — Sell zone touch handler.
 *
 * When an entity touches the sell zone, validate it as a dropped weaponbox,
 * locate the owning player, find their active weapon, credit the player with
 * half the weapon's cost (plus four bit-flag bonuses), then remove the
 * weapon entity.
 *
 * @param this   The CTSSellZone entity instance
 * @param pOther The touching entity (a dropped CWeaponBox)
 * @returns     void
 */
export function SellTouch(this: CTSSellZone, pOther: CBaseEntity): void {
  // 1. Reject anything that isn't a dropped "weaponbox".
  //    The string constant at [ebx-0x6b6c5] resolves to "weaponbox".
  //    STRING(classname) is computed as gpGlobals->pStringBase + (int)pev->classname
  //    via the triple-deref gpGlobals pattern at [ebx+0x1600].
  if (!FStrEq(STRING((pOther as any).pev.classname), "weaponbox")) {
    return;
  }

  // 2. Server must be running in CashBased mode for sell zones to take effect.
  if (!CashBased()) {
    return;
  }

  // 3. Resolve the player who dropped this weaponbox.
  //    The [[esi]+0x208] double-deref is the inlined EHANDLE::Get() pattern
  //    (pev->owner resolves through pEdicts->pvPrivateData).
  //    Fallback to player index 0 if the handle is null.
  // TODO(asm-ambiguous): the [[esi]+0x208] double-deref pattern doesn't
  // map cleanly to a standard CBaseEntity layout. Likely pOther->m_hOwner.Get()
  // inlined, or pOther being treated as a pev_t* with owner at offset 0x208
  // of an extended entvars_t (TS custom field).
  let pOwner: CBasePlayer | null = (pOther as any).m_hOwner?.Get?.() ?? null;
  if (!pOwner) {
    pOwner = UTIL_PlayerByIndex(0);
  }
  if (!pOwner) {
    return;
  }

  // 4. Walk from player to their currently-held weapon.
  //    [eax+0x7c] of the player resolves to m_pActiveItem (active weapon pointer).
  // TODO(asm-ambiguous): [player+0x7c] could be m_pActiveItem directly, or
  // m_hActiveItem's resolved pointer (.Get()); offset is unusual.
  const pActiveItem: any = (pOwner as any).m_pActiveItem;
  if (!pActiveItem) {
    return;
  }

  // 5. The active weapon must have both an owner EHANDLE and matching pointer set.
  //    +0xbc is an EHANDLE field (likely m_hOwner), +0xd0 the matching pointer
  //    field (likely m_pOwner).
  // TODO(asm-ambiguous): exact field names (m_hOwner vs m_hPlayer, etc.)
  if (((pActiveItem as any).m_hOwner?.IsNull?.())) {
    return;
  }
  if (!pActiveItem.m_pOwner) {
    return;
  }

  // 6. Re-fetch the player pointer through the weapon's owner field.
  //    [edi+0xd0] is m_pOwner, then [[edi+0xd0]+0x7c] re-derives the
  //    player-equivalent pointer used for cash access at +0x540.
  // TODO(asm-ambiguous): this round-trip back to "the player" via
  // [weapon.m_pOwner][+0x7c] is unusual — likely re-entering the player
  // struct from the weapon's owner pointer.
  const pPlayer: any = (((pActiveItem as any).m_pOwner) as any);
  if (!pPlayer) {
    return;
  }

  // 7. Confirm the weapon is sellable via a virtual call returning non-zero.
  //    vtable offset 0xc8 — likely CanHolster() or similar boolean check.
  // TODO(asm-ambiguous): vtable[0xc8] could be CanHolster, IsWeaponInSlot,
  // or some TS-specific validity check.
  if (!((pActiveItem as any).CanHolster?.())) {
    return;
  }

  // 8. Reject grenades (weapon id 0x1d = TS grenade constant).
  const weaponId: number = pActiveItem.m_iId;
  if (weaponId === 0x1d) {
    return;
  }

  // 9. Team filter — if the sell zone has a team index, require the weapon's
  //    owning player to be on that team.
  if (this.m_iTeam !== -1) {
    const teamName: string = (pActiveItem as any).TeamID?.() ?? "";
    const teamIdx: number = CTSGameRules.GetTeamIndex(
      (sTeamNames as any)[this.m_iTeam],
      teamName,
    );
    if (this.m_iTeam !== teamIdx) {
      return;
    }
  }

  // 10. Credit half the weapon's base cost to the player.
  //     Signed integer division: (cost >> 31) is added before sar 1 to round
  //     toward zero (matches the shr edx,0x1f / add eax,edx / sar eax,1 idiom).
  const wi: WeaponInfo = GetWeaponInfo(weaponId);
  const halfCost: number = Math.trunc(wi.cost / 2);
  pPlayer.m_iCash += halfCost;

  // 11. Apply four bit-flag bonuses from the weapon (flags at [edi+0x9c]).
  //     Each flag bit triggers a different cash bonus. Bits 0..3 of the byte.
  if (pActiveItem.m_fFlags & 0x1) {
    pPlayer.m_iCash += 0x1c2;
  }
  if (pActiveItem.m_fFlags & 0x2) {
    pPlayer.m_iCash += 0x190;
  }
  if (pActiveItem.m_fFlags & 0x4) {
    pPlayer.m_iCash += 0xfa;
  }
  if (pActiveItem.m_fFlags & 0x8) {
    pPlayer.m_iCash += 0x384;
  }

  // 12. Remove the weapon entity (edi in the disassembly, which holds the
  //     weapon-id and bonus-flags fields — i.e., the active weapon, not pOther).
  // TODO(asm-ambiguous): the disassembly removes edi (the active weapon) rather
  // than pOther (the weaponbox). This may be a TS sell-zone quirk that swaps
  // the player's current weapon out on touch, or my interpretation of the
  // register-aliased pointers is off.
  UTIL_Remove(pActiveItem);
}
```
