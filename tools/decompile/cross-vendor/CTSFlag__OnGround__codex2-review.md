VERDICT: FAIL

Checklist:
1. Signature — ✅ — `OnGround(this: CTSFlag): void` matches the demangled
   symbol `OnGround__7CTSFlag` and the disassembly's cdecl-style
   first-arg-is-this + void return.
2. Version check — N/A — this is a `CTSFlag` gameplay method, not one of
   the 4 HLSDK interface entry points (`GiveFnptrsToDll`, `GetEntityAPI*`,
   `GetNewDLLFunctions`). No `INTERFACE_VERSION` /
   `NEW_DLL_FUNCTIONS_VERSION` constant applies.
3. `*interfaceVersion` assignment — N/A — same as #2.
4. Success path / function effects — ❌ — The structural effects
   (clearing `pev+0x198`, setting `pev+0x10c`, calling `UTIL_SetOrigin`
   and `UTIL_SetSize`, and writing the four `CTSFlag` fields) are all
   captured. **However, the value written at `this[0xc]` is wrong**:
   the disassembly produces `0x00460000`, the TS writes `0x00004600`.
   See Issues #1 for the trace.
5. No fabricated paths — ✅ — Every operation in the TS traces back to
   an instruction in the disassembly. No invented branches or calls.
   (`this.pev.origin` correctly corresponds to `pev + 0x8` = `&pev->origin`.)
6. No TODO body — ✅ — All logic is expressed as code. The
   `TODO(asm-ambiguous)` comments call out specific unknowns and don't
   replace unwritten logic.
7. Field names — ⚠️ — `pev`, `origin`, `UTIL_SetOrigin`, `UTIL_SetSize`,
   `Vector` map to known HLSDK names. The four `G_FLAG_REST_*` globals
   are invented names for unnamed `[ebx ± k]` GOT-relative loads — they
   should be marked TODO (or record the disassembly offsets directly)
   rather than presented as confident matches.
8. Compiles in isolation — ⚠️ — Depends on `Vector`, `CTSFlag`, `pev`,
   `UTIL_SetOrigin`, `UTIL_SetSize`, and the `G_FLAG_REST_*` constants
   not being defined here. Per the checklist, unknowns should be `any`.

Issues to fix:

1. **HARD BUG — byte-order at `this[0xc]`.** The disassembly writes
   `0x00460000`, not `0x00004600`. Trace from the asm:
   ```
   8e2b3: mov   ax,0x0          ; ax = 0  →  eax = 0xffff0000 (high 16 unchanged)
   8e2b7: and   eax,0xffff      ; eax = 0xffff0000 & 0x0000ffff = 0x00000000
   8e2bc: or    eax,0x460000    ; eax = 0x00000000 | 0x00460000 = 0x00460000
   8e2c7: mov   [esi+0xc],eax   ; this[0xc] = 0x00460000
   ```
   The TS literal `0x00004600` (bytes `00 00 46 00` little-endian) would
   store the wrong value. Fix: `this[0xc] = 0x00460000;`. The doc   comment also quotes `0x00004600` and must be updated.

2. **Doc comment minor inaccuracy.** The comment says
   "`0xffff0000 is NaN`". It's actually `-∞` (sign=1, exponent all 1s,
   mantissa=0). The conclusion ("not a normal float") is fine.

3. **Suspicious asm pattern at `this[0x10]`.** The asm emits
   `mov cx, 0x60; mov edx, ecx; mov [esi+0x10], edx` rather than the
   expected `mov edx, 0x60; mov [esi+0x10], edx`. After the prior
   `mov ecx, esp` (8e279) and the call to `UTIL_SetSize` (caller-saved
   clobber), ecx's high 16 bits at 8e2c1 are technically undefined per
   the i386 ABI. The TS assumes `this[0x10] = 0x60` — almost certainly
   the original C intent, but not strictly provable from the asm alone.
   Worth a `TODO(asm-ambiguous)` if you want to be defensive; harmless
   if you accept the most-likely intent.

4. **Numeric field access (`this[0xc]`, `this.pev[0x198]`) needs
   typing.** Neither `this` nor `pev` are typed as indexable in the
   TS source. Either cast both to `any` (or to `Record<number, any>` /
   `Int32Array`) or document why the access is type-safe. (The TS
   uses `[0x...]` literals which TS will accept as numeric indices   on `any`-typed values, but a stricter typing would error.)

5. **Invented global names.** `G_FLAG_REST_MIN_X` etc. are fabricated
   names for unnamed `[ebx-0x6dec8]`, `[ebx-0x6f068]`, `[ebx-0x6cb5c]`,
   `[ebx-0x6f408]`, `[ebx+0x1f90]`. Either keep them as opaque
   constants and add a `TODO(D.4: derive from strings-n5.txt)`, or
   remove the names and reference the offsets directly. Don't present
   them as confirmed matches.

Suggested rewrite:

```typescript
/**
 * CTSFlag::OnGround — Called when a thrown flag has landed and come
 * to rest on a surface. Clears the in-flight bit on pev, sets the
 * grounded bit, re-anchors the entity's origin to its current value
 * (forcing an engine resync), sets the resting bounding box from
 * globals, and resets CTSFlag-specific flight-state fields to their
 * resting values.
 *
 * @param this  The CTSFlag entity instance
 * @returns    void
 */
export function OnGround(this: any): void {
  // pev offsets 0x198 and 0x10c have no analogue in stock HL1
  // entvars.h — likely TS-specific per-entity flight / ground-state
  // flags. TODO(asm-ambiguous): resolve in D.4.
  const pev: any = this.pev;
  pev[0x198] = 0;            // clear in-flight
  pev[0x10c] = 1;            // mark grounded

  // Re-apply current origin (engine resync). `pev + 0x8` is `&pev->origin`.
  UTIL_SetOrigin(pev, pev.origin);

  // Resting bounding box: X reused for Y in both mins and maxs
  // (asm pattern at 0x8e261-0x8e28e loads one DWORD and writes it to
  // both x and y slots). Values come from unnamed GOT-relative globals
  // at `[ebx-0x6dec8]`, `[ebx-0x6f068]`, `[ebx-0x6cb5c]`, `[ebx-0x6f408]`.
  // TODO(asm-ambiguous): derive from strings-n5.txt / D.4.
  const minX = G_FLAG_REST_MIN_X;        // also serves as min.y
  const minZ = G_FLAG_REST_MIN_Z;
  const maxX = G_FLAG_REST_MAX_X;        // also serves as max.y
  const maxZ = G_FLAG_REST_MAX_Z;
  UTIL_SetSize(
    pev,
    new Vector(minX, minX, minZ),        // mins  (HLSDK: 2nd arg)
    new Vector(maxX, maxX, maxZ),        // maxs  (HLSDK: 3rd arg)
  );

  // CTSFlag-specific flight-state fields (offsets relative to `this`,
  // not pev). 0xffff0000 is -∞ as IEEE 754 single — almost certainly
  // NOT a float; likely packed flags / state. TODO(asm-ambiguous):
  // meanings of fields at 0xc, 0x10, 0x14, 0x18 are unknown. 0x18
  // is loaded from `[ebx+0x1f90]`.
  this[0xc]  = 0x00460000;              // asm produces 0x00460000 (NOT 0x00004600)
  this[0x10] = 0x60;                    // asm: mov cx,0x60; mov edx,ecx — assume edx high=0
  this[0x14] = 0xffff0000;
  this[0x18] = G_FLAG_REST_GROUND_VALUE;
}
```
