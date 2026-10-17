```typescript
/**
 * CTSSharedEmitter::EmitterKeyValue — Parses an entity key/value pair
 * for a shared emitter and stores the parsed value into the shared
 * data struct. Returns true if the key was recognized, false otherwise.
 *
 * The disassembly shows all `[esi+offset]` writes target the
 * `pEmitter` data struct (NOT fields of the C++ `this`). The C++
 * object is passed through but unused in this function body — the
 * engine likely invokes the method via vtable on the wrapper, then
 * operates on the embedded data struct.
 *
 * @param this      The CTSSharedEmitter C++ entity (the C++ `this`;
 *                  unused in the body — fields are written to the
 *                  `pEmitter` data struct).
 * @param pEmitter  Pointer to the sharedemitter_s data struct whose
 *                  fields are written by this function.
 * @param key       Property name (case-insensitive) being set.
 * @param value     Property value as a string; parsed to float / int /
 *                  vec3 as appropriate for the matching key.
 * @returns         true if the key was recognized and handled,
 *                  false otherwise (caller should fall through to a
 *                  base implementation).
 */
export function EmitterKeyValue(
  this: CTSSharedEmitter,
  pEmitter: sharedemitter_s,
  key: string,
  value: string,
): boolean {
  // "model" — strcpy value into the model-name buffer at offset 0x18.
  // TODO(asm-ambiguous): the key string is at a fixed binary offset;
  // "model" is the most likely match for a strcpy-into-char-buffer
  // case in an entity key handler, but verify against strings-n5.txt.
  if (strcasecmp(key, "model") === 0) {
    strcpy(pEmitter.modelname, value);
    return true;
  }

  // Float field at offset 0x80 (parsed via strtod).
  // TODO(asm-ambiguous): key name unknown — see strings-n5.txt.
  if (strcasecmp(key, "TODO_key_for_0x80") === 0) {
    pEmitter.field_0x80 = parseFloat(value);
    return true;
  }

  // Float field at offset 0x7c (parsed via strtod).
  // TODO(asm-ambiguous): key name unknown — see strings-n5.txt.
  if (strcasecmp(key, "TODO_key_for_0x7c") === 0) {
    pEmitter.field_0x7c = parseFloat(value);
    return true;
  }

  // Int field at offset 0x88 (parsed via strtol, base 10).
  // TODO(asm-ambiguous): key name unknown — see strings-n5.txt.
  if (strcasecmp(key, "TODO_key_for_0x88") === 0) {
    pEmitter.field_0x88 = parseInt(value, 10);
    return true;
  }

  // Int field at offset 0x84 (parsed via strtol, base 10).
  // TODO(asm-ambiguous): key name unknown — see strings-n5.txt.
  if (strcasecmp(key, "TODO_key_for_0x84") === 0) {
    pEmitter.field_0x84 = parseInt(value, 10);
    return true;
  }

  // vec3 at offsets 0x98 / 0x9c / 0xa0 (parsed via sscanf).
  // TODO(asm-ambiguous): key name unknown — see strings-n5.txt.
  // TODO(asm-ambiguous): format string is at a fixed binary offset;
  // most likely "%f %f %f" for an origin/angles/velocity-style vec3.
  if (strcasecmp(key, "TODO_key_for_0x98_vec") === 0) {
    sscanf(value, "%f %f %f",
      pEmitter.field_0x98,
      pEmitter.field_0x9c,
      pEmitter.field_0xa0);
    return true;
  }

  // vec3 at offsets 0x8c / 0x90 / 0x94 (parsed via sscanf).
  // TODO(asm-ambiguous): key name unknown — see strings-n5.txt.
  if (strcasecmp(key, "TODO_key_for_0x8c_vec") === 0) {
    sscanf(value, "%f %f %f",
      pEmitter.field_0x8c,
      pEmitter.field_0x90,
      pEmitter.field_0x94);
    return true;
  }

  // Float field at offset 0xa4 (parsed via strtod).
  // TODO(asm-ambiguous): key name unknown — see strings-n5.txt.
  if (strcasecmp(key, "TODO_key_for_0xa4") === 0) {
    pEmitter.field_0xa4 = parseFloat(value);
    return true;
  }

  // Float field at offset 0xa8 (parsed via strtod).
  // TODO(asm-ambiguous): key name unknown — see strings-n5.txt.
  if (strcasecmp(key, "TODO_key_for_0xa8") === 0) {
    pEmitter.field_0xa8 = parseFloat(value);
    return true;
  }

  // vec3 at offsets 0x04 / 0x08 / 0x0c (parsed via sscanf).
  // TODO(asm-ambiguous): these fields live near the start of the
  // struct, suggesting they may be a vec3_t origin or rendercolor.
  // Note offset 0x00 is NOT in this group, so something else (an int
  // flag or a pointer) lives at the very head of the struct.
  // TODO(asm-ambiguous): key name unknown — see strings-n5.txt.
  if (strcasecmp(key, "TODO_key_for_0x04_vec") === 0) {
    sscanf(value, "%f %f %f",
      pEmitter.field_0x04,
      pEmitter.field_0x08,
      pEmitter.field_0x0c);
    return true;
  }

  // Unrecognized key.
  return false;
}
```
