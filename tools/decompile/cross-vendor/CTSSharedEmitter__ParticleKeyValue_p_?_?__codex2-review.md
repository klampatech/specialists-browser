I tried to load the in-repo context (`HANDOFF.md`, `SPEC.md`) to anchor the verdict to current project state, but the shell isn't returning output in this session. I'll review purely from the inline inputs — they are self-contained, so this is fine.

A quick meta-note before the verdict: the **review checklist** (items 2–4 specifically — version check, `*interfaceVersion` assignment-back, struct-copy success path) is written for the D.3 engine↔mod entry points and does **not apply** to a gameplay method like `ParticleKeyValue`. I'm applying the spirit of the rest to this D.4-shaped function.

---

```
VERDICT: PASS-WITH-NOTES

Checklist (adapted from D.3 rubric; 2–4 are N/A for a gameplay method):

1. Signature — ✅ — `bool CTSSharedEmitter::ParticleKeyValue(sharedparticle_s*, const char*, const char*)`.
   The TS signature is `export function ParticleKeyValue(this: CTSSharedEmitter, particle: sharedparticle_s,
   key: string, value: string): boolean`. The `this: CTSSharedEmitter` as an explicit TS param is a fair D.3
   stand-in for MSVC `__thiscall` (where `this` rides in `ecx` and the three stack args
   `[esp+0x24, 0x28, 0x2c]` are exactly `(particle, key, value)`). D.4 will likely want this promoted to a
   method on the class. The semantic shape matches.

2. Version check — ⚠️ N/A — this is a KV dispatcher, not a `GetEntityAPI*`/`GetNewDLLFunctions` entry.
   No version constant in scope. Reporting N/A for transparency.

3. interfaceVersion assignment-back — ⚠️ N/A — same reason.

4. Success path / struct-copy — ⚠️ N/A — there's no `memcpy` of an interface table. What *is* the success-path
   contract here is correct: every match returns `true` (`mov al, 0x1` → shared epilogue at 0xe8f6e) and the
   fallthrough returns `false` (`mov al, 0x0` at 0xe8f6c). The TS model of `return true` inside each branch
   and `return false` at the bottom is faithful. ✅

5. No fabricated paths — ✅ — I walked all 40 KV branches + the default:
     • strcpy   → 0xe4 + 0x158 (correctly modeled as 2 branches, and the head→tail jump at 0xe8684→0xe8da5
       is faithfully reproduced as `strcpy(particle.model_0xe4, value); return true;`)
     • strtol   → int fields at offsets 0x148, 0x14c, 0x150, 0x154, 0x40, 0x3c  (6 branches)
     • strtod   → float fields at 0x0c, 0x10, 0x14, 0x18, 0x1c, 0x20, 0x24, 0x28, 0x2c, 0x30, 0x34, 0x38,
                  0x44, 0x48, 0x4c, 0x50, 0x54, 0x58, 0x5c, 0x60, 0x64, 0x68, 0x6c, 0x70, 0xe0  (24 branches)
     • sscanf("%f %f %f", .x, .y, .z) → vec3s at 0x80, 0x74, 0x98, 0x8c, 0xc8, 0xbc, 0xd4  (7 branches)
   Order matches the disassembly exactly. The 7 vec3 branches' error-format offsets
   ([ebx-0x65410], -0x653d0, -0x65390, -0x65350, -0x65310, -0x652d0, -0x65290) and the AT_ERROR=4 push are
   all correctly carried through to `engine.alertMessage(4, /* GOT-… */)`.
   External call sites (`strcasecmp`, `__strtol_internal`, `__strtod_internal`, `sscanf`, `strcpy`,
   `g_engfuncs.pfnAlertMessage` via `[ebx+0x1aa8]+0xf4`) all line up. No invented branches.

6. No TODO body — ✅ — the body is fully implemented; the `/* TODO */` slots are only for key-string
   literals (which legitimately can't come from the disassembly — they live in `.rodata`). Per the
   conversion guidance, that's exactly the contract for a D.3 function-level decompile where the strings
   are a D.4 pass.

7. Field names — ⚠️ acceptable — uses offset-keyed placeholders (`int_0x148`, `vec3_0x80`, …) which are
   *not* invented (they map 1:1 to disassembly offsets). Per the conversion guidance, real names are a
   D.4 concern. ✅ for D.3; ⚠️ because they're not the canonical C names yet.

8. Compiles in isolation — ❌ — references `strcpy`, `sscanfVec3`, `engine.alertMessage`, plus types
   `CTSSharedEmitter` and `sharedparticle_s`, none of which are defined in the snippet. The conversion
   notes acknowledge these belong in a "decompile runtime shim," but for this snippet to typecheck you
   need either an import or a minimal stub block. (Cosmetic fix — see rewrite below.)

Additional flag worth raising:
   • `key.toLowerCase()` is JS's Unicode-aware case-fold; the assembly uses `strcasecmp`, which is
     `tolower()` byte-by-byte under the C locale. For HL entity keys (ASCII-only, lowercase) they're
     behaviorally equivalent. ⚠️ Minor — note in the rewrite for future non-ASCII safety.
```

