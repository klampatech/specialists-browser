```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — Matches the demangled symbol
   (`Use(CBaseEntity *, USE_TYPE, float)` = 3 args after `this`). The
   TS uses standard HLSDK naming (`pActivator`, `useType`, `value`).
   The demangler appears to have dropped one arg, so this signature
   is short of the HLSDK base class
   `CBaseEntity::Use(pActivator, pCaller, useType, value)`, but the
   disassembly consistently references only 3 stack slots (`[esp+0x10]`
   and the implicit `useType` / `value`) and the mangled symbol
   agrees with the TS. The "missing `pCaller`" is a faithful decision,
   not a TS bug.
2. Version check — ⚠️ N/A — `Use` is a class method, not one of the
   four interface exports. The HLSDK version-check pattern doesn't
   apply. Marking ⚠️ (rather than ✅) because the checklist rubric
   doesn't have a "N/A" option.
3. interfaceVersion assignment — ⚠️ N/A — same reason.
4. Success path / struct copy — ⚠️ N/A — `Use` has no `memcpy`-
   shaped success path; it acts via field writes and external calls.
5. No fabricated code paths — ✅ — The three `cmp/jcc` guards in
   the disassembly (`[esi+0x100]`, `[edx+0x1d4]`, `[eax+0x1c8]`)
   map one-to-one onto the three `if` blocks in the TS, in order,
   with matching skip targets. The unconditional `ActivateSlow`
   call is correctly the first action. The argument lists to
   `TSHudMessageAll` (6 args, constants `0,0xff,0x00,0x08,0x1e,str`)
   and `FireTargets` (5 args, `0,3,esi,esi,str`) match the push
   order and constant values exactly.
6. No TODO body — ✅ — The body is fully implemented. There is one
   localized `TODO(asm-ambiguous)` on the `0xffff0000` sentinel;
   that's a marker on an ambiguous *value*, not a stub for the
   function. Acceptable per D.3 conversion guidance.
7. Field names — ✅ — `m_flDeactivateAt` (float compare to 0),
   `m_iDeactivateFlag` (int write), `m_flActivatedAt` (assigned from
   a GOT slot), `pev.message`, `pev.target` all use Half-Life
   conventions and match the disassembly's operand types. Field
   offset → name mapping is inferred (0x100 = float compare → time-
   like, 0x14/0x18 = paired int+dword write, 0x1d4/0x1c8 = string_t
   on pev) and is plausibly correct but not independently
   verifiable from the disassembly.
8. Compiles in isolation — ❌ — References `CTSSlowMotion`,
   `CBaseEntity`, `USE_TYPE`, `gpGlobals`, `TSHudMessageAll`,
   `FireTargets`, `STRING` with no imports / declarations / stub
   module. Per the rubric "use `any` for unknowns", this fails.

Issues to fix:

A. **Does not compile in isolation (check 8).** Concrete types
   must become `any`, and globals must be sourced (e.g. via
   `globalThis`) until D.5 wires up the real types. See rewrite.

B. **`esi` = `this` is the wrong default.** The TS implicitly
   adopts reading (ii) — "esi is `this`; `pActivator`/`useType`/
   `value` are unused". The disassembly is consistent with that,
   but it is also consistent with reading (i) — "esi is the first
   stack arg, i.e. `pActivator`; `this` lives in ECX per the
   standard MSVC thiscall". Reading (i) would change the
   semantics materially: every `[esi+X]` becomes a field read on
   the *activating entity*, and `FireTargets` would be called
   with `pActivator` as both `pActivator` and `pCaller`. The
   way to disambiguate is to decompile another `CTSSlowMotion`
   method (`CTSSlowMotion::Spawn`, etc.) — if `esi` is repeatedly
   loaded from `[esp+0x10]`, and that method then does
   `esi->pev->...`, the convention is consistent across the class
   and one of the two readings wins by induction. **Do not
   commit this until that's resolved.** Mark issue B as
   `// TODO(asm-ambiguous, B): calling convention`.

C. **`[ebx+0x1c78]` is ambiguous.** Same GOT pattern is used for
   `gpGlobals` (via `[ebx+0x1600] -> [eax] -> [eax+0x98]` =
   `pStringBase`). The TS assumes `[ebx+0x1c78]` is the float
   `gpGlobals.time`; it's equally consistent with `[ebx+0x1c78]`
   being the `globalvars_t *` itself (i.e. the TS is writing the
   gpGlobals pointer into `m_flActivatedAt`, not the float time).
   Cross-check against the cvar table in `strings-n5.txt`
   (`slowamt`, `ts_slowmotion`) — those cvars are read elsewhere
   via `[ebx+similar_offset]` and would let you classify which
   GOT slots contain which globals. Mark issue C as
   `// TODO(asm-ambiguous, C): gpGlobals.time vs gpGlobals ptr`.

D. **Doc claims `pActivator` is unused.** That claim depends on
   issue B — under reading (i), `pActivator` is the single arg
   passed to `ActivateSlow(esi)`. Tighten the docstring after
   resolving B.

E. **`!== null` vs `!== 0` for `string_t` checks.** The
   disassembly compares `pev.message` and `pev.target` against
   `0`. In HLSDK, `string_t` is a uint32 offset, not a nullable
   pointer. The TS uses `!== null`, which is only correct if
   `pev.message` types as `string | null` in the project's
   interface layer. If the D.5 wiring ends up with
   `pev.message: string_t`, this becomes a comparison-mismatch
   that a strict smoke would catch. Minor; flag, don't block.

