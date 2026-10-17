// --- Ambient declarations so this file type-checks in isolation ---
// D.4 will replace these with the real class/global/function shapes.

interface entvars_s {
  nextthink: number;   // offset0x104 in TS — TODO(asm-ambiguous): verify
  renderamt: number;   // offset 0x14c in HLSDK/TS — TODO(asm-ambiguous): verify
}

interface CTSDeadCorpse {
  pev: entvars_s;
  // TODO(asm-ambiguous): members at this+0x64 and this+0x68 are inferred
  // from the disassembly — confirm against the class layout in D.4.
  die_time: number;       // [esi+0x64] — compared against gpGlobals->time
  fade_duration: number;  // [esi+0x68] — multiplied with FADE_TIME_SCALE
}

declare const gpGlobals: { time: number };
declare function UTIL_Remove(this: CTSDeadCorpse): void;

// --- Decompiled function ---

/**
 * CTSDeadCorpse::WaitThink — periodic think for dead corpse entities.
 *
 * Re-arms the think timer; if the corpse is past its die_time it is
 * removed. Otherwise it updates pev->renderamt to fade the corpse
 * across a configurable window before removal.
 *
 * Demangled: `CTSDeadCorpse::WaitThink()`
 * Address:   0x00060460 (154 bytes, ts/dlls/ts_i386.so)
 */
export function WaitThink(this: CTSDeadCorpse): void {
  // Compile-time double constants pulled from the GOT base (ebx).
  // TODO(asm-ambiguous): the disassembly chunk only references these via
  // GOT-relative offsets — the actual double values are linked into
  // .rodata at the addresses below and need a separate read pass.
  const THINK_DELAY      = 0.0; // fld QWORD [ebx - 0x6f010]
  const FADE_TIME_SCALE  = 0.0; // fld QWORD [ebx - 0x6efb8]
  const MAX_FADE_SECONDS = 0.0; // fld QWORD [ebx - 0x6f018]
  const ALPHA_SCALE      = 0.0; // fld QWORD [ebx - 0x6efb0]

  // 1. Schedule the next think:
  //    pev->nextthink = gpGlobals->time + THINK_DELAY.
  //    TODO(asm-ambiguous): pev+0x104 is treated as `nextthink` from the
  //    assignment pattern (current time + delay); verify against the TS
  //    entvars_s struct layout.
  this.pev.nextthink = gpGlobals.time + THINK_DELAY;

  // 2. If the corpse is past its die_time, remove it and bail.
  //    Disassembly: `fcomp die_time, gpGlobals->time` → `jae` skips
  //    the remove when die_time >= time. Fall-through (die_time < time)
  //    calls UTIL_Remove and jumps to the epilogue.
  if (this.die_time < gpGlobals.time) {
    UTIL_Remove(this);
    return;
  }

  // 3. Compute and apply the fade alpha for this tick.
  //      remaining = die_time - gpGlobals->time
  //      maxFade   = min(MAX_FADE_SECONDS, FADE_TIME_SCALE * fade_duration)
  //      ratio     = remaining / maxFade
  //      alpha     = min(ratio * ALPHA_SCALE, ALPHA_SCALE)
  //    The first min caps the fade window so per-entity fade_duration
  //    is bounded on both ends (short stays short, long is clamped).
  //    The second min caps the resulting alpha at ALPHA_SCALE so the
  //    corpse never renders above its configured maximum.
  //    TODO(asm-ambiguous): pev+0x14c is treated as `renderamt` based  //    on it receiving a clamped fade alpha in [0, ALPHA_SCALE].
  const remaining = this.die_time - gpGlobals.time;
  const maxFade   = Math.min(MAX_FADE_SECONDS, FADE_TIME_SCALE * this.fade_duration);
  const ratio     = remaining / maxFade;
  const alpha     = Math.min(ratio * ALPHA_SCALE, ALPHA_SCALE);

  this.pev.renderamt = alpha;
}
