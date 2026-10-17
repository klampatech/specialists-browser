```
VERDICT: PASS-WITH-NOTES

Quick note up front: the HLSDK reference block in the prompt is scoped to
the four engine↔mod export entry points (`GiveFnptrsToDll`,
`GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`). The function
under review — `CTSBomb::Use` — is a gameplay-entity method, not one of
those entry points. Checklist items 2 and 3 (version check,
`*interfaceVersion` assignment-back) and item 4 (struct copy on
success) don't apply. I've adapted the rest of the checklist to the
disassembly-vs-TS comparison that actually fits this function.

Checklist:
1. Signature — ⚠️ — Disassembly pushes exactly 2 explicit args
   ([esp+0x20] and [esp+0x24]); TS adds 3rd `value: number`. The
   trailing `f` in the mangled name (`Use__7CTSBombP11CBaseEntityT18USE_TYPEf`)
   is consistent with HLSDK's `CBaseEntity::Use(CBaseEntity*, USE_TYPE, float)`
   and the asm never reads the [esp+0x28] slot, so `value` is unused.
   Reasonable inference; mark it as assumption rather than
   disassembly-derived.
2. Version check — N/A — engine interface entry point only.
3. interfaceVersion assignment-back — N/A — engine interface entry point only.
4. Success path / struct copy — N/A — engine interface entry point only.
5. No fabricated code paths — ⚠️ — The 4-arg structure for
   `UTIL_VarArgs` (fmt + 1 numeric arg) is faithful, but see Issue 1:
   cache-update condition is inverted; see Issue 4: `gpGlobals.curtime`
   is unverified. Otherwise control flow maps cleanly.
6. No TODO body — ✅ — Function is fully implemented; the two
   `// TODO(asm-ambiguous)` blocks mark genuine vtable-offset
   uncertainties (offsets 0xc8 and 0x114), not placeholder logic.
7. Field names — ⚠️ — `m_bArmed` (0x64), `m_flLastTick` (0x78),
   `m_flDefuseProgress` (0x74), `m_iMaxDefuseTime` (0x80),
   `m_iStateField1`/`m_iStateField2` (0x6c/0x70), `pev.target` (0x1c8),
   `pev.message` (0x1d4) are plausible — but none are confirmed
   against a CTSBomb class header. Treat as TBD pending D.4.
8. Compiles in isolation — ⚠️ — Refs `CTSBomb`, `CBaseEntity`,
   `gpGlobals`, `USE_TYPE`, `UTIL_VarArgs`, `ClientPrint`,
   `FireTargets`, `TSHudMessageAll`, `STRING` must be declared
   externally. With ambient `any` types for these, body compiles;
   strict mode needs the stubs.

Issues to fix:

1. **Cache-update condition is inverted (real bug).** Asm at
   `7c9f5-7ca03` uses `fcomp; fnstsw; test ah,0x40; je 7ca12`. Bit
   `0x40` of AH is `C3` (FPU "equal" flag). The jump-to-7ca12
   (skip-cache-write) path is taken when C3=0, i.e. `now != field`.
   The fall-through path (write `curtime` to the cache field) runs
   ONLY when `now == field`. TS has `if (now >= this.m_flLastTick)`
   which fires on `now > field` too — a different (and far more
   common) condition than the asm. Change `>=` to `===`.

2. **Hardcoded magic 0.1.** Asm compares elapsed against the QWORD
   constant at `[ebx-0x6f010]` (a double-precision constant in the
   binary, ~0.1 s but named per what it represents — likely a
   sanity-cap on time-since-last-use). TS inlines `elapsedLimit = 0.1`.
   Use a named constant matching that offset (e.g. `TIME_SINCE_TICK_LIMIT`).

3. **`FireTargets` useType.** Asm pushes literal `0x3`
   (USE_TOGGLE). TS uses the type `USE_TYPE`. Pass `USE_TOGGLE`
   to match the engine-side enum, not the TS type.

4. **`gpGlobals.curtime` vs `gpGlobals.time`.** The TS uses two
   different `gpGlobals.*` time fields (`time` for `now`, `curtime`
   for the cache). The asm at `[ebx+0x1600] → *ptr → **ptr` reads
   `[B]` = offset 0 of a `globalvars_t`-shaped struct, which in
   stock HLSDK is `time`, not `curtime` (TS may have a custom
   engine header where `curtime` is at offset 0, but the asm does
   not disambiguate). Tighten the comment, and pick one — if
   TS really did rename the slot, say so explicitly; otherwise
   fold both to `gpGlobals.time`.

5. **TSHudMessageAll comment vs call drift.** Comment lists 7 args
   ("channel, r, g, b, x, y, msg") but the call has 6 (no `y`).
   Asm pushes 6 args (0, 0xff, 0, 8, 30, msg). Either drop the
   missing arg from the comment or note that the `y` slot was
   elided by the call site.

6. **`value: number` parameter is unverified.** Demangler output
   shows `Use(p ?, ?)` and the disassembly only reads 2 stack args.
   The 3rd parameter is inferred from HLSDK convention + the
   `f` suffix in the mangled symbol. Flag this in the JSDoc as an
   HLSDK-conformance inference rather than disassembly evidence.

