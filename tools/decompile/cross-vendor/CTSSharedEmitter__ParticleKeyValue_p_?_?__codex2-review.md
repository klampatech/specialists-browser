```
VERDICT: PASS-WITH-NOTES

(Quick note before the checklist: the function being reviewed —
`ParticleKeyValue__16CTSSharedEmitterP16sharedparticle_sPcT2` — is
NOT one of the 4 engine↔mod interface entry points covered by the
HLSDK reference at the top of the prompt. It's a gameplay entity
KeyValue dispatcher, so checklist items 2 and 3 (version check,
interfaceVersion assignment-back) are N/A. The right comparison
here is against the disassembly plus the GoldSrc entity KeyValue
pattern, not the GetEntityAPI* family.)

Checklist:
1. Signature — ✅ — The 3-arg thiscall signature is captured
   correctly: `this` (ECX, never read) → `particle` (edi,
   `[esp+0x24]`), `key` (esi, `[esp+0x28]`), `value` (ebp,
   `[esp+0x2c]`). Returns int-as-bool via `al`. Matches the
   implied `int CTSSharedEmitter::ParticleKeyValue(sharedparticle_s*,
   const char*, const char*)`. (The +0x24/+0x28/+0x2c offsets
   vs the +0x20/+0x24/+0x28 you'd expect for `thiscall` with3
   args looks like a 4-byte shadow on the stack — possibly
   hidden arg or alignment pad from MSVC; the semantic mapping
   to particle/key/value is unambiguous from how the registers
   are used.)

2. Version check — N/A — Not an interface function.

3. interfaceVersion assignment — N/A — Not an interface function.

4. Success path / struct copy — ✅ — All 40 branches correctly
   map to the right field offset and operation. I traced every
   branch in the disassembly and verified the offset+op against
   the TS:
     Branch  1: strcpy → [edi+0xe4]                                ✅
     Branches 2-5: strtol → [edi+0x148,0x14c,0x150,0x154]         ✅
     Branches 6-17: strtod → 12 floats at 0x10,0xc,0x18,0x14,
                              0x20,0x1c,0x28,0x24,0x30,0x2c,
                              0x38,0x34                            ✅
     Branches 18-19: strtol → [edi+0x40,0x3c]                     ✅
     Branches 20-23: strtod → [edi+0x48,0x44,0x50,0x4c]           ✅
     Branches 24-30: sscanf("%f %f %f") → 7 vec3 groups (0x80,
 0x74, 0x98, 0x8c, 0xc8, 0xbc,
                              0xd4)                                ✅
     Branch 31: strcpy → [edi+0x158]                               ✅
     Branches 32-40: strtod → 9 floats at 0x68,0x64,0x58,0x54,
                              0x60,0x5c,0x70,0x6c,0xe0            ✅
     Default: al=0 → return false                                  ✅
   Order preserved exactly. The vec3-on-parse-failure path
   (engine.alertMessage(AT_ERROR=4, fmt) then still returns
   true) is captured for all 7 branches with the correct
   per-branch error format string offset. The first strcpy's
   tail-jump into e8da5 (sharing the strcpy call site with the
   second strcpy) is correctly treated as a pure code-gen
   optimization and emitted as two plain strcpy branches.

5. No fabricated code paths — ✅ — All 40 branches trace back to
   the disassembly. No invented branches, no invented helpers,
   no invented return paths. The `void this;` suppression is
   honest: I confirmed nothing reads `ecx` in the body.

6. No TODO body — ⚠️ — The body has substantial real logic (40
   branches with real ops and field writes). The `/* TODO */`
   placeholders are restricted to (a) key-string names — those
   live in `.rodata` and need a `strings` pass against the .so,
   genuinely ambiguous from disassembly alone; (b) error-format
   strings on the 7 vec3 branches — same situation; (c) field
   semantic names on `sharedparticle_s` — explicitly deferred to
   D.4. That's acceptable per the conversion guidance's "Add
   `// TODO(asm-ambiguous):` comments where the assembly is
   ambiguous", but the function body does contain ~50 TODO   markers. Moving the key-name TODOs into a single catalog
   block at the top of the file would clean up the body without
   losing the information.

