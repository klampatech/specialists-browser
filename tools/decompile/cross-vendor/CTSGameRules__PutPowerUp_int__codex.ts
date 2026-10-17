```typescript
/**
 * CTSGameRules::PutPowerUp — find a spot near an existing power-up and drop
 * a new one there, avoiding spots that are too close to a player.
 *
 * Behavior:
 *  1. Enumerate every `ts_powerup` entity currently in the world (capped at 32).
 *  2. From the back of the list toward the front, for each candidate:
 *     a. Pick a random Vector near the candidate's origin.
 *     b. Search a 128-unit sphere for any `player`-class entity — bail if found.
 *     c. Otherwise, create a new power-up at that Vector and return 1.
 *  3. If the candidate is blocked (player too close), remove it from the list
 *     (shift later entries left) and try the previous one.
 *  4. If no candidate works, return 0.
 *
 * @param this    The CTSGameRules entity (TS gameplay rules instance).
 * @param player  Player-related int forwarded to `CTSPowerUp::CreatePowerUp` as its second arg.
 * @returns       1 if a new power-up was created, 0 otherwise.
 */
export function PutPowerUp(this: CTSGameRules, player: number): number {
  // 1. Collect every existing `ts_powerup` entity (capped at 0x20 = 32).
  // TODO(types): import Vector and CBaseEntity from the engine-types module.
  const slots: any[] = [];
  let e: any = UTIL_FindEntityByClassname(null, "ts_powerup");
  while (e !== null && slots.length < 0x20) {
    slots.push(e);
    e = UTIL_FindEntityByClassname(e, "ts_powerup");
  }
  if (slots.length === 0) return 0;

  // 2. Walk the candidate list from last to first; drop the ones we can't use.
  for (let i = slots.length - 1; i >= 0; i--) {
    const source = slots[i];

    // Pick a random Vector near this candidate's origin.
    // TODO(asm-ambiguous): a vtable call to `[ebx+0x1aa8]->[eax+0x168](0, i)`
    // happens right before this in the disassembly. Its purpose isn't visible
    // from this chunk alone — likely some per-iteration hook into the rules
    // (e.g. refreshing player tracking state) that doesn't change behavior here.
    const pos: Vector = GetRandomPosition(source.origin);

    // 3. Sphere check: any "player" within 128.0 units blocks spawning here.
    let clearToSpawn = true;
    let ent: any = UTIL_FindEntityInSphere(null, pos, 128.0);
    while (ent !== null && clearToSpawn) {
      if (strcmp(engineGetEntityClassname(ent), "player") === 0) {
        clearToSpawn = false;
      }
      ent = UTIL_FindEntityInSphere(ent, pos, 128.0);
    }

    if (clearToSpawn) {
      // Spawn the new power-up and copy the chosen origin onto it.
      const newPU = CreatePowerUp(-1 /* -1 = "any type" */, player);
      newPU.origin = pos; // 3-dword (Vector x, y, z) copy
      return 1;
    }

    // 4. Couldn't use this candidate — drop it (shift later entries left).
    slots[i] = null;
    for (let j = i; j < slots.length - 1; j++) {
      slots[j] = slots[j + 1];
    }
    slots.length -= 1;
  }

  return 0;
}
```
