/**
 * CTSGameRules::PutPowerUp — find a spot near an existing power-up and drop
 * a new one there, avoiding spots that are too close to a player.
 *
 * Algorithm (from disassembly at 0x0008797c):
 *   1. Enumerate every `ts_powerup` entity currently in the world (capped *      at 32).
 *   2. From the back of the list toward the front, for each candidate:
 *      a. Pick a random Vector near the candidate's origin.
 *      b. Search a 128-unit sphere for any `player`-class entity — bail if
 *         found.
 *      c. Otherwise, create a new power-up at that Vector and return 1.
 *   3. If the candidate is blocked (player too close), remove it from the
 *      list and try the previous one.
 *   4. If no candidate works, return 0.
 *
 * @param this    The CTSGameRules instance.
 * @param player  Player-related int forwarded to `CTSPowerUp::CreatePowerUp`
 *                as its FIRST arg (per disassembly push order).
 * @returns       1 if a new power-up was created, 0 otherwise.
 */
export function PutPowerUp(
  // TODO(types): replace `any` with `CTSGameRules` once the class is
  // declared. The disassembly has it as a hidden C++ `this` (at [esp+0x110]
  // after the prologue).
  this: any,
  player: number,
): number {
  // 1. Collect every existing `ts_powerup` entity (capped at 0x20 = 32).
  // TODO(types): replace `any` with `CBaseEntity` once declared.
  const slots: any[] = [];
  let e: any = UTIL_FindEntityByClassname(null, "ts_powerup");
  while (e !== null && slots.length < 0x20) {
    slots.push(e);
    e = UTIL_FindEntityByClassname(e, "ts_powerup");
  }
  if (slots.length === 0) return 0;

  // 2. Walk the candidate list from last to first; drop the ones we can't use.
  // The disassembly uses two `dec [esp+0x8]` instructions — one before the
  // loop body (at 0x87a2c, sets the starting index to N-1) and one after the
  // body (at 0x87ba2, advances the iterator). Together they yield the same
  // iteration order as `for (let i = slots.length - 1; i >= 0; i--)`.
  for (let i = slots.length - 1; i >= 0; i--) {
    const source: any = slots[i];

    // TODO(asm-ambiguous): the disassembly issues a vtable call at 0x87a4f on
    // some global singleton `[ebx+0x1aa8]->vtable[0x168/4]` with cdecl args
    // `(0, i)` (push order: `i` last = arg1, `0` first = arg2). The return
    // value is stored at `[esp+0xc]` and is then used as (a) an index into
    // the slots array for the GetRandomPosition source access at 0x87a69, and
    // (b) the shift count for the array-removal memmove starting at 0x87af6.
    // The TS treats this as a no-op for the purposes of this decompilation —
    // flagging explicitly here that this is an ASSUMPTION, not a proven
    // equivalence. A faithful re-decompile should either model this call or
    // explain why omitting it is safe (e.g. "verified at runtime that the
    // return always equals `i`").

    // Pick a random Vector near this candidate's origin.
    // TODO(types): replace `any` with `Vector` once declared.
    // NOTE: the disassembly actually pushes TWO values to GetRandomPosition
    // — the origin pointer AND a Vector* at [esp+0x10] (which appears to be
    // the function's output slot, since 12 bytes are copied from there to
    // [esp+0xec] = [E0+0xe0] right after the call). The TS treats the call
    // as single-arg; that's a known abstraction, but worth a TODO.
    const pos: any = GetRandomPosition(source.origin);

    // 3. Sphere check: any "player" within 128.0 units blocks spawning here.
    let clearToSpawn = true;
    let ent: any = UTIL_FindEntityInSphere(null, pos, 128.0);
    while (ent !== null) {
      // TODO(asm-exact): the disassembly reaches into engine globals to
      // compute the entity's classname pointer
      // (`[ebx+0x1600]->[...]->[vtable+0x98] + ent->vtable`), then `strcmp`s
      // it against "player". At this layer we treat it as
      // `engineGetEntityClassname(ent)`.
      if (strcmp(engineGetEntityClassname(ent), "player") === 0) {
        clearToSpawn = false;
      }
      ent = UTIL_FindEntityInSphere(ent, pos, 128.0);
    }

    if (clearToSpawn) {
      // Spawn the new power-up and copy the chosen origin onto it.
      // NOTE: cdecl pushes go right-to-left. The disassembly pushes
      // `0xffffffff` FIRST (→ second arg) and `[esp+0x120]` (= `player`)
      // SECOND (→ first arg). So the call is `CreatePowerUp(player, -1)`,
      // NOT `CreatePowerUp(-1, player)` as the previous decompilation had      // it. The previous call would have swapped which argument went to
      // which parameter, regardless of which parameter is named what.
      // TODO(types): replace `any` with `CTSPowerUp` once declared.
      const newPU: any = CreatePowerUp(player, -1);
      // 12-byte (Vector) copy from [esp+0xf0] (the chosen pos) to
      // result->[0]+8 = result->origin (pev->origin is at offset 8).
      newPU.origin = pos;
      return 1;
    }

    // 4. Couldn't use this candidate — remove it from the list.
    // TODO(asm-exact): the disassembly does an unrolled in-place shift of
    // the slots array (at [esp+0x20..]) by 4 bytes per element, with the
    // shift count coming from the vtable call above. `splice` is
    // semantically equivalent for our purposes here.
    slots.splice(i, 1);
  }

  return 0;
}