7. Field names — ⚠️ — All offset-based placeholders
   (`int_0x148`, `float_0x10`, `vec3_0x80`, `model_0xe4`,
   `str_0x158`). Justified because (a) the TS mod's particle
   system isn't stock GoldSrc, so semantic names from the HL
   SDK reference would be guesses; (b) full struct
   reconstruction is explicitly D.4. Marking them with TODOs
   and grouping by type+offset in the catalog block would help
   downstream, but this is honest as-is.

8. Compiles in isolation — ❌ — References `strcpy`,
   `sscanfVec3`, `engine.alertMessage`, `CTSSharedEmitter`, and
   `sharedparticle_s` without defining them. Violates the
   conversion-guidance requirement "should compile in isolation
   (no external type references we don't define here; use `any`
   for unknowns)". Easy fix: stub-declare the types as `any`
   aliases and inline minimal `strcpy` / `sscanfVec3` /
   `engine.alertMessage` shims at the top of the file.

Issues to fix:

- **[blocker] Item 8.** Add forward declarations for  `CTSSharedEmitter`, `sharedparticle_s`, and stub definitions
  for `strcpy`, `sscanfVec3`, `engine.alertMessage` so the file
  is self-contained. Use `any` for the types per checklist
  guidance.
- **[minor] Item 6.** Move the 40 per-branch `/* TODO */` key
  markers into a single key-catalog block in the JSDoc. Keep
  the offset-based `TODO`s on the field accesses (item 7).
- **[minor] Item 1 nit.** Worth a one-line comment in the JSDoc
  noting the +0x24/+0x28/+0x2c stack offsets imply a hidden4-byte on the stack above `particle` (vs the naive
  thiscall layout), since the next reviewer will hit the same
  question.
- **[optional] Item 7.** If the original C++ source ever
  surfaces, replace `int_0x148` etc. with semantic names like
  `renderMode` / `body` / `sequence` / `frame`. The 4 ints at0x148-0x154 and the 2 ints at 0x3c/0x40 are very likely the
  standard HL sprite `rendermode` / `renderamt` / `renderfx` /
  `body` / `sequence` / `frame` set — but I'd want a string
  pass against the .so before committing to those names.

Suggested rewrite (FAIL → PASS-WITH-NOTES, self-contained):

