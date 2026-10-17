```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — Matches the demangled symbol `IsCTB__12CTSGameRules`.
   Disassembly loads `this` from `[esp+0x10]` (cdecl, not thiscall —
   `this` is the first stack arg) and returns via `al` (a single byte
   truthy/falsy). TS expresses this as `IsCTB(this: CTSGameRules):
   boolean`, which is the idiomatic TS way to attach a typed `this`
   to a standalone function.

2. Version check pattern — ✅ — N/A (this isn't a `GetEntityAPI*`
   export). The analogous "gating check" — `cmp BYTE PTR [esi], 0x1`
   + `jne 67f57` (skip both the cache probe and the scan, fall
   straight through to the epilogue where `al=0` from the
   earlier `mov al, 0x0` is returned) — is correctly modeled as
   `if (this.field_0 !== 1) return false;`.

3. `*interfaceVersion` assignment-back — ✅ — N/A.

4. Success path (struct copy or equivalent) — ✅ — N/A. The function
   performs a one-shot lazy scan + cache, which is faithfully
   expressed as the `UTIL_FindEntityByClassname` call followed by
   the two field writes. The `setne` semantics
   (`test eax, eax` → store 1 if non-zero, 0 otherwise) translate
   cleanly to `found != null ? 1 : 0`.

5. No fabricated paths — ✅ — All three branches trace directly to
   the disassembly:
     • mode gate     → `67f1f-67f22` (cmp + jne)
     • cache hit     → `67f24-67f2b` (cmp + jne 67f51)
     • scan + cache  → `67f2d-67f4a` (sub esp, two pushes, call,
                       add esp, test, setne, mov0x1)
     • return load   → `67f51` (`al = [esi+0x5890]`)
   The fall-through from `67f4a` into `67f51` (so the scan path
   reuses the same return-load as the cache-hit path) is preserved
   by the TS collapsing both into a single trailing
   `return this.ctbCacheResult !== 0;`. ✅
   ⚠️ Minor: the classname literal `"ts_ctb_*"` is a placeholder.
   The disassembly resolves it via `lea eax, [ebx-0x6e70d]` to a
   rodata pointer (`0x167e10 - 0x6e70d = 0x0F9703`). This is a
   value-placeholder, not a fabricated control-flow path, and the
   TS comments it with a TODO. Acceptable for D.3; must be
   resolved before any runtime integration.

6. No TODO body — ✅ — The body is real logic. The TODOs are
   explanatory annotations (assembly provenance + classname
   pointer resolution), not stand-ins for missing code.

7. Field names — ⚠️ — `field_0`, `ctbCacheResult`, `ctbCacheValid`
   are inferred from offset + purpose. The real C++ names aren't
   recoverable from the disassembly alone — that's the D.4
   cross-reference pass. Names like `m_iGameMode`,
   `m_bCTBCached`, `m_bCTBCacheValid` (GoldSrc `CGameRules`
   conventions) are likely. Acceptable for D.3; flagged so the
   D.4 pass doesn't miss them.

8. Compiles in isolation — ✅ — Local `interface CTSGameRules` stub
   + `declare function UTIL_FindEntityByClassname` make this
   self-contained. No external type references.

Issues to fix (none blocking D.3; track in HANDOFF):
- **Resolve the classname literal** before any runtime integration.
  `"ts_ctb_*"` will silently miss every entity. The actual string
  lives in rodata at `GOT_base - 0x6e70d` (= `0x0F9703`). Pull the
  rodata for that address from the string table (or read it out of
  the binary with `objdump -s -j .rodata ts/dlls/ts_i386.so`).
- **Rename `field_0` once D.4 lands.** Suggest adding a HANDOFF
  note: "D.3 `IsCTB` uses placeholder names `field_0` /
  `ctbCacheResult` / `ctbCacheValid` — D.4 will rename to
  `m_iGameMode` / `m_bCTBCached` / `m_bCTBCacheValid` (TBD)."
- **Minor semantic delta on `setne`.** Disassembly stores1 for
  *any* non-zero EAX; TS stores 1 for `found != null`. In practice
  `UTIL_FindEntityByClassname` returns NULL or a valid pointer, so
  this is a non-issue — just noting for strict-equivalence
  purists.

Suggested rewrite (full TS function):
```typescript
/**
 * CTSGameRules::IsCTB — returns whether the level contains at least
 * one CTB-mode entity. Gated on the gameplay-mode byte at offset 0
 * being CTB (1); inside the CTB branch the answer is computed lazily
 * by scanning the entity list for the CTB classname (via
 * UTIL_FindEntityByClassname) and then cached on the rules object, so
 * later calls reuse the cached byte instead of re-scanning.
 *
 * @param this  The CTSGameRules rules entity instance (`this` in C++)
 * @returns     boolean — true if a CTB entity is present, false otherwise
 */

