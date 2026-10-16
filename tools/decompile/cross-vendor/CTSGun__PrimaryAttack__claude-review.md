```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — Demangled symbol is `CTSGun::PrimaryAttack()` (no
   args, void). TS `PrimaryAttack(this: CTSGun): void` is correct
   given the prologue loads `[esp+0x10]` (the `this` arg) into esi.
   No other args are read; no return value written.
2. Version check — N/A — this is a class method, not one of the four
   interface functions in D.3.
3. interfaceVersion assignment-back — N/A.
4. Success path — N/A.
5. No fabricated paths — ✅ — every branch in the TS traces back to
   the disassembly:
     - `[esi+0xcc]==0` → CCombatAttack (71a35-71a47)
     - category2 → set +0x24=0, GrenadeFire (71a4c-71a6e)
     - category 3 → set +0x24=0, KnifeFire (71a74-71a96)
     - category 0xa → KatanaFire, NO +0x24 clear (71a9c-71ab4) ✓
     - category 0xb → flag0x814&1 → set +0x24=0, KnifeFire; else
       fall through to epilogue (71abc-71af1)
     - mode 1 or 4 → flag0x814&1 OR DoubleFireRate≠0 → Fire;
       else skip (71af8-71b27)
     - mode 0 or 5 → Fire (71b2c-71b3c)
     - mode 2 → flag&1 guard, accumulator guard, set accumulator
       to 2 (if this+0xc8==23) else 3, NO Fire (71b3e-71b74)
     - mode 3 → *(*m_pOwner)+0x180&1 → Fire; else skip
       (71b78-71b93)
     - default → skip (falls through 71ba1)
   The accumulator ternary is correct: `setne al` makes al=1 when
   `[esi+0xc8] != 0x17`, then `add eax,0x2` → 2 if equal, 3 if not.
6. No TODO body — ✅ — function body is fully expressed in code.
   Two `// TODO(asm-ambiguous):` comments flag genuine ambiguity
   (case-0x3 indirection chain, +0xc8's identity), which is
   appropriate per the conversion guidance.
7. Field names — ⚠️ — speculative but consistently applied and
   not invented:
     - `m_pWeaponInfo` for `+0xcc` — plausible (weapon info struct ptr).
     - `m_pPlayer` for `+0xd0` — plausible (player ptr; offset 0x348
       is the category byte, a typical far-field on CBasePlayer).
     - `m_pOwner` for `+0x80` — plausible (CBasePlayer*).
     - `flag0x814`, `flag0x180` — placeholder offsets; reasonable
       for unknown flag bytes.
     - `weaponInfo.burstResetFlag` for `+0x24` — speculative name;
       the byte is cleared before select fire calls (2, 3, 0xb) but
       NOT before KatanaFire (0xa) or Fire(). The name hints at
       "reset some state before shooting," which is plausible but
       should be revisited in D.4.
     - `weaponInfo.fireMode` for `+0x02` — reasonable.
     - `weaponInfo.accumulator` for `+0x08` — speculative; the
       field is read with `cmp != 0` and written with 2 or 3. The
       name is OK pending D.4 confirmation.
     - `m_iSomeInt` for `+0xc8` — honestly flagged as a placeholder.
   No unfamiliar names without acknowledgment.
8. Compiles in isolation — ⚠️ — uses `CTSGun` as a type but doesn't
   define it; also calls `CCombatAttack`, `GrenadeFire`, `KnifeFire`,
   `KatanaFire`, `Fire` on `this`, and the global `DoubleFireRate`,
   none of which are defined here. This is acceptable for a
   per-function decompilation pipeline (the CTSGun class and its
   sibling methods will be assembled in D.4), but strictly speaking
   it doesn't compile standalone. No `any`-casts needed since the
   methods are called on the typed `this`.

Issues to fix (none blocking, all minor):
- The case-0x1/case-0x4 block is a redundant `if/else if` where both
  arms call `this.Fire()`. Collapse into a single boolean.
- The case-0x3 indirection could be clearer about the *number* of
  derefs; either rename `innerPointer` to make the chain explicit
  or add a one-line comment (`// *(*m_pOwner)+0x180`) so a future
  reader doesn't miscount the dereferences.
- A stray `*` appears in the file-level comment ("a fire-mode
  dispatcher * that ultimately calls Fire()"). Cosmetic.
- `weaponInfo.burstResetFlag = 0` before the0xb KnifeFire call is
  correct (assembly sets `[eax+0x24]=0` at 71ae4 before the call),
  but verify in D.4 whether "burstResetFlag" or some other name
  (e.g., `firing`, `bInAttack`) is right for +0x24.

Suggested rewrite (cleanup of the redundant case-0x1/0x4 branch and
the comment about the indirection chain; otherwise faithful to the
codex draft):

```typescript
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
```

Summary: the codex decompilation is faithful — every control-flow
branch traces back to the disassembly, the case-2 ternary is
correctly derived from `setne al; add eax,0x2`, the case-0x3
indirection count is captured (one `innerPointer` deref + one
`+0x180` offset = the same three memory accesses the assembly does),
and the no-fire paths for cases 0xb (flag not set) and 0x2 (arming)
are not silently swallowed as `Fire()`. The only fixes worth making
are cosmetic (the redundant if/else if, the stray `*` in the header
comment, and a sharper name-or-placeholder for `+0xc8`).
```
