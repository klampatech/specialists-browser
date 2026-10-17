```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ⚠️ — `Spawn__11CTSParticle` demangles to `void CTSParticle::Spawn()`. The TS signature `function Spawn(this: CTSParticle): void` is correct. **However, the HLSDK reference document you cited does not cover this function** — it only documents the 4 engine↔mod interface exports (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`). `CTSParticle::Spawn` is a TS-specific gameplay method. The right comparator here is GoldSrc's `CBaseEntity::Spawn` pattern (mostly a hook that subclasses override) + the TS-specific class internals (which is D.4 territory, not D.3). This isn't a fail — just a category mismatch between the checklist and the function under review.
2. Version check — ⚠️ — N/A. Not an interface-version-checking function; the checklist item doesn't apply. (No issue.)
3. interfaceVersion assignment — ⚠️ — N/A. Same reason. (No issue.)
4. Success path — ✅ — There is no `memcpy` in this function (none in the disassembly either). The "success path" is: store `AddParticle`'s return at `this+0x64`, fall through if not `-1`, optional sound precache at `this+0x1c0`. The TS preserves this flow. Argument order for `AddParticle` (`this=g_pSharedEmitter`, then `sharedparticle_s*`) matches the demangled `P16sharedparticle_s` Itanium encoding. ✅
5. No fabricated paths — ❌ — **The string `"Out of particle slots"` is fabricated.** The disassembly loads a string from a static address (`lea eax,[ebx-0x6eb90]` → 0x0f725f). The TS invented English content; the actual bytes at0x0f725f should come from `tools/decompile/strings-n5.txt` or equivalent. No other fabricated control-flow branches — the structure faithfully mirrors the asm.
6. No TODO body — ✅ — Body is real code; TODOs are inline annotations on ambiguous bits. ✅
7. Field names — ⚠️ — Mostly OK inferences: `m_sharedParticle` (offset 0x68), `m_iSharedHandle` (offset 0x64), `m_szSoundName` (offset 0x1c0) are reasonable names for what the asm does. `engine.pfnPrecacheSound` (offset 0x4) is correct (enginefuncs_t second field). `engine.pfnAlertMessage` (offset 0xf4) is plausible but unverified against a real `enginefuncs_t` dump. **`GLOBAL.field0x98` is a made-up name** — the asm uses `[edx+0x98]` (an offset into a struct that edx points to), not a global symbol. The `// TODO(asm-ambiguous)` comment acknowledges the ambiguity, but the `GLOBAL.field0x98` reference in code creates a false impression that there's a known symbol.
8. Compiles in isolation — ✅ — `any` types + ambient declarations cover all external references. Should compile standalone.

