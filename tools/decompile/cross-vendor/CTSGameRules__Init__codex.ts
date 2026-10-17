```typescript
/**
 * CTSGameRules::Init — initialize game-rule state for a fresh round.
 *
 * Resets per-team scores, the objective slot table, the embedded bullet
 * manager, the powerup / slow-motion subsystem, and the weapon-restriction
 * list. Seeds round-timing fields with `gpGlobals->time + cvar` so the first
 * round starts after the configured delay. Sub-initializers are called in
 * the order the Half-Life server expects them.
 *
 * @param this  The CTSGameRules entity instance.
 * @returns     void
 */
export function Init(this: CTSGameRules): void {
  // Prologue has already established the PIC / GOT base in `ebx`. Every
  // `[esi+off]` below is `this.field`; every `[ebx+off]` is a global
  // (cvar, gpGlobals, engine singleton).

  // ---- 1) Initial game-mode byte from a 2-deep global pointer chain. ----
  // TODO(asm-ambiguous): which global / struct the byte comes from —
  //  likely the active game-mode (coop / deathmatch / TS) flag.
  this.m_bInitialMode = readU8(readPtr(GOT, /* slot */ 0x210c));

  // ---- 2) Teams registry. ----
  this.InitTeams();
  this.m_bTeamsSentinel = 0xff; // sentinel byte at +1

  // ---- 3) Per-team score + round-timing state (offsets 0x558..0x578). ----
  // Two pre-seeded -1 slots, four zero slots, then float round-start +
  // (-1.0f / -1) sentinel pair. Each offset is a separate field; the MSVC
  // codegen writes them in non-sequential order, but the semantics are
  // independent field stores.
  this.field_0x558 = -1;
  this.field_0x55c = -1;
  this.field_0x560 = 0;
  this.field_0x564 = 0;
  this.field_0x568 = 0;
  this.field_0x56c = 0;
  this.m_flRoundStart    = gpGlobals.time + CVAR_TIME_A; // GOT -0x6e760
  this.m_flNextRoundTime = -1.0;                          // 0xbf800000
  this.m_iNextRoundTicks = -1;

  // ---- 4) Zero a 33-dword (132 B) per-player/per-team buffer at +0x57c. ----
  // Generated as `rep stosd` with ecx=0x21, eax=0.
  zeroFillDwords(this, /* offset */ 0x57c, /* count */ 33);

  // ---- 5) Early state ints & flags (offsets 0x4..0x18); round-time seeded. ----
  this.field_0x04 = 0;
  this.field_0x14 = 0;
  this.field_0x18 = 0;
  this.field_0x08 = 0;
  this.m_flRoundTime  = gpGlobals.time + CVAR_TIME_B;   // GOT -0x6f008
  this.m_bRoundActive = 1;

  this.InitObjectives();
  this.SetObjective();

  // ---- 6) Zero the 2304-byte objective slot table at +0x684. ----
  // Generated as `rep stosd` with ecx=0x240. Covers 0x684..0xf83 (576
  // dwords) — likely a 16-slot CTSObjective array (16 × 144 B).
  zeroFillDwords(this, /* offset */ 0x684, /* count */ 0x240);

  this.m_flNextObjectiveCheck = gpGlobals.time + CVAR_TIME_C; // GOT -0x6ecd0
  this.field_0x1824 = 0;

  // ---- 7) Reset the embedded bullet manager (in-place sub-object at +0x1864). ----
  this.m_BulletManager.Reset();

  // ---- 8) Weapon restriction: global init returns a list pointer; both head ----
  //       and tail of the restriction list are seeded with it.
  const weaponList = InitWeaponRestriction();
  this.field_0x586c = weaponList; // head
  this.field_0x5870 = weaponList; // tail

  // ---- 9) Powerup / slow-motion subsystem defaults (offsets 0x5874..0x5891). ----
  this.field_0x5874 = 0;
  this.field_0x5875 = 0;
  this.field_0x5876 = 0;
  this.field_0x5878 = 0;
  this.m_flNextPowerupCheck = gpGlobals.time + CVAR_TIME_C; // GOT -0x6ecd0
  this.field_0x5880 = 0;
  this.field_0x5884 = 0;
  this.field_0x5885 = 0;
  // TODO(asm-ambiguous): exact role of these slow-motion constants unclear
  //  from this chunk alone — likely default slow-motion amount (0x3dcccccd)
  //  and duration (0x3e59999a) used by `ts_slowmotion`.
  this.m_flSlowMotionAmount = 0.1;    // 0x3dcccccd
  this.m_flSlowMotionTime   = 0.169;  // 0x3e59999a
  this.field_0x5890 = 0;
  this.field_0x5891 = 0;
}
```
