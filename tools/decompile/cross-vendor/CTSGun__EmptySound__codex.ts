```typescript
/**
 * CTSGun::EmptySound — Plays the weapon's empty-magazine click and pushes the
 * next primary attack / weapon-idle / reload timers out.
 *
 * Bypassed for m_iWeaponType == 0x24 (a TS no-ammo weapon — likely a melee).
 *
 * @param this  The CTSGun entity instance.
 * @returns     void
 */
export function EmptySound(this: CTSGun): void {
  // Dry-fire has no meaning for some no-ammo weapons.
  // TODO(asm-ambiguous): 0x24 is a tsweapon_t enum value — identify which TS
  // weapon this guards (cross-reference strings-n5.txt + TS source).
  if (this.m_iWeaponType === 0x24) {
    return;
  }

  // Resolve the owning player (this->m_pPlayer at offset 0x80). The sample
  // path is the string constant at [GOT+0x1888] — almost certainly
  // "weapons/dryfire.wav".
  const player = this.m_pPlayer;
  const sample = SAMPLE_DRYFIRE; // [GOT+0x1888]

  // Play the dry-fire sound. The disassembly pushes 12 args and tail-calls
  // through the engine functions table at [GOT+0x1aa8]+0x1ec — a 12-arg
  // TS wrapper around pfnEmitSound. Right-to-left push order, so the first
  // C arg is the last push:
  //   arg1  = 0x1                          (entity class / channel flags)
  //   arg2  = [[m_pPlayer]+0x208]          (engine-internal edict ref)
  //   arg3  = WORD [this]+0x968            (sound channel / event index)
  //   arg4  = 0
  //   arg5  = sample                       (pushed twice)
  //   arg6  = sample
  //   arg7..12 = 0                          (defaults: volume / attn / flags / pitch)
  // TODO(asm-ambiguous): exact engine wrapper signature — 12-arg form
  // of pfnEmitSound; verify against TS source.
  emitSound12(
    /* entRef   */ readField(player, 0x208),
    /* channel  */ this.m_usSoundEvent,  // WORD @ this+0x968
    /* sample   */ sample,
    /* entClass */ 0x1,
  );

  // Schedule the next primary attack and weapon idle to
  //   UTIL_WeaponTimeBase() + DRYFIRE_IDLE_DELAY
  // where DRYFIRE_IDLE_DELAY is a constant float at [GOT-0x6ecd8].
  const now = UTIL_WeaponTimeBase();
  const dryFireAt = now + DRYFIRE_IDLE_DELAY;
  this.m_flNextPrimaryAttack = dryFireAt; // [esi+0x9c]
  this.m_flTimeWeaponIdle    = dryFireAt; // [esi+0xa0]

  // Schedule the reload timer to
  //   UTIL_WeaponTimeBase() + DRYFIRE_RELOAD_DELAY
  // where DRYFIRE_RELOAD_DELAY is a constant float at [GOT-0x6f010].
  this.m_flReloadTime = now + DRYFIRE_RELOAD_DELAY; // [esi+0xa8]
}
```
