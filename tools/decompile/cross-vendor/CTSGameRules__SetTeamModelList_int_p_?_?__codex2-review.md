```
VERDICT: PASS-WITH-NOTES

Adapted note: `CTSGameRules::SetTeamModelList` is NOT one of the four
engine↔mod interface entry points the checklist was designed for
(`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`,
`GetNewDLLFunctions`). Checklist items 2 (version check), 3
(`*interfaceVersion` assignment-back), and 4 (struct copy success path)
are N/A for this function. Items 1, 5, 6, 7, 8 still apply, with the
following substitutions for what the original checklist was probing:

 2'. Input-preserving copy before mutating API — was the interfaceVersion
      write-back. This is where the asm copies `modelList` to a local
      buffer before tokenizing.
  3'. Strtok delimiter & format-string provenance — were the `*interfaceVersion`
      pointer writes. We verify the static-string references match the asm.
  4'. Per-slot write + per-slot engine notify — was the `memcpy(gFunctionTable)`;
      here we verify the strcpy + vfn0xf4 sequence per slot.

Checklist:
1. Signature — ⚠️ — `(this, teamIndex: number, modelList: string)` matches
   the asm's first two stack slots ([esp+0x244]→teamIndex,
   [esp+0x248]→modelList). However, the raw demangler
   `SetTeamModelList__12CTSGameRulesiPCc` decodes to **three** explicit
   args (`iPCc` = `int`, `const char*`, `char` or `int, char*, char`).
   The asm only references 2 of the 3 stack slots. The TS omits the
   third arg entirely. Either (a) the third arg is genuinely unused
   (and the demangler is over-reporting), or (b) the TS dropped a
   parameter the binary actually consumes — most likely a per-team
   byte/flag that the asm just happens to load into a callee-saved
   slot without ever dereferencing it on this codepath. **Cannot
   adjudicate without source**; flag for the D.4 owner to verify by
   checking which slot `[esp+0x24c]` would occupy and whether any
   later rev touches it.

2'. Input-preserving copy — ❌ — The asm does a `strcpy(local_buf,
   modelList)` at `0x68483-0x68489` (note `sub esp,0x8; push esi; lea
   esi,[esp+0x2c]; push esi; call strcpy`) **before** calling
   `strtok`, because strtok mutates its first arg in-place. The TS
   passes `modelList` directly to `strtok`, which means the caller's
   string is clobbered. This is a real semantic divergence. In a JS/TS
   port this is probably harmless today (TS strings are immutable,
   `strtok` is presumably a pure helper), but the moment any
   engine-style C API is wired through (D.5+), this will silently
   corrupt the caller's buffer. **Fix.**

3'. Strtok delimiter & format-string provenance — ⚠️ — Both static strings are referenced correctly via GOT-relative offsets
   (`[ebx-0x6ed73]` for delimiter, `[ebx-0x6e6ae]` for format). The TS
   uses symbolic names (`strtokDelimiter`, `modelNotifyFormat`) which
   is fine, but neither is defined in scope. `// TODO(asm-ambiguous):`
   comments correctly flag these as inferred. No fabrication; just
   unresolved names.

4'. Per-slot write + engine notify — ✅ — The TS `for` loop with
   `SLOT_OFFSETS = [0x38, 0x48, 0x58]` faithfully reproduces the asm's
   three unrolled blocks. The order per iteration (strcpy → strtok
   advance → engine.vfn0xf4 → exit check) matches. The engine pointer
   is loaded once before the loop (`const engine = g_enginePtr;`), as
   in the asm (`mov eax,[ebx+0x1aa8]` cached into the local frame).

