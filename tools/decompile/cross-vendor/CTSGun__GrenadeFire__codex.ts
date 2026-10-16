```typescript
/**
 * CTSGun::GrenadeFire — arm and throw a grenade: validate ammo and owner
 * state, broadcast a "grenade thrown" network anim event, set the
 * post-throw timers, and bump a per-mode "cook" accumulator.
 *
 * @param this  The CTSGun weapon firing the grenade
 * @returns     void
 */
export function GrenadeFire(this: CTSGun): void {
  // ---- state guard -------------------------------------------------------
  // Bail early if there's no owner, the owner already has a grenade in
  // flight, or the owner is out of grenades.
  const player = this.m_pPlayer;                  // +0xcc
  if (player === null) return;
  if (player.m_bGrenadeInFlight !== 0) return;    // +0x8 — also flipped to 1 below
  if (player.m_iGrenadeAmmo <= 0) return;         // +0x4

  // ---- determine consumption amount -------------------------------------
  // Take a signed 16-bit "ammo to consume" out of the player's weapon
  // sub-state struct, falling back to 0 if that struct pointer is null.
  let consume = 0;
  if (player.m_pWeaponState !== null) {           // player+0x28 (nullable)
    consume = player.m_pWeaponState.field_0x26;   // int16 at sub+0x26
  }

  // ---- consume the grenades via virtual call ----------------------------
  // edx = this->m_pEntity (a pointer with a vtable); call vtable slot
  // 0x174 with args (this=esi, consume, 1, 0).
  // TODO(asm-ambiguous): identify which vtable function 0x174 maps to —
  // signature (this, count, 1, 0) suggests a CTS-ammo applier or a
  // CBasePlayer-style helper like TakeHealth.
  const helper = this.m_pEntity;                  // +0x60
  (helper as any).vtable_0x174(this, consume, 1, 0);

  // ---- broadcast "grenade thrown" network anim event --------------------
  // Twelve dwords pushed right-to-left for an engine-side message
  // dispatcher. The arg layout mirrors MESSAGE_BEGIN + WRITE_* pairs.
  // TODO(asm-ambiguous): GOT+0x1aa8 is the engine message dispatcher
  // (pfnMessageBegin + Write* / End); GOT+0x1888 is the buffer / sender
  // edict handle. Map each push onto the matching Write* call once we
  // find the EV_TSGrenadeFire counterpart in specialists-web.
  const ammoDef    = this.m_pAmmoDef;             // +0x80
  const ammoSlot   = ammoDef.dwAmmoIndex;         // ammoDef+0x208
  const weaponAnim = this.m_iGrenadeAnimIndex;    // uint16 at +0x978
  const msg        = (globalGOT as any).engineMessages;     // GOT+0x1aa8
  const buf        = (globalGOT as any).messageBuffer;      // GOT+0x1888

  msg.dispatch(
    /* dest */ 1,
    ammoSlot,
    weaponAnim,
    0,
    buf, buf,
    0, 0,
    /* msg-type */ 0x13,
    0, 0, 0
  );

  // ---- mark player as having a grenade in flight ------------------------
  player.m_bGrenadeInFlight = 1;                  // player+0x8

  // ---- schedule post-throw timing windows -------------------------------
  // m_flTimeWeaponIdle (+0xa0) and m_flNextAttack (+0x9c) are both set
  // to the SAME value: UTIL_WeaponTimeBase() + [GOT-0x6de48]. The asm
  // dance of "fld [esp] / fst [a0] / fstp [9c]" is the compiler emitting
  // a single float into two fields. m_flNextReload (+0xa8) is reset to
  // the same expression.
  // TODO(asm-ambiguous): [GOT-0x6de48] is a small double constant (likely
  // 0.1–0.3 s) — confirm by cross-referencing the grenade delay cvar.
  const postThrowDelay = (globalGOT as any).grenadePostThrowDelay; // GOT-0x6de48
  const nextFire       = UTIL_WeaponTimeBase() + postThrowDelay;
  this.m_flTimeWeaponIdle = nextFire;             // +0xa0
  this.m_flNextAttack    = nextFire;             // +0x9c
  this.m_flNextReload    = UTIL_WeaponTimeBase() + postThrowDelay; // +0xa8

  // ---- bump the per-throw "cook" accumulator ----------------------------
  // Store (gpGlobals->time + [GOT-0x6e818]) into the large-offset field.
  // [ebx+0x1600] is dereferenced then read as dword — most plausibly
  // gpGlobals->time truncated to float.
  // TODO(asm-ambiguous): this+0xa0c is well past typical CBasePlayerWeapon
  // layout — likely a per-mode grenade state field (cook timer, aim
  // damping, throw trajectory accumulator, etc.). [GOT-0x6e818] is another
  // constants entry whose meaning is unclear without the cvar map.
  const gpTime = ((globalGOT as any).gpGlobals.time as number) ?? 0;
  const cookStep = ((globalGOT as any).grenadeCookStep as number) ?? 0;
  this.m_flGrenadeCook = gpTime + cookStep;       // +0xa0c
}

// External call targets assumed declared elsewhere in the project:
//   - UTIL_WeaponTimeBase(): () => number     // returns gpGlobals->time
//   - CTSGun, CBasePlayer, etc. structs (this + helpers)
//   - globalGOT: { [key: string]: any }       // PIC-offset globals map
```
