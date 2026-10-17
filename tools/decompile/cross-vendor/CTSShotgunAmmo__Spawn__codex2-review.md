```
VERDICT: PASS-WITH-NOTES```

## ⚠️ Major observation up front: the review framework doesn't fit this function

The HLSDK reference block in your prompt documents the **4 engine↔mod interface exports** (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`) — i.e., the symbols listed in `tools/decompile/analysis/nm-D-size.txt`. The function you actually want reviewed is `CTSShotgunAmmo::Spawn` at `0x000b9534` — a **TS mod gameplay entity method**, not an interface export. That means checklist items 1 (HLSDK signature match), 2 (version check), 3 (`*interfaceVersion` write-back), and 4 (success-path `memcpy`) are not applicable here — they describe a contract that lives on a different class of function.

The review below uses the framework where it still applies (items 5–8) and substitutes disassembly + demangled-symbol + GoldSrc-entity-convention checks where the HLSDK contract doesn't reach. If you want a strictly-framework-driven review, you'll need to point this prompt at one of the four real interface exports; otherwise treat items 1–4 as N/A.

---

## Checklist

**1. Signature — ✅ pass**
Demangled symbol is `CTSShotgunAmmo::Spawn()`. TS exports `Spawn(this: CTSShotgunAmmo): void`. Name matches; `this` is the only implicit parameter (matches the C++ instance-method ABI — `mov esi, [esp+0x10]` after the standard prologue confirms `this` is the first arg slot). Return type is `void`, consistent with no `ret` value-setting in the disassembly.

**2. Version check — N/A** (not an `GetEntityAPI*` / `GetNewDLLFunctions` function).

**3. `*interfaceVersion` assignment-back — N/A**.

**4. Success-path struct copy — N/A** (no table copy in this method).

**5. No fabricated code paths — ✅ pass**
Every TS statement maps cleanly to the disassembly:
- `CTSGroundAmmo.spawn(this)` ← `push esi` (this) → `call Spawn__13CTSGroundAmmo@plt`. No other args pushed; signature matches `void Spawn()`.
- `getAmmoInfo(3)` ← `mov DWORD PTR [esp], 0x3` → `call get_ammo_info__Fi@plt`. Arg is the literal `0x3`.
- `this.ammoCount = Math.floor(info.max / 2)` ← `mov eax, [eax+0xc]` (load field at offset 0xc) → `mov edx, eax; shr edx, 0x1f; add eax, edx; sar eax, 1` (the canonical GCC idiom for signed `/2` rounded toward zero) → `mov DWORD PTR [esi+0x74], eax` (store to field at offset 0x74).
- The PIC setup (`call b953e; pop ebx; add ebx, 0xac8d2`) is correctly elided — it only exists to enable `[ebx+offset]` global access in the binary, and this function reaches every global through helper calls (`Spawn__13CTSGroundAmmo@plt`, `get_ammo_info__Fi@plt`), so the GOT base never matters here. ✅

**6. No TODO body — ✅ pass**
Body is fully expressed in code; no `// TODO` placeholders.

**7. Field names — ⚠️ needs review (minor)**
- `CTSShotgunAmmo`, `CTSGroundAmmo`, `Spawn`, `getAmmoInfo` — all match demangled symbols or the natural TS camelCase of `get_ammo_info__Fi`. ✅
- `this.ammoCount` (offset 0x74) — inferred. Plausible for a GoldSrc ammo-pickup entity (CBasePlayerAmmo / equivalent in TS), but no comment in the snippet justifying the offset. Consider adding `// offset 0x74 — TS pickup ammo count (inferred)` so the next T3 thread doesn't have to redo the inference.
- `info.max` (offset 0xc on the ammo-info struct) — inferred. Could be more specific (`info.maxCarry`). Without the actual ammo-info struct definition in your decompile notes (the HLSDK reference only defines `NEW_DLL_FUNCTIONS`, not the ammo-info type), this is acceptable but would benefit from a `// TODO(asm-ambiguous):` marker.

**8. Compiles in isolation — ❌ strict / ⚠️ lenient**
Strict reading of "no external type references we don't define here": the snippet references `CTSShotgunAmmo` (type), `CTSGroundAmmo` (class with `static spawn`), and `getAmmoInfo` (function), none of which are declared locally. Per the rubric, unknowns should be `any` or stubbed.
Lenient reading: assumes a sibling module / project-wide `.d.ts` provides these — which is your normal project convention. Pick one and document it in `tools/decompile/chunks/<demangled>.chunk.md` so future T3 threads don't re-litigate.

---

## Issues to fix

None blocking for the function's logic. Two polish items, one process item:

1. **Sign semantics (polish).** `Math.floor(info.max / 2)` matches the disassembly's `eax / 2` truncation-toward-zero pattern **only for non-negative `info.max`**. Ammo carry is always positive, so this is correct in practice. If you want exact C integer semantics on the off chance the field is ever negative, use `Math.trunc(info.max / 2)` or `(info.max / 2) | 0`.
2. **Field-name confidence (polish).** `info.max` → `info.maxCarry` if you can confirm the ammo-info struct layout from `dlls/ammo.h` (or its TS equivalent in your future decompile). Otherwise mark it `// TODO(asm-ambiguous):` so the inference is tracked.
3. **Review framework (process).** The HLSDK reference block should be reserved for the 4 interface exports. For gameplay-entity methods like this one, the review template needs a sibling block — likely something against `dlls/cbase.cpp` + the disassembly — or reviewers will keep producing partially-applicable verdicts. Worth adding to `tools/decompile/chunks/` template.

---

## Suggested rewrite (minimal — only the polish + isolated-compilation fix)

```typescript
// External dependencies (declare locally if you want strict in-isolation compilation)
type CTSShotgunAmmo = { ammoCount: number };

declare class CTSGroundAmmo {
  static spawn(self: CTSShotgunAmmo): void;
}

declare function getAmmoInfo(ammoType: number): {
  // TODO(asm-ambiguous): confirm "maxCarry" vs "max" from TS ammo-info struct
  maxCarry: number;
};

/**
 * CTSShotgunAmmo::Spawn — Initializes a shotgun-shell ammo pickup entity.
 * Forwards to CTSGroundAmmo::Spawn for shared ground-ammo setup, then sets
 * this pickup's ammo count to half the shotgun-shell carry maximum.
 *
 * Disassembly: `tools/decompile/chunks/Spawn__14CTSShotgunAmmo.chunk.md`
 *   - Calls CTSGroundAmmo::Spawn via PLT.
 *   - Calls get_ammo_info(3), reads field at offset 0xc (max carry).
 *   - Stores (max/2) to `this` field at offset 0x74 (ammo count).
 */
export function Spawn(this: CTSShotgunAmmo): void {
  CTSGroundAmmo.spawn(this);
  const info = getAmmoInfo(3);
  this.ammoCount = Math.trunc(info.maxCarry / 2); // offset 0x74 = ammoCount
}
```

If your project convention is "sibling module provides types, don't redeclare," drop the three `declare` lines and the local `type` — just keep the doc comment + the `Math.trunc` swap.
