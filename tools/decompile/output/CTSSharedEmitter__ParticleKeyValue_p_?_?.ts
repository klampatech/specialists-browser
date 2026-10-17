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
