## Verdict

**VERDICT: PASS-WITH-NOTES**

The function's structure and control flow match the disassembly cleanly, but a few details need polish before this is shippable. Note: the prompt's checklist was written for D.3 entry points — most items don't apply to a class method. I adapt and add applicable items below.

### Adapted Checklist

| # | Item | Status | Detail |
|---|------|--------|--------|
| 1 | Signature matches demangled symbol | ✅ | `CCombatIdle__6CTSGun` → `CCombatIdle(this: CTSGun): void`. Cdecl/Linux-i386 `this` via stack arg at `[esp+0x20]`, no other args, `void` return. ✓ |
| 2 | Throttle check preserves `fcomp`/`fnstsw` semantics | ✅ | `fcomp [edi+0xa8]` ⇒ `fnstsw ax` ⇒ `test ah,0x1` ⇒ `jne` to exit. Maps to `if (now < this.m_flTimeWeaponIdle) return`. The `0xa8` inline-comment is preserved. ✓ |
| 3 | Reschedule cadence (interval + store-back) | ✅ | `now + interval → [edi+0xa8]`. The 32-bit `fstp DWORD` (truncating the `QWORD` double) is implicit in TS but worth a `// faddp at 80-bit, store as float32` note. ✓ |
| 4 | `m_pPlayer` lookup at +0x60 | ⚠️ | `[edi+0x60]` → esi is correct. Naming it `m_pPlayer` is a reasonable inference (`CBasePlayer*`); offset is **not annotated inline** like `0xa8` was. |
| 5 | `get_weapon_info(0)` + stack reuse → args 3 & 4 of indirect call | ✅ | Correctly modeled as 4-arg call: `(gun, idleFxIdx, 0, 0)`. Cleanup via `add esp, 0x10` is correctly omitted (TS hides cdecl bookkeeping). ✓ |
| 6 | `movsx WORD [eax+0x252]` ⇒ sign-extended int16 | ✅ | Captured as `number` access on `info.field_0x252`. Sign-extension implicit. ✓ |
| 7 | Indirect dispatch through `[esi+0x174]` | ⚠️ | See issue 2 below — `player.dispatch(...)` fabricates a method that isn't in the disassembly. |
| 8 | No fabricated code paths | ⚠️ | One fabrication: `player.dispatch()` (issue 2). |
| 9 | No comment-only TODO body | ✅ | The body is real TS code; TODOs are in comments alongside. ✓ |
| 10 | Field names map to known/annotated fields | ⚠️ | `m_flTimeWeaponIdle` is canonical GoldSrc; `m_pPlayer` is plausible; `field_0x252` is honestly-named; `COMBAT_IDLE_INTERVAL` is undefined (issue 1). |
| 11 | Function compiles in isolation | ❌ | References undefined `COMBAT_IDLE_INTERVAL`; needs declaration or inline constant. |

### Issues to fix

1. **`COMBAT_IDLE_INTERVAL` is undefined** — the disassembly's `fld QWORD [ebx-0x6e768]` (the FPU `faddp`/`fstp` reschedule constant) needs *something* resolvable in this file. Options:
   - Inline `const interval = 0.075;` (guessing cadence is fine if labeled)
   - Add a `const COMBAT_IDLE_INTERVAL = 0.075;` near the top
   - Drop the local and read via a helper `getWeaponIdleInterval()`

2. **`player.dispatch()` is fabricated.** The disassembly does `call DWORD PTR [esi+0x174]`. That's a *function-pointer dereference*, not a method call on the player — and `[esi+0x174]` is a field at offset `0x174` from whatever `m_pPlayer` points at, not a method on the player itself. The TS collapses this into `.dispatch()` which is a guess. Better:

   ```typescript
   const dispatchFn = player.funcPtr_0x174; // [esi+0x174] — unknown semantics
   dispatchFn(this, idleFxIdx, 0, 0);
   ```

   or, even more honest:

   ```typescript
   const dispatchFn = (player as any)[0x174 >>> 2] as (a: any, b: number, c: number, d: number) => void;
   dispatchFn(this, idleFxIdx, 0, 0);
   ```

