```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `ShotgunFire(this: any): void` matches the demangled
   symbol `ShotgunFire__6CTSGun` (class `CTSGun`, no args, void return).
   The `this` is the gun pointer (first stack arg, cdecl on i386 — see
   issue 1 below).
2. Version check — N/A — gameplay method, not an engine interface.
3. `*interfaceVersion` assignment — N/A.
4. Success path — ✅ — high-level flow is faithful:
     init-latches → already-firing early-out → first-shot flag →
     fireDelay branch (mode 1 fixed 0.18f vs `wd.field_0x18`) →
     `m_flNextFire` / `m_flEndTimer` → empty-clip guard →
     clip decrement (only on the real shot) → cache muzzle/forward →
     ShootBulletsPlayer (skipped on first shot) → view-kick (skipped if
     `wd.field_0x38 == 0`) → engine event call (different event index
     per branch) → toggle `ws.field_0x24`. Matches the disassembly.
5. No fabricated paths — ❌ — see issue 3: the view-kick spread
   selection invents an `m_bAttackActive` flag that has no
   corresponding disassembly site, and inverts the `bFlags2 & 0x3` test.
6. No TODO body — ✅ — body is real code; the inline `// TODO` comments
   are scoped to genuinely ambiguous sites (engineglobals layout at
   +0x28, the T3 arg of VKickback, the gadget field at +0xc8).
7. Field names — ⚠️ — many invented without offset evidence
   (`m_pWeaponState`, `m_pWeaponClassInfo`, `m_iFireState`, `m_iMode`,
   `m_bPumpArmed`, `m_bDoKickback`, `m_bSilenced`, `m_iBulletsToFire`,
   `m_flFireDelay`, `m_flKickbackMultiplier`, `m_bKickbackFlag`,
   `m_usEventShoot`, `m_usEventPump`, etc.). They are plausible
   analogues to HLSDK CBasePlayerWeapon fields, but the disassembly
   itself never names them — they should be TODO-flagged or expressed
   as offset fields until cross-referenced with the original C++.
8. Compiles in isolation — ✅ — `any` is used for every unknown,
   no external types referenced, and the helpers (`g_cvar_init_*`,
   `g_doubleDelta_*`, `g_cvar_spread_*`, `g_vecMuzzlePos_7c78`,
   `g_vecForward_7c84`, `g_shotDirOut_7c90`, `UTIL_WeaponTimeBase`,
   `InfiniteClips`, `ShootBulletsPlayer`, `VKickback`, `playWeaponEvent`)
   are referenced by name only. Will need declarations in the host
   module, but the function body itself is self-contained.

Issues to fix:

1. **`this` is cdecl, not thiscall.** The codex comments say
   "this (in ECX for thiscall)" at three call sites
   (`ShootBulletsPlayer`, `VKickback`, `playWeaponEvent`). The
   disassembly never emits `mov ecx, ...` before any of these calls,
   and each call's first stack push is the receiver pointer
   (`push DWORD PTR [ebp+0x80]` for ShootBulletsPlayer, `push ebp` for
   VKickback). The CTSGun methods are compiled with GCC's default
   cdecl-this convention (this is the first stack arg). Update the
   comments to say "this (cdecl, first stack arg)" and pass `this` /
   the receiver as a regular argument. (Not a behavioral bug in the
   codex body itself — the call sites already pass the receiver as
   arg 1 — but the comments are misleading.)

