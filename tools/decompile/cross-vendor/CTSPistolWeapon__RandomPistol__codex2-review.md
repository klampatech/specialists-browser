I have enough context from HANDOFF.md to perform the review. The cross-vendor review template is intended for HLSDK engine↔mod interface functions, but the function under review (`CTSPistolWeapon::RandomPistol`) is a gameplay method — checklist items 2/3/4 don't strictly apply, and I'll note that where relevant. The chunk file does not exist on disk yet, so the review is based purely on the inline material provided.

---

```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `RandomPistol(this: CTSPistolWeapon): number` matches
   the demangled `CTSPistolWeapon::RandomPistol()` exactly (no args,
   returns int). The `this: CTSPistolWeapon` first-parameter is a
   TS idiom for class methods on free functions; fine.
2. Version check — N/A — This is a gameplay method, not one of the
   engine↔mod entry points (`GetEntityAPI*` / `GetNewDLLFunctions`).
   The disassembly confirms no version check exists. Checklist item
   doesn't apply.
3. interfaceVersion assignment-back — N/A — Same reason.
4. Success path (struct copy) — N/A — No struct copy in this
   function. The "success path" here is the jump-table dispatch +
   per-case `mov eax, imm; jmp epilogue`, captured correctly.
5. No fabricated paths — ⚠️ — Six visible case-target blocks in
   the chunk (returning 0x8, 0x9, 0xe, 0x15, 0x16, 0x1c) plus
   default returning 1. The disassembly's `cmp eax, 0x6; ja default`
   allows values 0..6 (seven cases), but only six case blocks are
   visible — case 6 lands in the default branch in the TS. This
   matches either (a) an original source with `case 6: return 1;`
   or (b) GCC's range-comparison optimization that emits `cmp (max+1)`
   with the table's last entry pointing at default. The inline
   comment acknowledges this. No invented control flow otherwise.
6. No TODO body — ✅ — The function body is real logic
   (`RANDOM_LONG(1, 7)` + a 6-arm switch returning distinct IDs).
   The two large inline TODO comments are explanations of the
   derivation, not stubs for missing code. Acceptable, though the
   comments are heavier than they need to be.
7. Field names — ⚠️ — No class fields are accessed (`this` is
   unused — confirmed by the disassembly, which never dereferences
   `ecx`/`esi`). `RANDOM_LONG` is an abstraction over
   `g_engfuncs.pfnRANDOM_LONG` — the disassembly shows the engine   function-table indirection explicitly (`[ebx+0x1aa8]` →
   `g_engfuncs`, then `[eax+0x168]` → `pfnRANDOM_LONG`). The HLSDK
   review criteria say field names should map to known C fields
   (e.g., `g_engfuncs.pfnPrecacheModel`). The TS loses that
   indirection. The body comment justifies the abstraction
   ("RANDOM_LONG is fetched from the engine function table at
   [ebx+0x1aa8]+0x168"), so it's not a hard fail — but a stricter
   rewrite would reference `g_engfuncs.pfnRANDOM_LONG` directly.
8. Compiles in isolation — ❌ — `RANDOM_LONG` and `CTSPistolWeapon`
   are both undefined. The function body uses `RANDOM_LONG(1, 7)`
   and the signature references `CTSPistolWeapon` without either
   being declared anywhere. Needs stubs (or `any`) to compile.

Issues to fix:
- **Standalone compilation (must-fix for D.3 isolation):** declare
  `RANDOM_LONG` (or reference `g_engfuncs.pfnRANDOM_LONG` and
  declare `g_engfuncs` as `any`) and declare `CTSPistolWeapon` as
  a class/interface. The current output references symbols that
  exist nowhere in the file.
- **Engine-table fidelity (nice-to-have):** replace the bare
  `RANDOM_LONG(1, 7)` with `g_engfuncs.pfnRANDOM_LONG(1, 7)`. The
  disassembly explicitly shows the two-step indirection; abstracting
  it away loses information. The body comment can stay as a
  citation but the call should mirror the binary.
- **Case 6 mapping (acceptable as-is):** the inline TODO comment
  on case 6 is honest. If you want to be defensive, you can either
  (a) keep the comment and trust the default branch, (b) add an
  explicit `case 6: return 1; // same as default per jump table`
  to make the assumption structural, or (c) extract the jump
  table from `tools/decompile/chunks/RandomPistol__15CTSPistolWeapon.chunk.md`
  once it exists and read the actual table[6] value. Option (c)
  is the only way to be sure.
- **Comment weight (cosmetic):** the two long inline TODO comments
  duplicate material that's already in the doc-comment. Consolidate
  into the doc-comment and let the function body be the body.

Suggested rewrite:

```typescript
/**
 * CTSPistolWeapon::RandomPistol — pick a random pistol type for
 * this weapon.
 *
 * Rolls `g_engfuncs.pfnRANDOM_LONG(1, 7)` and dispatches via a
 * jump-table switch on `(rolled - 1)` to return one of the pistol
 * type IDs below.
 *
 * Disassembly (146 B at 0xb9ba4):
 *   - PIC base0x166410 via `call +0x9; pop ebx; add ebx, 0xac263`
 *   - Load `[ebx+0x1aa8]` → g_engfuncs (engine function table)
 *   - Call `[eax+0x168]` → g_engfuncs.pfnRANDOM_LONG(1, 7)
 *   - `sub eax, 0x1` → switch on (rolled - 1)
 *   - `cmp eax, 0x6; ja default` → values 0..6 dispatched,
 *     >6 → default
 *   - Jump table at `[ebx - 0xac230]` = 0xBA1E0 (outside chunk).
 *   - Case targets visible in-chunk return 0x8, 0x9, 0xe, 0x15,
 *     0x16, 0x1c; default returns 1. Case 6 likely duplicates *     default per the jump table.
 *
 * `this` is unused — this is a static-like RNG dispatch helper
 * (no `this` dereferences in the disassembly).
 *
 * @returns Pistol type ID consumed by the engine's spawn code.
 */

// Stubs so this file compiles in isolation. In D.5 these will be
// wired to the real engine bindings from `src/mod/interface.ts`.
declare const g_engfuncs: any;            // enginefuncs_t, see D.3
declare class CTSPistolWeapon {}          // gameplay entity, see D.4

export function RandomPistol(this: CTSPistolWeapon): number {
  const rolled = g_engfuncs.pfnRANDOM_LONG(1, 7);
  switch (rolled - 1) {
    case 0: return 0x8;
    case 1: return 0x9;
    case 2: return 0xe;
    case 3: return 0x15;
    case 4: return 0x16;
    case 5: return 0x1c;
    default: return 1;  // case 6 + out-of-range, see jump table
  }
}
```

The rewrite does three things differently from the input:
- Replaces `RANDOM_LONG(...)` with `g_engfuncs.pfnRANDOM_LONG(...)`
  to mirror the two-step indirection the disassembly shows.
- Adds `declare const g_engfuncs: any` and `declare class
  CTSPistolWeapon {}` stubs so the function compiles in isolation
  without external type references.
- Consolidates the two inline TODO comments into the doc-comment
  block, leaving the body clean.

The switch logic, default behavior, and return type are unchanged
from the input — those parts are correct.
```

---

No file modifications were made — this is a review of inline material, not a commit. HANDOFF.md and SPEC.md don't need updates for a pure review pass. If you want this rewrite persisted, the next move is to save it as `tools/decompile/output/RandomPistol__15CTSPistolWeapon.ts` and run the standard chunk → decompile → review → commit cycle for this symbol.
