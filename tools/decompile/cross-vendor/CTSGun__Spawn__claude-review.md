```
VERDICT: PASS-WITH-NOTES

Note: this is a D.4 gameplay method (CTSGun::Spawn), not one of the
4 D.3 interface entry points. The HLSDK reference checklist items 2
(version check), 3 (*interfaceVersion assignment-back), and 4 (struct
copy success path) do not apply here. I substituted the relevant
gameplay-method equivalents (signature, control flow, side effects,
data flow).

Checklist:
1. Signature — ✅ — `Spawn(this: any /* TODO: CTSGun */): void`
   matches the demangled `Spawn__6CTSGun`. No args beyond `this`, void
   return — both match the disassembly (one stack arg consumed at
   [esp+0x10], no return value pushed before `ret`).
2. Version check pattern — ⚠️ N/A — not an interface function.
3. interfaceVersion assignment — ⚠️ N/A — not an interface function.
4. Success path — ⚠️ N/A — not an interface function. (Substituted:
   the in-line MAKE_STRING string-offset computation is preserved;
   the vtable dispatch and engine-call paths are present. See issue
   #2 below for a structural concern.)
5. No fabricated paths — ⚠️ — main control flow is correct (Reset →
   classname → Precache → SetModel → six field writes → FallInit).
   One bug: the classname assignment uses `ALLOC_STRING` where the
   disassembly emits the in-line MAKE_STRING pattern (pointer
   subtraction against gpGlobals->pStringBase). See issue #1.
6. No TODO-only body — ✅ — body is real code. TODOs flag
   genuine ambiguity (string-base offset in gpGlobals, vtable slot
   semantics for the Precache call, speculative field-name guesses).
7. Field names — ⚠️ — raw offsets (`this["0x88"]`, `this["0xb4"]`)
   are acceptable per the D.4 convention. However several speculative
   semantic-name comments are wrong (see issue #3). The
   `[esi+0x60]` interpretation as the vtable also needs binary
   verification (issue #2).
8. Compiles in isolation — ✅ — every external symbol
   (`g_engfuncs`, `ALLOC_STRING`/`MAKE_STRING`, `this.Reset`,
   `this.Precache`, `this.FallInit`) is a stub-or-defined-elsewhere
   helper. The `declare const g_engfuncs = ...` and `declare
   function ALLOC_STRING(str: string): number` lines at the bottom
   cover all references. No imports needed; `any`-compatible.

Issues to fix:

1. **`ALLOC_STRING` is the wrong macro for a static string literal.**
   The disassembly at 7055c–70570 performs:

   ```
   mov    eax, DWORD PTR [ebx+0x1600]  ; eax = [GOT+0x1600]
   mov    edx, DWORD PTR [eax]          ; edx = gpGlobals
   lea    eax, [ebx-0x6dda6]            ; eax = addr("weapon_tsgun")
   sub    eax, DWORD PTR [edx+0x98]     ; eax -= gpGlobals->pStringBase
   mov    DWORD PTR [ecx], eax          ; pev->classname = string_t(eax)
   ```

   This is the in-line `MAKE_STRING` pattern from HLSDK:

   ```c
   #define MAKE_STRING(s) ((char*)(s) - gpGlobals->pStringBase)
   ```

   The compiler emits the pointer subtraction directly (no call). It
   is *not* a runtime call to `ALLOC_STRING` — that function
   registers a string in the engine's string table and returns its
   offset, and is used for dynamically-built strings (e.g. via
   `STRING(MAKE_STRING("..."))` after `pfnAllocString`). For a
   static literal like "weapon_tsgun", the compiler uses MAKE_STRING.

   Codex wrote `ALLOC_STRING("weapon_tsgun")`. Fix:
   `MAKE_STRING("weapon_tsgun")` (with the matching stub at the
   bottom of the file).

   Side note: the TODO claim "stock HLSDK pStringBase there is at
   +0x34" is incorrect. Stock HLSDK's globalvars_t puts pStringBase
   near offset 0x80–0x88 (after trace_message_*). The disassembly
   reading +0x98 here suggests either a different field or extra
   fields in TS's gpGlobals. Worth flagging, but separate from the
   ALLOC_STRING bug.

2. **`[esi+0x60]` is unverified as the vtable pointer.** The codex
   asserts:
   > "GetClassPtr writes __vt_6CTSGun into [this+0x60]"

   This is a strong claim that contradicts the standard C++ ABI
   (vtable at offset 0 of the object). It is also inconsistent with
   the disassembly itself: the disassembly consistently uses `[esi]`
   as `pev` (writing through `[esi][0]` = `pev->classname` at 70570,
   and reading `[esi][0x208]` for the SetModel arg at 7058d). If
   `[esi]` is pev, then there is no vtable at offset 0 in this
   binary's layout.

   Two possibilities:

   (a) The TS binary genuinely places the vtable at offset 0x60
       instead of 0 (compiler flag / non-standard ABI). The codex's
       claim is then correct, but only by accident — standard C++
       Itanium ABI would put it at 0.

   (b) `[esi+0x60]` is NOT a vtable. It is some other pointer, and
       `[eax+0x28]` reads a function pointer at offset 0x28 from
       that struct. Candidates include `m_pPlayer` (CBasePlayer*) or
       a TS-specific dispatch table.

   **To verify:** read 4 bytes at `0x00103248` (`__vt_6CTSGun +
   0x28`) in the .so and confirm it equals `0x00070660`
   (`Precache__6CTSGun`). If it does, the codex is right (and this
   binary uses non-standard vtable layout). If it doesn't, the
   codex's interpretation is wrong.

   Until verified, mark this as a TODO that requires binary
   inspection, not a confident claim.

3. **Speculative field-name comments are wrong or unfounded.**
   Several field-label comments go beyond what the disassembly can
   justify and overreach:

   - `0xc8` labeled as `m_iWeaponIndex / m_iActiveMode` with the
     claim "In Deploy() it's used as an index into the per-state
     struct array at [this+0x114]". The Reset() function also zeros
     `0xc8/0xcc/0xd0`, suggesting these are *transient* state that
     gets re-initialized each spawn, NOT a permanent weapon index.
     The "index into per-state struct array" claim is unverified —
     there is no `[0xc8 * sizeof(...) + 0x114]` indexing pattern
     visible in this function. Replace with: "transient state; also
     zeroed by Reset() — likely counter/timer/active-mode flag".

   - `0xb4` and `0xc4` labeled as `m_bSomeFlag` with the byte/dword
     ambiguity noted but not resolved. These store `1` — plausible
     flags. The naming is fine as `TODO` placeholders; don't guess.

   - `0x88` labeled as `m_iClip / ammo-in-clip default`. Value `0x10`
     = 16, which is a reasonable clip size. But m_iClip is at offset
     0x88 only if the CTSGun layout matches standard HLSDK's
     CBasePlayerWeapon exactly, which is unverified. Don't claim
     it.

   - `0x9e4` and `0x9e8` labeled as `m_iSomeCounter`. Reasonable
     placeholder, but the layout suggests these may be near a
     per-weapon configuration struct (after the 0x114-0x963 zero
     region, they're 0x80 bytes apart — possibly a `[2]` array).

4. **`this.Precache()` should replace the raw vtable indexing.**
   The conversion guidance says "produce clean, idiomatic
   TypeScript that captures what the function does — don't do
   1:1 line-by-line translation". The codex writes:

   ```typescript
   const __vtable = this[0x60] as { [k: number]: (self: any) => void };
   __vtable[0x28 / 4](this);
   ```

   This mirrors the assembly literally but obscures the intent. If
   the binary's vtable is genuinely at offset 0x60 (issue #2),
   that's a D.5 integration concern, not a D.4 decompile concern.
   In D.4 land, prefer `this.Precache()` and add a TODO noting
   that the binary's vtable location is non-standard and will need
   to be reflected when the CTSGun class is reconstructed.

5. **Stylistic: TODO prefix convention.** Several TODOs use plain
   `// TODO:` instead of the project's `// TODO(asm-ambiguous):`
   prefix (see D.4.1 review notes in HANDOFF.md). Grepping
   "TODO(asm-ambiguous)" should find every field-name placeholder
   in the decompiled output; plain `TODO` won't. Convert all
   field-name TODOs to the convention.

