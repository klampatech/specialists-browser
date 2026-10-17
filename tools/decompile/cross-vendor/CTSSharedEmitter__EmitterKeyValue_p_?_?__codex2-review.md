```
VERDICT: PASS-WITH-NOTES

Note on scope: the 4 review checklist items tied to `GetEntityAPI*` /
`GetNewDLLFunctions` (signature, version check, *interfaceVersion
assignment, success-path memcpy) only literally apply to the engine↔mod
entry points, not to `EmitterKeyValue`. I've re-mapped them to this
function's equivalent contract (10-case string dispatch on
`pEmitter` offsets; boolean return; caller-falls-through on `false`)
and graded against the disassembly.

Checklist:
1. Signature — ✅ — `(this: CTSSharedEmitter, pEmitter: sharedemitter_s,
   key: string, value: string): boolean` matches the demangled
   `CTSSharedEmitter::EmitterKeyValue(sharedemitter_s*, const char*,
   const char*)` (the mangled `P15sharedemitter_sPcT2` resolves to
   (ptr-to-sharedemitter_s, ptr-to-char, ptr-to-char)). The C++ `this`
   arg sits at [esp+0x20] in the prologue but is never read into a
   register — only `esi` (pEmitter), `edi` (key), `ebp` (value) are
   used. The TS uses `this: CTSSharedEmitter` purely as a type   annotation, which matches. Return is `al = 0|1` ⇒ boolean.

2. Version check — N/A — Not an entry point; re-mapped to "input
   arg checks" — there are none. The disassembly does no validation on
   `pEmitter`/`key`/`value`. The TS matches: it does not null-check.
   ⚠️ in principle a null `key`/`value` would SEGV the original;
   the TS version is therefore 1:1 faithful, but you may want to add   defensive checks in D.5 wiring — flagging for D.4.

3. *interfaceVersion assignment — N/A — Re-mapped to "default fall-
   through returns false" — the disassembly ends with `mov al, 0x0`
   before the epilogue when no `strcasecmp` matched, and the TS does
   `return false` at the bottom. ✅ equivalent.

4. Success path — ✅ — All 10 branches correctly model   `strcasecmp → parse → store at offset → return true`. The
   operations (strcpy at +0x18, strtod at +0x80/+0x7c/+0xa4/+0xa8,
   strtol-base-10 at +0x88/+0x84, sscanf at +0x98/+0x9c/+0xa0,
   +0x8c/+0x90/+0x94, +0x04/+0x08/+0x0c) and their ordering match
   the disassembly one-for-one. The `jmp e863a` tail-merges into the
   epilogue (`add esp,0xc; pop ebx/esi/edi/ebp; ret`) and the TS
   expresses this as `return true` per branch, which is faithful.

5. No fabricated paths — ✅ — Every TS branch corresponds to a
   distinct `strcasecmp@plt` site in the disassembly (offsets
   0xe842b, 0xe845c, 0xe8490, 0xe84c4, 0xe84f8, 0xe852c, 0xe8560,
   0xe8594, 0xe85c8, 0xe85fc) plus the fallthrough at 0xe8638.
   Branch ordering in the TS matches the binary's chain of
   `jne`-forward strcasecmp ladder. No invented branches.

6. No TODO body — ⚠️ — The body is *not* a comment-only TODO —
   the actual logic is fully expressed in code. But 9 of the 10 key
   names are placeholder strings (`TODO_key_for_0x80`, etc.) and the
   sscanf format is asserted as `"%f %f %f"` without verification.
   This is acceptable per the conversion guidance (asm-ambiguous
   `[ebx-N]` PIC strings, defer to D.4 + strings-n5.txt lookup), but
   it is not a no-TODO body. The "model" → offset 0x18 strcpy branch
   is a guess, not verified — it should be cross-checked against
   `tools/decompile/strings/strings-n5.txt` for the literal at
   `[ebx-0x6ec76]`.

7. Field names — ⚠️ — `modelname` for +0x18 is a reasonable guess
   (GoldSrc convention for the model string buffer on `entvars_t`),
   but no verification. The remaining fields are accessed via
   synthesized property names `field_0x80`, `field_0x7c`, etc. This
   is fine as a placeholder, but it makes the TS **not compile in
   isolation** against any real `sharedemitter_s` definition unless
   that struct has those exact properties — see item 8. The C-side
   offsets 0x04 / 0x08 / 0x0c (first vec3) and 0x18 (model buffer)
   suggest the leading struct layout is something like `{int?, vec3_t,
   char[] modelname, ...}` — that inference is sound and worth
   recording for D.4.

8. Compiles in isolation — ❌ — Fails. The TS references four
   external symbols that are not declared anywhere in the file:
   - `CTSSharedEmitter` (type)
   - `sharedemitter_s` (type with the `modelname`/`field_0x*`
     properties the function accesses by name)
   - `strcasecmp`, `strcpy`, `sscanf` (libc bindings)
   Per the conversion guidance, this should compile in isolation with
   `any` fallbacks for unknowns.

Issues to fix:
- Compile-in-isolation: replace `sharedemitter_s`/`CTSSharedEmitter`
  with `any` (or define minimal stubs at the top of the file), and
  declare the three libc bindings (`strcasecmp`, `strcpy`, `sscanf`).
  Switching field access from `pEmitter.field_0x80` to `pEmitter[0x80]`
  also removes the dependency on a struct shape we don't have yet.
- The sscanf format string is asserted as `"%f %f %f"`. The actual
  format lives at `[ebx-0x65637]` in the binary — should be looked
  up against `tools/decompile/strings/strings-n5.txt` and replaced
  with a TODO literal (e.g. `"TODO_format_for_vec3"`) until
  verified, not assumed.
- `parseFloat` / `parseInt(value, 10)` are JS built-ins with
  different semantics from `__strtod_internal` / `__strtol_internal`
  (NaN vs 0-on-fail; whitespace tolerance; leading-sign quirks).
  These differences matter when the mod's key/values are malformed.
  Consider a thin `strtod`/`strtol` wrapper that mirrors libc.
- The `"model"` branch is a guess, not a verified key. Flag for
  confirmation against the actual string at `[ebx-0x6ec76]`.
- The `field_0x04_vec` branch's offset-0-leader observation
  (something lives at offset 0 that isn't part of the vec3 group) is
  a useful inference — keep it as a `// NOTE` for D.4.
- Add an `// REVIEW: D.5` note about defensive null-checks on
  `key`/`value` — not in the disassembly, but the browser-side
  wiring will want them.

Suggested rewrite:

```typescript
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
```
