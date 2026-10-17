```typescript
/**
 * CTSKnife::Use — handles a player trying to pick up a CTSKnife entity.
 *
 * Validates the activator (alive, player, not in a flagged-invalid state),
 * then either grants the knife via PickUpWeapon or just removes the entity
 * from the world. Slow-mo knives additionally require the activator to have
 * the KungFu specialty. After this runs, the entity is gone unless
 * PickUpWeapon explicitly failed.
 *
 * @param this  The CTSKnife entity
 * @param pActivator  The entity that initiated the use (typically a CBasePlayer)
 * @param useType  USE_TYPE describing how the entity was used
 * @param value  float value (typically 0 for weapons)
 * @returns void
 */
export function Use(
  this: CTSKnife,
  pActivator: CBaseEntity,
  useType: USE_TYPE,
  value: number
): void {
  // Already used / consumed — no-op.
  if (this.m_bUsed !== 0) return;

  // pActivator must be alive (vfunc through [pActivator+0x60]+0xc8).
  // TODO(asm-ambiguous): what is at pActivator+0x60? Which vtable is index 0x32?
  if (pActivator.m_pInner.vfunc_0x32() === 0) return;

  // pActivator must be a player (vfunc through [pActivator+0x60]+0xb4).
  // TODO(asm-ambiguous): which vtable is index 0x2d?
  if (pActivator.m_pInner.vfunc_0x2d() === 0) return;

  // Signed-byte check on pActivator — likely a "dead/transitional" state.
  // TODO(asm-ambiguous): what's at pActivator+0x118; why does negative matter?
  if (pActivator.m_iSignedFlag < 0) return;

  // Slow-mo knives require KungFu on the activator.
  if (this.m_bSlowed !== 0) {
    if (KungFu(pActivator as unknown as CBasePlayer) === 0) return;
  }

  // Pickup gate: [this+0x88] vs. a global value via three-level indirection
  // off the GOT. When true, attempt PickUpWeapon; the cleanup below runs in
  // both cases unless PickUpWeapon returns 0.
  // TODO(asm-ambiguous): triple-indirection at [GOT+0x1600]; the comparison
  // direction ([this+0x88] > global) is unusual for a respawn-time gate.
  const globalTime: number = 0; // placeholder for the indirection
  let picked = true; // default: no PickUpWeapon attempted → cleanup still runs
  if (this.m_flRespawnTime > globalTime) {
    // Pick which weapon to grant based on m_iMode:
    //   8 → 0x22, 6 → 0x19, default → 0x23.
    let weaponId: tsweapon_t;
    switch (this.m_iMode) {
      case 8:  weaponId = 0x22 as tsweapon_t; break;
      case 6:  weaponId = 0x19 as tsweapon_t; break;
      default: weaponId = 0x23 as tsweapon_t; break;
    }
    picked = PickUpWeapon(
      pActivator as unknown as CBasePlayer,
      weaponId,
      null, // void*
      0,    // int
      false, // bool
      false  // bool (signature also has trailing `T4` — TODO(asm-ambiguous))
    );
  }

  // Pickup attempted but rejected (e.g., inventory full) — leave the knife
  // for a later attempt.
  if (!picked) return;

  // Cleanup: stamp the respawn timer to the same global, drop from the
  // slow-mo array, then remove the entity.
  this.m_flRespawnTime = globalTime;
  RemoveEntityFromSlowedArray(this);
  UTIL_Remove(this);
}
```