3. **Missing offset annotations for `0x60`, `0x174`, `0x252`** — `+0xa8` got one but its siblings didn't. Consistency aids audit.

4. **`m_pPlayer` naming** is unconfirmed. Fine as-is *if* a `// TODO(asm-ambiguous):` tag stays on it. (It does — kept as a TODO.)

### Suggested rewrite

```typescript
/**
 * CTSGun::CCombatIdle — throttled combat-idle tick.
 *
 * Called periodically (e.g., from `WeaponIdle`). If enough real time has
 * passed since the last combat-idle event (`m_flTimeWeaponIdle`), schedules
 * the next tick and asks the owning player to play the combat-idle
 * sound/animation read from the weapon_info struct.
 *
 * @param this  The CTSGun entity instance (`this` in the original C++)
 * @returns     void
 */

// The reschedule interval is a 64-bit IEEE-754 double at
// `[ebx-0x6e768]` in the GOT-relative data section (the FPU does `faddp`
// then `fstp DWORD` — so it's loaded as double and stored truncated as
// 32-bit float). Value approximate; cadence is a typical gun-idle period.
const COMBAT_IDLE_INTERVAL_S = 0.075; // TODO(asm-ambiguous): confirm exact value

export function CCombatIdle(this: CTSGun): void {
  // 1. Throttle. `fcomp [edi+0xa8]` sets FPU C0=1 when `now < [edi+0xa8]`;
  //    `fnstsw ax` + `test ah,0x1` + `jne 75eb5` exits the body in that case.
  const now = UTIL_WeaponTimeBase();
  if (now < (this as any).m_flTimeWeaponIdle /* +0xa8, f32 */) {
    return;
  }

  // 2. Schedule the next combat-idle event: `now + interval → m_flTimeWeaponIdle`.
  (this as any).m_flTimeWeaponIdle = now + COMBAT_IDLE_INTERVAL_S;

  // 3. Resolve `m_pPlayer` (CBasePlayer*) at +0x60; used as the dispatch base.
  //    TODO(asm-ambiguous): the player-side layout (offsets below) is inferred.
  const player: any = (this as any).m_pPlayer /* +0x60 */;

  // 4. weapon_info lookup (1 logical arg of `tsweapon_t`; compiler pads to 4
  //    stack slots — leftover 0s become args 3 & 4 of the indirect call below).
  //    TODO(asm-ambiguous): confirm get_weapon_info's true signature.
  const info: any = get_weapon_info(0);

  // 5. `movsx eax, WORD PTR [eax+0x252]` — sign-extend int16 from weapon_info.
  //    Field purpose unknown; preserved as an offset-named accessor.
  const idleFxIdx: number = info.field_0x252 /* +0x252, i16 */;

  // 6. Indirect call through `[player+0x174]`. Args = (this_gun, idleFxIdx, 0, 0).
  //    The compiler reused the leftover 8 bytes from get_weapon_info's args
  //    as args 3 & 4, so the cleanup is one `add esp, 0x10` for 4 args total.
  //    TODO(asm-ambiguous): the entity at +0x174 is a function pointer, not
  //    a method slot. Could be a vtable, a TS dispatcher, or an embed-side
  //    callback table.
  const dispatchFn = player.funcPtr_0x174 /* +0x174 */ as (
    a: any, b: number, c: number, d: number
  ) => void;
  dispatchFn(this, idleFxIdx, 0, 0);
}
```

### Other observations (not blocking)

- The "TS may add custom functions" caveat from the prompt is honored here: this is a CTSGun gameplay method, not an engine↔mod interface point, so the `GiveFnptrsToDll`/`GetEntityAPI*` rules don't apply.
- The `faddp st(1),st` order — i.e. `st(1) = st(1) + st(0)` then pop — is a subtle 80-bit precision accumulation; a TS reviewer should know that storing back as `DWORD` truncates the constant double to float32, but this doesn't change the throttle semantics at this scale.
- Suggested `cross-vendor` companion: `SPEC.md` § CTSGun.CCombatIdle should record the +0xa8 / +0x60 / +0x174 / +0x252 field offsets once they're confirmed by cross-referencing sibling chunks (`WeaponIdle`, `Holster`, etc.).
