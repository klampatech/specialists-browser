/**
 * CTSSlowMotionPoint::WaitThink — per-tick think handler for a slow-motion zone.
 *
 * Each call:
 *   1. Reschedules itself to run again at gpGlobals.time + 0.1.
 *   2. If m_flEndTime has passed, calls DeactivateSlow and removes this entity.
 *   3. Iterates connected players (1..gpGlobals.maxClients). For each that
 *      passes two state checks, traces from the zone origin to the player's
 *      slightly-predicted origin. If LOS is clear, applies slow-motion to
 *      that player and records them in m_pAffectedPlayers[slot].
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x61728 (386 bytes).
 */

// External references (declare for compile-in-isolation).
declare const gpGlobals: any;
declare function UTIL_Remove(entity: any): void;
declare function UTIL_PlayerByIndex(idx: number): any;
declare function UTIL_TraceLine(...args: any[]): void;
declare function engineSlotLookup(arg: any): number;
interface Vector { x: number; y: number; z: number; }
interface TraceResult { flFraction: number; /* ... */ }

export function WaitThink(this: any): void {
  // (1) Schedule next think ~0.1s out
  this.pev.nextthink = gpGlobals.time + 0.1;

  // (2) Lifetime expired — retire the zone
  if (this.m_flEndTime < gpGlobals.time) {
    this.DeactivateSlow();
    UTIL_Remove(this);
    return;
  }

  // (3) For each player, apply slow-motion if they're visible from the zone
  for (let i = 1; i <= gpGlobals.maxClients; i++) {
    const player: any = UTIL_PlayerByIndex(i);
    if (!player) continue;

    // Two vtable calls through the player's vtable pointer at +0x60.
    // Pattern: "alive AND not already in slow-motion".
    // TODO(asm-ambiguous): exact vtable names / indices to be confirmed.
    const vtable: any = player[0x60];
    if (vtable[0xc8 / 4](player) === 0) continue;   // ~ IsAlive
    if (vtable[0x18 / 4](player) !== 0) continue;   // ~ !IsInSlowMotion

    // LOS-trace from the zone origin to a one-tick-ahead player position.
    // Floats at pev+0x174/0x178/0x17c form a delta vector (semantically:
    // per-tick velocity). TODO(asm-ambiguous): confirm field meaning.
    const start: Vector = this.pev.origin;
    const end: Vector = {
      x: player.pev.origin.x + player.pev[0x174],
      y: player.pev.origin.y + player.pev[0x178],
      z: player.pev.origin.z + player.pev[0x17c],
    };
    const result: TraceResult = {};
    UTIL_TraceLine(
      start,
      end,
      /*ignoreMonsters*/ 1,
      /*ignoreGlass*/    1,
      /*ignoreEnt*/      null,
      result,
    );
    if (result.flFraction < 1.0) continue; // LOS blocked

    // Apply slow-motion to this player for one tick.
    // Cdecl args (pushed R→L): 0 (force), this.m_flSlowAmount, player.
    // TODO(asm-ambiguous): vtable[5] identity.
    vtable[0x14 / 4](player, this.m_flSlowAmount, 0);

    // Mirror zone's active flag onto the player's slow-motion flag.
    // [edi+0xf4]=this.m_bIsActive, [esi+0x175]=player.m_bIsInSlowMotion.
    player.m_bIsInSlowMotion = (this.m_bIsActive !== 0);

    // Engine slot-lookup: maps player.pev+0x208 -> 0..0x20 slot index.
    // Disassembly: call [ebx+0x1aa8][0x11c](player.pev+0x208).
    // TODO(asm-ambiguous): exact engine function / what pev+0x208 holds.
    const slot: number = engineSlotLookup(player.pev[0x208]);
    if (slot > 0x20) continue;
    this.m_pAffectedPlayers[slot] = player;
  }
}