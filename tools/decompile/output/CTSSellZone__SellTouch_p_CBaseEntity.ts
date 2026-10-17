/**
 * CTSSellZone::SellTouch — sell zone touch handler.
 *
 * When an entity touches the sell zone, validate it as a dropped weaponbox,
 * locate the owning player, walk to their currently-held weapon, require the
 * weapon to be sellable (CanHolster-like vtable check), reject grenades,
 * optionally enforce a team filter, credit the player with half the weapon's
 * base cost plus four bit-flag bonuses, then remove the player's active
 * weapon (NOT the weaponbox — that's the TS sell-zone quirk).
 *
 * @param this   The CTSSellZone entity instance
 * @param pOther The touching entity (a dropped CWeaponBox)
 * @returns     void
 */
export function SellTouch(this: CTSSellZone, pOther: CBaseEntity): void {
  // === Step 1: reject anything that isn't a "weaponbox" ===
  // STRING(classname) = gpGlobals->pStringBase + pev->classname (int)
  if (!FStrEq(STRING((pOther as any).pev.classname), "weaponbox")) return;

  // === Step 2: server must be in CashBased mode ===
  if (!CashBased()) return;

  // === Step 3: resolve the owner via [pev+0x208], fallback to player 0 ===
  // [esi+0x208] is NOT standard pev->owner (which is at +0x84 in HLSDK).
  // It's either a TS-extended pev field or a different class member.
  // TODO(asm-ambiguous): confirm this is m_hOwner raw int vs a TS-custom field.
  const rawOwner: number = (pOther as any).pev?.[0x208] ?? 0;
  let pOwner: CBasePlayer | null = rawOwner
    ? UTIL_PlayerByIndex(rawOwner)
    : null;
  if (!pOwner) pOwner = UTIL_PlayerByIndex(0); // fallback path (call [eax+0x114])
  if (!pOwner) return;

  // === Step 4: walk to the player's active item via [player+0x7c] ===
  // 0x7c is unverified as m_pActiveItem.
  // TODO(asm-ambiguous): confirm m_pActiveItem offset in TS CBasePlayer.
  const pActiveItem: any = (pOwner as any)[0x7c];
  if (!pActiveItem) return;

  // === Step 5: validate the active item's owner EHANDLE at [edi+0xbc] ===
  // Asm: call operator!; je to end when eax == 0.
  // If operator! returns 1 when null (standard), then asm ABORTS when
  // handle is SET (not null). Original TS got this polarity backwards.
  // TODO(asm-ambiguous): verify EHANDLE::operator! semantics in TS source.
  if (IsEHANDLEValid(pActiveItem, 0xbc)) return; // polarity flipped from original TS

  // === Step 6: confirm the active item's direct owner ptr at [edi+0xd0] is set ===
  if (!pActiveItem[0xd0]) return;

  // === Step 7: re-fetch the player through the weapon's owner pointer ===
  // [edi+0xd0] gives a player pointer; pSeller aliases esi later.
  const pSeller: CBasePlayer = pActiveItem[0xd0];

  // === Step 8: re-fetch the active item from pSeller via [seller+0x7c] ===
  // esi = [eax+0x7c] where eax = [edi+0xd0] = pSeller.
  const pActiveAgain: any = (pSeller as any)[0x7c];
  if (!pActiveAgain) return;

  // === Step 9: vtable call on pActiveAgain at slot 0xc8/4 (CanHolster-ish) ===
  // 0xc8 is unverified — could be CanHolster, IsDeployable, IsUseable,
  // or a TS-custom IsSellable.
  // TODO(asm-ambiguous): confirm vtable slot 0xc8/4 in TS CBasePlayerItem.
  const sellable: number = (pActiveAgain as any).CanHolster?.() ?? 0;
  if (!sellable) return;

  // === Step 10: reject grenades (weapon id 0x1d) ===
  // [edi+0x88] holds the weapon id; cmp with 0x1d; je end.
  const weaponId: number = pActiveAgain[0x88];
  if (weaponId === 0x1d) return;

  // === Step 11: team filter ([this+0x64] is the sell zone's team index) ===
  // Sentinel 0xffffffff == -1 means "no team filter".
  if ((this as any)[0x64] !== -1) {
    // Virtual call on pSeller at vtable slot 0xd0/4 (TeamID or similar).
    // Arg order: (sTeamNames[team], playerTeamName) — last arg pushed first.
    const playerTeamName: string = (pSeller as any).TeamID?.() ?? "";
    const teamIdx: number = CTSGameRules.GetTeamIndex(
      (sTeamNames as any)[(this as any)[0x64]],
      playerTeamName,
    );
    if ((this as any)[0x64] !== teamIdx) return;
  }

  // === Step 12: credit half the weapon's base cost (signed halve, round-to-zero) ===
  // shr edx,0x1f / add eax,edx / sar eax,1 = C `(int)x / 2` for negatives.
  const wi: WeaponInfo = GetWeaponInfo(weaponId);
  const halfCost: number = Math.trunc(wi.cost / 2);
  (pSeller as any)[0x540] += halfCost; // [esi+0x540] = pSeller's m_iCash

  // === Step 13: apply four bit-flag bonuses from [edi+0x9c] (bits 0..3) ===
  const flags: number = pActiveAgain[0x9c];
  if (flags & 0x1) (pSeller as any)[0x540] += 0x1c2;
  if (flags & 0x2) (pSeller as any)[0x540] += 0x190;
  if (flags & 0x4) (pSeller as any)[0x540] += 0xfa;
  if (flags & 0x8) (pSeller as any)[0x540] += 0x384;

  // === Step 14: remove the active item (edi), NOT the weaponbox (pOther) ===
  // DELIBERATE: this is a TS sell-zone quirk — the player's current weapon
  // is removed (so they no longer hold it), not the dropped weaponbox.
  UTIL_Remove(pActiveAgain);
}
