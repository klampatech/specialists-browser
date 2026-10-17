```typescript
/**
 * CTSGameRules::TheOneIsDead — handle the death of "The One" player.
 *
 * Called when the player designated as "The One" dies. Shows a HUD
 * announcement, plays death/promotion sounds on the victim and killer,
 * and (if killed by a non-victim player) promotes the killer to the
 * new "The One".
 *
 * @param this      The CTSGameRules instance
 * @param pVictim   The CBasePlayer who died (was "The One"), or null
 * @param pKiller   The CBasePlayer who killed The One, or null for suicide/environment
 * @returns void
 */
export function TheOneIsDead(
  this: CTSGameRules,
  pVictim: CBasePlayer | null,
  pKiller: CBasePlayer | null
): void {
  // Mark "The One is dead" on the rules object (byte flag at offset 0x5878)
  this.theOneAliveFlag = 0;

  // Nothing to do without a victim
  if (!pVictim) return;

  // Clear the victim's "I am The One" flag (byte at offset 0x7b9)
  pVictim.theOneFlag = 0;

  // Bail if the round isn't in an "active The One" state.
  // TODO(asm-ambiguous): [ebx+0x12cc] is a pointer-to-pointer whose first
  // dereference is checked. Likely a cvar pointer or game state flag
  // (e.g. ts_theone_active) — verify against strings-n5.txt.
  if (theOneRoundActive === 0) return;

  // No killer, or self-kill (suicide): show generic message and stop
  if (!pKiller || pKiller === pVictim) {
    // TSHudMessageAll(r=0x64, g=0x96, b=0xff, x=1, y=0x1e, msg)
    // Generic suicide/no-killer announcement (string at [ebx-0x6e4e1])
    TSHudMessageAll(0x64, 0x96, 0xff, 1, 0x1e, "The One is dead!");
    return;
  }

  // Format and show a HUD message naming the killer.
  // TODO(asm-ambiguous): the format string at [ebx-0x6e4d0] is assumed to be
  // "%s killed The One!" (it sits 17 bytes after the suicide string at
  // [ebx-0x6e4e1] and is used with exactly one vararg). The %s arg is the
  // killer's netname, computed as
  //   [ebx+0x1600]->[0x98] + pKiller->vtable[0x1d0]
  // — verify the engine global and vtable slot against strings-n5.txt and
  // the CBasePlayer vtable layout.
  const killMsg = UTIL_VarArgs("%s killed The One!", getKillerName(pKiller));
  TSHudMessageAll(0x64, 0x96, 0xff, 1, 0x1e, killMsg);

  // --- Play death-related sounds/effects on the victim ---
  // TODO(asm-ambiguous): [ebx+0x2060] is an engine singleton. Its vtable
  // is dispatched twice below: slot 0xe0 with (engine, pVictim) and
  // slot 0xdc with (engine, pVictim, channel). These are likely
  // pfnEmitSound / pfnEmitAmbientSound equivalents.
  engineSingleton.emitSoundTo(pVictim);
  // TODO(asm-ambiguous): pVictim holds an interface pointer at offset 0x60;
  // calling vtable[0xd0] with pVictim as 'this' returns the player's default
  // sound channel used in the next emit.
  const victimSoundChan = pVictim.someInterface0x60?.vtable0xd0() ?? 0;
  engineSingleton.emitAmbientFxTo(pVictim, victimSoundChan);

  // Promote the killer to the new "The One"
  SetPlayerTheOne(this, pKiller);

  // --- Play promotion sounds/effects on the (new) The One ---
  engineSingleton.emitSoundTo(pKiller);
  const killerSoundChan = pKiller.someInterface0x60?.vtable0xd0() ?? 0;
  engineSingleton.emitAmbientFxTo(pKiller, killerSoundChan);
}
```
