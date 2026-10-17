```
VERDICT: PASS-WITH-NOTES

The structural decompilation of `CTSStunt::HandleWallClimb` is faithful to
the disassembly — control flow, the 3-DWORD `rep movsd`, the conditional
network-fade gate, and the sound tail all trace correctly. The biggest
issue is that the TS reuses several HLSDK field names at offsets that
**don't match HLSDK** (`m_fFlags`, `velocity`, `pContainingEdict`). The
HLSDK reference in the prompt is for the 4 engine↔mod entry points and is
N/A here; the relevant check is "does the TS match the disassembly + the
C++ signature?"

Checklist (adapted — items 1-3 reference the interface entry points
only):
1. Signature — ✅ — matches C++ `void CTSStunt::HandleWallClimb()`.
   `[esp+0x20]` after prologue/PIC is the hidden `this`; no other args;
   return `void`. HLSDK reference: N/A (not an entry point).
2. Version check — ⚠️ N/A — function isn't `GetEntityAPI*` /
   `GetNewDLLFunctions`. Internal flag tests (`pev+0x1a5 & 0x2`,
   `pev+0x250 & 0x20000`, `player+0x815 & 0x40`) are all reproduced.
3. `*interfaceVersion` assignment-back — ⚠️ N/A — no such param on a
   class method.
4. Success path / struct copy — ✅ — the `rep movsd ecx=3` copy from
   `[ebx+0x1888]` into `pev+0x174` is captured. The conditional
   network-fade block correctly reproduces `fcomp cvar / jae` gate and
   the `mov [ebp+0x0], 0` reset BEFORE the FPU math (so the
   `cvar2 * field_0x0` evaluates to 0 — the TS preserves this oddity,
   which is faithful).
5. No fabricated code paths — ✅ — both phases (active climb / climb
   request) and every sub-branch trace the disassembly. Sound tail
   ordering (`pev+0x11c` reset → short pfnEmitSound → full
   EMIT_SOUND_DYN) is correct. Wall-jump `jmp 8b7d8` (cleanup) and the
   wall-dive `or 0x800000 → GoDive` ordering match. No invented paths.
6. No TODO body — ✅ — substantial logic; TODOs are inline comments on
   ambiguous field names / cvars / sample strings, not stand-ins.
7. Field names — ❌ — multiple HLSDK names used at non-HLSDK offsets.
   See Issues.
8. Compiles in isolation — ⚠️ — references `CTSStunt`, `engine.*`,
   `EMIT_SOUND_DYN`, `pev`, etc. which aren't defined in this file. Fine
   in project context, not standalone.

Issues to fix:

- **`pev.m_fFlags` at `pev+0x250` is wrong.** HLSDK `m_fFlags`
  (`entvars_t::flags`) is around `0x100-0x108` depending on build.
  `pev+0x250` is far past `entvars_t` — it's a TS custom packed flag
  field. Replace with `pev.m_climbState` or `pev.ts_field_0x250` + TODO.

- **`pev.velocity` at `pev+0x174` is wrong.** HLSDK `velocity` is at
  `0x020` (12 bytes). `pev+0x174` is `0x154` past `velocity` — definitely
  not `velocity`. It's a TS custom 3-float field (purpose unclear).
  Replace with neutral field names.

- **`pev.pContainingEdict` at `pev+0x208` is wrong.** HLSDK
  `pContainingEdict` is at `~0x88`, not `0x208`. The TS custom field at
  `0x208` is some other pointer (likely a cached edict handle on the
  player). Use a neutral name.

- **`pev.userFadeAlpha` (`pev+0x120`) and `pev.userRenderFactor`
  (`pev+0x11c`) are fabricated names.** These offsets are TS custom; the
  names imply semantics the disassembly doesn't justify. Use neutral
  names until D.4 names them.

- **`engine.cvarVec3('ts_wallclimb_speed')` is a fabrication.** The
  disassembly shows `rep movsd` from `[ebx+0x1888]`, which is a static
  global data symbol, not a cvar. Use `engine.globalVec3At('g_dword_0x1888')`
  or similar.

- **`pfnEmitSound` arg list is overcommitted.** The disassembly has
  only 4 stack dwords for a 7-arg function, plus a stale-value
  `sub esp, 0x4` gap. Either the TS engine function takes fewer args
  (a TS-specific variant) or the compiler is exploiting an early-return
  path. The TS commits to `channel=0x1f, sample='', vol=0.0, pitch=0.5`
  and silently omits `fFlags` and `attenuation` — that's a fabrication.
  Stub the trailing args with TODOs.

- **`EMIT_SOUND_DYN` 7th arg = `g_engfuncs + 0x5f` is implausibly
  "pitch".** Pushing a pointer-to-engine-dispatch-slot as the pitch
  parameter makes no semantic sense. More likely the original C++ passes
  a cvar pointer or this is a macro-expansion quirk. Do not label it
  "pitch"; use a TODO placeholder.

- **`this.m_flClimbElapsed` / `this.m_flPostClimbDuration` for
  `this+0x0` / `this+0x4`** are inferred names. Mark with TODOs naming
  them `field_0x0` / `field_0x4` until D.4 confirms.

- **`player.readByte(0x815)`** is OK as a placeholder; the offset 0x815
  is well past `CBasePlayer`'s HLSDK layout, so this is a TS custom
  field. Note that explicitly.

- **Cvar names** (`ts_wallclimb_speed`, `ts_wallclimb_time`,
  `ts_wallclimb_fade`) and the sample string at `[ebx-0x6c364]` need
  verification against `tools/decompile/analysis/strings-n5.txt`. The
  TS acknowledged it can't read that file in this session. Use  `'TODO_*_UNVERIFIED'` placeholders.

- **Minor:** the TS's `engine.netMsgFadeToOne(player, fadeTicks)`
  collapses 3 explicit engine calls (`MessageBegin → WriteShort →
  MessageEnd`) into a single helper. That's a reasonable abstraction
  for readable code, but it loses the per-call stack manipulation
  (especially the `add esp, 0x4` between MessageBegin and the FPU
  math). Either keep it as a helper and comment the 3-call shape, or
  inline it.

```typescript
/**
 * CTSStunt::HandleWallClimb — Drive the wall-climb sequence each tick.
 *
 * Disassembly-faithful structural decompile. All field identifiers are
 * placeholder names (`ts_field_*`); HLSDK names are NOT used unless the
 * offset matches. D.4 (TS class reconstruction) will resolve them.
 *
 * @param this  The CTSStunt entity instance
 * @returns     void
 */
