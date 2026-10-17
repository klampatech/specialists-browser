// The output is expected to compile in isolation.
// `this`, `cvars`, `UTIL_WeaponTimeBase`, and `DoubleFireRate` are all
// `any` so the snippet has no external type refs.

/**
 * CTSGun::SecondaryAttack — secondary-fire handler.
 *
 * Pipeline:
 *   1. No status struct   → delegate to CCombatAttack() and bail.
 *   2. Weapon-class dispatch (info.weaponType @ +0x348):
 *        0x2 (grenade) → GrenadeFire()    (sets status.firedSecondary)
 *        0x3 (knife)   → KnifeFire()      (sets status.firedSecondary)
 *        0xa (katana)  → KatanaThrow()    (no firedSecondary toggle)
 *        0xb           → return
 *   3. Fire-mode @ status+0x2:
 *        4 / 5 → Fire() (mode 4 gated by player.byte_0x815 & 0x8 OR DoubleFireRate())
 *        else  → fall through to zoom toggle
 *   4. Zoom toggle on status.+0x10 & 0x8:
 *        zoomed-in  → cvar-driven cycle through Zoom(info+0x3c) /
 *                     Zoom(info+0x40) / Unzoom()
 *        not zoomed → commit-dezoom if (status.zoomState != 0 ||
 *                     info.animWord_0x28c == 0xffff); else zoom-in.
 *                     Both sub-branches invoke the same indirect call
 *                     `call [this->offset_0x60][0x174]` with the same
 *                     arg shape (this, animField, channel=1, vtable[0x114]).
 *   5. Schedule m_flNextSecondaryAttack (+0xa0) and m_flTimeWeaponIdle (+0xa8)
 *      from two cvars.
 *
 * @param this  The CTSGun entity (the `this` of the original C++).
 */