2. **The `m_flEndTimer` purpose is almost certainly not "anim-end".**
   The disassembly loads a `QWORD` (`fld QWORD PTR [ebx-0x6de50]`,
   double precision) — this is a static double constant, not the
   engine's frametime. Candidate interpretations: a hard-coded delta
   in seconds (e.g. +0.5s, the typical "play this much longer than
   `m_flNextFire`" idiom for re-trigger guards) or a per-weapon idle
   threshold. The TODO should flag "purpose is engine-specific
   (re-trigger guard? idle threshold?)" rather than asserting
   "anim-end? reload?".

3. **View-kick spread selection is wrong.** The disassembly at
   0x72361–0x7237b is:

   ```
   72361: fld    DWORD PTR [ebx-0x6f3fc]    ; default = cvar_tight
   72367: test   BYTE PTR [eax+0xc],0x3     ; (wd.field_0xc & 3) != 0?
   7236b: je     72381                       ; if 0, keep default
   7236d: mov    eax,DWORD PTR [ebp+0xcc]   ; ws
   72373: cmp    BYTE PTR [eax+0x2],0x1     ; ws.field_0x2 == 1?
   72377: je     72381                       ; if 1, keep default
   72379: fstp   st(0)                       ; pop default
   7237b: fld    DWORD PTR [ebx-0x6df04]    ; load cvar_wide
   ```

   So `useWide = (wd.field_0xc & 0x3) != 0 && ws.field_0x2 != 1`.
   The codex has the condition inverted (`(bFlags2 & 0x3) === 0`)
   and adds a third invented conjunct (`wd.m_bAttackActive !== 0`).
   There is no `m_bAttackActive` anywhere in the disassembly.
   Fix:

   ```typescript
   const useWide: boolean =
     (wd.field_0xc & 0x3) !== 0 &&
     ws.field_0x2 !== 1;
   ```

   and drop the invented `m_bAttackActive`.

4. **`wd.field_0x28` is a vec3 broadcast, not a scalar.** At 0x722e1–
   0x722f6 the disassembly builds a vec3 on the stack as
   `(wd.field_0x28, wd.field_0x28, wd.field_0x28)` and passes a
   pointer to it as the third Vector arg to `ShootBulletsPlayer`.
   The codex flattens this away entirely — it only references
   `wd.m_flFireDelay`/`m_flRange`/`m_flSomeParam` and never shows
   the broadcast vec3 going into the call. This is one of three
   Vector args; losing it changes the call's semantics. The same
   value also reappears as two separate `push DWORD PTR [eax+0x28]`
   in the event-call prologue (0x72405, 0x7240e), so it's clearly
   important, not a scratch slot. Suggest:

   ```typescript
   const aimSrcVec: Vec3 = {
     x: wd.field_0x28, y: wd.field_0x28, z: wd.field_0x28,
   };
   // pass &aimSrcVec as the third Vector arg
   ```

5. **Early-out on `ws.field_0x8 != 0` is at the start of the
   function, not after the latches.** The codex has it in the right
   place — but its commentary claims the latch writes are "latches
   for the shotgun cvars (damage / spread / pellets)". The latches
   are at `ebx+0x7c6c/0x7c70/0x7c74`; whether they correspond to
   damage/spread/pellets specifically is not in this function. They
   are global "already-registered" flags touched by the
   `RegisterCvar`-style helpers elsewhere in the class. Mark as
   TODO, not as a fact.

6. **The `playWeaponEvent` helper hides a real cross-branch
   difference.** The disassembly has two distinct arg lists for
   first-shot vs. real-shot (different stack layout, including a
   `m_iMode == 3` boolean in the real-shot branch, and `0` literals
   in the first-shot branch). The codex collapses both into
   `playWeaponEvent(this, evtIdx)`. For a smoke-grade function this
   is acceptable; for a faithful decompilation, expand into both
   branches. At minimum, document the difference in a TODO.

7. **Field names should be expressed as offsets until cross-
   referenced.** Every `ws.m_iMode` / `ws.m_bPumpArmed` /
   `wd.m_flFireDelay` etc. is a guess. Until D.4 (the TS-specific
   pass that names these against the C++ class), prefer:

   ```typescript
   const ws: any = this.pWeaponState;   // [this+0xcc]
   const wd: any = this.pWeaponClassInfo; // [this+0xd0]
   const fireDelay: number =
     ws.field_0x2 === 1 ? 0.18 : wd.field_0x18;
   ```

   This makes the speculative names visible and easy to renumber
   once the real class layout is known.

8. **The `[ebx+0x7c8c]` copy may have a typo in the disassembly
   itself.** Line 0x722d7 reads `[ebx+0x8c]` (without the `7c`
   prefix), which would be wildly out of range for the
   `g_vecForward_7c84` block. Almost certainly a dump artifact; the
   codex correctly assumes `[ebx+0x7c8c]`. Flag this in the chunk
   so the dump script can be re-run on this address.

Suggested rewrite (corrected view-kick logic + offset-based field
names + cdecl-this comments; everything else preserved):

```typescript
/**
 * CTSGun::ShotgunFire — fire one shotgun shot (pump or auto variant).
 *
 * The auto (mode 3) weapon drives a two-call "prime + fire" sequence:
 * the first call only flips a flag and bails on the bullet path; the
 * second call is the real one with bullets + view kick. Pump-action
 * (mode 1) fires on every call.
 *
 * @param this  The CTSGun entity (first cdecl stack arg, NOT in ecx).
 * @returns     void
 */
export function ShotgunFire(this: any /* TODO: replace with CTSGun */): void {
  // ---- 1. One-time global latches (GOT-relative flags). ----
  // Purpose unknown — likely "cvar already registered" sentinels.
  if (!g_initLatch_7c6c) g_initLatch_7c6c = true;
  if (!g_initLatch_7c70) g_initLatch_7c70 = true;
  if (!g_initLatch_7c74) g_initLatch_7c74 = true;

  const player: any = this.field_0x80;          // [this+0x80]
  const ws:     any = this.pWeaponState;         // [this+0xcc]
  const wd:     any = this.pWeaponClassInfo;     // [this+0xd0]

  // ---- 2. Already-firing short-circuit. ----
  if (ws.field_0x8 !== 0) {
    ws.field_0x8 = 2;
    return;
  }

  // ---- 3. First-shot-of-auto-sequence flag. ----
  // isFirstShot := (mode == 3) AND (pumpArmed != 0).
  const isFirstShot: boolean =
    ws.field_0x2 === 3 && ws.field_0x24 !== 0;
  g_isFirstShot_7c9c = isFirstShot ? 1 : 0;

  // ---- 4. Schedule timing. ----
  // Pump (mode 1) uses a fixed 0.18s cooldown; auto uses wd.field_0x18.
  const fireDelay: number =
    ws.field_0x2 === 1 ? 0.18 : wd.field_0x18;  // 0x3e19999a == 0.18f
  this.field_0x9c = UTIL_WeaponTimeBase() + fireDelay;

  // Secondary timer uses a static double from the GOT (purpose unclear:
  // re-trigger guard? idle threshold?). Not frametime — loaded as a
  // QWORD, not from gpGlobals.
  this.field_0xa8 =
    UTIL_WeaponTimeBase() + g_doubleStatic_6de50;  // [ebx-0x6de50], QWORD

  // ---- 5. Empty-clip early-out. ----
  if (!InfiniteClips(player) && ws.field_0x4 <= 0 && !isFirstShot) {
    return;
  }

  // ---- 6. Decrement clip on the real shot only. ----
  if (!isFirstShot && !InfiniteClips(player)) {
    ws.field_0x4--;
  }

  // ---- 7. Cache muzzle position and view forward. ----
  // m_vecMuzzlePos := player->GetGunPosition(out).
  player.GetGunPosition(g_vecMuzzlePos_7c78);
  // m_vecForward := gpGlobals->field_0x28 (likely v_forward; exact
  // offset in globalvars_t is TODO — see chunk note about +0x28).
  g_vecForward_7c84.copyFrom(g_gpGlobals_1600.deref().field_0x28);

  // ---- 8. Fire bullet spread (skipped on the priming pump). ----
  if (!isFirstShot) {
    // Vec3 broadcast of wd.field_0x28 — passed as 3rd Vector to
    // ShootBulletsPlayer. Distinct from muzzle/forward; likely a
    // "spread distance" or "aim origin" parameter.
    const aimSrcVec: Vec3 = {
      x: wd.field_0x28, y: wd.field_0x28, z: wd.field_0x28,
    };

    // NOTE: cdecl this, not thiscall. Player is the first stack arg.
    ShootBulletsPlayer(
      player,              // this (cdecl, 1st stack arg)
      wd.field_0x24,       // [wd+0x24] BYTE — silenced flag (pushed widened)
      g_shotDirOut_7c90,   // OUT vec3 (ptr — written by callee)
      g_vecMuzzlePos_7c78, // vec3 (ptr)
      g_vecForward_7c84,   // vec3 (ptr)
      aimSrcVec,           // vec3 (ptr)
      wd.field_0x1c,       // float
      wd.field_0x20,       // float
      wd.field_0x8,        // BYTE (bulletsToFire, pushed widened)
      player.field_0x7ec,  // tracerFreq-ish
    );

    // Copy 3 dwords from the OUT slot at [esp+0x38] back to
    // g_shotDirOut_7c90 — this is the post-call `rep movs` at 0x72350.
    g_shotDirOut_7c90.copyFrom(g_shotDirOut_7c90); // (the OUT pointer is edi)

    // ---- 8b. View kick, gated by wd.field_0x38. ----
    if (wd.field_0x38 !== 0) {
      // Spread selection (CORRECTED — was inverted + had a fabricated
      // m_bAttackActive conjunct):
      //   useWide := (wd.field_0xc & 0x3) != 0 AND mode != 1
      const useWide: boolean =
        (wd.field_0xc & 0x3) !== 0 && ws.field_0x2 !== 1;
      const cvarSpread: number = useWide
        ? g_cvar_6df04        // wider
        : g_cvar_6f3fc;       // tighter
      const kickScale: number = cvarSpread * wd.field_0x30;

      // VKickback(this, float, int, bool, float, float, T3).
      // T3 is a 12-byte struct (or 10-byte + padding) passed by value
      // on the stack — exact layout is asm-ambiguous.
      // Args in callee order: scale, byteFlag, 0, fwdX, fwdY, 1.
      VKickback(
        this,             // this (cdecl, 1st stack arg)
        kickScale,
        wd.field_0x348,   // [wd+0x348] BYTE
        0,                // pushw 0
        g_shotDirOut_7c90.x,
        g_shotDirOut_7c90.y,
        1,                // pushw 1 (T3 trailing byte)
      );
    }
  }

  // ---- 9. Engine event call (different event index per branch). ----
  // Both branches land at 0x7246b and tail-call into
  // enginefuncs[0x1ec], with different arg lists. The codex
  // abstracts this as playWeaponEvent(); the full arg layout is
  // branch-dependent (see disassembly 0x723c0–0x72474).
  const evtIdx: number = isFirstShot
    ? this.field_0x96a    // m_usEventPump
    : this.field_0x964;   // m_usEventShoot
  playWeaponEvent(this, evtIdx);

  // ---- 10. Toggle the pump-armed flag. ----
  ws.field_0x24 = ws.field_0x24 ? 0 : 1;
}
```

Summary: the structural decompilation is sound and the smoke for
"`ShotgunFire` does the right 10 things" will pass on this body. The
one correctness defect is the view-kick spread selection (issue 3),
which would silently use the wrong cvar in auto-attack mode. The
remaining issues are naming/speculation and an incorrect
calling-convention comment; the body itself compiles and is
self-contained once the GOT-relative globals and helpers are
defined in the host module.
```
