```typescript
/**
 * CTSGun::SecondaryAttack — secondary-fire handler.
 *
 * Order of operations:
 *   1. No status struct attached → delegate to CCombatAttack() and bail.
 *   2. Per-weapon-class dispatch on info+0x348:
 *        0x2 (grenade) → GrenadeFire()     (sets status.firedSecondary)
 *        0x3 (knife)   → KnifeFire()       (sets status.firedSecondary)
 *        0xa (katana)  → KatanaThrow()
 *        0xb           → return (no secondary)
 *   3. Per fire-mode on status+0x2:
 *        4 → Fire() gated by player powerup (@+0x815&0x8) OR DoubleFireRate()
 *        5 → Fire()
 *      otherwise → fall through to zoom toggle
 *   4. Zoom toggle on status+0x10 & 0x8 (currently-zoomed bit):
 *        zoomed-in  → cvar-driven cycle through Zoom(info.dword_0x3c) /
 *                     Zoom(info.dword_0x40) / Unzoom()
 *        not zoomed → if preconditions are off, commit-dezoom (set ptr to
 *                     &info.animWord_0x252); else zoom-in (set state byte,
 *                     dispatch anim event, advance ptr to &info.animWord_0x28c)
 *   5. Schedule m_flNextSecondaryAttack and m_flTimeWeaponIdle from two cvars.
 *
 * @param this  The CTSGun entity (this in the original C++).
 * @returns     void
 */
export function SecondaryAttack(this: CTSGun): void {
  // ── 1. Combat-only fallback when no weapon-status struct is attached.
  if (this.m_status /* [esi+0xcc], pWeaponStatus? */ === null) {
    this.CCombatAttack();
    return;
  }

  const status = this.m_status; // [esi+0xcc] — weapon-status struct
  const info   = this.m_info;   // [esi+0xd0] — weapon-info / model struct

  // ── 2. Per-weapon-class dispatch on info+0x348 (weaponType byte).
  switch (info.weaponType /* byte @ +0x348 */) {
    case 0x2: // Grenade secondary (throw)
      status.firedSecondary = 1; // flag byte @ +0x24
      this.GrenadeFire();
      return;
    case 0x3: // Knife secondary (slash)
      status.firedSecondary = 1;
      this.KnifeFire();
      return;
    case 0xa: // Katana secondary (throw)
      this.KatanaThrow();
      return;
    case 0xb: // Weapon class has no secondary attack
      return;
  }

  // ── 3. Fire-mode 4/5 → Fire(). Mode 4 is gated.
  const fireMode = status.fireMode /* byte @ +0x2 */;
  if (fireMode === 4 || fireMode === 5) {
    const player = this.m_pPlayer; // [esi+0x80]
    if (fireMode === 4) {
      const hasPowerup = (player.byte_0x815 /* TODO: field name */ & 0x8) !== 0;
      if (!hasPowerup && !DoubleFireRate(player)) {
        return; // gated off — skip Fire()
      }
    }
    this.Fire();
    return;
  }

  // ── 4. Zoom toggle. Bit 3 of status+0x10 = "currently zoomed".
  if ((status.flags /* byte @ +0x10 */ & 0x8) !== 0) {
    // Already zoomed — drive a cvar-gated cycle / unzoom.
    //
    // TODO(asm-ambiguous): the cvar at [ebx-0x6f408] and the meaning of
    // player.field_0x214 (a time field) plus info.dword_0x3c / 0x40
    // (likely anim-frame indices cast to dword) cannot be pinned down
    // without engine-side verification. Behavior summary:
    //   if    cvarK == player.field_0x214 and info.dword_0x3c != 0
    //       → Zoom(info.dword_0x3c)
    //   elif  info.dword_0x40 != 0 and info.dword_0x40 != player.field_0x214
    //       → Zoom(info.dword_0x40)
    //   else  → Unzoom()
    const player = this.m_pPlayer;
    const K = cvars.zoomSentinel /* [ebx-0x6f408] */;
    if (K === player.field_0x214 /* TODO: real field name */) {
      if (info.dword_0x3c /* TODO: real field name */ !== 0) {
        this.Zoom(info.dword_0x3c);
      }
    } else if (info.dword_0x40 /* TODO: real field name */ !== 0
            && info.dword_0x40 /* fp-compare via fild */ as number !== player.field_0x214) {
      this.Zoom(info.dword_0x40);
    } else {
      this.Unzoom();
    }
  } else if (
    status.zoomState /* byte @ +0x2c */ !== 0 ||
    info.animWord_0x28c /* word @ +0x28c */ === 0xffff
  ) {
    // Not zoomed, but preconditions for zoom-in aren't met — commit to dezoom.
    status.zoomState = 0;
    //
    // TODO(asm-ambiguous): the dispatch below is `call [esi+0x60][0x174]`
    // — an indirect call through a function-table pointer installed at
    // +0x60. Arg shape (right-to-left: this, ?, 1 /* channel */, ? from
    // vtable at [esi][0x114]) cannot be reconstructed from this chunk.
    this.dispatchAnimEvent(/* this */ this, /* arg2 */ 0, /* arg3 */ 1, /* arg4 */ 0);
    status.animFieldPtr /* pField @ +0x28 */ = /* & */ info.animWord_0x252;
  } else {
    // Zoom-in: set state, dispatch anim event, advance anim-field ptr.
    status.zoomState = 1;
    const prev = status.animFieldPtr;
    const arg2 = prev != null
      ? (prev as any).word_0xe_signed /* movsx WORD PTR [prev+0xe] */
      : 0;
    const arg4 = (this as any).vtable_word_0x114 as any; // [esi][0x114]
    this.dispatchZoomEvent(this, arg2, /* channel */ 1, arg4);
    status.animFieldPtr = /* & */ info.animWord_0x28c;
  }

  // ── 5. Schedule next-secondary / next-weapon-idle from cvars.
  this.m_flNextSecondaryAttack =
    UTIL_WeaponTimeBase() +
    cvars.secondaryCooldown /* [ebx-0x6de58], fld QWORD */;
  this.m_flTimeWeaponIdle =
    UTIL_WeaponTimeBase() +
    cvars.idleDelay /* [ebx-0x6f018], fld QWORD */;
}
```
