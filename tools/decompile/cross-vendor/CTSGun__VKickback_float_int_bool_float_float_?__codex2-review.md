```
VERDICT: PASS-WITH-NOTES

PRE-FLIGHT NOTE — input mismatch
The provided HLSDK reference section (`GiveFnptrsToDll`,
`GetEntityAPI{,2}`, `GetNewDLLFunctions`) is the engine↔mod
interface contract, not a reference for a gameplay method.
`VKickback` is a member of `CTSGunfibffT3`; the reference
doesn't apply. I reviewed against the disassembly and the
class context instead. Checklist items 2 (version check),
3 (interfaceVersion assignment-back), and 4 (struct copy
success path) are n/a here.

Checklist (adapted for a single decompiled method):

1. Signature — ⚠️ — three explicit args + `this` matches   what the body accesses ([esp+0x24]=float baseAmount,
   [esp+0x28]=int weaponMode, [esp+0x2c]=bool altModeFlag,
   [esp+0x20]=`this` loaded into esi). The demangled
   signature lists FIVE explicit args and one `?`; the
   function body only references the first three + `this`.
   Either the demangler pulled extra params from a separate
   debug-info source, or the caller passes two unused
   trailing floats. TS silently drops the two unused args
   without a comment that they're dropped.
   Return is void (no eax writeback before `ret`). ✅ for
   return; ⚠️ for arg count.

2. Version check — n/a.

3. interfaceVersion assignment — n/a.

4. Success path — n/a (no engine-side struct write; this
   method mutates player_state[0x68/0x6c] when a flag bit
   is set).

5. No fabricated paths — ✅ — the switch/case table
   faithfully matches the asm order: 8 → 4-or-5 → 1 →
   6-or-7 → 9 → default. The alt-mode and DoubleFireRate
   "scale both locals by a cvar" branches match the two
   `fmul st,st(1); fstp …; fmul [esp+0x10]; fstp …` blocks.
   No invented branches. Minor caveat: see issue 2 about
   the double-deref.

6. No TODO body — ⚠️ — body is real code, but every cvar
   is an undefined `KICKBACK_*_CVAR` constant. The
   "KICKBACK_DOUBLE_FIRE_CVAR" and the rest are not defined
   anywhere; the function will not type-check without   `any`-typed placeholders. The JSDoc has `TODO(D.4)` and
   `TODO(asm-ambiguous)` markers that flag real work, but
   the constants themselves should be declared (as `any`
   per checklist item 8) so the snippet compiles in
   isolation.

7. Field names — ⚠️ — `[esi+0x80]` is asserted to be
   `m_pPlayer` (HLDSDK). Plausible — `CBasePlayerItem`
   does have `m_pPlayer` and0x80 is the right magnitude
   — but not verified. The 0x1a5 / 0x68 / 0x6c offsets into
   "playerState" are explicitly TODO-flagged. Names are
   defensible as hypotheses with TODOs, but bracket-indexed
   access via integer offsets is brittle. Recommend keeping
   the bracket access for D.3 and resolving field names in
   D.4.

8. Compiles in isolation — ❌ — `KICKBACK_BASE_CVAR`,
   `KICKBACK_MODE_*_CVAR`, `KICKBACK_DEFAULT_CVAR`,
   `KICKBACK_ALT_MODE_CVAR`, `KICKBACK_DOUBLE_FIRE_CVAR`,
   and `DoubleFireRate` are all undeclared identifiers.
   `this.m_pPlayer` is dynamic so it's fine, but the
   top-level cvar references break the file.

Issues to fix:

A. **Double-deref missing in the player-state update.**
   The asm at 704e0-704e6 is:
       mov eax, [esi+0x80]   ; eax = this->m_pPlayer
       mov eax, [eax]        ; eax = *(this->m_pPlayer)
   followed by `[eax+0x1a5]`, `[eax+0x68]`, `[eax+0x6c]`.
   The TS does `const playerState: any = owner;` which is
   only one deref — `playerState` ends up pointing at the
   same `CBasePlayer*` that `owner` already is, NOT at the
   inner struct the asm accesses. The JSDoc says "implicit
   double-deref" but no code actually performs the second
   deref. Net effect on the body: the offsets 0x1a5/0x68/0x6c
   would be applied to the wrong object. (Whether the literal
   asm's second deref is itself sane — `CBasePlayer`'s
   offset-0 is its vtable ptr in MSVC — is a separate question
   that's already TODO-flagged; the immediate fix is to make
   the TS code match the literal asm.)

B. **Undefined cvar constants.** All `KICKBACK_*_CVAR` and
   `DoubleFireRate` need declarations. Per checklist item 8,
   these should be `any`-typed placeholders so the function
   compiles in isolation:
   - `const KICKBACK_BASE_CVAR: any = undefined;` etc.
   - `declare function DoubleFireRate(p: any): number;`

C. **Arg-count discrepancy not commented.** Demangler says
   5 explicit args; body uses 3. The TS silently drops the
   trailing two. A short JSDoc note ("two trailing float
   args from demangler are not referenced in this body")
   would prevent a future reader from assuming the signature
   is wrong.

D. **Minor: misleading "first four" wording.** JSDoc says
   "only the first four are referenced in this code path".
   Counting `this` as one of the four, this is defensible.
   I'd reword to "this + the first three explicit args" so
   it's unambiguous.

Suggested rewrite (full TS function — addresses A, B, C, D):

```typescript
/**
 * CTSGun::VKickback — applies weapon kickback (recoil) to the
 * gun's owner.
 *
 * Picks a per-weapon kickback cvar based on `weaponMode`,
 * scales it by `baseAmount` (and optionally by an "alt mode"
 * cvar and a "double fire rate" cvar), then mutates two
 * adjacent floats on the owning player's state (offsets
 * 0x68 / 0x6c, likely velocity or view-angle components) when
 * a flag byte (offset 0x1a5, mask 0x20) is set.
 *
 * NOTE: the demangled symbol lists five explicit args (and a
 * `?` suffix). The asm body references only `this` plus the
 * first three — the two trailing float args are dropped on
 * the floor by this method, not by us. (TODO(D.4): confirm
 * via caller-side audit whether the trailing args are ever
 * forwarded to anything.)
 *
 * @param this         The CTSGun instance that fired.
 * @param baseAmount   Base scalar / direction value (float).
 * @param weaponMode   Weapon mode index (int). Switches over
 *                     {1, 4, 5, 6, 7, 8, 9}; anything else
 *                     falls back to a default kickback cvar.
 * @param altModeFlag  Boolean. When truthy, multiplies both
 *                     kickback values by an "alt mode" cvar.
 * @returns            void
 */
