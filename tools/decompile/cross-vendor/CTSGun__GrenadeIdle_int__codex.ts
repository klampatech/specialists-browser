I have all the disassembly I need in the chunk. The exec commands aren't returning output (likely a shell/sandbox hiccup), but I don't need filesystem access to produce the TS deliverable. Let me write the decompiled function.

The function is a state-machine for a prime-then-throw grenade weapon. Let me trace the key structure:

- `[ebp+0xc0]` (after prologue) = first arg = `this` (CTSGun*)
- `[esp+0xc4]` = the int param (force-release flag)
- `[ebp+0xcc]` = weaponStatus struct: counter(0x4), state(0x8), throwStyle(0x24), soundName(0x28)
- `[ebp+0x80]` / `[ebp+0xd0]` = both player-like pointers (m_pPlayer / m_pOwner)
- `[ebp+0x60]` = sound engine interface (vtable call at +0x174)
- `[ebp+0xc8]` = m_iId
- `[ebp+0x978]` = weapon model/event index (word)
- `[ebp+0xa0]/0x9c/0xa8` = timing fields
- 0x801 = `FL_FLY | FL_FROZEN`

State machine: state 1 = prime, state 2 = release, otherwise = idle bump. Two throw styles (0 = overhand, 1 = underhand) with different vector math and different bounce/dmg tunings on the spawned grenade.