// Minimal stub so the export compiles in isolation. The full
// CTSGameRules interface is rebuilt in the D.4 task; field names
// will be updated then (likely `m_iGameMode`, `m_bCTBCached`,
// `m_bCTBCacheValid` based on GoldSrc CGameRules conventions).
interface CTSGameRules {
  /** mode discriminator byte at offset 0 (1 == CTB) */
  field_0: number;
  /** cached "exists" byte at offset 0x5890 (set after the first scan) */
  ctbCacheResult: number;
  /** cache-validity byte at offset 0x5891 (1 once the scan has run) */
  ctbCacheValid: number;
}

// External engine helper; real signature in the Half-Life SDK.
declare function UTIL_FindEntityByClassname(
  pStartEntity: any,
  classname: string
): any;

/**
 * PLACEHOLDER. The disassembly loads this from rodata via
 * `lea eax, [ebx-0x6e70d]` (GOT_base - 0x6e70d = 0x0F9703). Pull the
 * actual string from the .rodata section before this ships to a
 * real engine integration — the placeholder will silently miss
 * every entity at runtime.
 */
const TS_CTB_CLASSNAME_PLACEHOLDER = "ts_ctb_*";

export function IsCTB(this: CTSGameRules): boolean {
  // Gate: mode discriminator byte at offset 0 must equal CTB (1).
  // asm: `cmp BYTE PTR [esi], 0x1` + `jne 67f57`
  // (al is preloaded to 0 from `mov al, 0x0` at 67f1d, so the
  // fall-through returns false.)
  if (this.field_0 !== 1) {
    return false;
  }

  // Cache hit: validity byte at offset 0x5891 is set → reuse the
  // cached answer from offset 0x5890 instead of re-scanning.
  // asm: `cmp BYTE PTR [esi+0x5891], 0x0` + `jne 67f51`,
  // where `67f51` loads `al = [esi+0x5890]` and returns it.
  if (this.ctbCacheValid !== 0) {
    return this.ctbCacheResult !== 0;
  }

  // First evaluation: scan the entity list. cdecl arg order is
  // (pStartEntity, classname); disassembly pushes them right-to-left:
  //   sub esp, 0x8          ; stack alignment for the call
  //   lea eax, [ebx-0x6e70d]; classname pointer (rodata)
  //   push eax              ; arg2: classname
  //   push 0x0              ; arg1: NULL pStartEntity (start from head)
  //   call UTIL_FindEntityByClassname@plt
  //   add esp, 0x10         ; clean up alignment + 2 args
  // TODO(asm-ambiguous): resolve the classname literal from rodata
  // before this lands in a real engine integration.
  const found = UTIL_FindEntityByClassname(
    /* pStartEntity */ null,
    /* classname    */ TS_CTB_CLASSNAME_PLACEHOLDER
  );

  // `setne` semantics: store (found != 0) ? 1 : 0 into the cache byte.
  this.ctbCacheResult = found != null ? 1 : 0;
  // Mark the cache valid so subsequent calls skip the scan.
  this.ctbCacheValid = 1;
  return this.ctbCacheResult !== 0;
}
```

Bottom line: the decompilation is correct and faithful. The control-flow model,
argument order, return-value path, and cache semantics all match the
disassembly byte-for-byte (modulo the cdecl↔TS abstraction). The only
real-world hazard is the placeholder classname — track it in HANDOFF so
it doesn't sneak into production. Field-name placeholder is by design and
gets cleaned up in D.4.