// TODO(D.4): replace `any` annotations with `CTSGun`,
//             `CBasePlayer`, `entvars_t`, and named cvar
//             references once the class is reconstructed.
//             Resolve KICKBACK_*_CVAR names from
//             tools/decompile/analysis/strings-n5.txt.

// Cvar placeholders. Real values live in the .data section at
// the GOT-relative offsets in the asm. Typed as `any` so this
// compiles in isolation; resolve in D.4.
const KICKBACK_BASE_CVAR:         any = undefined; // [ebx-0x6df08]
const KICKBACK_MODE_8_CVAR:       any = undefined; // [ebx-0x6df04]
const KICKBACK_MODE_4_5_CVAR:     any = undefined; // [ebx-0x6df00]
const KICKBACK_MODE_1_CVAR:       any = undefined; // [ebx-0x6defc]
const KICKBACK_MODE_6_7_CVAR:     any = undefined; // [ebx-0x6def8]
const KICKBACK_MODE_9_CVAR:       any = undefined; // [ebx-0x6def4]
const KICKBACK_DEFAULT_CVAR:      any = undefined; // [ebx-0x6f408]
const KICKBACK_ALT_MODE_CVAR:     any = undefined; // [ebx-0x6df0c]
const KICKBACK_DOUBLE_FIRE_CVAR:  any = undefined; // [ebx-0x6def0]

// External: defined in tools/decompile/chunks/... in D.4.
// Signature matches the @plt call site (cdecl, returns int).
declare function DoubleFireRate(p: any): number;

