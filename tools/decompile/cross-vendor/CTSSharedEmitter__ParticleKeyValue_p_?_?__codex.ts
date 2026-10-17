The shell is having issues returning output, so I can't access the strings file from the project. I have enough information from the disassembly alone to produce the TS — the actual key string names would be in the binary's .rodata at the indicated GOT offsets, but the structure of the function is fully visible. Per instructions, the decompilation principles say to mark such things with `// TODO(asm-ambiguous):` rather than guess.

```typescript
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
 * Field offsets are preserved exactly from the disassembly (the
 * exact semantic name of each key is not in the disassembly; the
 * strings live in the .rodata segment of the .so and are flagged
 * with TODOs).
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

**Decompilation notes (so the next pass knows where to look):**

- **Signature.** MSVC `__thiscall` with `this` in `ecx`. The 3 stack args loaded at `[esp+0x24..0x2c]` are `(sharedparticle_s*, char*, char*)`. The function never reads `this`; every store targets the `particle` pointer (`edi`).
- **PIC/GOT.** Prologue `call $+5; pop ebx; add ebx, 0x7d7c0` puts `ebx = 0x15e410` (GOT base). Every key string and engine format string is a `[ebx - k]` pointer to `.rodata` of the .so. Concrete byte content of those strings is not in the disassembly — they need a `strings`/objdump pass against `ts/dlls/ts_i386.so` to populate the `/* TODO */` key slots.
- **Key name cataloguing.** The 40 key slots aren't random — they appear in the same order they were added in the original C++ source. The disassembly only shows the `strcasecmp` calls and the resulting field writes, so the order should be preserved. Likely candidates for the first strcpy (offset 0xe4) are `model` / `spritemodel`; for the ints 0x148-0x154 something like `rendermode`/`renderamt`/`renderfx`/`body`; for the four ints 0x3c/0x40 likely `sequence`/`frame`; the seven vec3s read like `origin`/`mins`/`maxs`/`velocity`/`avelocity`/`angles`/`size` but the exact mapping needs the string table.
- **Vec3 sscanf.** Each branch checks `== 3`; on miss it calls `engine->AlertMessage(AT_ERROR=4, format)` via `[ebx+0x1aa8]+0xf4` (the global `g_engfuncs` vtable). Returns true either way. The 7 format strings are all distinct (one per vec3 kv), each at a unique `[ebx - k]` offset — I have listed those offsets for the D.4 string-table pass.
- **strcpy optimization.** The two strcpy branches (`0xe4` and `0x158`) share a tail via a forward jump; semantically each is just `strcpy(particle+off, value)`.
- **Helpers.** `strcpy`/`sscanfVec3`/`engine.alertMessage` are referenced as if they exist; they should live in the decompile runtime shim that D.4 will add. `parseInt(value, 10)` and `parseFloat(value)` are JS built-ins used as direct equivalents to `strtol(_, NULL, 10)` / `strtod(_)` for well-formed input.
- **Field naming.** I used `model_0xe4`, `int_0x148`, `float_0x10`, `vec3_0x80`, `str_0x158` etc. as placeholder names keyed by struct offset. The full class reconstruction is D.4 — this function-level output only commits to behaviour, not field semantics.