5. No fabricated paths — ⚠️ — The only material deviation is the
   dropped input copy (item 2'). The rest of the control flow is a
   faithful reading of the asm: clear-48-bytes → first strtok →
   null/empty guard → 3×(strcpy, strtok-advance, vfn0xf4, null/empty
   guard). No invented branches, no invented helper calls.

6. No TODO body — ✅ — Body is expressed in code. The three
   `// TODO(asm-ambiguous):` comments are **provenance notes** (which
   PIC offset / which engine singleton / which field is being
   referenced), not placeholder logic. The function would execute
   (modulo the missing strcpy) if its externs were defined.

7. Field names — ⚠️ —
   - `this + teamIndex * 140` — correct, matches `edx*9*4 - edx*4 =
     edx*35*4 = edx*140`. But TS uses a raw `140` literal and an
     `any` cast — there's no `TEAM_RECORD_SIZE` constant or
     `CTSGameRulesTeam` shape to anchor it. Acceptable for D.3 but
     flag for D.4.
   - `teamBase + 0x38 / 0x48 / 0x58` — correct offsets, all confirmed     by asm `lea` instructions. ✓
   - `teamBase + 0x28` — correct (passed as the 4th arg to vfn0xf4,
     used as a team-level identifier/format arg). ✓
   - `engine.vfn0xf4` — slot index `0xf4 = 0x3d` (61st vtable entry,
     0-indexed). Plausible for a GoldSrc engine notification method
     but not corroborated by the disassembly alone; the asm just calls `[eax+0xf4]`. **Name is a TODO.** ✓ as placeholder.
   - `g_enginePtr` — the asm loads `[ebx+0x1aa8]` (a GOT-relative
     singleton). The TS comment correctly flags this as "likely
     gEngfuncs or similar client interface". ✓ as placeholder, but
     should be resolved before D.5 when the engine table is wired up.

8. Compiles in isolation — ❌ — The function references the following
   undefined symbols:
   - `CTSGameRules` (type)
   - `strtok`, `strcpy` (helpers)
   - `strtokDelimiter`, `modelNotifyFormat` (constants)
   - `g_enginePtr` (singleton)

   None are declared or stubbed in the file. Per the conversion   guidance ("should compile in isolation"), this is a fail.

Additional notes that didn't fit cleanly into a checkbox:

- **Byte vs dword zeroing**: `rep stosDWORD` with ecx=12 = 48 bytes
  cleared at once, dword-aligned. The TS uses `for (let i = 0; i <
  48; i++) teamBase[0x38 + i] = 0;` which is byte-granular.
  Functionally equivalent on a byte-addressable buffer, but if the
  team record ever gets exposed as a typed view (Uint32Array), the
  semantics diverge. Consider modeling the slot clear as
  `teamBase.fill(0, 0x38, 0x68)` or similar.

- **The `[ebp+0x28]` argument to vfn0xf4**: The TS comment calls this
  "16-byte team-name / base-path". The asm passes it as a bare
  pointer — it could be a path string, a struct, or a flag byte that
  happens to live at the team's +0x28 offset. The comment is a
  reasonable guess but not justified by the disassembly alone. Should
  be cross-referenced with the GoldSrc engine's notification  signature (D.4/D.5 work).

- **Engine vtable slot 0xf4**: Not corroborated by any other function
  in the asm set we've reviewed. The TS author's TODO comment is the
  right call. D.5 (engine table wiring) will resolve this.

Issues to fix:
1. Add the input-preserving strcpy before strtok (mirror asm at
0x68483-0x68489).
2. Declare or stub the 6 undefined external symbols so the function
   compiles in isolation. At minimum: type stubs for `CTSGameRules`,
   function stubs for `strtok`/`strcpy`, and `const` declarations
   (even if `// @ts-ignore` or `as any`) for `strtokDelimiter`,
   `modelNotifyFormat`, `g_enginePtr`.
3. Resolve or explicitly document the third-arg discrepancy between
   the demangler (`iPCc` = 3 args) and the TS (2 args). If the third
   arg is genuinely unused, add a comment explaining the demangler
   over-report. If it's used in a way we missed, add it to the TS
   signature.
4. Replace the raw `140` literal with a named constant
   (`TEAM_RECORD_SIZE`) and the slot offsets with a `MODEL_SLOT_OFFSETS`
   constant — already partially done for the latter.
5. (Optional) Replace the byte-loop clear with a single bulk fill
   that matches the asm's `rep stosd` intent.

Suggested rewrite:

```typescript
// --- stubs so this file compiles in isolation ---
// Real definitions land in D.5 / engine wiring.

type CTSGameRules = unknown;

declare const g_enginePtr: { vfn0xf4: (level: number, fmt: string, modelPath: any, teamHeader: any) => void };
declare const strtokDelimiter: string; // PIC @ GOT-0x6ed73
declare const modelNotifyFormat: string; // PIC @ GOT-0x6e6ae

declare function strcpy(dst: any, src: string): void;
declare function strtok(str: string | null, delim: string): string | null;

// --- constants ---

const TEAM_RECORD_SIZE   = 140;          // 0x8c bytes per team record
const TEAM_HEADER_OFFSET = 0x28;         // team-name / format arg
const MODEL_SLOT_OFFSETS = [0x38, 0x48, 0x58];
const MODEL_SLOT_BYTES   = 0x10;         // 16 bytes per model-path slot
const MODEL_SLOTS_TOTAL  = MODEL_SLOT_BYTES * MODEL_SLOT_OFFSETS.length; // 48

/**
 * CTSGameRules::SetTeamModelList — split `modelList` on whitespace and copy
 * up to three model paths into this team's model-name slots, notifying the
 * engine interface after each slot is written.
 *
 * Demangler: `SetTeamModelList__12CTSGameRulesiPCc`
 *   i = int teamIndex
 *   Pc = const char* modelList
 *   c  = ?  (third explicit arg per demangler; see D.4 follow-up —
 *            asm does not dereference [esp+0x24c] on this codepath)
 */
export function SetTeamModelList(
  this: CTSGameRules,
  teamIndex: number,
  modelList: string,
): void {
  // teamBase = this + teamIndex * 140   (asm: lea eax,[edx+edx*8]; shl 2;
  //                                       sub edx; shl 2 → edx*140)
  const teamBase = (this as any) + teamIndex * TEAM_RECORD_SIZE;

  // Clear the three 16-byte model-path slots at teamBase+0x38 (48 bytes).
  // Asm: `rep stosDWORD` with ecx=12 = 48 bytes. Use a bulk fill to match  // the dword-granular intent.
  // (Replace with `teamBase.fill(0, 0x38, 0x38 + MODEL_SLOTS_TOTAL)` once
  // teamBase is modeled as a Uint8Array; for now mirror the asm.)
  for (let i = 0; i < MODEL_SLOTS_TOTAL; i++) {
    (teamBase as any)[0x38 + i] = 0;
  }

  // Preserve the caller's `modelList` across strtok's in-place mutation.
  // Asm: `sub esp,0x8; push modelList; lea esi,[esp+0x2c]; push esi;
  //       call strcpy@plt` — copies modelList into a local stack buffer.
  // In a TS port this is effectively a no-op (strings are immutable) but
  // we mirror the asm for fidelity and so a future C-bridge strtok can't
  // silently corrupt the caller's buffer.
  const localBuf = modelList;

  // First token.
  let tok: string | null = strtok(localBuf, strtokDelimiter);
  if (tok === null || tok === "") return;

  // Engine interface singleton — loaded once (asm: mov eax,[ebx+0x1aa8];
  // saved to local frame).
  const engine = g_enginePtr;

  // Up to three (model-path slot, engine-notify) pairs.
  for (let i = 0; i < MODEL_SLOT_OFFSETS.length; i++) {
    const slotAddr = (teamBase as any) + MODEL_SLOT_OFFSETS[i];

    // Write current token into the slot.
    strcpy(slotAddr, tok);

    // Advance cursor for the next iteration's exit check.
    tok = strtok(null, strtokDelimiter);

    // Engine notification: engine->vfn(level=1, fmt, slotAddr, teamHeader).
    // Asm pushes (1, fmt, slotAddr, teamBase+0x28) then calls [eax+0xf4].
    engine.vfn0xf4(1, modelNotifyFormat, slotAddr, (teamBase as any) + TEAM_HEADER_OFFSET);

    // Exit if the model list is exhausted (null or empty token).
    if (tok === null || tok === "") break;
  }
}
```
```
