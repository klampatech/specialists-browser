/**
 * CTSSharedEmitter::EmitterKeyValue — Parses an entity key/value pair
 * for a shared emitter and stores the parsed value into the shared
 * data struct. Returns true if the key was recognized, false
 * otherwise (caller falls through to base implementation).
 *
 * C++ signature:
 *   bool CTSSharedEmitter::EmitterKeyValue(
 *     sharedemitter_s* pEmitter,
 *     const char* key,
 *     const char* value
 *   );
 *
 * Disassembly observations:
 *   - `this` is passed at [esp+0x20] but never read. Only
 *     pEmitter (esi), key (edi), value (ebp) are used.
 *   - 10 strcasecmp ladder branches + fallthrough → false.
 *   - All stores go into the `pEmitter` data struct, NOT the C++
 *     object — confirmed by the offset pattern (e.g. +0x18 is the
 *     model-name buffer).
 *   - sscanf format string lives at a fixed PIC offset
 *     ([ebx-0x65637]) and is currently TODO.
 *
 * TODO(asm-ambiguous): All key names except "model" are TODO.
 * Verify against tools/decompile/strings/strings-n5.txt for the
 * literals at each [ebx-N] PIC address below.
 * TODO(asm-ambiguous): sscanf format at [ebx-0x65637] — TODO.
 *
 * @returns true if the key was handled, false otherwise.
 */

// External dependencies — declared here so the file compiles in
// isolation. Wire these up in D.5 when we link libc + the entity
// type system.
declare const CTSSharedEmitter: any;
declare const sharedemitter_s: any;
declare function strcasecmp(a: string, b: string): number;
declare function strcpy(dst: any, src: string): any;
declare function sscanf(
  src: string,
  fmt: string,
  ...args: any[]
): number;

export function EmitterKeyValue(
  this: any,
  pEmitter: any,
  key: string,
  value: string,
): boolean {
  // "model" → strcpy into the model-name buffer at offset 0x18.
  // TODO(verify-key): confirm the literal at [ebx-0x6ec76] is  // "model" — most likely match for a strcpy-into-char-buffer
  // case in a GoldSrc entity key handler, but unverified.
  if (strcasecmp(key, "model") === 0) {
    strcpy(pEmitter[0x18], value);
    return true;
  }

  // Float at +0x80 (strtod).
  // TODO(verify-key): literal at [ebx-0x65661].
  if (strcasecmp(key, "TODO_key_for_0x80") === 0) {
    pEmitter[0x80] = parseFloat(value);
    return true;
  }

  // Float at +0x7c (strtod).
  // TODO(verify-key): literal at [ebx-0x6565a].
  if (strcasecmp(key, "TODO_key_for_0x7c") === 0) {
    pEmitter[0x7c] = parseFloat(value);
    return true;
  }

  // Int at +0x88 (strtol, base 10).
  // TODO(verify-key): literal at [ebx-0x65652].
  if (strcasecmp(key, "TODO_key_for_0x88") === 0) {
    pEmitter[0x88] = parseInt(value, 10);
    return true;
  }

  // Int at +0x84 (strtol, base 10).
  // TODO(verify-key): literal at [ebx-0x6564b].
  if (strcasecmp(key, "TODO_key_for_0x84") === 0) {
    pEmitter[0x84] = parseInt(value, 10);
    return true;
  }

  // vec3 at +0x98/+0x9c/+0xa0 (sscanf,3 floats).
  // TODO(verify-key): literal at [ebx-0x65643].
  // TODO(verify-format): format at [ebx-0x65637].
  if (strcasecmp(key, "TODO_key_for_0x98_vec") === 0) {
    sscanf(
      value,
      "TODO_format_for_vec3",
      pEmitter[0x98],
      pEmitter[0x9c],
      pEmitter[0xa0],
    );
    return true;
  }

  // vec3 at +0x8c/+0x90/+0x94 (sscanf, 3 floats).
  // TODO(verify-key): literal at [ebx-0x6562e].
  // TODO(verify-format): format at [ebx-0x65637].
  if (strcasecmp(key, "TODO_key_for_0x8c_vec") === 0) {
    sscanf(
      value,
      "TODO_format_for_vec3",
      pEmitter[0x8c],
      pEmitter[0x90],
      pEmitter[0x94],
    );
    return true;
  }

  // Float at +0xa4 (strtod).
  // TODO(verify-key): literal at [ebx-0x65621].
  if (strcasecmp(key, "TODO_key_for_0xa4") === 0) {
    pEmitter[0xa4] = parseFloat(value);
    return true;
  }

  // Float at +0xa8 (strtod).
  // TODO(verify-key): literal at [ebx-0x65613].
  if (strcasecmp(key, "TODO_key_for_0xa8") === 0) {
    pEmitter[0xa8] = parseFloat(value);
    return true;
  }

  // vec3 at +0x04/+0x08/+0x0c (sscanf, 3 floats).
  // TODO(verify-key): literal at [ebx-0x6b031].
  // TODO(verify-format): format at [ebx-0x65637].
  // NOTE for D.4: this vec3 lives at the head of the struct,
  // starting at +0x04 (NOT +0x00), so something else (likely an
  // int flag or pointer) occupies the first 4 bytes. Most likely
  // a vec3_t origin, but could be rendercolor / avelocity.
  if (strcasecmp(key, "TODO_key_for_0x04_vec") === 0) {
    sscanf(
      value,
      "TODO_format_for_vec3",
      pEmitter[0x04],
      pEmitter[0x08],
      pEmitter[0x0c],
    );
    return true;
  }

  // Unrecognized key — caller falls through to base implementation.
  return false;
}
