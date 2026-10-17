/**
 * CTSGameRules::CountPlayers — counts the players on the server that
 * pass a per-player liveness check.
 *
 * Iterates player indices 1..gpGlobals->maxClients and, for each,
 * asks UTIL_PlayerByIndex(i) for the player and then calls a virtual
 * predicate on the returned player. Tallies and returns the count of
 * players for which the predicate returned non-zero.
 *
 * @param this  The CTSGameRules instance. The body does not read
 *              `this`; the function walks engine globals only.
 * @returns     Number of players passing the per-player check.
 */

// Ambient declarations so this file compiles in isolation. The real
// shapes are wired up in D.4 / D.5.
type CTSGameRules = any;
declare const globals: any;
declare function UTIL_PlayerByIndex(i: number): any;

export function CountPlayers(this: CTSGameRules): number {
  const maxClients: number = (globals as any).maxClients; // gpGlobals->maxClients (offset 0x90)
  let count = 0;

  for (let i = 1; i <= maxClients; i++) {
    const player: any = UTIL_PlayerByIndex(i);

    // TODO(asm-ambiguous): the disassembly loads a pointer from
    //   *(player + 0x60)
    // and then indirect-calls through its vtable at offset 0xc8
    // (vtable index ~50), passing the player as `this`. The 0x60
    // load-then-deref pattern suggests this is a virtual call on a
    // *sub-object* of the player (e.g. via pev / pvPrivateData),
    // not directly on the player's primary vtable. The exact method
    // identity (IsAlive / IsConnected / IsPlayer / similar) is not
    // recoverable from this chunk alone — needs the GoldSrc SDK
    // vtable layout to map offset 0xc8 on the sub-object to a name.
    if (player == null || !player.someLivenessCheck()) continue;

    count++;
  }

  return count;
}
