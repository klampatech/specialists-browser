/**
 * CTSGun::GrenadeIdle — prime-then-throw idle state for a grenade weapon.
 * Ticks a prime counter each call; when the counter reaches zero (or the
 * caller passes a non-zero `force` flag), spawns the grenade entity, plays
 * the prime/throw sounds, dispatches the priming animation event, applies
 * a movement-speed penalty to the player, and once the counter is fully
 * exhausted drops the weapon.
 *
 * Demangled:  CTSGun::GrenadeIdle(int)
 * Address:    0x00074f18  (1476 bytes)
 */
export function GrenadeIdle(this: any /* CTSGun */, force: number): void {
  // After prologue, the original stack layout is:
  //   [esp+0xc0] = this  (saved into ebp by the prologue)
  //   [esp+0xc4] = force (int)
  //
  // Field offsets (relative to the indicated base) are taken straight
  // from the disassembly — names are TODO until D.4 wires up the real
  // CTSGun / m_pOwner / CBasePlayer class layouts.

  const status: any = this[0xcc / 4];            // [ebp+0xcc] = weaponStatus
  if (status == null) return;

  // State machine:
  //   state == 1 → main prime path
  //   state == 2 → just-released; run cleanup this tick
  //   else       → idle tick; bump a timer and bail
  let shouldFinish = false;

  if (status[0x8 / 4] !== 1) {
    if (status[0x8 / 4] === 2) {
      status[0x8 / 4] = 0;
      shouldFinish = true;
    } else {
      // TODO(cvar-ident): which timing field is bumped here, and what's
      // the QWORD interval constant at [ebx-0x6e768]?
      this[0xa8 / 4] = 0 /* gpGlobals.time */ + 0 /* [ebx-0x6e768] */;
      return;
    }
  } else {
    // ---- Main prime path ----

    // Bail if player has FL_FLY|FL_FROZEN and caller did not force us.
    // [ebp+0x80] is the player-like ptr; flags live at *(ptr)+0x180    // (TS layout — not a pev field directly).
    const pPlayer: any = this[0x80 / 4]; // [ebp+0x80]
    const flags: number = (pPlayer[0])[0x180 / 4];
    if ((flags & 0x801) !== 0 && force === 0) return;

    // ---- Pitch → "throw power" ----
    // Disassembly loads view angles from *(pPlayer)+0x74 (TS layout),
    // folds the pitch through a QWORD global ([ebx-0x6de38] or
    // [ebx-0x6de28]), then clamps against [ebx-0x6dea0] / [ebx-0x6de9c].
    // TODO(asm-ambiguous): exact fold math; constants unknown.
    const ang: any = {
      x: (pPlayer[0])[0x74 / 4],
      y: (pPlayer[0])[0x78 / 4],
      z: (pPlayer[0])[0x7c / 4],
    };
    const power: number = 0; // placeholder for the clamp result

    // TODO(engine-call): HLSDK pfnMakeVectors(forward, right, up).
    UTIL_MakeVectors(ang);

    // Eye position = player origin + view_ofs; both TS-layout offsets.
    const eye: any = {
      x: (pPlayer[0])[0x08 / 4] + (pPlayer[0])[0x174 / 4],
      y: (pPlayer[0])[0x0c / 4] + (pPlayer[0])[0x178 / 4],
      z: (pPlayer[0])[0x10 / 4] + (pPlayer[0])[0x17c / 4],
    };
    const playerVel: any = {
      x: (pPlayer[0])[0x20 / 4],
      y: (pPlayer[0])[0x24 / 4],
      z: (pPlayer[0])[0x28 / 4],
    };

    // Throw-style branch on status[0x24/4] (throwStyle byte).
    // Overhand (0) and underhand (1) compute different origin/velocity
    // blends using *(pPlayer)+0x28 (some vtable? unsure) and *(pPlayer)+0x20.
    // TODO(asm-ambiguous): exact blend formulas.
    const origin: any = eye;
    const velocity: any = playerVel;
    const throwStyle: number = status[0x24 / 4];
    // (the if/else blocks for styles 0/1 are elided here — they're
    //  the same compute-blend pattern with different constants.)

    // Grenade spawn gate. The disassembly reads [ebp+0xd0]+0x20, NOT
    // [ebp+0x80]+0x20 — these are two different player-like pointers.
    // [ebp+0xd0] is likely `m_pOwner` / the weapon's owning entity.
    const pOwner: any = this[0xd0 / 4];          // [ebp+0xd0]
    if (pOwner && pOwner[0x20 / 4] === 4) {
      // radius pulled from [ebx-0x6de98]. TODO(cvar-ident).
      const grenade: any = CM61Grenade_CreateGrenade(
        pPlayer, /*radius*/ 0, origin, velocity);
      if (grenade != null) {
        // Disassembly is a double-deref:
        //   edx = grenade result
        //   eax = DWORD PTR [edx]      (likely grenade->pev)
        //   mov DWORD PTR [eax+0x..], imm        const inner: any = grenade[0];           // (*grenade)
        if (throwStyle === 0) {
          // 0x43480000 = 200.0
          inner[0x5c / 4] = 200.0;
        } else {
          // 0x3ecccccd = 0.4   (writes to *(grenade)+0x120 — past end of
          //                     HL entvars_t, so this is an entity field)
          // 0x44160000 = 600.0  (writes to *(grenade)+0x60)
          // 0xc2c80000 = -100.0 (writes to *(grenade)+0x5c)
          inner[0x120 / 4] = 0.4;
          inner[0x60 / 4]  = 600.0;
          inner[0x5c / 4]  = -100.0;
        }
        // TODO(field-map): identify what 0x5c/0x60/0x120 map to in
        // CM61Grenade (bounce factor, damage, detonate-on-touch?).
      }
    }

    // ---- Play the prime sound ----
    // Disassembly: 4 pushes then call through [ecx+0x174] where
    // ecx = *(ebp+0x60) (some sound interface). Pushed in order
    // (right-to-left): attn=0, vol=1, soundIndex, this. So the call
    // is m_pSoundEngine->PlaySound(this, soundIndex, vol, attn) — 4 args.
    let primeSound: number = 0;
    if (status[0x28 / 4] !== 0) {
      const sndBase: any = status[0x28 / 4];
      primeSound = (throwStyle === 0)
        ? /* *(int16*)(sndBase+0x28) */ 0
        : /* *(int16*)(sndBase+0x2a) */ 0;
    }
    const soundEng: any = this[0x60 / 4];
    soundEng[0x174 / 4](this, primeSound, /*vol*/ 1, /*attn*/ 0);

    // ---- PlaybackEvent ----
    // Disassembly pushes 12 args then calls through [ecx+0x1ec].
    // Many of the args are GOT globals ([ebx+0x1888] twice) or
    // entity-local fields (entindex at *(pPlayer)+0x208, weapon
    // model idx at *(this)+0x978). The event index is 0x14 or 0x15
    // based on throwStyle. TODO(engine-call): full signature.
    soundEng[0x1ec / 4](
      /*flags*/ 1,                                 // FEV_NOTHOST
      /*entindex*/ (pPlayer[0])[0x208 / 4],
      /*eventIndex*/ this[0x978 / 2], // word at this+0x978
      /*... 9 more args ...*/ 0, 0, 0, 0, 0, 0, 0, 0, 0);

    // ---- Priming animation ----
    // Sequence 0x35 = 53. The animator pointer is *(this)+0x28c.
    Animate(this[0x28c / 4], pPlayer[0], 53);

    // ---- Bump timing windows ----
    // Disassembly: time + QWORD at [ebx-0x6f010]. Writes to three
    // timing fields on `this` at 0x9c, 0xa0, 0xa8.
    // TODO(cvar-ident): name of the interval.
    const next: number = 0 /* gpGlobals.time */ + 0 /* [ebx-0x6f010] */;
    this[0x9c / 4] = next;
    this[0xa0 / 4] = next;
    this[0xa8 / 4] = next;

    // Clear player iuser3 when the prime counter is about to expire.
    if (status[0x4 / 4] === 1) {
      pPlayer[0][0xc0 / 4] = 0; // *(pPlayer)+0xc0 = iuser3 (TS layout)
    }

    // ---- State transition ----
    if (force !== 0) {
      shouldFinish = true;
      status[0x8 / 4] = 0;
    } else {
      status[0x8 / 4] = 2;                         // mark "released"
    }
    status[0x4 / 4] = (status[0x4 / 4] as number) - 1;
  }

  // ---- Post-throw cleanup ----
  if (!shouldFinish) return;

  // Add this weapon's weight to the player's carried-weight accumulator.
  // Disassembly: *(this)+0x548 += *(pOwner)+0xd0 (BYTE weight).
  const pOwner: any = this[0xd0 / 4];
  const weaponWeight: number = (pOwner[0])[0xd0 / 4] & 0xff;
  (this[0x548 / 4] as number) += weaponWeight;

  // Recompute and apply slowed player speed.
  const newSpeed: number = GetSpeedBySlots(pPlayer);
  SetPlayerSpeed(pPlayer, newSpeed);

  if (status[0x4 / 4] > 0) {
    // One more audible frame after the throw.
    // TODO(cvar-ident): [ebx-0x6de50] interval; *(sndBase)+0x04 sound.
    let releaseSound: number = 0;
    if (status[0x28 / 4] !== 0) {
      releaseSound = /* *(int16*)(status[0x28/4]+0x04) */ 0;
    }
    soundEng[0x174 / 4](this, releaseSound, /*vol*/ 1, /*attn*/ 0);
    this[0xa8 / 4] = 0 /* gpGlobals.time */ + 0 /* [ebx-0x6de50] */;
  } else {
    // Counter fully exhausted — drop the now-empty weapon.
    DropWeapon(this, this[0xc8 / 4] /* m_iId */, /*dropAll*/ true);
  }
}

// ---- External symbols (stubs so the file compiles standalone) ----
declare const gpGlobals: { time: number; v_forward: any; v_right: any; v_up: any };
declare function UTIL_MakeVectors(ang: { x: number; y: number; z: number }): void;
declare function CM61Grenade_CreateGrenade(
  player: any, radius: number, origin: any, velocity: any): any;
declare function Animate(animator: any, pev: any, sequence: number): void;
declare function GetSpeedBySlots(player: any): number;
declare function SetPlayerSpeed(player: any, speed: number): void;
declare function DropWeapon(self: any, weaponId: number, dropAll: boolean): void;