6. **Mixing semantic and raw-offset access.** The codex uses
   `this.pev.classname` (typed semantic access) for classname but
   `this["0x88"]` (raw offset) for the field writes. Either
   consistent style is fine; mixing them creates an ambiguous boundary.
   Suggest raw-offset (`this["0x00"].classname = ...`) for D.4 output
   consistency, with `// TODO(asm-ambiguous): pev at offset 0` to
   flag the vtable-vs-pev question (issue #2).

Suggested rewrite (full TS function):
```typescript
/**
 * CTSGun::Spawn — initialize a freshly-spawned CTSGun weapon entity.
 *
 * Pipeline (in order):
 *   1. Reset() — wipe transient state from any prior life.
 *   2. pev->classname = MAKE_STRING("weapon_tsgun") — static-literal
 *      string_t via in-line pointer subtraction against
 *      gpGlobals->pStringBase.
 *   3. this->Precache() — virtual call (vtable[10] in this binary's
 *      layout; vtable pointer is at this+0x60, NOT at offset 0 as
 *      in standard C++ ABI — verify against __vt_6CTSGun).
 *   4. g_engfuncs.pfnSetModel(pev, "models/w_glock18.mdl") — engine
 *      call via g_engfuncs[2].
 *   5. Initialize a handful of mode/state fields on the instance
 *      (most get re-touched by Deploy(); the writes here set sane
 *      defaults for weapons that exist on the ground before any
 *      deploy ever happens).
 *   6. CBasePlayerItem::FallInit() — start the standard "this item
 *      is falling to the ground" animation/state.
 *
 * Note on the model: every CTSGun-derived weapon initially gets the
 * Glock-18 world model assigned here. Subclasses that need a
 * different model override Spawn() and re-call SetModel.
 *
 * Generated from asm at 0x0007053c (164 B).
 */
export function Spawn(this: any /* TODO: CTSGun */): void {
  // PIC / GOT base established by the prologue.
  //   [ebx+0x1600] → gpGlobals (double-indirect: [GOT] → &gpGlobals → struct)
  //   [ebx+0x1aa8] → g_engfuncs (engine functions table)

  // String-table offsets resolved against .rodata (GOT-relative):
  //   [ebx-0x6dda6] = vaddr 0xF806A = "weapon_tsgun"        (classname)
  //   [ebx-0x6e287] = vaddr 0xF7B89 = "models/w_glock18.mdl" (model)

  // 1. Wipe transient state. Reset() zeros the bulk of the CTSGun
  //    instance (see CTSGun__Reset.ts for the exact ranges).
  this.Reset();

  // 2. Classname on the server entity. In-line MAKE_STRING: subtract
  //    gpGlobals->pStringBase from the static string literal's
  //    address to produce a string_t offset. The disassembly does
  //    NOT call ALLOC_STRING (which would be a runtime string-table
  //    registration); this is a compile-time-ish offset computation
  //    the compiler emitted inline.
  // TODO(asm-ambiguous): gpGlobals->pStringBase is at offset 0x98
  //   here, vs offset ~0x80 in stock HLSDK. Either TS's gpGlobals
  //   has extra fields, or this is a different field. Confirm against
  //   the TS engine header (the mod's `mp.dll` headers if shipped,
  //   else derive from the actual binary's struct layout).
  this["0x00"].classname = MAKE_STRING("weapon_tsgun");

  // 3. Precache() — virtual dispatch via the most-derived vtable.
  //    Disassembly: `mov eax, [esi+0x60]; call [eax+0x28]` with
  //    `this` pushed as the arg. vtable[10] in this binary's layout
  //    is Precache__6CTSGun.
  // TODO(asm-ambiguous): the vtable is at this+0x60 in this binary
  //   (NOT at offset 0 as in standard C++ ABI). Verify by reading
  //   __vt_6CTSGun+0x28 = 0x00103248 in the .so; the dword there
  //   should be 0x00070660 (Precache__6CTSGun). If not, [esi+0x60]
  //   is something other than a vtable (m_pPlayer or a TS dispatch
  //   table), and the call target needs re-deriving.
  this.Precache();

  // 4. Set the world model. g_engfuncs.pfnSetModel is g_engfuncs[2]
  //    (the 3rd entry; offset 0x8 = 0x8/4 = index 2). The arg pair
  //    (in push order: pev+0x208 first, model string second) maps
  //    to the cdecl right-to-left convention pfnSetModel(pev, szModel).
  //    The +0x208 deref reads through pev to whatever the engine
  //    uses as the internal edict ref for this entity (commonly
  //    pev->pvPrivateData or pev->pContainingEntity depending on
  //    engine version).
  g_engfuncs.pfnSetModel(this["0x00"], "models/w_glock18.mdl");

  // 5. Initialize mode/state fields on the instance. Most get
  //    re-touched by Deploy(); these writes set sane defaults so
  //    a weapon sitting on the ground (pre-deploy) reports sensible
  //    values.
  // TODO(asm-ambiguous): field names below are speculative — semantic
  //   names come from class reconstruction in D.4.
  this["0x88"]  = 0x10;  // transient state — possibly clip size (16 is a common default)
  this["0xb4"]  = 1;     // flag (dword)
  this["0xc4"]  = 1;     // flag (dword)
  this["0xc8"]  = 0;     // transient state — also zeroed by Reset()
                          //   (NOT a permanent weapon index; that
                          //   would survive Reset())
  this["0x9e4"] = 0;     // counter/state (near end of object)
  this["0x9e8"] = 0;     // counter/state (near end of object)

  // 6. Hand off to the standard "this thing is falling to the ground"
  //    initializer inherited from CBasePlayerItem. FallInit sets
  //    pev->movetype = 6 (MOVETYPE_TOSS), pev->solid = 2 (SOLID_BBOX),
  //    snaps origin, calls SetSize(pev, mins=0, maxs=0), sets render
  //    color, and schedules pev->nextthink = gpGlobals.time + delay.
  this.FallInit();
}

// Stubs — replace with actual definitions / imports from the engine
// bindings module and the reconstructed CTSGun class.
declare const g_engfuncs: {
  pfnSetModel: (pev: any, model: string) => void;
  // ...other engine funcs as needed.
};
declare function MAKE_STRING(str: string): number;
```

Summary: structurally faithful, with one clear bug
(`ALLOC_STRING` → `MAKE_STRING`) and one unverifiable structural
claim (`[esi+0x60]` as the vtable pointer, contradicting standard
C++ ABI). The rest are stylistic / convention alignments. The
classname and engine dispatch are correct. The field writes
preserve the original order and values. FallInit dispatch is
correct.

Recommended next step: verify `[esi+0x60]` by reading 4 bytes at
`0x00103248` in `ts/dlls/ts_i386.so`. If it equals
`0x00070660`, the codex's vtable interpretation is right (and
we need to note in D.5 that this binary uses non-standard vtable
placement, which affects every virtual call in the mod). If it
doesn't, the codex is wrong and the call target needs to be
re-derived from the binary.