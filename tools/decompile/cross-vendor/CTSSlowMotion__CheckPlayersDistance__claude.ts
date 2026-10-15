/**
 * CTSSlowMotion::CheckPlayersDistance — for each affected player,
 * restore normal playback if they've moved beyond the threshold.
 *
 * Iterates the 33 affected-player slots at this+0x70 (4 bytes each).
 * For each non-null, alive player, computes the Euclidean distance
 * to this entity; if it exceeds the threshold at this+0xf4
 * (loaded via `fild` so stored as int32), calls the entity vtable's
 * SetSlowMotion slot with (player, 1.0f, 0) and clears the slot.
 */
export function CheckPlayersDistance(this: CTSSlowMotion): void {
  // Iterate the 33 affected-player slots at this+0x70.
  for (let i = 0; i <= 32; i++) {
    const player: any = this.m_rgAffectedPlayers[i];
    if (player == null) continue;

    // IsAlive via player->[0x60]->vtable[6](player).
    if (!player.m_pEntityVTable.IsAlive(player)) continue;

    // GetAbsOrigin via this->[0x60]->vtable[62](this, &out).
    // Same vtable pointer slot used on `player` for IsAlive / SetSlowMotion.
    const thisOrigin: any = { x: 0, y: 0, z: 0 };
    this.m_pEntityVTable.GetAbsOrigin(this, thisOrigin);

    // Read player origin: dereference player[0] (first field as ptr),
    // then load 3-float Vector at +0x8, +0xc, +0x10 of the pointed struct.
    // TODO(asm-ambiguous): offset 0x8 of *player doesn't match standard
    // pev->origin (0x78). Likely a TS-specific direct origin field.
    const playerBase: any = (player as any).__pbase;
    const playerOrigin: any = {
      x: playerBase[0x8 / 4],
      y: playerBase[0xc / 4],
      z: playerBase[0x10 / 4],
    };

    // Euclidean distance: sqrt(dx*dx + dy*dy + dz*dz).
    const dx = playerOrigin.x - thisOrigin.x;
    const dy = playerOrigin.y - thisOrigin.y;
    const dz = playerOrigin.z - thisOrigin.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Threshold comparison: dist > threshold → deactivate.
    // (fcompp + test ah,0x41 matches > or< ; exact equality edges to "skip".)
    if (dist > this.m_iMaxDistance) {
      // SetSlowMotion via player->[0x60]->vtable[5](player, 1.0f, 0).
      player.m_pEntityVTable.SetSlowMotion(player, 1.0, 0);
      this.m_rgAffectedPlayers[i] = null;
    }
  }
}