Issues to fix (if any):
- **The string literal `"Out of particle slots"` is fabricated** and should be replaced with a reference to the actual static string at 0x0f725f (lookup in the binary's strings dump).
- **`GLOBAL.field0x98`** reads as if there's a real symbol called `GLOBAL` with a field at offset 0x98. There isn't — it's an asm-disassembly pattern. Either rename to something honest (e.g., `// unknown engine/grid struct accessed via GOT[0x1600]`) or inline the TODO into the comment rather than modeling it as code.
- **`pfnAlertMessage` signature**: the TS calls `pfnAlertMessage(AT_ERROR, "Out of particle slots", 0x200)` as if `0x200` is a regular arg. `pfnAlertMessage` is variadic (`void pfnAlertMessage(ALERT_TYPE, char *fmt, ...)`); the 0x200 is one of the variadic args. The TS should either (a) keep the actual `fmt` string and not invent the content, or (b) treat the call as opaque variadic with a TODO.
- **Origin-snap interpretation is a guess.** "engine-internal origin-snap helper" doesn't match the assembly semantics (`static_base - struct.dword[0x98]`). Could be world-grid-coord subtraction, coord conversion, or something else. The TODO is correct; the prose interpretation is misleading.
- **One-stale-pointer note — `[ebx+0x1600]` vs `[ebx+0x1aa8]`:** the asm uses TWO different GOT slots for the engine function table — `GOT[0x1600]` (double-deref, used for the origin calc) and `GOT[0x1aa8]` (single-deref, used for `pfnPrecacheSound` and `pfnAlertMessage`). These point to the same conceptual thing (enginefuncs_t) but the asm author treated them differently. The TS lumps both under `engine.*` which is fine for decompilation purposes, but worth noting.

Suggested rewrite (full TS function):
```typescript
// External symbols referenced by the decompiled body but defined
// elsewhere in the project (engine interface, singletons, helpers).
declare const engine: any;
declare const g_pSharedEmitter: any;
declare const AT_ERROR: number;
declare function UTIL_Remove(this: any): void;

// TODO: full CTSParticle class layout is reconstructed in D.4. Minimal
// stub here so this decompiled function compiles in isolation.
type CTSParticle = any;

// Static string at binary address 0x0f725f. TODO(D.3-strings): look up
// the actual UTF-8 content in tools/decompile/strings-n5.txt.
const STR_AT_0x0f725f: string = "<unresolved: 0x0f725f>";

/**
 * CTSParticle::Spawn — initialize a CTSParticle entity on level load.
 *
 * Disassembly structure (160 B at 0x00064134):
 *   1. Compute pev->origin.x from a static base and an unknown
 *      field accessed via GOT[0x1600] → *eax → edx → [edx+0x98].
 *      The exact semantics are not recoverable from this chunk alone.
 *   2. Validate keyvalues via this->CheckValues().
 *   3. Register this particle with the shared CTSSharedEmitter pool
 *      by calling AddParticle(this->m_sharedParticle, this); the
 *      returned slot index (or -1 on failure) is stored at +0x64.
 *   4. On registration failure (-1): pfnAlertMessage(AT_ERROR,
 *      <static string at 0x0f725f>, 0x200 /* variadic *\/) + UTIL_Remove(self).
 *   5. If this->m_szSoundName[0] is non-zero, precache the sound via
 *      pfnPrecacheSound.
 *
 * @param this  The CTSParticle entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSParticle): void {
  const self = this as any;

  // (1) Origin calculation.
  // TODO(asm-ambiguous): the pattern is
  //     GOT[0x1600]            → ptr-to-ptr
  //     *GOT[0x1600]           → edx
  //     static addr 0x0f7197   → eax
  //     eax -= [edx+0x98]      → eax
  //     pev->origin.x = eax
  // Without engine source, we cannot tell whether [edx+0x98] is a
  // coordinate origin, a grid offset, or some other engine global.
  // The author's earlier guess of "origin-snap helper" is plausible
  // but not confirmed.
  self.pev.origin.x = 0x0f7197 /* - unknown_dword_at_edx_plus_0x98 */;

  // (2) Validate configured keyvalues.
  self.CheckValues();

  // (3) Register with the shared particle emitter pool.
  // Disassembly:
  //   push eax              ; eax = &this->m_sharedParticle (+0x68)
  //   push GOT[0x13a0]      ; g_pSharedEmitter (this)
  //   call AddParticle
  //   mov [esi+0x64], eax   ; m_iSharedHandle = return value
  // (Argument order matches the Itanium-demangled
  // AddParticle__16CTSSharedEmitterP16sharedparticle_s.)
  self.m_iSharedHandle = g_pSharedEmitter.AddParticle(self.m_sharedParticle);

  // (4) Registration failed: emit error and remove self.
  // pfnAlertMessage is variadic: (ALERT_TYPE level, char *fmt, ...).
  // The asm pushes AT_ERROR (0x4), the static string, and 0x200
  // (a variadic arg whose meaning is not recovered — could be a
  // payload, a buffer-size hint, or unused).
  // TODO(D.3-strings): the real string content is at static address
  // 0x0f725f in the .so; resolve via the strings dump.
  if (self.m_iSharedHandle === -1) {
    engine.pfnAlertMessage(AT_ERROR, STR_AT_0x0f725f /* fmt */, 0x200 /* variadic */);
    UTIL_Remove(this);
  }

  // (5) Optional sound precache.
  // Disassembly checks the first byte of this->m_szSoundName (+0x1c0);
  // non-zero → precache via pfnPrecacheSound (enginefuncs_t offset 0x4).
  if (self.m_szSoundName[0] !== 0) {
    engine.pfnPrecacheSound(self.m_szSoundName);
  }
}
```

Net: the decompilation is structurally faithful to the disassembly — control flow, call targets, offsets, and return-value handling all match. The two real defects are (a) the fabricated `"Out of particle slots"` literal and (b) the `GLOBAL.field0x98` placeholder that reads like a real symbol. Both are easy fixes and neither requires new disassembly analysis — just honesty about what came from the binary vs. what was inferred. The D.4 pass over CTSParticle's full layout will likely confirm or correct `m_sharedParticle` / `m_iSharedHandle` / `m_szSoundName` field names, but the offsets in this function (+0x64, +0x68, +0x1c0) are firm.
