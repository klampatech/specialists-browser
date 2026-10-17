```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `Fall(this: CTSAmmoPack): void` matches the demangled
   symbol `Fall__11CTSAmmoPack` exactly: zero non-`this` args, void return.
   The asm ends in plain `ret` (no `eax` setup), so `void` is correct.
2. Version check — N/A — `Fall` is a class method, not one of the engine↔mod
   interface functions in the HLSDK reference. The `INTERFACE_VERSION`
   pattern does not apply.
3. `*interfaceVersion` assignment — N/A — same reason as #2.
4. Success path / struct copy — N/A — no `memcpy` / assignment-back here;
   the function is a per-tick physics step. The three sections of the asm
   each map cleanly to a TS section (see #5).
5. No fabricated paths — ✅ — every control-flow branch in the asm appears
   in the TS: the `test [eax+0x1a5],0x2 / je` landing check, the `jae`
   skip over `UTIL_Remove`, and both `call` sites (`OnGround`,
   `UTIL_Remove`). No extra branches, no extra calls, no inlined logic
   that isn't in the disassembly.
6. No TODO body — ✅ — the function has real code; the TODOs are scoped
   to field/constant *identities*, not entire code paths. There are no
   `// TODO implement this` blanks.
7. Field names — ⚠️ — mixed:
   - `pev`, `velocity`, `flags` are standard HLSDK CBaseEntity /
     entvars_t fields ✅
   - `OnGround()`, `UTIL_Remove(this)` match the PLT calls exactly ✅
   - `frameTime` and `sv_gravity` for the two PIC-loaded globals are
     *guesses*. They are internally consistent with each other (the same
     value is reused in the add and in the comparison), but their actual
     identities are not pinned by the asm (`[ebx+0x1600][0]` is just "first
     field of struct pointed to by global pointer"; `[ebx-0x6ecd8]` is a
     true 8-byte IEEE double load, not a float). ⚠️
   - `m_fFallVel` for the field at `[esi+0xa4]` is a guess that doesn't
     fit the auto-remove semantic very well (comparing a velocity to a
     scalar threshold isn't a standard "remove after time/distance" idiom).
     ⚠️
   - The `& 0x2` flag is called out in a TODO — that's the right move
     since standard HL1 `FL_ONGROUND` is `1<<0` (mask `0x1`), so mask
     `0x2` is *not* `FL_ONGROUND` in unmodified HL1. ⚠️
8. Compiles in isolation — ✅ — uses `declare const` / `declare function`
   for ambient globals + a free helper, exactly as the prompt allows when
   the engine-callback layer isn't wired yet. No external type references.
```

---

## Issues to fix

1. **`[ebx-0x6ecd8]` is a `fld QWORD`, not a float.** The TS comment says
   "QWORD load... fadd promotes the cvar float to double; result is
   truncated back to float on store." That's backwards — the QWORD *is*
   the double. The float (`[ebx+0x1600][0]`) is the operand added in.
   The current comment misidentifies which operand is which. If
   `frameTime` is meant to be `gpGlobals->frametime`, it's actually a
   `float` (4 bytes) and would be loaded with `fld DWORD`, not `fld
   QWORD`. So either the field name is wrong, or the field genuinely is
   stored as a `double` somewhere unusual.

2. **`[ebx+0x1600][0]` is the same load in both places** (the addend in
   step 1 and the comparison RHS in step 3). The TS handles this
   correctly *by coincidence* (it labels the same global `sv_gravity` in
   both call sites), but it should be made structurally explicit —
   e.g., capture it in a local — so a future edit doesn't accidentally
   desync the two sites. The same pattern does *not* appear for
   `[ebx-0x6ecd8]` (only used in step 1), which is consistent with the
   TS using `frameTime` only there. ✅ on consistency, ⚠️ on
   discoverability.

3. **`m_fFallVel` is a poor placeholder name** for the field at
   `[esi+0xa4]`. The semantic of the third block — "if some field has
   dropped below a threshold, remove the entity" — is more naturally
   expressed as a die timer (`m_flDieTime`), a think threshold
   (`m_flNextThink`), or a fall-distance accumulator, not a literal
   fall velocity. The TODO acknowledges the unknown but should suggest
   better candidates, or pick `m_flDieTime` as the working name.

4. **The `& 0x2` flag is misidentified in the comment.** The TS comment
   says "mask 0x2 corresponds to `FL_PARTIALGROUND` in standard HL1
   (`FL_ONGROUND` is 0x1) — verify engine flag layout." That's a
   hallucination: standard HL1 has no `FL_PARTIALGROUND` — that's an
   Opposing Force / third-party flag. In unmodified HL1, mask `0x2` is
   `FL_FLY`. The TODO should call out the actual candidate
   (`FL_FLY = 1<<1`) plus "or a TS-specific flag" rather than
   `FL_PARTIALGROUND`.

5. **`pev.velocity.x = 0; pev.velocity.z = 0` skips velocity.y.**
   The asm zeros `[eax+0x50]` and `[eax+0x58]` and leaves
   `[eax+0x54]` alone. If those offsets really are x and z of the
   standard `vec3_t velocity`, that's an intentional y-skip (which is
   odd for a "landed" handler — usually you'd zero all of velocity or
   just velocity.z). Worth a one-line comment noting the skip, since
   it's likely to confuse a later reader.

6. **PIC prologue should be acknowledged.** The `call 9154e / pop ebx
   / add ebx, 0xd48c2` sequence is i386 PIC (load the GOT base into
   `ebx`). That makes both "globals" *live values resolved every call*,
   not compile-time constants. The `declare const` on `frameTime` and
   `sv_gravity` is fine for placeholder names but should be commented
   as "not actually const" so it doesn't get copied into real engine
   code later.

---

## Suggested rewrite

```typescript
// Ambient engine symbols loaded via i386 PIC into ebx. These reflect live
// engine state at *call time*, not compile-time constants — replace with
// `CVAR_GET_FLOAT` / `gpGlobals->*` / `cvar->value` lookups once the
// engine-callback layer is wired up.
//
// Identity caveats (the asm gives us addresses, not names):
//   - `[ebx+0x1600]` is a *pointer* that's derefed once before each use,
//     so the value is the first field of a struct reachable through that
//     pointer. Candidates:
//       * `gpGlobals->time`    (time is offset 0 of `globalvars_t`)
//       * `sv_gravity->value`  (would require a non-standard `cvar_t`
//                               layout where `value` is at offset 0 —
//                               standard HL1 puts `name` at offset 0).
//   - `[ebx-0x6ecd8]` is loaded with `fld QWORD`, so it's a true 8-byte
//     IEEE double, NOT a float pair and NOT a 4-byte float. Candidates:
//     a static double in .rodata, `sv_gravity` cached as `double`, or a
//     tick-rate constant stored as double.
declare const frameTime: number;        // `[ebx-0x6ecd8]` — true f64 (TODO)
declare const sv_gravity: number;       // `[ebx+0x1600][0]` — f32 chain-deref (TODO)
declare function UTIL_Remove(ent: CTSAmmoPack): void;

/**
 * `CTSAmmoPack::Fall` — per-tick physics step for the ammo pack entity.
 *
 * Disassembly at `0x00091544` (123 bytes) decomposes into three blocks:
 *   1. `pev->flFallVel = (f64)[ebx-0x6ecd8] + (f32)[[ebx+0x1600]]`
 *   2. If `pev->flags & 0x2`: zero `pev->velocity.x` and
 *      `pev->velocity.z`, leaving `pev->velocity.y` untouched, then
 *      dispatch `OnGround()`.
 *   3. If `[esi+0xa4] < (f32)[[ebx+0x1600]]` (same float as block 1):
 *      call `UTIL_Remove(this)`.
 */
export function Fall(this: CTSAmmoPack): void {
  const pev = this.pev;

  // Capture the chain-loaded float once — the asm loads it twice (block 1
  // and block 3), so the same expression must serve both call sites.
  const chainVal = sv_gravity;

  // ----- Block 1: fall-velocity update ----------------------------------
  // `fld QWORD [ebx-0x6ecd8]`  → double onto x87 stack
  // `fadd DWORD [eax]`         → add (eax = *(*[ebx+0x1600]))
  // `fstp DWORD [edx+0x104]`   → truncate back to float, store as flFallVel
  // pev.flFallVel = frameTime + chainVal
  pev.flFallVel = frameTime + chainVal;

  // ----- Block 2: landing handler ---------------------------------------
  // `test BYTE [eax+0x1a5], 0x2` / `je 91598`
  // Standard HL1 FL_ONGROUND = 1<<0 (mask 0x1). Mask 0x2 is FL_FLY (1<<1)
  // in vanilla HL1, or a TS-specific flag (e.g., a partially-grounded
  // state, an OpFor-style FL_PARTIALGROUND, or a CTSAmmoPack custom flag).
  // TODO(asm-ambiguous): confirm the 0x2 bit against the mod's flag map.
  if ((pev.flags & 0x2) !== 0) {
    // The asm zeros [pev+0x50] and [pev+0x58] but skips [pev+0x54] — i.e.,
    // velocity.x and velocity.z are cleared while velocity.y is left alone.
    // Odd for a "landed" handler (usually you'd clear all of velocity or
    // just z), but it's what's in the binary.
    pev.velocity.x = 0;
    pev.velocity.z = 0;
    this.OnGround();
  }

  // ----- Block 3: auto-despawn ------------------------------------------
  // `fcomp DWORD [edx]` / `fnstsw ax` / `sahf` / `jae 915b9`
  // → branch taken when ST(0) >= memory, i.e. when [esi+0xa4] < chainVal.
  // The field at +0xa4 is unknown. m_fDieTime is a placeholder; the
  // "compare and remove" idiom is much more naturally expressed as a die
  // timer, a think-threshold, or a fall-distance accumulator than as a
  // literal fall velocity.
  // TODO(asm-ambiguous): identify the field — candidates `m_flDieTime`,
  //       `m_flNextThink`, or a fall-distance accumulator.
  if (this.m_fDieTime < chainVal) {
    UTIL_Remove(this);
  }
}
```

Key changes vs the original decompilation:

- **Captures `chainVal` in a local** to make the block-1 / block-3 reuse
  of `[ebx+0x1600][0]` structurally obvious (the original got this right
  by coincidence).
- **Renames `m_fFallVel` → `m_fDieTime`** as a working placeholder —
  auto-remove-on-threshold is normally a timer, not a velocity.
- **Replaces the fabricated `FL_PARTIALGROUND` comment** with the
  correct vanilla-HL1 candidate (`FL_FLY`) plus "or TS-specific flag".
- **Corrects the QWORD comment** — the QWORD is the constant at
  `[ebx-0x6ecd8]`, not a promoted `float` from `[ebx+0x1600]`.
- **Calls out the velocity.y skip** explicitly so a future reader
  doesn't think it's a typo and "fix" it.
- **Notes the PIC prologue** — the `declare const` symbols aren't
  actually const at runtime.
