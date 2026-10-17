```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — `(this: CTSGun, slotIndex: number, selectBetter: boolean): number`
   matches the demangled `CTSGun::DropWeapon(int, bool)`. Return is
   inferred from the asm (eax = 0/1 in the tail block at 709c2/709f4),
   which the TS reproduces as `return 0` / `return 1`. Args are
   located at [esp+0x20], [esp+0x24], [esp+0x28] in the asm — that
   lines up with this/slotIndex/selectBetter.
2. Version check — ⚠️ N/A — this is a gameplay method, not one of
   the engine interface entry points (`GiveFnptrsToDll`,
   `GetEntityAPI*`, `GetNewDLLFunctions`). The version-check
   pattern does not apply. Disregard.
3. interfaceVersion assignment — ⚠️ N/A — same.
4. Success path — ✅ — TS reproduces: range check → slot empty
   check → zero slot → player-gated validator (with null bypass
   on `m_pPlayer`) → optional GetBetterWeapon / HolsterWeapon
   switch when the dropped slot equals `m_iActiveWeapon` →
   return 1. All blocks map 1:1 to the asm.
5. No fabricated paths — ✅ — no invented branches. The
   `m_pPlayer == null` bypass (asm: `je 709cc` at 709a6) is
   real, and the `getBetter` vs. `holster` split is a real
   asm conditional on `selectBetter` at 709d4.
6. No TODO body — ✅ — every TODO is a comment; the function
   body is fully expressed in code.
7. Field names — ⚠️ — `m_pPlayer` (offset 0x80), `m_iActiveWeapon`
   (offset 0xc8), and the validator `onWeaponDrop` (the vtable
   slot `*(m_pPlayer+0x60)+0xb4`) are guesses, but each is
   tagged with a `// TODO(asm-ambiguous):` comment as the rules
   allow. The numeric offsets and the
   `vtable-pointer-then-indirect-call` shape are faithful to
   the asm. Acceptable for D.3.
8. Compiles in isolation — ⚠️ — `CTSGun` is referenced but not
   declared in this file. The prompt allows `any` for unknowns,
   so the harness is expected to provide `type CTSGun = any;`
   (or an equivalent). If the harness does, the body
   type-checks. No other undeclared types are pulled in.

Issues to fix:

- ❌ **Off-by-one in the slot range check.** The asm does
  `lea eax,[esi-0x1]; cmp eax,0x24; ja fail`, which rejects
  `slotIndex >= 0x26` and accepts `1..0x25` (37 slots). The TS
  writes `slotIndex > 0x24`, which accepts only `1..0x24` (36
  slots) and silently drops a valid slot 0x25. The
  accompanying comment ("rejects slotIndex <= 0 and > 0x25")
  also misreads the asm — the asm's predicate is
  `> 0x25`, not `> 0x24`. Change the bound to `0x25`.

- ⚠️ **`onWeaponDrop` is a placeholder name.** The asm calls
  `[*(m_pPlayer+0x60)+0xb4](m_pPlayer)`. In HLSDK
  `CBaseEntity`, offset 0x60 is the vtable pointer and `+0xb4`
  is a virtual. Without D.4's vtable cross-reference for
  `CBasePlayer`, the method name is a guess. The TODO comment
  already flags this; acceptable, but the rewrite below uses
  the lower-level indirection so a future review can plug the
  real name in without changing the rest of the shape.

- ⚠️ **The "drop the slot, then ask the player" ordering is
  preserved from the original.** If the validator rejects, the
  slot has already been zeroed — so a rejected drop still
  wipes the inventory slot. This is faithful to the asm but
  looks like a bug in the original gameplay code. Not a
  decomp error; flag for the D.4 gameplay pass to confirm.

- ℹ️ The `__cdecl` caller-cleanup `add esp, 0x10` after the
  `GetBetterWeapon` / `HolsterWeapon` calls doesn't need to be
  modeled in TS. Already handled.

Suggested rewrite (full TS function):

```typescript
/**
 * CTSGun::DropWeapon — drop the weapon in the given slot; if it
 * was the active weapon, switch to a replacement (GetBetterWeapon)
 * or holster (HolsterWeapon) per `selectBetter`.
 *
 * Asm refs:
 *   - Valid slot range: 1..0x25 (37). Pattern:
 *       lea eax, [esi-0x1]; cmp eax, 0x24; ja fail
 *   - Slots are 56 bytes; slot table at this+0x114; first byte
 *     of each slot is the "has weapon" flag.
 *   - The dropped slot is zeroed (14 dwords = 56 bytes).
 *   - If this->m_pPlayer (offset 0x80) is non-null, a virtual
 *     validator is called as:
 *       edx = *(m_pPlayer + 0x60);  // vtable
 *       result = (*(edx + 0xb4))(m_pPlayer);
 *     A zero result rejects the drop.
 *   - If the dropped slot equals m_iActiveWeapon (offset 0xc8),
 *     run GetBetterWeapon(slot) when selectBetter, else
 *     HolsterWeapon().
 *   - Returns 1 on success, 0 on rejection.
 */

// CTSGun is provided by the harness; declared as `any` here so
// this snippet compiles in isolation per the D.3 review rules.
type CTSGun = any;

export function DropWeapon(
  this: CTSGun,
  slotIndex: number,
  selectBetter: boolean
): number {
  // Range check. Asm rejects (slotIndex - 1) > 0x24 unsigned,
  // i.e. slotIndex >= 0x26, so valid is 1..0x25 (37).
  if (slotIndex < 1 || slotIndex > 0x25) {
    return 0;
  }

  // Slot geometry: 56 bytes per slot, base offset 0x114.
  const slotOffset = 0x114 + slotIndex * 56;

  // Slot must be occupied (first byte != 0).
  if (this.mem.getUint8(slotOffset) === 0) {
    return 0;
  }

  // Zero the slot (asm: `cld; mov eax,0; mov ecx,0xe; rep stosd`).
  for (let i = 0; i < 14; i++) {
    this.mem.setUint32(slotOffset + i * 4, 0);
  }

  // Player-gated validator. Null m_pPlayer bypasses the call.
  // TODO(asm-ambiguous): the validator at vtable+0xb4 on
  // CBasePlayer is not yet identified by name; the lower-level
  // indirection is preserved here so a future D.4 pass can plug
  // in the real method (likely something like `CanDropWeapon` /
  // `AllowWeaponDrop`).
  const player = this.m_pPlayer as any;
  if (player !== null && player !== undefined) {
    // *(player + 0x60) is the vtable; [vtable + 0xb4] is the
    // virtual to call, with `player` as its sole argument.
    const vtable = player[0x60 / 4] as any;
    const fn = vtable[0xb4 / 4] as (self: any) => number;
    const allowed: number = fn.call(vtable, player);
    if (allowed === 0) {
      return 0;
    }
  }

  // If we dropped the active weapon, switch.
  // TODO: m_iActiveWeapon (offset 0xc8) field name not yet
  // mapped to a CTSGun member.
  if (this.m_iActiveWeapon === slotIndex) {
    if (selectBetter) {
      this.GetBetterWeapon(slotIndex);
    } else {
      this.HolsterWeapon();
    }
  }

  return 1;
}
```
