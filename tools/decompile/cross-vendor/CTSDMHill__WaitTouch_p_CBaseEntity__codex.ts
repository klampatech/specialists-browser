```typescript
/**
 * CTSDMHill::WaitTouch — touch handler for the DM Hill
 * (King-of-the-Hill) entity.
 *
 * Tracks the player currently on the hill, enforces a dwell
 * window before scoring, and resets state when:
 *   - A new player takes the hill and cannot see the current king
 *   - The same player re-touches and dwell has elapsed
 *
 * On eligible score frames, iterates all player entities,
 * awards points + plays the score sound on the king, broadcasts
 * a centered HUD message, and fires the entity's target.
 *
 * @param this   The CTSDMHill entity instance
 * @param pOther The entity that just touched the hill
 * @returns     void
 */
export function WaitTouch(
  this: CTSDMHill,
  pOther: CBaseEntity,
): void {
  // ---- Cooldown gate ----
  // m_flNextCheck is initialized to 0; non-zero means "wait
  // until gpGlobals->time catches up before re-evaluating".
  if (this.m_flNextCheck > gpGlobals.time) return;

  // ---- Tatcher must be alive + a player ----
  if (!pOther.IsAlive()) return;                  // vtable +0xc8
  if (!pOther.IsPlayer()) return;                 // vtable +0xb4

  // ---- 1. First-claim: no current king ----
  if (this.m_pCurrentToucher === null) {
    this.m_pCurrentToucher = pOther;
    this.m_flNextCheck = 0;
    const deadline = gpGlobals.time + Math.max(this.m_flDwellTime, 0);
    this.m_flDeadline = deadline;
    this.m_flLastClaim = deadline;
    return;
  }

  // ---- 2. Different player is now on the hill ----
  if (this.m_pCurrentToucher !== pOther) {
    // FVisible(pOther, this) → 1 if the existing king can see
    // the new arrival; only "steal" on visible contact.
    if (this.m_pCurrentToucher.FVisible(pOther, this) !== 1) {
      this.m_pCurrentToucher = null;
      this.m_flNextCheck = 0;
      this.m_flDeadline = gpGlobals.time + Math.max(this.m_flDwellTime, 0);
      return;
    }
    // Otherwise fall through — dwell check + scoring below.
  } else {
    // ---- 3. Same player re-touching ----
    // Compare elapsed since last claim against dwell threshold.
    const elapsed = gpGlobals.time - this.m_flLastClaim;
    const dwell = Math.max(this.m_flDwellTime, 0);
    if (elapsed >= dwell) {
      // Dwell exceeded: reset state and re-arm deadline.
      this.m_pCurrentToucher = null;
      this.m_flNextCheck = 0;
      this.m_flDeadline = gpGlobals.time + dwell;
      return;
    }
    // Within dwell window — proceed to outer-deadline gate.
  }

  // ---- 4. Outer-deadline gate (gating the actual scoring) ----
  // TODO(asm-ambiguous): this re-check at 0x61d97 uses `jae` after
  // `fcomp`; the behavior depends on whether the deadline field
  // is the same as the dwell-just-calculated deadline or something
  // seeded earlier. We've modeled it as "skip if deadline not yet
  // reached".
  if (this.m_flDeadline >= gpGlobals.time) return;

  // ---- 5. Build the HUD message string ----
  // The disassembly assembles a stack-resident string by:
  //   - testing a global (game-rules?) pointer; if set, copy a
  //     short prefix from a code-data string at [ebx-0x6ee52];
  //   - otherwise read the toucher edict's `netname` offset
  //     (0x1d0 + edict base + gpGlobals->max_edicts) and strcpy it;
  //   - then strcat a separator from [ebx-0x67fba];
  //   - then strcat the toucher's target-name offset (0x1d4 + ...)
  //     followed by a format string from [ebx-0x6ee31]/[ebx-0x6ee45]
  //     that includes this->m_iPointsPerKill (0x70) or 0x74.
  // The exact runtime string is engine-internal; we don't model
  // its assembly line-by-line here.
  // TODO(asm-ambiguous): the king-announcement text assembly uses
  // several [ebx-0x6e...] literals that correspond to code-section
  // strings ("%s", " won the hill with %d points", etc.). Their
  // identities need to be cross-checked against analysis/strings-n5.txt.
  const msg = buildKingAnnouncement(this, this.m_pCurrentToucher);

  // ---- 6. Walk every "player" entity and award points to the king ----
  let ent: CBaseEntity | null = UTIL_FindEntityByClassname(null, "player");
  while (ent !== null) {
    // Gate: player must have a weapon, the weapon must pass
    // an entity-type check (probably HasWeapon / weapon-visibility),
    // and the player must be alive.
    const weapon = ent.weapon;   // [ent+0x208]
    if (weapon === 0) {
      ent = UTIL_FindEntityByClassname(ent, "player");
      continue;
    }
    // TODO(asm-ambiguous): vtable +0x118 — looks like a check that
    // the player's weapon pointer is a recognized CBaseEntity
    // subclass; treated as a no-fail visibility probe here.
    if (ent.someWeaponCheck(weapon) === 0) {
      ent = UTIL_FindEntityByClassname(ent, "player");
      continue;
    }
    if (!ent.IsAlive()) {
      ent = UTIL_FindEntityByClassname(ent, "player");
      continue;
    }

    // Resolve the C++ class for the player (it's stored as a
    // vtable-typed base pointer; GetClassPtr<T> recovers it).
    const pPlayer = GetClassPtr<CBasePlayer>(ent);

    // Compare netnames — we only score the player whose name
    // matches the toucher's.
    const otherName = this.m_pCurrentToucher.GetNetName();  // vtable +0xd0
    if (strcmp(pPlayer.GetNetName(), otherName) !== 0) {
      ent = UTIL_FindEntityByClassname(ent, "player");
      continue;
    }

    // Award points (the fild/fadd sequence at 0x61f3e adds an
    // *int* point value to frags at +0x164).
    pPlayer.frags += this.m_iPointsPerScore;   // m_iPointsPerScore at +0x74
    // On the OTHER path (no game-rules-pointer), the += uses +0x70:
    // pPlayer.frags += this.m_iScoreForTwoWayKill; // +0x70

    // Play the score sound via EmitSound (vtable +0xb8, channel 2,
    // vol=0, pitch=0). The exact sound name string lives in the
    // GOT-relative engine globals.
    pPlayer.EmitSound(/* channel */ 2, /* vol */ 0, /* pitch */ 0, /* sound */ undefined);

    // Append player stats (e.g. "%d frags") to the HUD message —
    // implemented via fnstcw/fldcw + fistp to convert the float
    // `frags` field to an int, then strcat'ing a "%d" string.
    appendScoreToHud(msg, pPlayer.frags);

    ent = UTIL_FindEntityByClassname(ent, "player");
  }

  // ---- 7. Center-screen broadcast of the king announcement ----
  // 0x62184–0x621f2: builds "X is the king of the hill" via
  //   - max(m_flLastClaim, 0) → elapsed-since-claim string
  //   - color/int conversion via fnstcw trick
  //   - TSHudMessageAll(channel=8, x=0, y=0xff=255?, r=255, g=8,
  //                     b=-1, msg)
  // TODO(asm-ambiguous): the exact (x, y, r, g, b) arguments and
  // the timeout aren't fully derivable from the chunk alone.
  if (msg.length > 0) {
    TSHudMessageAll(
      /* channel */ 8,
      /* x */ 0,
      /* y */ 0xff,
      /* r */ 0xff,
      /* g */ 8,
      /* b */ -1,
      msg,
    );
  }

  // ---- 8. Schedule the next scoring deadline ----
  const newDeadline = gpGlobals.time + Math.max(this.m_flDwellTime, 0);
  this.m_flDeadline = newDeadline;

  // ---- 9. Fire the entity's target if configured ----
  if (this.m_pFireTarget) {
    // STRING(this->m_pFireTarget) is built from edict(0x1c8).base +
    // max_edicts at gpGlobals+0x98 — i.e. the same pattern as
    // elsewhere in the chunk. USE_TOGGLE = 3.
    FireTargets(this.m_pFireTarget, this, this, USE_TYPE.USE_TOGGLE, 0);
  }

  // ---- 10. Stash last-activity timestamp on the entity ----
  this.m_flLastActivity = gpGlobals.time;
}
```

**Note:** This skeleton leans on helper signatures we haven't formalized yet (`buildKingAnnouncement`, `appendScoreToHud`, `EmitSound` parameter ordering, the exact `pointers->pev` model that mediates `strcmp(netname)` in the original C++). The pure control-flow / state-machine shape — gates → claim / steal / dwell-reset → outer-deadline → score-walk → broadcast → fire-target → restamp — is faithful to the disassembly. Field-name choices (`m_pCurrentToucher`, `m_flDwellTime`, etc.) are derived from operation type at each offset and should be re-verified against `analysis/strings-n5.txt` and the class's DWARF types once we add the full class reconstruction (D.4).
