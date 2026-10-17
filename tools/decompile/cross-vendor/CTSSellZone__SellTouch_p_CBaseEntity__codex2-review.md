```
VERDICT: FAIL

Reason #1 (structural, not the TS's fault): the review template
is designed for the four engine↔mod interface functions
(`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`,
`GetNewDLLFunctions`). Applying it verbatim to
`CTSSellZone::SellTouch` produces mostly n/a items. Most of
this checklist can't be meaningfully checked on a gameplay
method, so I can't honestly verdict anything other than FAIL.

Reason #2 (real, in the TS itself): the decompiled TS makes
several speculative field-name choices and has at least one
semantic inversion (see issues #2, #5, #6 below).

Checklist:
1. Signature — ✅ — `(this: CTSSellZone, pOther: CBaseEntity): void` matches the
   two-arg `__thiscall` of the disassembly (this in [esp+0x20],
   pOther in [esp+0x24]; void return).
2. Version check — n/a — no version check in source; template
   item inapplicable for this function.
3. interfaceVersion assignment — n/a — template item
   inapplicable.
4. Success path: struct copy — n/a — no memcpy in source;
   the "success path" is cash credit + UTIL_Remove.
5. No fabricated paths — ⚠️ — high-level control flow follows
   the asm (the ~6 conditional branches to 0x62992 are all
   preserved as early-returns), but several field/vtable-slot
   choices are speculative (m_pActiveItem, CanHolster, m_hOwner,
   m_pOwner, m_iCash, m_fFlags, m_iTeam).
6. No TODO body — ⚠️ — five `TODO(asm-ambiguous)` markers
   flag genuinely ambiguous interpretations, but the body is
   expressed in code (with `as any` casts), not stubbed out.
   Borderline pass.
7. Field names — ⚠️ — heavy reliance on `(x as any).<guess>`.
   `m_pActiveItem`, `m_hOwner`, `m_pOwner`, `m_iCash`, `m_iId`,
   `m_fFlags`, `m_iTeam`, `CanHolster`, `TeamID` are all guesses.
   None can be verified from the disassembly alone.
8. Compiles in isolation — ✅ — `as any` casts throughout;
   external symbols (`sTeamNames`, `CTSGameRules`, `FStrEq`,
   `STRING`, `CashBased`, `UTIL_Remove`, `UTIL_PlayerByIndex`,
   `GetWeaponInfo`) are referenced but not declared — fine for a
   standalone file as long as the project provides them.

Issues to fix:

1. **Template mismatch (you should fix this first).** The
   checklist items for version check / interfaceVersion
   write-back / struct copy are not relevant for D.4 gameplay
   methods. Build a D.4-appropriate checklist (signature,
   control flow vs disassembly, field/vtable-slot fidelity,
   flag handling, entity lifecycle, extern-call wiring).

2. **`[pev+0x208]` is far beyond standard pev.** Standard HLSDK
   `entvars_t` ends around offset 0x108; the `owner` field is
   at 0x84. Offset 0x208 = 520 bytes past the start of pev —
   not standard. Either this is a TS-specific extended pev
   field, or the disassembly's `[esi]` first-deref is reading
   a different class member than `pev` (e.g. `[esi+0]` is
   actually an inline `m_hOwner` raw int, not a pev pointer).
   The TS guesses `(pOther as any).m_hOwner?.Get?.()`, which
   is plausible but unsupported. Recommend renaming to
   `(pOther as any).pev[0x208]` with a `// TODO` until verified.

3. **`[esi+0x7c]` is unverified as `m_pActiveItem`.** HLSDK's
   `CBasePlayer` has `m_pActiveItem` at a small offset but 0x7c
   is a guess. Same advice: label as
   `(pOwner as any)[0x7c]` until you have a TS class dump.