export function SecondaryAttack(this: any): void {
  // ── 1. Combat-only fallback when no weapon-status struct is attached.
  if (this.m_status /* dword @ +0xcc */ === null) {
    this.CCombatAttack();
    return;
  }

  const status = this.m_status; // pWeaponStatus?
  const info   = this.m_info;   // pWeaponInfo?

  // ── 2. Per-weapon-class dispatch on info.+0x348 (weaponType byte).
  switch (info.weaponType /* byte @ +0x348 */) {
    case 0x2: // Grenade secondary (throw)
      status.firedSecondary /* byte @ +0x24 */ = 1;
      this.GrenadeFire();
      return;
    case 0x3: // Knife secondary (slash)
      status.firedSecondary = 1;
      this.KnifeFire();
      return;
    case 0xa: // Katana secondary (throw)  -- no firedSecondary toggle here
      this.KatanaThrow();
      return;
    case 0xb: // No secondary attack for this class
      return;
  }

  // ── 3. Fire-mode 4/5 → Fire(). Mode 4 is gated by powerup + cvar.
  const fireMode = status.fireMode /* byte @ +0x2 */;
  if (fireMode === 4 || fireMode === 5) {
    if (fireMode === 4) {
      const player = this.m_pPlayer /* dword @ +0x80 */;
      const hasPowerup = (player.byte_0x815 /* TODO: real field name */ & 0x8) !== 0;
      if (!hasPowerup && !DoubleFireRate(player)) {
        return; // gated off — skip Fire()
      }
    }
    this.Fire();
    return;
  }

  // ── 4. Zoom toggle. status.+0x10 & 0x8 == "currently zoomed".
  if ((status.flags /* byte @ +0x10 */ & 0x8) !== 0) {
    // ----- Zoomed-in path (7198c → 719f0 in the disassembly).
    //
    // Disassembly: 7198c mov eax, [esi+0x80]   (= this.m_pPlayer)
    //              71992 mov ecx, [eax]         (= *(m_pPlayer + 0) = vtable ptr)
    //              71994 fld   [ebx-0x6f408]    (cvar1)
    //              7199a fcomp [ecx+0x214]      (vtable+0x214)
    //              719a2 fnstsw ax; test ah,0x40
    //              719a5 jne  719d8
    //
    //   equal case (fall-through, K == player.vtable+0x214):
    //       719a7 cmp info+0x40, 0            → je 719cc  (Unzoom)
    //       719b3 fild [info+0x40]; fcomp player.+0x214
    //       719c1 jne 719cc                    (Unzoom if !=)
    //       else Zoom(info+0x40)
    //   not-equal case (jne 719d8):
    //       719d8 cmp info+0x3c, 0            → je 719f3  (skip)
    //       else Zoom(info+0x3c)
    //
    // The TS had the two field offsets swapped. Below is the correct mapping.
    const player = this.m_pPlayer;
    const K = (cvars as any).zoomSentinel /* [ebx-0x6f408] */;

    if (K !== (player as any).field_0x214 /* TODO: real field name; disassembly reads vtable+0x214 */) {
      // Not-equal case (jne 719d8): first zoom level.
      if (info.dword_0x3c /* TODO: real field name */ !== 0) {
        this.Zoom(info.dword_0x3c);
      }
      // else: skip (jump to 719f3 → schedule next).
    } else {
      // Equal case: second zoom level / unzoom.
      if (info.dword_0x40 /* TODO: real field name */ !== 0
          && (info.dword_0x40 as any) === (player as any).field_0x214) {
        // TODO(asm-ambiguous): assembly does `fild DWORD PTR [edx+0x40]`
        // (loads a 32-bit int from info+0x40 and treats it as a float for
        // comparison). Treating both sides as ordinary numbers here.
        this.Zoom(info.dword_0x40);
      } else {
        // Covers both info+0x40 == 0 (cmp + je 719cc) and
        // (int)info+0x40 != player.+0x214 (jne 719cc).
        this.Unzoom();
      }
    }
  } else if (
    (status as any).zoomState /* byte @ +0x2c */ !== 0 ||
    (info as any).animWord_0x28c /* word @ +0x28c */ === 0xffff
  ) {
    // ----- Not zoomed, but preconditions for zoom-in aren't met.
    // Commit-dezoom (71928–71989 in the disassembly).
    (status as any).zoomState = 0;

    // `call [this->offset_0x60 + 0x174]` with args (right-to-left):
    //   this, status.animFieldPtr->word_0xe (or 0 if ptr is null),
    //   1 /* channel */, this->vtable[0x114].
    //
    // Same dispatch shape as the zoom-in sub-branch — the TS previously
    // placeheld this with `(this, 0, 1, 0)` and is now reconstructed.
    const prev = (status as any).animFieldPtr /* dword @ +0x28 */;
    const arg2 = prev != null
      ? (prev as any).word_0xe_signed /* movsx WORD PTR [prev+0xe] */
      : 0;
    const arg4 = (this as any).vtable_word_0x114 as any; // [esi][0x114]
    this.dispatchAnimEvent(this, arg2, /* channel */ 1, arg4);

    (status as any).animFieldPtr = (info as any).animWord_0x252; // +0x252 in info
  } else {
    // ----- Zoom-in (718ca → 71921 in the disassembly).
    (status as any).zoomState = 1;

    const prev = (status as any).animFieldPtr;
    const arg2 = prev != null
      ? (prev as any).word_0xe_signed /* movsx WORD PTR [prev+0xe] */
      : 0;
    const arg4 = (this as any).vtable_word_0x114 as any; // [esi][0x114]
    this.dispatchZoomEvent(this, arg2, /* channel */ 1, arg4);

    (status as any).animFieldPtr = (info as any).animWord_0x28c;
  }

  // ── 5. Schedule next-secondary / next-weapon-idle from cvars.
  this.m_flNextSecondaryAttack /* dword @ +0xa0 */ =
    (UTIL_WeaponTimeBase as any)() +
    (cvars as any).secondaryCooldown /* [ebx-0x6de58], fld QWORD */;
  this.m_flTimeWeaponIdle /* dword @ +0xa8 */ =
    (UTIL_WeaponTimeBase as any)() +
    (cvars as any).idleDelay /* [ebx-0x6f018], fld QWORD */;
}

// ── Module-scope stubs so the snippet compiles in isolation.
// Remove these once D.4 / D.5 supply real definitions.
declare const cvars: any;
declare function UTIL_WeaponTimeBase(): number;
declare function DoubleFireRate(player: any): number;
