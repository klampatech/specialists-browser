```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `AddItem(this: CTSGun, item: number): number` matches
   the demangled `AddItem__6CTSGuni` → `CTSGun::AddItem(int)` and the
   demangled chunk's `(int)` arg list. Returns `1`/`0` like the assembly.

2. Version check — N/A — This is a class method, not one of the 4 HLSDK
   interface entry points. The HLSDK reference section is provided as
   context for the review-prompt shape; it doesn't apply here.

3. interfaceVersion assignment — N/A — Same reason.

4. Success path — ✅ — The two OR-write sites (`weaponList.ownedFlags |= item`,
   and the per-slot `itemFlags |= item` in both the akimbo and non-akimbo
   arms) faithfully reproduce `or DWORD PTR [esi+0xcc]+0x10, edi` and the
   indexed `or [esi+eax*8+0x124], edi` / `[eax+esi*1+0x124]`. The
   success-path "struct copy" analogue here is flag-bit composition; the
   TS expresses it with `|=`, which is the right idiom.

5. No fabricated paths — ✅ — I traced every conditional against the
   disassembly:
   - `[esi+0xcc] == 0` early-return → ✅ (`if (this.weaponList === 0) return 0;`)
   - `(item & active+0xe0) == 0` fail → ✅
   - `(item & active+0xe4) != 0` fail → ✅ (correctly inverts direction vs. #1)
   - `(item & weaponList+0x10) != 0` fail → ✅
   - Akimbo branch (no -1 guard, stride 56, OR into +0x124) → ✅
   - Non-akimbo branch (-1 guard on active+0xc8, byte check at +0x114, OR at +0x124) → ✅
   - `selectedWeapon` stash, clear, `SelectWeapon(this, prev, false)`,
     conditional vtable call, return 1 → ✅
   No invented branches.

6. No TODO body — ✅ — Body is real logic. The two TODO comments are
   localized ambiguity notes (akimboIndex guard absence, vtable+0x128
   identity), not placeholder bodies.

7. Field names — ⚠️ — Sensible inferences from offsets: `weaponList`
   (single ptr at +0xcc), `activeItem` (ptr at +0xd0), `requiredBits`/
   `forbiddenBits` (at +0xe0/+0xe4 inferred from the AND+test pattern),
   `ownedFlags` (at +0x10 inside weaponList), `weaponSlots` (stride-56
   array at +0x114/+0x124), `itemFlags`/`akimboFlag` (per-slot fields),
   `akimboIndex` (at active+0xcc) vs `weaponIndex` (at active+0xc8),
   `selectedWeapon` (at +0xc8), `vtable` (at +0x60).
   Caveats:
   - `[active+0xc8]` and `[esi+0xc8]` both happen to be offset 0xc8 but
     are on different objects (active vs this). The TS correctly names
     them differently, but this offset coincidence is worth a one-line
     comment so a future reader doesn't try to merge them.
   - The TS doesn't surface the 56-byte stride or the +0x114/+0x124
     base offsets anywhere except in the akimbo-branch TODO. For D.3
     this is fine; D.4 (full class reconstruction) will need them.

8. Compiles in isolation — ✅ — `declare type CTSGun = any`,
   `declare function IsWeaponAkimbo`, `declare function SelectWeapon`
   cover all external references. No top-level type errors.

Issues to fix (minor, all ⚠️-tier):
- The first TODO comment ("no -1 guard on active.akimboIndex here; element
  stride is 56 bytes") reads as if the absence of a guard is ambiguous.
  It isn't ambiguous — the assembly simply doesn't have one. Suggest  rewording to "Disassembly has no -1 guard here; slot stride is 56
  bytes." so a reader doesn't go looking for a missing check.
- The vtable call is written `this.vtable[0x128](this)`. On 32-bit ELF
  the byte offset 0x128 is into an array of 4-byte pointers, so it's
  method index 0x4A (74). The shorthand is conventional in decompiled
  TS but a `// vtable method index 0x4A (byte offset 0x128)` note would
  help D.4 when resolving the identity.
- One subtle correctness item: the first filter fails when
  `(item & requiredBits) === 0` — i.e., "no required bit is present,"
  not "all required bits are present." That's faithful to the assembly
  (`test eax,eax` / `je fail`), but the name `requiredBits` suggests a
  bitmask that must be fully present. If the field is actually a single
  "must have at least one of these" mask, the name is fine; if it's a
  "all bits required" mask, this is a real semantic divergence from
  what a GoldSrc reader would expect. The decompilation is correct per
  the disassembly; the field-name semantics is something only D.4 can
  settle.

The function is faithful to the disassembly, compiles standalone, and
expresses the algorithm in clean TS without inventing branches. The
notes above are documentation/clarity polish, not correctness fixes.
```
