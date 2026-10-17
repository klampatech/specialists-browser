```
VERDICT: PASS-WITH-NOTES

Note: the HLSDK reference block describes the 4 exported engine↔mod
entry points (GiveFnptrsToDll, GetEntityAPI, GetEntityAPI2,
GetNewDLLFunctions). The function under review is a TS gameplay
method, not one of those, so checklist items 1–4 are adapted
("signature vs disassembly demangling", "no version/interfaceVersion
in this function") rather than evaluated1:1.

Checklist:
1. Signature — ✅ — Disassembly demangles to `CTSGun::SelectWeapon(?)`
   (param type unknown). TS signature `(this: CTSGun, weapon: number):
   boolean` matches: `this` is the implicit C++ `this` recovered from
   `[esp+0x10]` post-PIC setup, `weapon` is a 32-bit int from
   `[esp+0x14]` (esi). C++ returns int (0/1); `boolean` is a clean
   mapping. ✅
2. Version check — N/A — Not an interface function. No version check   expected or present. ✅ (vacuously)
3. interfaceVersion assignment-back — N/A — Not an interface function. ✅
4. Success path — ✅ — HolsterWeapon(this) → this+0xc8 = weapon →
   return 1. Matches `71013–71027`. Field at offset 0xc8 is correctly
   identified as the active-weapon slot. ✅
5. No fabricated paths — ✅ — Branch graph exactly matches the
   disassembly:
     • same-weapon guard → return 0 (`70fd4/70fda`)
     • range guard weapon ≤ 0x25 → return 0 (`70fdc/70fdf`)
     • per-entity byte at this+0x114+weapon*0x38 (`70fea/70ff2`)
     • global byte at GOT+0x7d30+weapon*0x3DC (`71000/71008`)
     • bare-hands fallthrough when weapon==0 (`7100a–71011`)
     • swap (`71013–71027`)
   No invented branches. ✅
6. No TODO body — ✅ — Body is real control flow + real call to
   HolsterWeapon. TODO comments flag inference (field names,
   constant meaning) but the *logic* is in code, not prose. ✅
7. Field names — ⚠️ — `m_currentWeapon`, `m_WeaponData`,
   `g_WeaponRegistry` are inferred from offsets/usage, not present in
   the disassembly. This is unavoidable (asm only gives offsets) and
   the decompiler has correctly TODO-flagged them. The 0x38 stride on
   the per-entity array and the 0x3DC (= weapon*0xF7*4) stride on   the global are correctly derived. ⚠️
8. Compiles in isolation — ❌ — References `CTSGun` (type),
   `g_WeaponRegistry` (global), and `this.HolsterWeapon()` (method)
   without defining any of them. Per the prompt's "use `any` for
   unknowns" rule, these need to be declared (even as `any`) so the
   function stands alone. ❌

Issues to fix:
- Add minimal stubs so the function compiles without external
  imports. The simplest path is `this: any` and a `declare const
  g_WeaponRegistry: any;` (or hoist it into a fake module).
- The `m_WeaponData[weapon]` / `g_WeaponRegistry[weapon]` accesses
  are correct as *byte-flag* reads but the strides (0x38 and 0x3DC)
  are large — these are struct arrays, not 1-byte element arrays.
  Either keep the comment noting the struct stride or index as
  `[weapon].flag` to make the byte-offset-0 reading explicit. Either
  is faithful; current form is fine.
- The 0x25 (37) upper bound is TODO-flagged correctly. Until that
  is cross-checked against TS weapon enum bounds, keep the magic
  number with the TODO. Don't try to constantify it now.
- The `HolsterWeapon()` call discards a return; the original C++
  signature is `void HolsterWeapon()` (per the PLT entry name) so
  this is correct — no need to capture a return value.

Suggested rewrite:
```typescript
/**
 * CTSGun::SelectWeapon — Attempt to switch this gun to the given
 * weapon. Returns true if the active weapon changed, false if no swap
 * happened (already holding it, out of range, or unavailable).
 *
 * Demangled: `CTSGun::SelectWeapon(?)` — param type unknown, compared
 * as a 32-bit int in the disassembly. Treat as a `tsweapon_t` enum
 * by ordinal.
 */
export function SelectWeapon(this: any, weapon: number): boolean {
  // Same-weapon guard — [this + 0xc8] holds the active weapon slot.
  if (this.m_currentWeapon === weapon) {
    return false;
  }

  // Range guard — `weapon > 0x25` (37) is rejected.
  // TODO(asm-ambiguous): confirm 0x25 == TS_LAST_WEAPON or similar.
  if (weapon > 0x25) {
    return false;
  }

  // Two availability flags must both be non-zero for a normal swap:
  //   * per-entity flag at  [this + 0x114 + weapon * 0x38]   (byte)
  //   * global registry at [GOT + 0x7d30 + weapon * 0x3DC] (byte)
  // The0x38 / 0x3DC strides are struct sizes, not 1-byte element
  // arrays — only byte-offset-0 of each struct is being read.
  // TODO(asm-ambiguous): confirm field/global names against CTSGun
  //   layout and the mod's weapon registry.
  const perEntitySlot = this.m_WeaponData[weapon] !== 0;
  const globalSlot = g_WeaponRegistry[weapon] !== 0;

  // Selection is permitted when both flags are set, OR as a
  // special-case fallthrough when weapon === 0 (the bare-hands slot
  // is always selectable regardless of the flags).
  const canSelect = (perEntitySlot && globalSlot) || weapon === 0;
  if (!canSelect) {
    return false;
  }

  // Swap: holster what we're currently holding, then record the new
  // active slot. The disassembly pads the stack with `sub esp, 0xc`
  // before pushing `this` — a 32-bit MSVC stack-alignment quirk;
  // semantically a normal thiscall.
  this.HolsterWeapon();
  this.m_currentWeapon = weapon;
  return true;
}

// Globals (defined elsewhere in the mod) — stubbed so this file
// compiles in isolation. Replace with the real type when D.4 wires
// up the weapon registry.
declare const g_WeaponRegistry: any;
```

Net: the decompilation is logically faithful — branch-for-branch
match with the disassembly, including the easy-to-miss bare-hands
fallthrough at `7100a–71011` and the convoluted`weapon*0xF7*4 + 0x7d30` stride math. The only real defect is the
missing isolation stubs (checklist 8). Everything else is TODO-grade
inference that the disassembly genuinely can't settle.
```
