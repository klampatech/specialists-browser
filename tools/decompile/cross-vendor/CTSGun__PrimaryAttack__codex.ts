```typescript
/**
 * CTSGun::PrimaryAttack — handle a primary attack press.
 *
 * Routes to GrenadeFire / KnifeFire / KatanaFire based on the player's
 * weapon-category byte, then falls through to a fire-mode dispatcher * that ultimately calls Fire(). If the gun has no weapon-info attached,
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
      // Always fire when owner flag bit 1 is set; otherwise consult
      // DoubleFireRate (fire only if it returns non-zero).
      if ((this.m_pOwner.flag0x814 & 0x1) !== 0) {
        this.Fire();
      } else if (DoubleFireRate(this.m_pOwner) !== 0) {
        this.Fire();
      }
      // else: rate-limited, skip this tick
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
      // TODO(asm-ambiguous): +0xc8's meaning is unclear; it is compared
      // to 23 (0x17) and selects accumulator value 2 vs 3.
      weaponInfo.accumulator = this.m_iSomeInt === 23 ? 2 : 3;
      return;
    }
    case 0x3: {
      // Gate by a flag at *(*m_pOwner)+0x180 bit 1.
      // TODO(asm-ambiguous): the chain *(*m_pOwner) implies m_pOwner
      // points to a struct whose first field is another pointer (e.g.
      // m_pActiveItem at offset 0); the precise CBasePlayer layout is
      // not visible in this chunk.
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