4. **`CanHolster` vtable-slot guess.** The asm has a vtable   call at offset 0xc8 (slot 50) on what you call "the active
   item". HLSDK's `CBasePlayerItem::CanHolster()` exists but at
   a different vtable slot. Could equally be `IsDeployable`,
   `IsUseable`, or a TS-custom `IsSellable`. Mark as TODO.

5. **`operator!` semantics may be inverted (BUG).** You read
   `[edi+0xbc]` via `m_hOwner?.IsNull?.()` and abort on null,
   but the asm has:
 call __opi__7EHANDLE
       test eax, eax
       je <end>
   If `__opi__` is `EHANDLE::operator!()` with the standard
   "returns 1 when null, 0 when set" semantics, then `je` jumps
   (aborts) when `operator!` returned 0 → when the handle IS
   SET. Your TS aborts when the handle IS NULL — opposite
   condition. Verify once TS EHANDLE source is available;
   right now your TS has the polarity flipped. This is a real
   semantic bug, not just an unknown field name.

6. **`TeamID` called on the wrong `this` (BUG).** The virtual
   call at 0x628ec with vtable offset 0xd0 (slot 52) is on
   `esi`, which the disassembly tracks as the **player**
   (re-fetched through weapon's m_pOwner → +0x7c). Your TS
   calls it as `(pActiveItem as any).TeamID?.()` — wrong `this`.
   Should be on the player object (your `pPlayer`), not the
   active item. The argument order to `GetTeamIndex` matches
   the asm push order (eax from virtual call pushed first =
   last arg = team name string; then `[ebx+0x14f0]` = sTeamNames
   base = first arg) — that part is correct.

7. **`UTIL_Remove(pActiveItem)` is correct — your TODO comment
   is misleading.** edi is set at 0x62869
   (`mov edi, edx` where `edx = [eax+0x7c]`) and never
   reassigned. edi is what gets pushed at 0x62989 before the
   `UTIL_Remove` call. edi is also what you read
   `[edi+0x88]` from (weapon id) and `[edi+0x9c]` from
   (bonus flags) — i.e., the active item. So removing the
   active item (NOT the weaponbox) IS what the disassembly
   does. Your TODO says "this may be a TS sell-zone quirk
   that swaps the player's current weapon out on touch" —
   that's actually the most likely explanation, not a
   decompilation error. Re-label as
   `// DELIBERATE: removes the player's active weapon (edi),
   // not the weaponbox (pOther)`.

8. **`m_iTeam !== -1` sentinel.** The asm compares
   `[ebp+0x64]` against `0xffffffff` (-1 in two's complement),
   so the sentinel is correctly -1. Minor: this.m_iTeam type
   isn't pinned (could be `int` or `short`).

9. **Cash credit target.** The asm credits `[esi+0x540]`, not
   `[edi+0x540]`. esi is the re-fetched player. Your TS uses
   `pPlayer.m_iCash += ...` — correct in spirit but only   because pPlayer happens to alias the player pointer that
   edi+0xd0 leads to. Variable naming is confusing. Recommend
   `const pSeller = ...` and keep that name consistent.

10. **Math is correct.** `shr edx,0x1f; add eax,edx; sar eax,1`
    is signed halving with round-toward-zero — matches C
    `(int)x / 2` for negative numbers. `Math.trunc(wi.cost / 2)`
    rounds toward zero for negatives, same semantics. ✓

Suggested rewrite (full corrected TS function):

```typescript
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
```

Net assessment: this is a reasonable skeleton with proper
TODO flags, but it has at least two real semantic bugs (the
EHANDLE polarity flip in step 5, the TeamID target being on
the wrong `this` in step 11) and a misleading comment about
the final `UTIL_Remove` (which is actually correct as-is).
Recommend keeping this in `tools/decompile/skeletons/` as
`SellTouch.skeleton.ts` and not promoting to `src/` until TS
source / class layouts are available to verify the fieldnames and vtable slots. The D.4 review template (when you
build one) should include specific checks for polarity of
`test/je` after boolean-returning operators, and for vtable
slot verification against known HLSDK slot tables.
