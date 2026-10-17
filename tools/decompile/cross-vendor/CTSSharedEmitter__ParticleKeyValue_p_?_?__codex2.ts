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
