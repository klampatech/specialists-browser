```typescript
// Forward declarations for engine bindings referenced by CreateWeapon.
// TODO: replace with full engine-binding types when those land.
declare function GetClassPtr<T>(size: number): T | null;
declare function UTIL_ClientPrintAll(level: number, fmt: string, ...args: any[]): void;
declare function MAKE_STRING(s: string): number;

/**
 * CTSWorldGun::CreateWeapon — static factory: allocate a CTSWorldGun entity,
 * populate its weapon type + status payload, run Spawn(), and (if a player is
 * supplied) hand it off by forwarding the owner's handle and a velocity value.
 * On allocation failure, prints an error to all clients and returns NULL.
 * Special-cases weapon 29 (0x1d) by setting throwable-style pev fields.
 *
 * @param player       CBasePlayer to attach the new weapon to (NULL → standalone).
 * @param weaponType   tsweapon_t enum value identifying which weapon.
 * @param weaponStatus s_weapon_status payload (56 bytes copied verbatim).
 * @returns            The new CTSWorldGun*, or NULL on allocation failure.
 *
 * Note: original C++ is `static CTSWorldGun::CreateWeapon(...)` — no `this`.
 */
export function CreateWeapon(
  player: any /* TODO(asm-ambiguous): CBasePlayer | null */,
  weaponType: number /* TODO(asm-ambiguous): tsweapon_t */,
  weaponStatus: any /* TODO(asm-ambiguous): s_weapon_status* */,
): any /* TODO(asm-ambiguous): CTSWorldGun* */ {
  // ---- 1. Allocate entity (engine typed heap) ----
  const worldGun = GetClassPtr<any /* TODO: CTSWorldGun */>(0);
  if (worldGun === null) {
    UTIL_ClientPrintAll(
      /* print_level */ 3,
      /* fmt         */ "Failed to allocate CTSWorldGun!\n",
      /* extra1..4   */ null, null, null, null,
    );
    return null;
  }

  // ---- 2. Initialize identity + weapon payload ----
  worldGun.pev.classname = MAKE_STRING("CTSWorldGun");
  worldGun.m_weaponType = weaponType;
  // 56 bytes (14 dwords) copied verbatim from s_weapon_status into this->field_0x8c.
  worldGun.m_weaponStatus = { ...weaponStatus };

  // ---- 3. Run engine Spawn() hook (virtual call via vtable+0x24) ----
  worldGun.Spawn();

  // ---- 4. Optional player handoff ----
  if (player !== null) {
    // Forward owner's handle from player onto this->pev->owner.
    // Handle is read from player->pev at +0x208 (a TS-specific field).
    // TODO(asm-ambiguous): exact pev_t field at 0x208 is unknown — likely
    // some handle (m_hOwnerEntity / m_pPlayer / etc.) reused as owner.
    worldGun.pev.owner = player.pev.handle_at_0x208;

    // Velocity handoff:
    //   * Compare a global rule float (likely sv_maxvelocity at [ebx-0x6f408])
    //     against the player's cached velocity field at offset 0x180.
    //   * If equal, forward the cached value directly into the weapon's
    //     velocity setter (vtable+0x14) with a trailing zero arg.
    //   * Otherwise, re-query the player via vtable+0x10 (a Get*-style
    //     method returning a float) and forward that result.
    // TODO(asm-ambiguous): both vtable slots and the global rule name are
    // inferred; exact semantics depend on TS player velocity handling.
    const sv_maxvelocity: number = 0; // TODO(asm-ambiguous): real cvar lookup
    if (sv_maxvelocity === player.cachedVelocity) {
      worldGun.SetVelocity?.(player.cachedVelocity, 0);
    } else {
      const v: number = player.GetVelocity?.();
      worldGun.SetVelocity?.(v, 0);
    }
  } else {
    // Standalone (no player): clear the owner handle and reset scale to 1.0.
    worldGun.pev.owner = 0;
    worldGun.pev.scale = 1.0; // 0x3f800000
  }

  // ---- 5. Weapon 29 (0x1d) → configure as a thrown projectile ----
  if (weaponType === 0x1d /* TODO(asm-ambiguous): tsweapon_t enum name */) {
    //   pev+0x14c = 5.0     (likely friction or dmg)
    //   pev+0x15c = 19      (likely body/model index)
    //   pev+0x150..0x158 = (200, 200, 200) — Vector (impact offset?)
    // TODO(asm-ambiguous): pev_t field names at these offsets are inferred.
    worldGun.pev.friction = 5.0;
    worldGun.pev.body = 19;
    worldGun.pev.impact_offset = { x: 200, y: 200, z: 200 };
  }

  return worldGun;
}
```