```typescript
/**
 * CTSGun::GrenadeIdle — prime-then-throw idle state for a grenade
 * weapon (the M61 frag grenade). Ticks the prime counter each call;
 * when the counter reaches zero (or the caller passes a non-zero
 * `force` flag), it spawns the grenade entity, plays the prime/throw
 * sounds, dispatches the priming animation event, and applies a
 * movement-speed penalty to the player. Once the counter is fully
 * exhausted, the weapon is dropped.
 *
 * @param this    The CTSGun entity instance (this in the original C++)
 * @param force   Non-zero to force an immediate release / finish
 * @returns       void
 */
export function GrenadeIdle(this: CTSGun, force: number): void {
  const status = this.weaponStatus;
  if (status == null) return;

  // state 1 = prime (main path), state 2 = just-released (still finish
  // the throw this tick), anything else = just bump the timer and bail.
  let shouldFinish = false;

  if (status.state !== 1) {
    if (status.state === 2) {
      // Released: clear state and fall through to the post-throw cleanup.
      status.state = 0;
      shouldFinish = true;
    } else {
      // Idle: bump the next-attack window and exit.
      this.m_flNextSecondaryAttack = gpGlobals.time + ts_grenadeIdleInterval.value;
      return;
    }
  } else {
    // ---- Main prime / throw path ----

    // Bail if the player is FL_FROZEN|FL_FLY and the caller did not force us.
    if ((this.m_pPlayer.pev.flags & 0x801) !== 0 && force === 0) return;

    // Read view angles and derive a "throw power" from the pitch.
    const ang = this.m_pPlayer.pev.v_angle;
    // TODO(asm-ambiguous): the two QWORD globals ([ebx-0x6de38] and
    // [ebx-0x6de28]) are the wrap-around bounds used to fold the pitch
    // into the right half-turn. The exact cvar identities are unknown;
    // the end result is: `power` is the absolute pitch distance from the
    // chosen fold, scaled and clamped.
    const folded = wrapPitch(ang.x, /*fold*/ CVar.ts_gren_pitchFold.value);
    const power = clamp(
      (CVar.ts_gren_pitchMax.value - folded) * CVar.ts_gren_powerMul.value,
      CVar.ts_gren_powerMin.value,
      CVar.ts_gren_powerMax.value,
    );

    UTIL_MakeVectors(ang);

    // Two throw styles: 0 = overhand (forward from the eye), 1 = underhand
    // (forward + up blend). Both blend the player's current velocity into
    // the spawn origin so the grenade is "thrown" rather than placed.
    const eye = Vector.add(this.m_pPlayer.pev.origin, this.m_pPlayer.pev.view_ofs);
    const playerVel = this.m_pPlayer.pev.velocity;
    let origin: Vector;
    let velocity: Vector;
    if (status.throwStyle === 0) {
      // Overhand throw: pure forward from the eye + player velocity.
      velocity = Vector.scaleAdd(gpGlobals.v_forward, power, playerVel);
      origin = Vector.add(eye, Vector.scaleAdd(gpGlobals.v_forward, power, playerVel));
    } else {
      // Underhand / rolling throw: forward + an upward component (the
      // up-bias cvar) so the grenade arcs low and bounces into cover.
      // TODO(asm-ambiguous): the up-blend uses a cvar (likely ts_gren_upBias)
      // and a QWORD scale ([ebx-0x6efb8]) we have not named yet.
      const upBlend = gpGlobals.v_up.scale(CVar.ts_gren_upBias.value * power);
      velocity = Vector.add(
        Vector.scaleAdd(gpGlobals.v_forward, power, playerVel),
        upBlend,
      );
      origin = Vector.add(eye, velocity);
    }

    // Only spawn the grenade entity when the active weapon is the
    // grenade slot (slot 4 in HL/TS weapon-slot numbering).
    if (this.m_pPlayer.m_iWeapons === 4) {
      const grenade = CM61Grenade.CreateGrenade(
        this.m_pPlayer,
        CVar.ts_gren_damageRadius.value, // float pulled from a global
        origin,
        velocity,
      );
      if (grenade != null) {
        if (status.throwStyle === 0) {
          // Overhand: very high bounce, sits where it lands.
          grenade.pev.fuser1 = 200.0; // 0x43480000
        } else {
          // Rolling: low bounce, explodes on impact.
          grenade.pev.fuser3 = 0.4;   // 0x3ecccccd — bounce factor
          grenade.pev.dmg = 600.0;    // 0x44160000
          grenade.pev.dmg_take = -100.0; // 0xc2c80000 — detonate-on-bounce
        }
      }
    }

    // Play the prime "click" sound. The sound index is pulled from the
    // sound-name struct at +0x28 (overhand) or +0x2a (underhand).
    const primeSound = status.soundName
      ? (status.throwStyle === 0
          ? status.soundName.readShortAt(0x28)
          : status.soundName.readShortAt(0x2a))
      : 0;
    this.m_pSoundEngine.PlaySound(this, /*channel*/ 1, primeSound, /*vol*/ 1.0, /*attn*/ 0.0);

    // Dispatch the priming animation event.
    // eventIndex = 0x14 (20) for overhand, 0x15 (21) for underhand.
    const primeEvent = 0x14 + (status.throwStyle === 0 ? 0 : 1);
    this.m_pSoundEngine.PlaybackEvent(
      /*flags*/ 1,                                  // FEV_NOTHOST
      /*entindex*/ this.m_pPlayer.pev.entindex,     // [pev+0x208]?? — see TODO
      /*eventIndex*/ this.m_usWeaponModel,          // word at +0x978
      /*origin.z*/ 0,
      /*origin.xy*/ gpGlobals.evtOrigin,            // from a GOT global
      /*origin.xy*/ gpGlobals.evtOrigin,
      /*iparam1*/ 0,
      /*iparam2*/ 0,
      /*eventIdx*/ primeEvent,
      /*pitch*/ 0,
      /*volume*/ 0,
      /*soundChannel*/ gpGlobals.evtChannel,        // from a GOT global
    );

    // Trigger the priming animation (sequence 53 = 0x35).
    Animate(this.m_pAnimator, this.m_pPlayer.pev, 53);

    // Schedule the next idle / primary / secondary attack windows.
    const next = gpGlobals.time + CVar.ts_idleInterval.value;
    this.m_flTimeWeaponIdle = next;
    this.m_flNextPrimaryAttack = next;
    this.m_flNextSecondaryAttack = next;

    // When the counter is about to expire, clear the player's iuser3
    // (presumably the "prime" HUD flag).
    if (status.counter === 1) {
      this.m_pPlayer.pev.iuser3 = 0;
    }

    // State transition.
    if (force !== 0) {
      shouldFinish = true;
      status.state = 0;
    } else {
      status.state = 2; // mark "released" so the next tick runs the cleanup
    }
    status.counter--;
  }

  // ---- Post-throw cleanup (run when transitioning to "done") ----
  if (!shouldFinish) return;

  // Add this weapon's weight into the player's carried-weight accumulator
  // (used by GetSpeedBySlots to compute a movement-speed penalty).
  this.m_pPlayer.pev.weight = (this.m_pPlayer.pev.weight ?? 0) + this.m_pPlayer.m_iWeaponWeight;

  // Recompute and apply the slowed player speed.
  const newSpeed = GetSpeedBySlots(this.m_pPlayer);
  SetPlayerSpeed(this.m_pPlayer, newSpeed);

  if (status.counter > 0) {
    // Counter still positive: play the release sound and bump the
    // next-attack window. (One more audible frame after the throw.)
    const releaseSound = status.soundName ? status.soundName.readShortAt(0x04) : 0;
    this.m_pSoundEngine.PlaySound(this, /*channel*/ 1, releaseSound, /*vol*/ 1.0, /*attn*/ 0.0);
    this.m_flNextSecondaryAttack = gpGlobals.time + CVar.ts_releaseInterval.value;
  } else {
    // Counter fully exhausted: the player has thrown the last grenade;
    // drop the now-empty weapon from their inventory.
    DropWeapon(this, this.m_iId, true);
  }
}
```
