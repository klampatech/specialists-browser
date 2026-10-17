```typescript
/**
 * CTSAnimation::EnableBulletDance — flips the player into bullet-dance
 * mode by setting the active flag and seeding the blend alpha and
 * per-frame blend speed that BulletDance() reads each tick.
 *
 * @param this    The CTSAnimation instance (its fields are not touched)
 * @param pPlayer The player to put into bullet dance
 * @returns       void
 */
export function EnableBulletDance(this: CTSAnimation, pPlayer: CBasePlayer): void {
  // pPlayer+0x1e4 — bullet-dance active flag (was 0; now 1)
  pPlayer.m_fBulletDance = 1;
  // pPlayer+0x1dc — initial blend-in alpha (0x3e19999a ≈ 0.15)
  pPlayer.m_flBulletDanceAlpha = 0.15;
  // pPlayer+0x1e0 — per-frame blend speed (0x40400000 = 3.0)
  pPlayer.m_flBulletDanceSpeed = 3.0;
}
```