export function HandleWallClimb(this: CTSStunt): void {
  const player = this.m_pPlayer;
  const pev = player.pev;

  // ─── Phase 1 — actively climbing this tick ──────────────────────────
  // pev.ts_field_0x1a5 is a TS custom byte; bit 0x2 = "in climb anim/state".
  if ((pev.ts_field_0x1a5 & 0x02) !== 0) {
    // pev.ts_field_0x250 is a TS custom flag word; bit 0x20000 = "final climb tick".
    if (pev.ts_field_0x250 & 0x20000) {
      pev.ts_field_0x250 &= ~0x20000;

      // 0.5 into pev+0x120 (purpose TBD).
      pev.ts_field_0x120 = 0.5;

      // 3-float copy from a global symbol [ebx+0x1888] into pev+0x174.
      // NOTE: pev+0x174 is NOT entvars_t::velocity (which is at 0x020);
      // this is a TS custom 3-float field.
      const climbVel = engine.globalVec3At('g_dword_0x1888'); // TODO: real name
      pev.ts_field_0x174_x = climbVel[0];
      pev.ts_field_0x174_y = climbVel[1];
      pev.ts_field_0x174_z = climbVel[2];

      // Post-climb timer (0.3 s) at this+0x4, and elapsed-time gate against
      // a cvar at [ebx-0x6f3f0].
      this.ts_field_0x4 = 0.3;
      if (this.ts_field_0x0 < engine.cvarFloat('TODO_wallclimb_time_UNVERIFIED')) {
        this.ts_field_0x0 = 0; // reset BEFORE the FPU math

        // Network fade via engine dispatch:
        //   MessageBegin(edict=pev+0x208, ?, ?, ?) → WriteShort(int) → MessageEnd()
        // The three dispatch slots [esi+0xb8, +0xc0, +0xbc] map to
        // pfnMessageBegin / pfnWriteShort / pfnMessageEnd.
        // WriteShort arg = (int)(cvar2 * this->field_0x0) — note that
        // field_0x0 was just zeroed, so the result is 0. Faithful to asm.
        const fadeArg =
          (engine.cvarFloat('TODO_wallclimb_fade_UNVERIFIED') * this.ts_field_0x0) | 0;
        engine.netMsgFadeOne(player, pev.ts_field_0x208, fadeArg);
      }
    }

    // ─── Tail (always executed in the active-climb phase) ────────────
    pev.ts_field_0x11c = 1.0;
    const edictHandle = pev.ts_field_0x208; // TS custom; NOT pContainingEdict

    // Layer 1: short pfnEmitSound blip. Disassembly has only 4 stack
    // dwords for a 7-arg function (plus a stale-value sub esp, 0x4),
    // so trailing args are intentionally uninitialized. Stub them.
    engine.pfnEmitSound_TS(
      /* entity  */ edictHandle,
      /* channel */ 0x1f,
      /* sample  */ 'TODO: short-form, real sample string unknown',
      /* vol     */ /* TODO(asm-ambiguous): uninitialized in disassembly */,
      /* attn    */ /* TODO(asm-ambiguous): uninitialized in disassembly */,
      /* fFlags  */ /* TODO(asm-ambiguous): uninitialized in disassembly */,
      /* pitch   */ /* TODO(asm-ambiguous): uninitialized in disassembly */);

    // Layer 2: full EMIT_SOUND_DYN with sample string at [ebx-0x6c364].
    // NOTE: 7th arg is `g_engfuncs + 0x5f`, implausibly a "pitch" —
    // likely a cvar pointer or macro-expansion quirk. TODO.
    EMIT_SOUND_DYN(
      /* entity  */ edictHandle,
      /* channel */ 4,
      /* sample  */ engine.stringAt('g_string_-0x6c364'), // TODO: confirm .wav
      /* volume  */ 1.0,
      /* attn    */ 0.8,
      /* fFlags  */ 0,
      /* pitch   */ /* TODO: g_engfuncs+0x5f — verify against D.4 */);

    return;
  }

  // ─── Phase 2 — climb request pending, but not actively climbing ────
  // player.ts_field_0x815 is a TS custom byte; bit 0x40 = climb-request.
  if ((player.ts_field_0x815 & 0x40) !== 0) {
    if (this.CheckForWallJump()) {
      this.GoWallJump();
      return;
    }
    if (this.CheckForWallDive()) {
      pev.ts_field_0x250 |= 0x800000; // mark wall-dive transition
      this.GoDive();
    }
  }
}
```

Summary: structure is right, naming is wrong. The HLSDK-misnamed fields
are the headline issue; the rest is conservative cleanup of placeholder
arithmetic and TODO coverage.
