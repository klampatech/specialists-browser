Big callout first: **the review template you pasted is for D.3, not for this function.**

The HLSDK reference section at the top is for the 4 engine↔mod interface functions (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`) — that's `tools/decompile/prompts/review-single-function.md` per HANDOFF.md. The disassembly + codex output, however, are for `CHalfLifeMultiplay::PlayerKilled` — a 6912 B TS-gameplay handler, which is D.4. The 8 checklist items break down as:

- **Items 1–4** (signature / version check / `*interfaceVersion` assignment / struct-copy success path) — **don't apply.** `PlayerKilled` isn't an engine↔mod interface function; there are no version constants or `interfaceVersion` returns to check. Applying them verbatim produces four "N/A" results and a verdict that means nothing.
- **Items 5–8** (no fabricated paths / no TODO body / field names / compiles) — **apply**, but the D.4 subcriteria are different (no HLSDK reference frame for the body; the right comparison is disassembly + the TS-source skill set).

I'm going to (a) below since (b) is junk signal and (c) requires regenerating the prompt:

- **(a)** Real D.4 review of `PlayerKilled` against the disassembly, with adapted criteria. Verdict + findings only — a full TS rewrite of 6912 B is a decompile task, not a review task.
- **(b)** Apply the D.3 template verbatim. Will mark 1-4 as N/A, ride 5-8 along. Not doing this.
- **(c)** Pause and let you re-supply a corrected prompt.

If you wanted (c), stop me. Otherwise: review follows.

---

# Cross-vendor review — `CHalfLifeMultiplay::PlayerKilled` (D.4)

```
VERDICT: FAIL

(The function compiles in isolation and captures the right
 high-level structure and local-variable layout, but ~half of
 the body — every place that emits player-visible output, plus
 the arg shape — is commentary with `// TODO` instead of code.
 Codex under-implemented; the cross-vendor pass must either
 fill it in or punt the function back for another decompile
 iteration.)

Checklist (D.4-adapted):
1. Signature (vs disassembly stack slots)           — ❌
2. No fabricated control-flow branches              — ✅ (no invented branches; high-level phases follow the asm)
3. No comment-only / TODO body                       — ❌ (fatal — see Issues)
4. Field names map to known C struct fields          — ⚠️  (many plausible, several speculative; needs asm-anchored verification)
5. Compiles in isolation                             — ✅ (any-typed; compiles)
6. Captures the full 6912 B of work                  — ❌ (multiple phases are stubs)
7. Matches the TS-specific class structure          — ⚠️  (free function with `this:`, not a class method — handled at merge, but worth flagging)

Issues to fix:

A. Parameter shape is wrong (FATAL, easy fix).
   The codex output declares the parameters as
   `const`s inside the function body, initialized to
   `null as any` — i.e. as placeholders, not as args.
   The disassembly accesses [esp+0xf4] … [esp+0x104]
   as 5 stack slots, so the function has 5 args after
   `this`. They must be TS parameters, not locals:
     function PlayerKilled(this, pVictim, pevAttacker,
                           pevInflictor, pAttacker,
                           damageType)
   This is also why the comment "arg [esp+0xf4] / 0xf8 / …"
   is misleading — those are caller pushes, not stack reads.

B. Most of the function body is commentary (FATAL).
   Codex correctly identified the shape of each phase
   but didn't render it as TS:
     Phase 9 (weapon-name string)         — `let szWeaponName = ''`
     Phase 10 (log-message format)        — `let szMessage = ''`
     Phase 11 (print log)                 — `UTIL_LogPrintf(szMessage)` with empty msg
     Phase 18 ("about a dozen TSHudMessageAll calls")
     Phase 22 (best-streak updates)      — ends in `// TODO`
     Phase 23 (HUD updates)              — "Big block of HUD calls updating..."
   From the disassembly these correspond to:
     - 6 `UTIl_VarArgs` + `TSHudMessageAll` callsites
       (7a465-7a480 / 7a677-7a67c / 7a78d-7a792 / 7a7e7-7a7ec
        / 7a576-7a57b / 7a614-7a619 / 7a5c5-7a5ca / 7a72e)
     - 1 `strncmp` ladder for the log header selector
       (7a9af-7ab10)
     - 6+ `rep movs` block-copies for fixed-size log
       fragments (7a7ec-7a7ec / 7a7ec-7a7eb / etc.)
     - 3 `UTIL_LogPrintf` calls for mod-log mode +
       world-kill mode (7a182 / 7a2bb / 7aed6)
     - The "give cash + update score" tail (7aae2-7ab42)
     - The killer-streak + best-streak tracking (7acdc-7ad0b)
   None of that is in the codex output. This is the
   gap the cross-vendor pass was meant to close.

C. Arg-shape correspondence to the asm has only one
   verified arm. Codex labeled the SECOND arg `entvars_t*`
   (the codex docstring says `pevAttacker: any`). The
   disassembly at 7963e reads `[edx+0x208]` where edx =
   2nd arg — but `entvars_t` is ~80 B, not 0x208+ bytes.
   So the 2nd arg is more likely `edict_t*` or
   `CBasePlayer*` (which is hundreds of bytes and can
   plausibly have a member at 0x208). Codex's comment
   "(TS extension at +0x208)" is a not-quite-right
   workaround — the right fix is to relabel the arg and
   demote the field access to an opaque `.something` cast.

D. Skip-handling condition at 7a394-7a3bb is misread.
   Codex wrote `const skipKillHandling = !pKiller || !pKiller.m_pActiveItem;`
   but the asm is `cmp DWORD PTR [esp+0x2c],0x0 / je 7aedc` —
   the only check is that the resolved killer pointer
   (at local [esp+0x2c]) is non-null. No weapon check.
   And the follow-up at 7a3b3-7a3cc (`test DWORD PTR [eax+0x250],0x10c10; jne`) —
   the flag check on `pevAttacker+0x250` (FL_FROZEN/FL_NOTARGET
   or similar) is lost.

E. CreateSlowMotionPoint args are wrong direction.
   The asm at 7a3f6-7a41b constructs a `Vector` from
   the killer entity's vtable method, then passes it
   (with three floats 0/0.5/1.0) to `CreateSlowMotionPoint`.
   Codex wrote `CreateSlowMotionPoint(pVictim.origin, ...)` —
   the origin comes from the *killer* entity, not
   the victim, per the asm at 7a3ed-7a407 reading
   `[edx+0x8] / [edx+0xc] / [edx+0x10]` which is the vtable
   method result on the killer-side arg, not the victim.

F. Specific constants in Phase 19 (cash) are placeholder
   guesses. The asm refers to `cvar_cashmode` and conditional
   branches on `<= 1` (which codex got) but the actual
   giveaway-amounts (0x384 / 0x3e8 = 900/1000) are likely
   wrong. Compare against D.4.2 CTSGun's `GiveCash` use,
   or against any TS source-port if you find one later.
   Mark as `// TODO(asm-ambiguous: cash tier values)`.

G. Suggested-skill for cross-vendor closure. Codex's
   output is a strong skeleton. To turn this into a
   PASS verdict, I'd recommend re-running the cross-vendor
   loop specifically on Phase 9-11 (weapon string + log
   message) and Phase 18 (HUD messages), since those are
   the largest all-comment sections. The remaining
   gaps are smaller and can be filled in during merge.

Suggested rewrite (skeleton + critical fixes only —
 NOT a full re-decompile of 6912 B):
```

```typescript
/**
 * CHalfLifeMultiplay::PlayerKilled — TS override of the HLSDK
 * multiplayer-rules player-death handler. 6912 B, ~24 phases.
 *
 * Stack slot → param mapping (vs disassembly):
 *   [esp+0xf4]  arg #1  — victim (likely CBasePlayer*)
 *   [esp+0xf8]  arg #2  — attacker entvars OR CBasePlayer
 *                          (size determined by +0x208 read;
 *                           entvars_t is too small — see note
 *                           in Issue C of the review)
 *   [esp+0xfc]  arg #3  — inflictor entvars
 *   [esp+0x100] arg #4  — attacker CBasePlayer*
 *   [esp+0x104] arg #5  — int damageType / iScoreBonus
 *
 * Local layout (matches prologue zero-init at [esp+0x3b]..[esp+0x43]):
 *   bStreak3 / bStreak6 / bStreak9 / bStreak10Plus
 *   bSpecialMode / bHeadshot / bSelfKill
 *   pKiller (resolved CBasePlayer*, NULL if world-kill)
 *   iPoints (frag value from TSGetPointsForFrag)
 */
export function PlayerKilled(
  this: CHalfLifeMultiplay,
  pVictim: any,         // arg 1 — CBasePlayer* per TS source
  pevAttacker: any,     // arg 2 — see note above (relabel per Issue C)
  pevInflictor: any,    // arg 3 — entvars_t (or CBaseEntity*)
  pAttacker: any,       // arg 4 — CBasePlayer*
  damageType: number,   // arg 5
): void {
  // Phase 1: Resolve killer (assembly at 79637..7965c)
  let pKiller: any = null;
  {
    const killerSrc = (pevAttacker as any);
    let pKillerEnt = killerSrc?.pContainingEntity
                  ?? engine.ENT(0);   // engine.vtable[0x114](0)
    if (pKillerEnt) {
      pKiller = pKillerEnt;
      // Skip spectator killers (asm 7967b-79684 compares vtable[0x13] to 2)
      const isSpectator = ((pKillerEnt as any).vtable[0x4c / 4](pKillerEnt) === 2);
      if (isSpectator) pKiller = pVictim;
    }
  }

  // Phase 2: Update victim's last-killer ref (asm 79691-796ad)
  const victimKillerRef = (pVictim as any).someMethod(pevAttacker);

  // Phases 4-8: TSGetPointsForFrag + streak flagset (asm 796d1..79845)
  let iPoints = 0;
  let bHeadshot = false;
  let bSpecialMode = false;
  let bSelfKill = false;
  let bStreak3 = false, bStreak6 = false;
  let bStreak9 = false, bStreak10Plus = false;

  // Weapon-based kill path is gated on having a real killer
  // and the victim's last-killer ref having an active item.
  const skipWeaponLogic = !victimKillerRef
                       || !pKiller
                       || !(victimKillerRef as any).m_pActiveItem;

  if (!skipWeaponLogic) {
    // ... Phases 4-8 from codex output are reasonable in shape
    //     but field names need asm-anchored verification.
    //     See the review: 2 of the field names (esp+0x744,
    //     esp+0x748, esp+0x208) need offset cross-checks
    //     against CHalfLifeMultiplay + CBaseEntity.
    //
    //  >>> TODO(asm-ambiguous): Phases 9 (weapon name string),
    //      10 (log format), 11 (UTIL_LogPrintf) — all currently
    //      empty strings. Must be filled in from asm at
    //      7984a..7acdc before this function compiles to
    //      runtime-correct behavior.
    let szWeaponName = '';
    let szMessage    = '';
  }

  // Phase 12: victim death count (asm 7a2c5)
  (pVictim as any).m_iDeaths++;

  // Phase 13: FireTargets "game_playerdie" (asm 7a2d4-7adb)
  FireTargets('game_playerdie', pVictim, pVictim, 3, 0);  // USE_TOGGLE=3

  // Phase 14: One-life mode (asm 7a2ec-7a306)
  if (pVictim.m_bOneLife) {
    CTSGameRules.TheOneIsDead(pVictim, pKiller);
    pVictim.m_iKillCount = 0;
  }

  // Phase 15: Self-kill slowmo reset (asm 7a309..7a38c)
  if (pVictim === pAttacker && pVictim.weaponMode > 8) {
    // cancel slow-mo timer (asm 7a324-7a330 reads constants
    // [ebx-0x6e818] and [edx+0x164])
    // >>> TODO: gglobals-modify time, emit TSHudMessageAll
  }

  // Phase 16: Skip rest of killer-specific handling if no killer
  // >>> see review Issue D: the skip condition in the codex
  //     output is wrong (pKiller.m_pActiveItem vs the asm's
  //     bare pKiller non-null check).
  const skipKillHandling = !pKiller;

  if (!skipKillHandling) {
    // Phase 17: Spectacular slow-mo (asm 7a3bb..7a426)
    // >>> see review Issue E: CreateSlowMotionPoint origin
    //     comes from the KILLER entity, not the victim.
    if ((pevAttacker.flags & 0x10c10) !== 0
        || cvar_spectacular.value !== 0
        || iPoints > 2) {
      if (DoSpectacularNess()) {
        const killerOrigin = pKiller?.origin ?? pVictim.origin;
        CreateSlowMotionPoint(killerOrigin, 0.25, 1.0, false);
      }
    }

    // Phases 18-22: HUD + cash + scores
    // >>> mostly TODO in the codex output. Approx 6+ TSHudMessageAll,
    //     one FireTargets "ts_killed", GiveCash x4, UpdateTeamScores.
    // >>> specific cash constants (0x384 / 0x3e8) are asm-derived
    //     but unverified against TS source. Mark TODO.

    // Phase 21: FireTargets "ts_killed" (asm 7ac06)
    FireTargets('ts_killed', pVictim, pVictim, 3, 0);
  }

  // Phase 24: CallCheckDeads (asm 7b0d4)
  CTSGameRules.CallCheckDeads();
}
```

```
Notes on what this review does NOT do:

- Did not verify every field offset against CHalfLifeMultiplay
  or CBasePlayer — that's a D.4 follow-up across all
  gameplay methods that touch a given field, not a per-function
  review concern. Flag each suspect field with
  `// TODO(asm-ambiguous: <field>, offset 0xNNN)`.
- Did not produce a full reimplementation of the missing
  Phases 9-11 + 18. That work belongs in the next iteration
  of the cross-vendor loop on this specific function.
- Did not save to `tools/decompile/cross-vendor/CHalfLifeMulti-
  play__PlayerKilled__claude-review.md` because the convention
  is for `decompile-review.py` to write that file from a full
  review pass. Tell me if you want me to write it now (or just
  re-run the runner with this prompt + my verdict as seed).
```

Want me to:

1. **Save this verdict to** `tools/decompile/cross-vendor/CHalfLifeMultiplay__PlayerKilled__claude-review.md` and write the skeleton (above) to `…__claude.ts` per the cross-vendor convention?
2. **Send it back through the runner** with this prompt + my findings as seed, so it can produce a codex-rev2 attempt focused on filling Phases 9-11 + 18?
3. **Re-prompt with a corrected D.4 template** (`tools/decompile/prompts/review-single-function-d4.md` or similar) for future use, so this mismatch doesn't happen again?

If you want any of those, say which — I'll do it. Otherwise this is the review.
