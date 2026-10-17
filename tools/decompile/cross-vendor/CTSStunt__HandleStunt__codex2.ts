// --- suggested patch (just the comment fix and one readability note) ---

// In the player-state gate, change the wrong flag comment:
  // 0xc30 = FL_INWATER | FL_MONSTER | FL_ONGROUND | FL_NOTARGET
  // Stunts are disallowed while any of these bits are set on the player.
  if ((pev.flags & 0xc30) !== 0) return; // pev+0x250

// In the bullet-time / dive fallback, clarify the redundant bit-0x40 retest:
  // === Bullet-time / dive fallback ===
  // We reach here from three paths in the disassembly:
  //   (a) bit 0x2 set + wall-climb check failed  (bit 0x40 state unknown)
  //   (b) bit 0x2 not set, bit 0x40 set, wall-jump AND wall-dive both failed
  //   (c) bit 0x2 not set, bit 0x40 not set  (handled in the else branch above)
  // The disassembly's 0x8b0eb retest of bit 0x40 is required for (a); for
  // (b) it's redundant but is faithfully preserved here.
  if ((player.m_afButton & 0x40) === 0) return;

// In the time-since-stunt gate, drop a one-line note about the float→double
// promotion that happens implicitly between 0x8b12d and 0x8b14b:
  // NB: the original code loads timeSinceStunt as a 32-bit float (0x8b12b),
  // then `fstp QWORD PTR [esp]` widens it to double before the0x8b146
  // `fdivrp` against the [ebx-0x6de48] double constant. In TS this is
  // implicit in the numeric ops; no manual widening is needed.