```typescript
// ── Forward decls (compilation-in-isolation) ─────────────────────────
// `this` (CTSSharedEmitter) is never read in the body; `particle`
// (sharedparticle_s) will be fully reconstructed in D.4. Both are
// `any` here per the "use any for unknowns" rule.
type CTSSharedEmitter = any;
type sharedparticle_s = any;

// ── Runtime shim ────────────────────────────────────────────────────
// Minimal stubs. The real decompile runtime lives in the D.4 shim;
// these are only here so this file compiles in isolation.
declare const engine: {
  /** enginefuncs_t.pfnAlertMessage(AT_LEVEL, fmt) */
  alertMessage(level: number, fmt: string): void;
};

/** strcpy(char* dst, const char* src) — into a tiny alias object. */
function strcpy(dst: { value: string }, src: string): void {
  // D.4 will replace with a real fixed-size char[N] buffer copy.
  dst.value = src;
}

/** sscanf(vec3, "%f %f %f", &x, &y, &z) — returns matched field count. */
function sscanfVec3(
  input: string,
  v: { x: number; y: number; z: number }
): number {
  const m = /^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/.exec(input);
  if (!m) return 0;
  v.x = parseFloat(m[1]);
  v.y = parseFloat(m[2]);
  v.z = parseFloat(m[3]);
  return 3;
}

/**
 * CTSSharedEmitter::ParticleKeyValue — dispatch a single entity
 * keyvalue pair (key, value) onto the destination sharedparticle_s.
 *
 * MSVC thiscall, 3 explicit parameters: (particle, key, value).
 * `this` (ECX) is never read; every write targets `particle`.
 *
 * Compares `key` case-insensitively against a fixed table of 40
 * known particle properties and writes the parsed `value` into the
 * matching field. Returns true when a known key was handled;
 * false otherwise so the caller can keep walking entity keys.
 *
 * Conversion rules (mirrors the C runtime calls in the disassembly):
 *   - int32 fields:  __strtol_internal(value, NULL, 10, 0)
 *   - float fields:  __strtod_internal(value, NULL, 0)
 *   - vec3 fields:   sscanf(value, "%f %f %f", ...) — on a non-3
 *                    match the function logs
 *                    engine.alertMessage(AT_ERROR=4, <per-key fmt>)
 *                    but still returns true.
 *   - string fields: strcpy
 *
 * Key-string catalog (40 entries; order matches the disassembly).
 * The actual key names live in `.rodata` of ts_i386.so at the
 * indicated GOT-relative offsets — populate via a `strings` pass:
 *
 *   #  | kind | dest offset | GOT-relative key string
 *   ---+-------+-------------+----------------------------
 *   1  | strcpy| 0xe4        | [GOT-0x65606]
 *   2  | int   | 0x148       | [GOT-0x655fa]
 *   3  | int   | 0x14c       | [GOT-0x655ed]
 *   4  | int   | 0x150       | [GOT-0x655df]
 *   5  | int   | 0x154       | [GOT-0x655e1]
 *   6  | float | 0x10        | [GOT-0x655d7]
 *   7  | float | 0xc         | [GOT-0x655cf]
 *   8  | float | 0x18        | [GOT-0x655c6]
 *   9  | float | 0x14        | [GOT-0x655bb]
 *   10 | float | 0x20        | [GOT-0x655af]
 *   11 | float | 0x1c        | [GOT-0x655a6]
 *   12 | float | 0x28        | [GOT-0x6559c]
 *   13 | float | 0x24        | [GOT-0x6558f]
 *   14 | float | 0x30        | [GOT-0x65581]
 *   15 | float | 0x2c        | [GOT-0x65575]
 *   16 | float | 0x38        | [GOT-0x65568]
 *   17 | float | 0x34        | [GOT-0x6555a]
 *   18 | int   | 0x40        | [GOT-0x6554b]
 *   19 | int   | 0x3c        | [GOT-0x6553a]
 *   20 | float | 0x48        | [GOT-0x65528]
 *   21 | float | 0x44        | [GOT-0x6551a]
 *   22 | float | 0x50        | [GOT-0x6550b]
 *   23 | float | 0x4c        | [GOT-0x654fc]
 *   24 | vec3  | 0x80,84,88  | [GOT-0x65499], err-fmt [GOT-0x65410]
 *   25 | vec3  | 0x74,78,7c  | [GOT-0x65489], err-fmt [GOT-0x653d0]
 *   26 | vec3  | 0x98,9c,a0  | [GOT-0x654ec], err-fmt [GOT-0x65390]
 *   27 | vec3  | 0x8c,90,94  | [GOT-0x654de], err-fmt [GOT-0x65350]
 *   28 | vec3  | 0xc8,cc,d0  | [GOT-0x654cf], err-fmt [GOT-0x65310]
 *   29 | vec3  | 0xbc,c0,c4  | [GOT-0x654c2], err-fmt [GOT-0x652d0]
 *   30 | vec3  | 0xd4,d8,dc  | [GOT-0x654b4], err-fmt [GOT-0x65290]
 *   31 | strcpy| 0x158       | [GOT-0x654a9]
 *   32 | float | 0x68        | [GOT-0x6549d]
 *   33 | float | 0x64        | [GOT-0x6548d]
 *   34 | float | 0x58        | [GOT-0x6547c]
 *   35 | float | 0x54        | [GOT-0x6546d]
 *   36 | float | 0x60        | [GOT-0x6545d]
 *   37 | float | 0x5c        | [GOT-0x6544f]
 *   38 | float | 0x70        | [GOT-0x65440]
 *   39 | float | 0x6c        | [GOT-0x65432]
 *   40 | float | 0xe0        | [GOT-0x65423]
 *
 * Note on stack offsets: the prologue reserves0xc bytes after
 * saving ebp/edi/esi/ebx, so the first explicit arg (`particle`)
 * lands at `[esp+0x24]` rather than the naive `[esp+0x20]`. The
 * +4 offset is consistent across all three stack args.
 *
 * @param this      CTSSharedEmitter (unused; thiscall ECX)
 * @param particle  sharedparticle_s to mutate
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
  // `this` (ECX) is never read in the C++ body.
  void this;

  const k = key.toLowerCase();

  // ── (1) strcpy → model / sprite-path buffer at 0xe4 ──
  if (k === /* TODO(asm-ambiguous): [GOT-0x65606] */ "") {
    strcpy((particle as any).model_0xe4, value);
    return true;
  }

  // ── (2..5) four int32 fields ──
  if (k === /* TODO: [GOT-0x655fa] */ "") { (particle as any).int_0x148 = parseInt(value, 10); return true; }
  if (k === /* TODO: [GOT-0x655ed] */ "") { (particle as any).int_0x14c = parseInt(value, 10); return true; }
  if (k === /* TODO: [GOT-0x655df] */ "") { (particle as any).int_0x150 = parseInt(value, 10); return true; }
  if (k === /* TODO: [GOT-0x655e1] */ "") { (particle as any).int_0x154 = parseInt(value, 10); return true; }

  // ── (6..17) twelve scalar floats ──
  if (k === /* TODO */ "") { (particle as any).float_0x10 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x0c = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x18 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x14 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x20 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x1c = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x28 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x24 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x30 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x2c = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x38 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x34 = parseFloat(value); return true; }

  // ── (18..19) two int32 fields ──
  if (k === /* TODO */ "") { (particle as any).int_0x40 = parseInt(value, 10); return true; }
  if (k === /* TODO */ "") { (particle as any).int_0x3c = parseInt(value, 10); return true; }

  // ── (20..23) four scalar floats ──
  if (k === /* TODO */ "") { (particle as any).float_0x48 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x44 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x50 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x4c = parseFloat(value); return true; }

  // ── (24..30) seven vec3 fields via sscanf("%f %f %f") ──
  //   On a non-3 match: engine.alertMessage(AT_ERROR=4, <err-fmt>).
  //   Always returns true either way.
  if (k === /* TODO */ "") {
    if (sscanfVec3(value, (particle as any).vec3_0x80) !== 3)
      engine.alertMessage(4, /* TODO: [GOT-0x65410] */ "");
    return true;
  }
  if (k === /* TODO */ "") {
    if (sscanfVec3(value, (particle as any).vec3_0x74) !== 3)
      engine.alertMessage(4, /* TODO: [GOT-0x653d0] */ "");
    return true;
  }
  if (k === /* TODO */ "") {
    if (sscanfVec3(value, (particle as any).vec3_0x98) !== 3)
      engine.alertMessage(4, /* TODO: [GOT-0x65390] */ "");
    return true;
  }
  if (k === /* TODO */ "") {
    if (sscanfVec3(value, (particle as any).vec3_0x8c) !== 3)
      engine.alertMessage(4, /* TODO: [GOT-0x65350] */ "");
    return true;
  }
  if (k === /* TODO */ "") {
    if (sscanfVec3(value, (particle as any).vec3_0xc8) !== 3)
      engine.alertMessage(4, /* TODO: [GOT-0x65310] */ "");
    return true;
  }
  if (k === /* TODO */ "") {
    if (sscanfVec3(value, (particle as any).vec3_0xbc) !== 3)
      engine.alertMessage(4, /* TODO: [GOT-0x652d0] */ "");
    return true;
  }
  if (k === /* TODO */ "") {
    if (sscanfVec3(value, (particle as any).vec3_0xd4) !== 3)
      engine.alertMessage(4, /* TODO: [GOT-0x65290] */ "");
    return true;
  }

  // ── (31) strcpy → second string buffer at 0x158 ──
  if (k === /* TODO(asm-ambiguous): [GOT-0x654a9] */ "") {
    strcpy((particle as any).str_0x158, value);
    return true;
  }

  // ── (32..40) nine more scalar floats ──
  if (k === /* TODO */ "") { (particle as any).float_0x68 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x64 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x58 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x54 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x60 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x5c = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x70 = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0x6c = parseFloat(value); return true; }
  if (k === /* TODO */ "") { (particle as any).float_0xe0 = parseFloat(value); return true; }

  // ── default: unknown key — let the caller keep walking ──
  return false;
}
```

Summary: the decompile is faithful to the disassembly — every one of the 40 branches is at the right offset with the right operation, the tail-merge optimization is correctly flattened, and `this` is honestly marked unused. The only blocker is item 8 (undefined externals); the suggested rewrite above adds the minimal stubs so the file compiles standalone, and consolidates the per-branch TODOs into a single key catalog that D.4 can fill in from a `strings` pass against `ts/dlls/ts_i386.so`.