F. **Sentinel `0xffff0000` is correctly marked TODO.** Just
   confirming this is a known-ambiguous value, not an oversight.

Suggested rewrite (PASS-WITH-NOTES — addresses checklist 8 and
lifts issue B/C TODOs to the top so future readers can't miss
them; semantics otherwise unchanged):

```typescript
/**
 * CTSSlowMotion::Use — handle the "use" event for a slow-motion
 * trigger entity.
 *
 * Compiles in isolation (D.3 stub layer): all unknown project
 * types are `any`; engine globals are pulled via `globalThis`.
 *
 * Two known TODO(asm-ambiguous) items — MUST resolve before this
 * reaches gameplay:
 *   (B) esi vs pActivator: the disassembly uses `[esp+0x10]`
 *       consistently as the entity passed to `ActivateSlow` and
 *       `FireTargets`, and as the source for every field read/
 *       write. The TS currently treats that as `this` (reading
 *       (ii)), but it could equally be `pActivator` (reading
 *       (i)) under MSVC thiscall where `this` lives in ECX. To
 *       resolve, decompile another `CTSSlowMotion::` method and
 *       confirm which reading holds class-wide.
 *   (C) `[ebx+0x1c78]`: could be `gpGlobals.time` (float, current
 *       TS reading) OR the `gpGlobals` pointer itself (would make
 *       `m_flActivatedAt` a pointer-typed field, not a float).
 *       Cross-reference with the GOT layout used elsewhere for
 *       `gpGlobals` (offset 0x1600 in the same method) to classify.
 *
 * @param this        The CTSSlowMotion entity instance (reading (ii)).
 * @param pActivator  Entity that triggered the use — unused iff (B)(ii).
 * @param useType     USE_TYPE — unused in this overload.
 * @param value       Float — unused in this overload.
 */
export function Use(
  this: any,
  pActivator: any,
  useType: any,
  value: number,
): void {
  // Project globals (D.5 will replace these with real imports).
  const gpGlobals: any          = (globalThis as any).gpGlobals;
  const USE_TYPE: any           = { TOGGLE: 3 };
  const TSHudMessageAll: any    = (globalThis as any).TSHudMessageAll;
  const FireTargets: any        = (globalThis as any).FireTargets;
  const STRING: any             = (globalThis as any).STRING;

  // 1. Activate the slow-motion effect immediately.
  //    Disassembly: push esi; call ActivateSlow@plt.
  //    Under reading (B)(ii): `this.ActivateSlow()`.
  //    Under reading (B)(i):  `ActivateSlow(pActivator)`.
  // TODO(asm-ambiguous, B): confirm `esi === this` across the class.
  this.ActivateSlow();

  // 2. First-use: schedule deactivation. Disassembly writes
  //    [esi+0x14] = 0xffff0000 and [esi+0x18] = [ebx+0x1c78] together.
  //    The 0xffff0000 constant is a packed flag (low 16 bits zero,
  //    high 16 bits set); its meaning is not recoverable from the
  //    disassembly alone.
  if (this.m_flDeactivateAt === 0) {
    this.m_iDeactivateFlag = 0xffff0000;          // TODO(asm-ambiguous): decode the 0xffff0000 sentinel.
    // TODO(asm-ambiguous, C): [ebx+0x1c78] may be gpGlobals.time (float)
    //   or the gpGlobals pointer itself.
    this.m_flActivatedAt = gpGlobals.time;
  }

  // 3. If a HUD message is configured on this entity, broadcast it.
  //    Disassembly pushes (0, 0xff, 0, 0x8, 0x1e, str) — that's
  //    TSHudMessageAll(0, 0xff, 0, 8, 30, str). The string is built
  //    as pStringBase + pev->message (offset 0x1d4), i.e. STRING().
  //
  //    `cmp [edx+0x1d4], 0` in C is `!== 0` in TS for a string_t-typed
  //    field. `!== null` is only correct if D.5 ends up typing it as
  //    `string | null` (see issue E).
  if (this.pev.message !== 0) {
    TSHudMessageAll(0, 0xff, 0x00, 0x08, 0x1e, STRING(this.pev.message));
  }

  // 4. If a target is configured, fire it. Disassembly pushes
  //    (0.0, useType=3, esi, esi, str) for FireTargets — under the
  //    standard TS signature
  //    `FireTargets(target, pActivator, pCaller, useType, value)`,
  //    that's (str, esi, esi, USE_TOGGLE, 0.0).
  // TODO(asm-ambiguous, B): under reading (i), both entity args
  //   would be `pActivator` rather than `this`.
  if (this.pev.target !== 0) {
    FireTargets(STRING(this.pev.target), this, this, USE_TYPE.TOGGLE, 0.0);
  }
}
```

Recommendation: file issues B and C as a follow-up before this
method is treated as committed truth; resolve them by decompiling
sibling `CTSSlowMotion::*` methods (to confirm reading (ii) holds
class-wide) and by mapping the GOT slot at `[ebx+0x1c78]` against
the GOT layout used by `gpGlobals` ([ebx+0x1600]) elsewhere in
the same binary. The current TS is correct *enough* to land as a
D.3 stub, but not as gameplay code.
```
