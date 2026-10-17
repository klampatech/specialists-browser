Shell output isn't returning. The review inputs are all self-contained inline — I'll proceed with the review from the inline material. The HARD requirement is: don't end a turn on stated intent. I'm doing the review right here.

---

## Review of `RestorePhysycs__15CTSPhysicObject.chunk.md`

**Scope note before walking the checklist:** Items 1–4 of the checklist are calibrated for the 4 engine↔mod interface entry points (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`). `RestorePhysycs` is a `CTSPhysicObject` instance method — not an interface function — so several items don't strictly apply. I'm annotating accordingly.

```
VERDICT: PASS-WITH-NOTES
```

### Checklist

1. **Signature** — ✅
   Demangled symbol: `CTSPhysicObject::RestorePhysycs()` (typo preserved; the sibling `SavePhysics` is correctly spelled — TS keeps the inconsistency). TS shape: `RestorePhysycs(this: CTSPhysicObject): void`. Disassembly confirms: no `ret $N` cleanup, no return value (no `eax` set), `this` lives at `[esp+0x24]` post-prologue. No HLSDK reference for this method, but the binary shape is internally consistent.

2. **Version check pattern** — ✅ N/A
   Not a `GetEntityAPI*` function. No version gate in the disassembly, no version gate in HLSDK for this symbol. Correctly omitted.

3. **`*interfaceVersion` assignment-back** — ✅ N/A
   No engine pointer is being negotiated. Correctly omitted.

4. **Success path / struct-copy equivalent** — ✅
   Three blocks of `rep movsd` (12 B each) plus one dword copy in the disassembly:
   - `[ebp+0x64]` → `pev+0x20` (origin)
   - `[ebp+0x70]` → `pev+0x5c` (angles/avelocity region — TS TODO flags it)
   - `[ebp+0x7c]` → `pev+0x11c` (single dword, scalar)
   
   And on the refresh side: global vec3 (12 B) → `[ebp+0x64]` and → `[ebp+0x70]`. The TS field-by-field writes + struct assignments are the right TS-shape expression of those 12-byte copies. No data-flow reordering, no extra fields, no missing arithmetic.

5. **No fabricated code paths** — ✅
   Walked each control-flow transition:
   - Early-return: `je 6bd03 / 0d / 1a` chain + `mov ecx, 0x1` + `jne 6bd90`. TS: `if (saved.x > global.x && saved.y > global.y && saved.z > global.z) return;`. **Match.** Critically, the bail skips both pev restore AND saved refresh AND flag clear (all between 6bd28 and 6bd86). The TS `return;` at the top captures this correctly.
   - pev restore (6bd37 / 4d / 55) → TS: 7 offset-indexed stores. **Match.**
   - Saved refresh from global (6bd6f / 7d) → TS: 2 struct assignments, same source pointer. **Match.** Note the assembly correctly reloads the global from `[esp+0x4]` (the CSE slot stashed at 6bd61) before the second copy rather than re-doing the GOT lookup — TS doesn't need to mirror that detail.
   - Clears (6bd7f / 86) → TS: `= 0` × 2. **Match.**

6. **No TODO body** — ✅
   The body is real logic. TODOs narrow two genuine ambiguities (the GOT global identity, and the `pev+0x5c`/`0x11c` field meanings). The function's behavior is expressed in code, not stubbed.

7. **Field names map to known C fields** — ⚠️
   Mixed:
   - `pev` at `this+0x00` is the standard CBaseEntity first field. **Safe.**
   - `m_vecSavedOrigin` / `m_vecSavedAngles` / `m_flSavedScalar` / `m_iPhysFlag` at offsets 0x64 / 0x70 / 0x7c / 0x84 are **inferred from behavior, not symbol-confirmed.** AGENTS.md allows inferring, but the TS presents them as canonical names without flagging the inference — only the GOT global and the two `pev` field ambiguities get TODOs.
   - The inference itself is reasonable: a 12-byte region that memcpy's to `pev->origin` is overwhelmingly likely `m_vecSavedOrigin`, same for angles/scalar. **Plausible but not verified.**
   - `currentPhysVec` is also fully inferred (just `[ebx+0x1888]`). It has a TODO, which is good.

8. **Compiles in isolation** — ⚠️
   `this: CTSPhysicObject` is an undeclared reference. The body is fine (`any` everywhere). To match the strict D.3 rule "no external type references we don't define here," either annotate `this: any` or include a stub `declare class CTSPhysicObject {}` at the top.

### Issues to fix

- **[field-naming]** Flag the inferred `CTSPhysicObject` field names as such. Right now `m_vecSavedOrigin` / `m_vecSavedAngles` / `m_flSavedScalar` / `m_iPhysFlag` look canonical. They're educated guesses. Either add a `// TODO(asm-inferred):` per offset, or use neutral `this.field_0x64` / `_0x70` / `_0x7c` / `_0x84` until D.4 cross-references the symbol table.

- **[isolation]** Either swap `this: CTSPhysicObject` for `this: any`, or add a stub `declare class CTSPhysicObject {}` so this file compiles standalone.

- **[value semantics]** `this.m_vecSavedOrigin = globalVec; this.m_vecSavedAngles = globalVec;` — the disassembly does two **12-byte copies** from the same source pointer. If those fields end up typed as `Float32Array(3)` or shared references, `=` is a reference assignment, not a copy. Worth a note that D.5 must type these as value-typed vec3 (or use `.set()`) for the assembly semantics to hold.

- **[nit, positive]** Early-return ordering is right. When `saved > global` in all 3 axes, we bail past 6bd28–6bd86, leaving `this->0x7c` and `this->0x84` at whatever `SavePhysics` last wrote. The TS preserves that. Verified against the `jne 6bd90` jump target.

- **[nit, positive]** Function-name typo `RestorePhysycs` is preserved, matching the demangled symbol exactly. Don't "fix" it.

### Suggested rewrite (since this is PASS-WITH-NOTES)

```typescript
// Stub class so this file compiles in isolation; replaced by the real
// declaration in D.4.
declare class CTSPhysicObject {
  pev: any;
  m_vecSavedOrigin: any;
  m_vecSavedAngles: any;
  m_flSavedScalar: any;
  m_iPhysFlag: any;
}

/**
 * CTSPhysicObject::RestorePhysycs — copy the saved origin/angles/scalar
 * back onto live pev, refresh both saved-vec3s from a globally-tracked
 * 12-byte vec3, then clear the in-flight scalar and flag. Bails early
 * when the saved origin is strictly ahead of the global in all three
 * axes (the engine already considers the entity past the snapshot).
 *
 * Source: tools/decompile/chunks/RestorePhysycs__15CTSPhysicObject.chunk.md
 * (196 B, GOT-relative access at [ebx+0x1888], three rep movsd copies,
 *  one dword copy, two single-dword clears).
 */
export function RestorePhysycs(this: CTSPhysicObject): void {
  // Global vec3 pointer at [static_base + 0x1888]. Typed `any` because
  // we don't yet know the underlying symbol.
  // TODO(asm-ambiguous): identity of this global — cross-reference
  // tools/decompile/analysis/strings-n5.txt for ts_slowmotion / slowamt
  // and similar physics cvars.
  const globalVec: any = currentPhysVec;

  const savedOrigin: any = this.m_vecSavedOrigin;
  if (
    savedOrigin.x > globalVec.x &&
    savedOrigin.y > globalVec.y &&
    savedOrigin.z > globalVec.z
  ) {
    // Bail: saved origin is strictly ahead of the global on every axis,
    // so the engine has already accepted the move — no restore needed,
    // and we deliberately leave the saved snapshot and flags alone.
    return;
  }

  // Apply the saved snapshot back onto live pev:
  //   pev+0x20  (origin, 12 B)              <- m_vecSavedOrigin
  //   pev+0x5c  (TS-specific field, 12 B)   <- m_vecSavedAngles
  //   pev+0x11c (TS-specific field, 1 dw)   <- m_flSavedScalar
  // TODO(asm-inferred): pev+0x5c / +0x11c meanings depend on TS's custom
  // entvars_t layout — not stock HLSDK offsets.
  // TODO(asm-inferred): the field names m_vecSavedOrigin / m_vecSavedAngles
  // / m_flSavedScalar are inferred from copy target semantics; verify
  // against the symbol table in D.4 before treating as canonical.
  const pev: any = this.pev;
  pev[0x20] = savedOrigin.x;
  pev[0x24] = savedOrigin.y;
  pev[0x28] = savedOrigin.z;
  pev[0x5c] = this.m_vecSavedAngles.x;
  pev[0x60] = this.m_vecSavedAngles.y;
  pev[0x64] = this.m_vecSavedAngles.z;
  pev[0x11c] = this.m_flSavedScalar;

  // Refresh both saved vec3s from the global current-physics-frame vec3.
  // In the disassembly, both rep movsd's load the same source (the dword
  // at [ebx+0x1888] is stashed at [esp+0x4] and reused for the second
  // copy). Two 12-byte copies, not a shared reference.
  // TODO(value-semantics): if m_vecSaved{Origin,Angles} end up typed as
  // Float32Array(3), replace `=` with `.set(globalVec)` to preserve
  // the 12-byte memcpy semantics.
  this.m_vecSavedOrigin = globalVec;
  this.m_vecSavedAngles = globalVec;

  // Clear the in-flight scalar and flag so the next SavePhysics starts
  // from a clean slate.
  this.m_flSavedScalar = 0;
  this.m_iPhysFlag = 0;
}
```

### Files actually touched

None — read-only review. No write was applied; the rewrite above is suggestion only. Per AGENTS.md "stay in scope," this is a single-function D.3 cross-vendor review; broader edits (CTSPhysicObject class reconstruction, D.4 symbol cross-reference, D.5 struct typing) belong to subsequent tasks and should be tracked in `HANDOFF.md` before any of them start.