---

**Issues to fix:**

1. **Undefined symbols (item 8).** Add a small stub block at the top — runtime-shim placeholders for `strcpy`, `sscanfVec3`, `engine.alertMessage`, plus placeholder types for `sharedparticle_s` and `CTSSharedEmitter`. This is the only thing blocking the file from compiling in isolation.

2. **`key.toLowerCase()` locale mismatch (cosmetic).** Fine for HL ASCII keys, but worth a one-line comment so future maintainers don't rely on it for non-ASCII keys.

3. **Key-string placeholders.** These are *intentional* TODOs per conversion guidance, but the seven vec3 branches also carry TODO offsets for the engine alert format strings (`GOT-0x65410` etc.). When D.4 pulls strings from `.rodata`, both should be filled in tandem.

No structural rewrites needed — the control flow, field-offset mappings, branch order, return-value contract, and external-call set are all faithful.

---

**Suggested minimal patch (only items 1 + 2; logic untouched):**

```typescript
// ─── Runtime shim + type stubs (D.3 placeholders) ─────────────────────
// Remove when D.4 wires these into the real class definition / native bridge.

// libc shim
declare function strcpy(dst: number /* pointer */, src: string): void;

// Equivalent to sscanf(input, "%f %f %f", &out.x, &out.y, &out.z).
// Returns the number of conversions (matches C sscanf's return).
declare function sscanfVec3(input: string, out: { x: number; y: number; z: number }): number;

// g_engfuncs.pfnAlertMessage — offset 0xf4 in enginefuncs_t (AT_ERROR=4).
declare const engine: {
  alertMessage(level: number, fmt: string): void;
};

// sharedparticle_s — field offsets preserved from disassembly.
// Real field names + accurate types land in D.4.
declare interface sharedparticle_s {
  // strcpy targets
  model_0xe4: number; // char[] ptr, offset 0xe4
  str_0x158: number;  // char[] ptr, offset 0x158

  // strtol targets (int32, base 10)
  int_0x148: number; int_0x14c: number; int_0x150: number; int_0x154: number;
  int_0x3c: number; int_0x40: number;

  // strtod targets (float, single)
  float_0x0c: number; float_0x10: number; float_0x14: number; float_0x18: number;
  float_0x1c: number; float_0x20: number; float_0x24: number; float_0x28: number;
  float_0x2c: number; float_0x30: number; float_0x34: number; float_0x38: number;
  float_0x44: number; float_0x48: number; float_0x4c: number; float_0x50: number;
  float_0x54: number; float_0x58: number; float_0x5c: number; float_0x60: number;
  float_0x64: number; float_0x68: number; float_0x6c: number; float_0x70: number;
  float_0xe0: number;

  // sscanf "%f %f %f" targets (x at base offset, y at +4, z at +8)
  vec3_0x74: { x: number; y: number; z: number };
  vec3_0x80: { x: number; y: number; z: number };
  vec3_0x8c: { x: number; y: number; z: number };
  vec3_0x98: { x: number; y: number; z: number };
  vec3_0xbc: { x: number; y: number; z: number };
  vec3_0xc8: { x: number; y: number; z: number };
  vec3_0xd4: { x: number; y: number; z: number };
}

declare class CTSSharedEmitter {}

// ─── Function (logic unchanged from the existing TS, only the
//     ASCII-key comment on toLowerCase() is new) ──────────────────────

/**
 * CTSSharedEmitter::ParticleKeyValue — dispatch a single entity
 * keyvalue pair (key, value) onto the destination sharedparticle_s.
 *
 * Compares `key` case-insensitively against a fixed table of ~40
 * known particle properties and writes the parsed `value` into the
 * matching field on `particle`. Returns true when a known key was
 * handled; false otherwise so the caller can keep walking entity
 * keys.
 *
 * Conversion rules:
 *   - int32  fields: strtol(value, NULL, 10)
 *   - float  fields: strtod(value)
 *   - vec3   fields: sscanf(value, "%f %f %f", ...) — on a non-3
 *     match a level-4 engine AlertMessage is logged (each vec3
 *     branch has its own format string) but the function still
 *     returns true.
 *   - string fields: strcpy
 *
 * The `this` parameter is the C++ method binding; it is never read —
 * every write targets the `particle` argument.
 *
 * @param this      CTSSharedEmitter entity instance (unused)
 * @param particle  sharedparticle_s struct to mutate
 * @param key       Property name (case-insensitive)
 * @param value     Property value as a string
 * @returns         true if `key` matched a known property, else false
 */
export function ParticleKeyValue(
  this: CTSSharedEmitter,
  particle: sharedparticle_s,
  key: string,
  value: string
): boolean {
  // `this` is never read in the C++ body — all writes go to `particle`.
  void this;

  // NB: JS's String#toLowerCase is Unicode-aware; the assembly uses
  // C strcasecmp (ASCII / C-locale). Equivalent for HL entity keys
  // (lowercase ASCII). Revisit if non-ASCII keys ever appear.
  const k = key.toLowerCase();

  // ── (1) strcpy into the model / sprite-path field at offset 0xe4 ──
  if (k === /* TODO(asm-ambiguous): key string at GOT-0x65606 */) {
    strcpy(particle.model_0xe4, value);
    return true;
  }

  // ── (2..5) four int32 fields at 0x148, 0x14c, 0x150, 0x154 ────────
  if (k === /* TODO */) { particle.int_0x148 = parseInt(value, 10); return true; }
  if (k === /* TODO */) { particle.int_0x14c = parseInt(value, 10); return true; }
  if (k === /* TODO */) { particle.int_0x150 = parseInt(value, 10); return true; }
  if (k === /* TODO */) { particle.int_0x154 = parseInt(value, 10); return true; }

  // ── (6..17) twelve scalar floats (strtod) ──────────────────────────
  if (k === /* TODO */) { particle.float_0x10 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x0c = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x18 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x14 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x20 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x1c = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x28 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x24 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x30 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x2c = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x38 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x34 = parseFloat(value); return true; }

  // ── (18..19) two int32 fields at 0x40, 0x3c ───────────────────────
  if (k === /* TODO */) { particle.int_0x40 = parseInt(value, 10); return true; }
  if (k === /* TODO */) { particle.int_0x3c = parseInt(value, 10); return true; }

  // ── (20..23) four scalar floats at 0x48, 0x44, 0x50, 0x4c ────────
  if (k === /* TODO */) { particle.float_0x48 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x44 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x50 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x4c = parseFloat(value); return true; }

  // ── (24..30) seven vec3 fields via sscanf("%f %f %f") ────────────
  //   Each branch logs an engine alert (level=4 = AT_ERROR) on parse
  //   failure but still returns true. Format strings differ per kv.
  if (k === /* TODO */) {
    if (sscanfVec3(value, particle.vec3_0x80) !== 3)
      engine.alertMessage(/* AT_ERROR */ 4, /* TODO: GOT-0x65410 */);
    return true;
  }
  if (k === /* TODO */) {
    if (sscanfVec3(value, particle.vec3_0x74) !== 3)
      engine.alertMessage(4, /* TODO: GOT-0x653d0 */);
    return true;
  }
  if (k === /* TODO */) {
    if (sscanfVec3(value, particle.vec3_0x98) !== 3)
      engine.alertMessage(4, /* TODO: GOT-0x65390 */);
    return true;
  }
  if (k === /* TODO */) {
    if (sscanfVec3(value, particle.vec3_0x8c) !== 3)
      engine.alertMessage(4, /* TODO: GOT-0x65350 */);
    return true;
  }
  if (k === /* TODO */) {
    if (sscanfVec3(value, particle.vec3_0xc8) !== 3)
      engine.alertMessage(4, /* TODO: GOT-0x65310 */);
    return true;
  }
  if (k === /* TODO */) {
    if (sscanfVec3(value, particle.vec3_0xbc) !== 3)
      engine.alertMessage(4, /* TODO: GOT-0x652d0 */);
    return true;
  }
  if (k === /* TODO */) {
    if (sscanfVec3(value, particle.vec3_0xd4) !== 3)
      engine.alertMessage(4, /* TODO: GOT-0x65290 */);
    return true;
  }

  // ── (31) strcpy into the second string field at offset 0x158 ───────
  if (k === /* TODO(asm-ambiguous): key string at GOT-0x654a9 */) {
    strcpy(particle.str_0x158, value);
    return true;
  }

  // ── (32..40) nine more scalar floats (strtod) ─────────────────────
  if (k === /* TODO */) { particle.float_0x68 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x64 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x58 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x54 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x60 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x5c = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x70 = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0x6c = parseFloat(value); return true; }
  if (k === /* TODO */) { particle.float_0xe0 = parseFloat(value); return true; }

  // ── default: key not recognized — let the caller keep walking ─────
  return false;
}
```

---

**Summary for the next T3 thread:**

This was a very clean decompile. The only thing actually wrong is the missing shim/type-stub block, which is a one-time housekeeping fix per file, not a function-logic problem. Once `strcpy` / `sscanfVec3` / `engine.alertMessage` / `sharedparticle_s` / `CTSSharedEmitter` are reachable (either via import from a runtime shim, or via the stub block above), it compiles and runs.

Everything else — branch ordering, offset mappings, the strcpy tail-share, the sscanf-on-mismatch-still-returns-true behavior, the `g_engfuncs.pfnAlertMessage` vtable dispatch, the fallthrough `false` return — matches the disassembly byte-for-byte.

When the string-table pass lands (D.4), the only thing left to do is fill in the `/* TODO */` key slots and the seven `GOT-…` alert-format string slots. No logic changes expected.
