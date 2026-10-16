```typescript
/**
 * CTSGun::ShotgunFire — fire one shotgun shot (pump or auto variant).
 *
 * The auto (mode 3) weapon drives a two-call "prime + fire" sequence:
 * the first call only flips a flag and bails on the bullet path; the
 * second call is the real one with bullets + view kick. Pump-action
 * (mode 1) fires on every call.
 *
 * @param this  The CTSGun entity instance (the original C++ `this`).
 * @returns     void
 */
export function ShotgunFire(this: any /* TODO: replace with CTSGun */): void {
  // ---- 1. One-time cvar registration latches ----
  // GOT-relative flags 0x7c6c / 0x7c70 / 0x7c74 are "initialized"
  // markers for the shotgun cvars (damage / spread / pellets — TODO).
  if (!g_cvar_init_7c6c) g_cvar_init_7c6c = true;
  if (!g_cvar_init_7c70) g_cvar_init_7c70 = true;
  if (!g_cvar_init_7c74) g_cvar_init_7c74 = true;

  const player: any = this.m_pPlayer;            // [ebp+0x80]
  const ws:     any = this.m_pWeaponState;        // [ebp+0xcc] (runtime state)
  const wd:     any = this.m_pWeaponClassInfo;    // [ebp+0xd0] (fire params)

  // ---- 2. Already-firing short-circuit ----
  // m_iFireState != 0 ⇒ previous shot still animating. Re-stamp to 2
  // and bail without firing another volley.
  if (ws.m_iFireState !== 0) {
    ws.m_iFireState = 2;
    return;
  }

  // ---- 3. Decide whether this is the priming pump of an auto seq. ----
  // isFirstShot = (m_iMode == 3) && (m_bPumpArmed != 0).
  // Cached at GOT-relative 0x7c9c so the bullet path below can reuse it.
  const isFirstShot: boolean =
    ws.m_iMode === 3 && ws.m_bPumpArmed !== 0;
  g_isFirstShotFlag_7c9c = isFirstShot ? 1 : 0;

  // ---- 4. Schedule timing ----
  // Pump uses a fixed 0.18s cooldown; auto uses wd.m_flFireDelay.
  const fireDelay: number =
    ws.m_iMode === 1 ? 0.18 : wd.m_flFireDelay;            // 0x3e19999a == 0.18f
  this.m_flNextFire =
    UTIL_WeaponTimeBase() + fireDelay;                     // [ebp+0x9c]

  // Secondary timer: UTIL_WeaponTimeBase() + a static (double) delta.
  // TODO(asm-ambiguous): purpose is engine-specific (anim-end? reload?).
  this.m_flEndTimer =
    UTIL_WeaponTimeBase() + g_doubleDelta_6de50;           // [ebp+0xa8]

  // ---- 5. Empty-clip early-out ----
  // Bail unless infinite-clips, OR the clip has ammo, OR this is the
  // priming pump (which never consumes ammo).
  if (!InfiniteClips(player) && ws.m_iClip <= 0 && !isFirstShot) {
    return;
  }

  // ---- 6. Decrement clip on the real shot only ----
  if (!isFirstShot && !InfiniteClips(player)) {
    ws.m_iClip--;
  }

  // ---- 7. Cache the muzzle position + view forward vector ----
  // m_vecMuzzlePos ← player->GetGunPosition(out vec3).
  player.GetGunPosition(g_vecMuzzlePos_7c78);              // GOT-relative 0x7c78
  // m_vecForward ← engine globals + 0x28 (likely view forward).
  // TODO(asm-ambiguous): engineglobals layout at +0x28 is unclear —
  //   could be origin, angles, or view-forward; using a placeholder.
  g_vecForward_7c84.copyFrom(g_engineGlobals.field_0x28);  // GOT-relative 0x7c84

  // ---- 8. Fire bullet spread (skipped on the priming pump) ----
  if (!isFirstShot) {
    // Pick spread cvar. Tight by default; widen if attack is active
    // AND low-2-flag-bits of m_bFlags2 are clear AND we're not in
    // single-shot (mode 1).
    const useWideCone: boolean =
      wd.m_bAttackActive !== 0 &&
      (wd.m_bFlags2 & 0x3) === 0 &&
      ws.m_iMode !== 1;
    const spread: number = useWideCone
      ? g_cvar_spread_6df04   // wider spread (auto-attacking path)
      : g_cvar_spread_6f3fc;  // tighter spread (default pump path)

    // Hand off to the player's ShootBulletsPlayer. The output direction
    // vec3 is copied back into globals for VKickback's input.
    ShootBulletsPlayer(
      player,                  // this (in ECX for thiscall)
      wd.m_bSilenced,          // [wd+0x24] BYTE
      g_shotDirOut_7c90,       // output vec3 ptr (GOT-relative 0x7c90)
      g_vecForward_7c84,       // aim direction (vec3)
      wd.m_flRange,            // [wd+0x20] float
      wd.m_flSomeParam,        // [wd+0x1c] float
      wd.m_iBulletsToFire,     // [wd+0x8] BYTE → pushed as dword
      player.m_iTracerFreq,    // [player+0x7ec]
    );

    // ---- 8b. View kick, gated by m_bDoKickback (+0x38) ----
    if (wd.m_bDoKickback !== 0) {
      const kickScale: number =
        spread * wd.m_flKickbackMultiplier;                // [wd+0x30]
      VKickback(
        this,                  // this (in ECX for thiscall)
        kickScale,             // float (cone * multiplier)
        wd.m_bKickbackFlag,    // [wd+0x348] BYTE
        /* pushw 0 */ 0,       // bool / float placeholder
        g_shotDir_7c90,        // vec3 in (split as x, y floats)
        /* pushw 1 */ 1,       // bool / int placeholder
      );
    }
  }

  // ---- 9. Play the weapon sound / animation event ----
  // Different event index on the priming pump vs the real shot:
  //   priming → this.m_usEventPump     (offset +0x96a)
  //   real    → this.m_usEventShoot    (offset +0x964)
  // 12 stack args + an enginefuncs vtable call (via [ebx+0x1aa8].pfn
  // +0x1ec) — details abstracted away.
  const evtIdx: number = isFirstShot
    ? this.m_usEventPump
    : this.m_usEventShoot;
  playWeaponEvent(this, evtIdx);

  // ---- 10. Toggle the pump-armed flag so the next call lands on
  //         the other branch of step 3. ----
  ws.m_bPumpArmed = ws.m_bPumpArmed ? 0 : 1;
}
```
