// Stub declarations so this function compiles standalone. In the
// real project these live in sibling modules.
declare const gpGlobals: { time: number };
declare const WAIT_THINK_INTERVAL: number;
declare const WAIT_SENTINEL_GLOBAL: number;

interface CTSFlag {
  pev: { nextthink: number };
  m_flRespawnTime: number;
  RespawnFlag(): void;
}

/**
 * CTSFlag::WaitThink — periodic think callback. Re-schedules itself
 * via pev->nextthink and invokes CTSFlag::RespawnFlag when the wait
 * timer has elapsed.
 */
export function WaitThink(this: CTSFlag): void {
  // 1) Re-schedule this think for now + WAIT_THINK_INTERVAL.
  //    asm: fld [ebx-0x6ecd8]; fadd [eax]; fstp [edx+0x104]
  //    where eax = gpGlobals->time and edx = this->pev.
  this.pev.nextthink = gpGlobals.time + WAIT_THINK_INTERVAL;

  // 2) Bail out if a sentinel indicates "not actively waiting".
  //    asm: fld [ebx-0x6f408]; fcomp [ecx+0x88]; test ah,0x40; jne ret
  // TODO(asm-ambiguous): the sentinel's identity is unclear without
  // cross-referencing tools/decompile/analysis/strings-n5.txt;
  // modeled here as WAIT_SENTINEL_GLOBAL.
  const waitTime = this.m_flRespawnTime;
  if (WAIT_SENTINEL_GLOBAL === waitTime) {
    return;
  }

  // 3) Bail out if the wait timer hasn't elapsed yet.
  //    asm: fld [ecx+0x88]; fcomp [edx]; sahf; jae ret
  //    where edx = gpGlobals->time. `jae` fires when waitTime >= time.
  if (waitTime >= gpGlobals.time) {
    return;
  }

  // 4) Wait elapsed — respawn the flag at its original location.
  this.RespawnFlag();
}
