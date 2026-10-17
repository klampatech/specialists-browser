if (Math.hypot(vx, vy, vz) < kThreshold) {
  pev.dword0x50 = 0;
  pev.dword0x58 = 0;
  pev.velocity = Globals.bounceReplacement;
}