export function VKickback(
  this: any,
  baseAmount: number,
  weaponMode: number,
  altModeFlag: boolean
): void {
  // -- Step 1: baseValue = baseCvar * baseAmount.
  //     [esp+0xc] in the asm frame.
  let baseValue = KICKBACK_BASE_CVAR * baseAmount;

  // -- Step 2: perWeaponValue.
  //     The asm keeps the partial product of step 1 on the FPU
  //     stack and either multiplies it by a mode-specific cvar,
  //     or (default case) discards it via `fstp st(0)` and loads
  //     the default cvar directly — i.e. perWeaponValue is
  //     NOT multiplied by baseAmount in the default branch.
  //     [esp+0x10] in the asm frame.
  let perWeaponValue: number;
  switch (weaponMode) {
    case 8:
      perWeaponValue = baseValue * KICKBACK_MODE_8_CVAR;
      break;
    case 4:                                            // fallthrough
    case 5:
      perWeaponValue = baseValue * KICKBACK_MODE_4_5_CVAR;
      break;
    case 1:
      perWeaponValue = baseValue * KICKBACK_MODE_1_CVAR;
      break;
    case 6:                                            // fallthrough
    case 7:
      perWeaponValue = baseValue * KICKBACK_MODE_6_7_CVAR;
      break;
    case 9:
      perWeaponValue = baseValue * KICKBACK_MODE_9_CVAR;
      break;
    default:
      perWeaponValue = KICKBACK_DEFAULT_CVAR;
      break;
  }

  // -- Step 3: alt-mode boost. Multiplies BOTH values by the
  //     alt-mode cvar. Asm pattern is `fld X; fld baseValue;
  //     fmul st,st(1); fstp baseValue; fmul [esp+0x10];
  //     fstp [esp+0x10]` — same cvar X used twice.
  if (altModeFlag) {
    baseValue      *= KICKBACK_ALT_MODE_CVAR;
    perWeaponValue *= KICKBACK_ALT_MODE_CVAR;
  }

  // -- Step 4: DoubleFireRate owner-side scaling.
  //     [esi+0x80] is asserted to be `m_pPlayer` per HLDSDK
  //     CBasePlayerItem layout (TODO(D.4): verify offset).
  //     `test eax,eax; je` in the asm corresponds to !== 0.
  const owner: any = (this as any).m_pPlayer;          // [esi+0x80]
  if (DoubleFireRate(owner) !== 0) {
    baseValue      *= KICKBACK_DOUBLE_FIRE_CVAR;
    perWeaponValue *= KICKBACK_DOUBLE_FIRE_CVAR;
  }

  // -- Step 5: conditional apply to the player state.
  //     The asm does TWO dereferences of `[esi+0x80]`:
  //         mov eax, [esi+0x80]   ; eax = owner (CBasePlayer*)
  //         mov eax, [eax]        ; eax = *owner  ← second deref
  //     and then reads offsets 0x1a5 / 0x68 / 0x6c from eax.
  //     The original TS comment said "implicit double-deref"
  //     but no code did it — that was a bug. Reflect it
  //     literally here so the offsets apply to the right object.
  //
  // TODO(asm-ambiguous): whether the literal `*owner` (which
  //     in HLDSK lands on CBasePlayer's vtable ptr at offset 0)
  //     is the intended target, or whether `[esi+0x80]` is
  //     actually `pev` / some other pointer field, is open.
  //     Resolve in D.4 via cross-reference with CBasePlayer's
  //     layout in this exact build.
  const playerState: any = owner && (owner as any)[0]; // double-deref
  if (((playerState as any)[0x1a5] /* flag byte */ & 0x20) !== 0) {
    (playerState as any)[0x68] -= baseValue;
    (playerState as any)[0x6c] += perWeaponValue;
  }
}
```

Summary: the structure and control flow are faithful to the asm;
the only outright bug is the missing second dereference in step 5
(issue A). The undefined-cvar problem (issue B) is mechanical and
fixed by the rewrite above. Field-name guesses (issue 7) and
arg-count discrepancy (issue C) are appropriate TODOs to defer to
D.4, but should be noted in the JSDoc so they're not lost.
