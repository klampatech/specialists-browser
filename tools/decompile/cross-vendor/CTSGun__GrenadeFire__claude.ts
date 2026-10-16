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