Suggested rewrite:
```typescript
/**
 * CTSBomb::Use — invoked when a player interacts with the bomb.
 *
 * Faithful to the i386 disassembly at 0x0007c9a4. Field offsets are
 * preserved as comments so the next pass (D.4 — CTSBomb class
 * discovery) can re-anchor them.
 *
 * @param this        CTSBomb entity instance (`this` in C++)
 * @param pActivator  CBaseEntity that triggered the use (the player)
 * @param useType     USE_TYPE — not consulted in this implementation
 * @param value       float   — not consulted in this implementation
 *                              (HLSDK-conformance inference; the asm
 *                              never reads the [esp+0x28] slot)
 */
export function Use(
  this: CTSBomb,
  pActivator: CBaseEntity,
  useType: USE_TYPE,
  value: number,
): void {
  // ── early-outs ────────────────────────────────────────────────────────

  // [esi+0x64] — armed flag (byte). 0 == disarmed.
  if (!this.m_bArmed) return;

  // [edi+0x60] is the vtable-bearing pointer in pActivator's layout;
  // call through vtable slot 0xc8 (TS-custom IsAlive / IsValidActivator).
  // TODO(asm-ambiguous): 0xc8 is past standard HL1 IsPlayer() slot —
  // verify against the CTS objective hierarchy in D.4.
  if (!pActivator.IsPlayer()) return;

  // CTSObjective::CanInteract(pActivator) — gameplay-layer permission.
  if (!this.CanInteract(pActivator)) return;

  // ── per-tick cache + time arithmetic ────────────────────────────────

  // [ebx-0x6f408] — float slot (gpGlobals.time, or possibly a cvar).
  // The asm reads the same slot three times (7c9f5 / 7ca2a / 7cac6).
  const now = gpGlobals.time;

  // Cache-write guard. Asm at 7c9f5-7ca03 tests C3 (equal flag) of
  // the FPU status word: `test ah,0x40; je 7ca12`. The fall-through
  // path writes curtime to m_flLastTick ONLY when now == m_flLastTick.
  // (Unconditional refresh happens later at 7cac0.)
  //
  // Triple-deref `[ebx+0x1600] → *ptr → **ptr` reads offset 0 of the
  // globalvars_t-shaped struct — `time` in stock HLSDK, possibly
  // renamed to `curtime` in TS's custom engine header; if you keep
  // `curtime` here, treat it as TS-header-specific.
  if (now === this.m_flLastTick) {
    this.m_flLastTick = gpGlobals.curtime;
  }

  // Elapsed = curtime - m_flLastTick.
  const elapsed = gpGlobals.curtime - this.m_flLastTick;

  // Sanity cap: asm compares elapsed against a QWORD constant at
  // [ebx-0x6f010] (≈0.1 s) and skips the decrement branch when
  // elapsed is large enough that we suspect a wrap/freeze. Do NOT
  // hardcode the literal — keep the symbolic name so D.4 can
  // re-anchor the source.
  const elapsedLimit = TIME_SINCE_TICK_LIMIT; // ~0.1 s
  if (elapsed < elapsedLimit) {
    // Equality branch: same C3 check at 7ca2a-7ca38, fires when
    // `now == m_flDefuseProgress`. Asm loads m_iMaxDefuseTime as int
    // via fild and stores it as float to 0x74. Rare-float-equality
    // guard, semantics are not obvious in isolation — preserve as-is.
    if (now === this.m_flDefuseProgress) {
      this.m_flDefuseProgress = this.m_iMaxDefuseTime;
    } else {
      // Reverse-subtract: progress = progress - (curtime - m_flLastTick).
      this.m_flDefuseProgress -= elapsed;
    }
  }

  // ── status HUD message to the activator ─────────────────────────────

  // x87 fcom selects max(now, m_flDefuseProgress); control-word dance
  // (`fnstcw; mov byte[esp+0x25],0x0c; fldcw`) sets round-to-zero
  // before `fistp` to truncate the float to an int.
  const remaining = Math.max(now, this.m_flDefuseProgress);
  const message = UTIL_VarArgs("%d", Math.trunc(remaining));

  // HUD_PRINTCENTER (4). Asm: `push eax; push 0x4; push [edi]; call ClientPrint`.
  ClientPrint(pActivator.pev, 4, message);

  // Refresh the cache unconditionally (asm at 7cab6-7cac0).
  this.m_flLastTick = gpGlobals.curtime;

  // ── defuse complete: fire targets, HUD broadcast, reset, cleanup ───

  // asm: `test ah,0x41` checks (C3 | C0); jumps to return if either
  // bit is set. Fall-through (continue) only when now > progress.
  if (now <= this.m_flDefuseProgress) return;

  // pev->target (offset 0x1c8) resolves via gpGlobals->pStringBase.
  // Asm pushes USE_TOGGLE literal 0x3, NOT the type.
  if (this.pev.target) {
    FireTargets(STRING(this.pev.target), this, this, USE_TOGGLE, 0);
  }

  // pev->message (offset 0x1d4) — 6 args total: (channel, r=255,
  // g=0, b=8, x=30, msg). No `y` slot in the asm — corrected from the
  // earlier 7-arg comment.
  if (this.pev.message) {
    TSHudMessageAll(0, 0xff, 0, 8, 30, STRING(this.pev.message));
  }

  // Clear the two int state fields ([esi+0x6c] and [esi+0x70]).
  this.m_iStateField1 = 0;
  this.m_iStateField2 = 0;

  // vtable slot 0x114 with arg=1. Unusual for vanilla HL1 — almost
  // certainly a TS-added `Remove(flags)` or `OnDefused(1)`.
  // TODO(asm-ambiguous): confirm slot 0x114 against the CTSBomb
  // hierarchy in D.4.
  this.removeOrCleanup(1);
}
```

Recommend re-running D.3 smoke (`tools/smokes/d3-engine-interface-bind.ts`)
and the per-function smoke (`smokes/d3-cts-entity-uses.ts` — TBD) only
after fixing Issue 1 (cache condition), since the inverted `>=` would
otherwise show up as soon as someone wires real `gpGlobals.time`
values into the test fixture.
