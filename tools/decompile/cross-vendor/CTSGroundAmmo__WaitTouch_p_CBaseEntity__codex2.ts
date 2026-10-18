// Decompiled from `WaitTouch__13CTSGroundAmmoP11CBaseEntity` (0x00092f40, 596 bytes).
// Calling convention is GCC cdecl-with-this: [esp+0x20] = `this`, [esp+0x24] = pOther.

// -------- Type stubs (full definitions come later in D.4) --------
type CTSGroundAmmo = any;
type CBaseEntity   = any;

// -------- Engine globals (declared here so the chunk compiles in isolation) --------
// The GOT (EBX-relative) cvars/strings are listed inline at the call sites.
declare const EMIT_SOUND_DYN:        (edict: any, channel: number, sample: string,
                                       volume: number, attenuation: number,
                                       pitch: number, flags: number) => void;
declare const gpGlobals:             { time: number };
declare const ammoPickupSound:       string;
declare const cvarDefaultRespawn:    number;
declare const cvarInstantRespawn:    number;
declare const gpDefaultRespawnThink: any;
declare const gpGameModeCvar:        number;

/**
 * CTSGroundAmmo::WaitTouch — touch callback for a ground ammo pickup.
 *
 * Invoked by the engine's CBaseEntity::Touch dispatch when something overlaps
 * this pickup's bounding box. If the touching entity is a living player whose
 * currently-held gun matches this pickup's weapon class, this function tries
 * to grant each registered ammo count, plays the pickup sound, freezes the
 * model, and either schedules the pickup to respawn (after `m_iRespawnTime`
 * seconds, clamped at 180) or hides it permanently in deathmatch-style game
 * modes (game-mode cvar == 2 or 3).
 *
 * @param this    The CTSGroundAmmo instance (the pickup itself).
 * @param pOther  The touching entity (expected to be a living CBasePlayer).
 * @returns       void
 */
export function WaitTouch(this: CTSGroundAmmo, pOther: CBaseEntity): void {
  // ---- 1. Already consumed? -----------------------------------------------
  // TODO(asm-ambiguous): pev+0x118 byte-test vs zero (`js` = sign branch) — this
  //   is the high bit of `flags`'s low byte, i.e. the "kill/consumed" flag 0x80.
  if ((this.pev.flags & 0x80) !== 0) return;

  // ---- 2. Must be a living player. ----------------------------------------
  // TODO(asm-ambiguous): [pOther+0x60] is dereferenced as a vtable pointer — a
  //   GCC-compiled cdecl-this ABI quirk. vtable[0xC8] = IsPlayer, vtable[0xB4]
  //   = IsAlive (in this CBaseEntity layout).
  if (!pOther.IsPlayer()) return;
  if (!pOther.IsAlive())  return;

  // ---- 3. The held weapon must match this pickup's class. ----------------
  // TODO(asm-ambiguous): [pOther+0xA10] = m_pActiveItem; [gun+0x88] = class id.
  //   The class-id check (0x10) selects the specific weapon family this ammo
  //   services. Each ammo pickup is bound to one weapon class.
  const gun = (pOther.m_pActiveItem ?? null) as any;
  if (!gun) return;
  if ((gun.m_iClassID ?? gun.classID) !== 0x10) return;

  // ---- 4. Try to give each registered ammo count. -----------------------
  // 8 dwords of ammo counts live at +0x68..+0x84 (consecutive). The "type"
  // argument passed to AddAmmo walks 0,1,3,6 / 10,11,13,16 — triangular
  // numbers per row, looking like an unrolled inner loop with pre-increments
  // of +1,+2,+3,+4 in the original C++.
  const ammoCounts = [
    this.m_iCount0, this.m_iCount1, this.m_iCount2, this.m_iCount3,
    this.m_iCount4, this.m_iCount5, this.m_iCount6, this.m_iCount7,
  ];
  let ammoType     = 0;
  let anyAmmoGiven = false;
  for (let i = 0; i < 8; i++) {
    const col   = i % 4;
    const count = ammoCounts[i];
    if (count !== 0 && gun.AddAmmo(ammoType, count)) anyAmmoGiven = true;
    // Mirrors the asm's per-access pre-increments (+1, +2, +3, +4 per row).
    ammoType += col + 1;
  }

  if (!anyAmmoGiven) return;

  // ---- 5. Pickup sound; freeze the model. --------------------------------
  // edict from pOther->pev + 0x208.
  // TODO(asm-ambiguous): sample path (GOT ebx-0x6C8DA), channel 3, and the
  //   other 5 args come from GOT globals (likely cvars; the literal 0x64 = 100
  //   is also pushed as one of the args).
  EMIT_SOUND_DYN(pOther.edict, /* ch */ 3, ammoPickupSound,
                 /* vol */ 1.0,  /* attn */ 1.0,
                 /* pitch */ 0, /* fl */ 0);

  // Zero inline velocity, mark the model as consumed.
  // TODO(asm-ambiguous): +0x14 / +0x18 — likely an inlined m_vecVelocity (x, y).
  this.m_vecVelX = 0;
  this.m_vecVelY = 0;
  this.pev.flags |= 0x80;

  // ---- 6. Decide whether to respawn. -------------------------------------
  // TODO(asm-ambiguous):
  //   +0xA8 = m_iRespawnTime (seconds; >0 / ==0 / 0)
  //   GOT +0x1730 = default respawn think function
  //   GOT +0x14F0 = game-mode cvar (byte; 2 or 3 = "deathmatch-style" = no respawn)
  //   0xFFFF0000 = sentinel float bits stored into m_fNextThink (≈ "very far
  //                 future" — keeps the engine's think loop quiet until then)
  //   +0xC / +0x10 = m_fNextThink / m_pfnThink slots in CBaseEntity
  const respawn = this.m_iRespawnTime as number;
  if (respawn > 0) {
    this.m_fNextThink = 0xffff0000;
    this.m_pfnThink   = gpDefaultRespawnThink;
  } else {
    const gameMode = gpGameModeCvar as number;
    if (gameMode === 2 || gameMode === 3) {
      // Deathmatch-style mode → don't respawn, just bury the model.
      this.m_fNextThink = 0;
      this.m_pfnThink   = null;
    } else {
      this.m_fNextThink = 0xffff0000;
      this.m_pfnThink   = gpDefaultRespawnThink;
    }
  }

  // ---- 7. Schedule the actual respawn time. ------------------------------
  //   pev->nextthink (pev+0x104) = gpGlobals->time + delta, where:
  //     respawn <= 0 → cvar default delay   (GOT ebx-0x6E760)
  //     respawn == 1 → cvar instant delay   (GOT ebx-0x6F018)
  //     respawn >= 2 → clamp to 180 s
  // The 180 s cap is implemented as: `cmp [nextthink_field], 0xB4; jle .use; mov 0xB4`.
  let delta: number;
  if      (respawn <= 0) delta = cvarDefaultRespawn;
  else if (respawn === 1) delta = cvarInstantRespawn;
  else                    delta = Math.min(respawn, 0xb4);

  this.pev.nextthink = gpGlobals.time + delta;
}