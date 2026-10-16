```typescript
/**
 * CTSGun::KatanaThrow — throw the katana, spawning a flying CTSKnife projectile
 * along the player's view, then drop the katana from the player's inventory.
 *
 * @param this  The CTSGun entity instance (this in the original C++)
 * @returns     void
 */
export function KatanaThrow(this: CTSGun): void {
  // Guard: only proceed if a katana is actually attached to this gun.
  // TODO(asm-ambiguous): [this+0xcc] is a dword null-checked here. It may be
  //   a flag/pointer to the active katana item, or a TS-specific "ready to
  //   throw" guard; the exact field meaning is unclear without more context.
  if (this.m_pKatanaItem === null) return;

  const player: any = this.m_pPlayer;         // [this+0x80]
  const katanaItem: any = this.m_pActiveItem; // [this+0xd0]

  // Set cooldown times. The throw delay comes from the katana item's own time
  // field; the weapon idle cooldown is a hard-coded 0.5s (double-precision
  // constant at GOT-0x6e768).
  const throwDelay: number = katanaItem.m_flTime; // [katanaItem+0x28]
  const now: number = UTIL_WeaponTimeBase();
  this.m_flNextSecondaryAttack = now + throwDelay;
  this.m_flNextPrimaryAttack = now + throwDelay;
  this.m_flTimeWeaponIdle = now + 0.5;

  // Build view vectors from the player's view angles.
  UTIL_MakeVectors(player.pev.v_angle);

  // spawnPos = player abs origin + view_ofs (the eye position).
  const ox = player.pev.origin.x + player.pev.view_ofs.x;
  const oy = player.pev.origin.y + player.pev.view_ofs.y;
  const oz = player.pev.origin.z + player.pev.view_ofs.z;

  // endPos = spawnPos + forward * throwSpeed.
  // TODO(asm-ambiguous): the global at GOT+0x1600 is dereferenced twice
  //   ([GOT+0x1600] -> ptr -> struct) and then accessed as a 3-vector at
  //   +0x28/+0x2C/+0x30. Verify the actual layout (likely a vec3 cvar like
  //   "ts_katana_throw_speed" or similar).
  const tv: any = g_katanaThrowSpeed.value;
  const ex = ox + gpGlobals.v_forward.x * tv.x;
  const ey = oy + gpGlobals.v_forward.y * tv.y;
  const ez = oz + gpGlobals.v_forward.z * tv.z;

  // Trace the throw line, ignoring monsters, to find what's in the way.
  const trace: any = UTIL_TraceLine(
    { x: ox, y: oy, z: oz },
    { x: ex, y: ey, z: ez },
    IGNORE_MONSTERS,
    player.edict,
  );

  // Knife spawn position is the trace's hit point (or the trace end if nothing
  // was hit).
  // TODO(asm-ambiguous): the assembly copies trace.vecEndPos into one local
  //   and endPos into another, then mixes them per-axis with a separate cvar
  //   (GOT-0x6f064). The exact blend is not clearly visible in the chunk;
  //   treated here as "use the hit point".
  const hx = trace.vecEndPos.x;
  const hy = trace.vecEndPos.y;
  const hz = trace.vecEndPos.z;

  // Knife initial velocity: a blend of the throw direction, the player's
  // current velocity, and the throw speed cvar.
  // TODO(asm-ambiguous): the assembly does a complex chain of fmuls/fadds
  //   with three different cvar vectors here. Treated here as a rough blend.
  const pvx = player.pev.velocity.x;
  const pvy = player.pev.velocity.y;
  const pvz = player.pev.velocity.z;
  const vx = ex - ox + pvx + tv.x;
  const vy = ey - oy + pvy + tv.y;
  const vz = ez - oz + pvz + tv.z;

  // Spawn the knife projectile.
  const knife: any = CTSKnife.CreateKnife(
    player,
    { x: hx, y: hy, z: hz },     // origin (passed by const-ref)
    { x: vx, y: vy, z: vz },     // velocity (passed by const-ref)
    katanaItem.m_iModelIndex,    // [katanaItem+0x20], int param to CreateKnife
  );

  if (knife !== null) {
    // Orient the knife along its velocity vector.
    const kvx = knife.pev.velocity.x;
    const kvy = knife.pev.velocity.y;
    const kvz = knife.pev.velocity.z;
    const speed = Math.sqrt(kvx * kvx + kvy * kvy + kvz * kvz);
    let dir: { x: number; y: number; z: number };
    if (speed < 0.00001) {
      // Degenerate velocity; fall back to straight up.
      dir = { x: 0, y: 0, z: 1 };
    } else {
      // Normalize velocity and scale by a throw-speed cvar (GOT-0x6f3fc).
      const inv = tv.x / speed;
      dir = { x: kvx * inv, y: kvy * inv, z: kvz * inv };
    }
    UTIL_VecToAngles(dir);
    knife.pev.angles = dir;
    // Set the knife's angular velocity: 90 deg/s on x, -1000 deg/s on z.
    // TODO(asm-ambiguous): 0x42b40000 = 90.0, 0xc42f0000 = -1000.0 (sign-flip
    //   of 0x42f00000 = 120.0). The semantic mapping of each constant to
    //   avelocity.x/.y/.z is inferred; verify against CTSKnife's pev layout.
    knife.pev.avelocity = { x: 90.0, y: 0.0, z: -1000.0 };
  }

  // Trigger the throw animation if the player isn't in a special state.
  // TODO(asm-ambiguous): the flag mask 0x30c30 likely corresponds to
  //   FL_ONGROUND|FL_FROZEN|FL_ATCONTROLS|FL_DUCKING|FL_SWIM. The button test
  //   0x2 is likely IN_ATTACK. Verify against engine.h.
  if ((player.pev.flags & 0x30c30) === 0 && (player.pev.button & 0x2) !== 0) {
    CTSAnimation.Animate(player, /* sequence idx */ 0x20, /* mode */ 0);
  }

  // Play the throw sound. Pitch is randomized for variation.
  // TODO(asm-ambiguous): the sample name is at GOT-relative address 0x84603;
  //   confirm from the data-section strings dump (likely
  //   "weapons/katana_throw.wav"). The 8th arg of EMIT_SOUND_DYN (0.5) is a
  //   radius/extra param; confirm its meaning.
  EMIT_SOUND_DYN(
    player.edict,
    /* channel */ CHAN_WEAPON, // 4
    /* sample  */ "weapons/katana_throw.wav",
    /* volume  */ 1.0,
    /* attn    */ 0.8,
    /* flags   */ 0,
    /* pitch   */ RANDOM_LONG(0, 31) + 95,
    /* radius  */ 0.5,
  );

  // If the infinite-clips cheat is OFF, refund ammo and drop the weapon.
  if (!InfiniteClips(player)) {
    // Refund the katana's clip ammo back into the player's ammo pool.
    player.m_rgAmmo[katanaItem.m_iAmmoType] += katanaItem.m_iClip;
    // Refresh the player's max-speed (dropping the katana may change it).
    SetPlayerSpeed(player, GetSpeedBySlots(player));
    // Drop the katana weapon. [this+0xc8] is the int arg.
    // TODO(asm-ambiguous): [this+0xc8] is the int arg, possibly m_iDropData
    //   or the weapon slot id; verify.
    this.DropWeapon(this.m_iDropData, true);
  }
}
```
