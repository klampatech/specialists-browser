```typescript
/**
 * CTSGunRffi::ScaleSpread — adjusts weapon spread for a single shot.
 *
 * Reads/writes the current spread cone, optionally amplifies it for
 * running fire, accumulates per-player inaccuracy over time, and stamps
 * the last-shot timestamp. Invoked per shot.
 *
 * Demangled symbol: `CTSGun::ScaleSpread(r ?, float, float, int)` at 0x702a8.
 *
 * @param this    The CTSGun entity instance (the C++ `this` argument)
 * @param spread  In/out reference to the current spread value (cone radius)
 * @param mult    Spread multiplier for this shot
 * @param flag    Non-zero to enable "running" / sustained-fire mode
 * @returns void
 */
export function ScaleSpread(
  this: CTSGun,
  spread: { value: number },
  mult: number,
  flag: number
): void {
  // ── Cvars: offsets from the PIC / GOT base, names live in strings-n5.txt
  // TODO(asm-ambiguous): replace these placeholders with real cvar names
  //   once the strings file is consulted. The semantics below match the asm.
  const CVAR_RUNNING_INC    = 0;    // [ebx - 0x6df10]
  const CVAR_GATE_MIN       = 0;    // [ebx - 0x6f408] (early-exit threshold)
  const CVAR_BASE_SPREAD    = 0;    // [ebx - 0x6df4c]
  const CVAR_SLOWMOTION_AMT = 0;    // [ebx - 0x6ec2c]
  const CVAR_RUNNING_MUL    = 0;    // [ebx - 0x6df0c]
  const CVAR_TIME_THRESHOLD = 0;    // [ebx - 0x6f3fc]
  const CVAR_MIN_DT         = 0;    // [ebx - 0x6f3f4] (deadband for dt)
  const CVAR_DT_HALF        = 0.5;  // [ebx - 0x6f010] (QWORD double, likely 0.5)
  const CVAR_ACCURACY_CAP   = 0;    // [ebx - 0x6ecd8] (QWORD double)

  const player = this.m_pPlayer;                     // [esi + 0x80]

  // 1) Running-fire mode multiplies the existing spread in place.
  if (flag !== 0) {
    spread.value *= CVAR_RUNNING_INC;
  }

  // 2) Early-exit guard.
  //    asm: fcomp + test ah,0x41 (C0 | C2) + jne 7040c (the bare-cleanup path,
  //    which notably does NOT stamp m_flLastShotTime).
  //    Fall-through requires ST(0) >= op AND not NaN.
  //    `!(mult >= x)` in TS covers both C0 (<) and C2 (NaN) in one shot.
  if (!(mult >= CVAR_GATE_MIN)) {
    return;
  }

  // 3) Compose the per-shot base spread: shrunk for slowmotion players,
  //    further multiplied for running fire.
  let localSpread = CVAR_BASE_SPREAD;
  if (DoubleFireRate(player)) {
    localSpread *= CVAR_SLOWMOTION_AMT;
  }
  if (flag !== 0) {
    localSpread *= CVAR_RUNNING_MUL;
  }

  // 4) Time bookkeeping.
  //    asm: *(*(*(gotBase + 0x1600))) — gpGlobals->time (or curtime),
  //    loaded as a 4-byte float into the local frame.
  const currentTime: number = GPGlobals.time;
  let dt = currentTime - this.m_flLastShotTime;      // [esi + 0x9e8]
  const threshold = CVAR_TIME_THRESHOLD;

  // 4a) Tiny dt → just clear the recoil flag and stamp the time.
  if (dt < CVAR_MIN_DT) {
    this.m_bRecoilAcc = 0;                           // [esi + 0x9ec]
    this.m_flLastShotTime = currentTime;
    return;
  }

  // 5) Roll the player's accuracy penalty into this shot's spread.
  //    [eax + 0x778] is a CBasePlayer float used as a running
  //    "shots-fired" penalty.
  //    TODO(asm-ambiguous): confirm whether the field is `m_flAccuracy`,
  //    `m_iShotsFired` (cast to float), or something else.
  spread.value += player.m_flAccuracy;

  // 6) Virtual float-returning getter on the player.
  //    asm: vtable pointer at [eax + 0x60]; slot at [vtable + 0x10]
  //    (5th vtable entry). Result returned in ST(0).
  //    TODO(asm-ambiguous): method name is hidden — likely `GetFireRate()`,
  //    possibly `GetSensitivity()` or similar.
  const fireRate = player.GetFireRate();

  // [esp+0x10] is overwritten with `fireRate * dt` here.
  let effectiveDt = fireRate * dt;

  // 7) Threshold branch:
  //    - effectiveDt >  threshold: keep as-is (fast-fire path; uses the
  //      real fireRate*dt for the decay).
  //    - effectiveDt <= threshold: replace with `threshold * CVAR_DT_HALF`
  //      and clear the recoil flag (slow-fire path; accelerated decay).
  if (effectiveDt <= threshold) {
    this.m_bRecoilAcc = 0;
    effectiveDt = threshold * CVAR_DT_HALF;
    // Belt-and-braces guard: if CVAR_DT_HALF didn't actually shrink dt
    // (i.e. factor >= 1, which makes this unreachable for sane cvars),
    // bail without an accuracy update.
    if (effectiveDt >= threshold) {
      this.m_flLastShotTime = currentTime;
      return;
    }
  }

  // 8) Accumulate the player's inaccuracy, capped from above:
  //      player.m_flAccuracy =
  //        min(player.m_flAccuracy
  //              + (threshold - effectiveDt) * mult * localSpread,
  //            CVAR_ACCURACY_CAP)
  //    The asm uses fcom against [ebx - 0x6ecd8] (QWORD double):
  //    if ST(0) >= cap, replace ST(0) with cap; otherwise leave as-is.
  const decay = threshold - effectiveDt;
  const delta = decay * mult * localSpread;
  const candidate = player.m_flAccuracy + delta;
  const newAcc = Math.min(candidate, CVAR_ACCURACY_CAP);
  player.m_flAccuracy = newAcc;

  // 9) Stamp the last-shot time.
  this.m_flLastShotTime = currentTime;
}
```
