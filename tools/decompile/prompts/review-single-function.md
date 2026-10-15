# Cross-vendor review prompt — single function

You are reviewing a TypeScript function that was decompiled from
`ts/dlls/ts_i386.so` (The Specialists Half-Life mod). The decompiled
output is provided below. Compare it against the HLSDK reference
implementation in `tools/decompile/references/hlsdk-goldsrc-interface.md`
and the original disassembly in `tools/decompile/chunks/<demangled>.chunk.md`.

Your job: be a strict but fair reviewer. Tell me what's right,
what's wrong, and what needs to change.

## Review checklist

For each item, say ✅ pass, ❌ fail (with the issue), or ⚠️
needs review (explain).

1. **Signature matches the HLSDK reference.** Arg types +
   arg count + return type. The function name matches the
   demangled C symbol exactly.
2. **Version check pattern** (for `GetEntityAPI*` /
   `GetNewDLLFunctions`): null-pointer check + version
   comparison against the right version constant.
3. **`*interfaceVersion` assignment-back** on the failure path.
   The HLSDK implementations write the desired version back to
   the engine's pointer before returning FALSE. Easy to miss.
4. **Success path: struct copy or equivalent** (`memcpy`,
   spread, or field-by-field). The TS output must preserve
   the data flow (engine writes its table → we copy it into
   our global).
5. **No fabricated code paths** — every control-flow branch
   must come from the disassembly or the HLSDK reference, not
   invented.
6. **No comment-only "TODO" body.** If the body is mostly
   `// TODO`, that's a fail — the function's logic should be
   expressed in code.
7. **Field names** map to known C fields (e.g., `g_engfuncs`,
   `gpGlobals`, `gFunctionTable`, `gNewDLLFunctions`). Any
   unfamiliar field names are a fail unless they're explicitly
   justified as a TODO.
8. **The function compiles** in isolation (no external type
   references we don't define here; use `any` for unknowns).

## Output format

```
VERDICT: PASS | FAIL | PASS-WITH-NOTES

Checklist:
1. Signature — ✅ / ❌ / ⚠️ — (detail)
2. Version check — ✅ / ❌ / ⚠️ — (detail)
3. interfaceVersion assignment — ✅ / ❌ / ⚠️ — (detail)
4. Success path — ✅ / ❌ / ⚠️ — (detail)
5. No fabricated paths — ✅ / ❌ / ⚠️ — (detail)
6. No TODO body — ✅ / ❌ / ⚠️ — (detail)
7. Field names — ✅ / ❌ / ⚠️ — (detail)
8. Compiles in isolation — ✅ / ❌ / ⚠️ — (detail)

Issues to fix (if any):
- ...

Suggested rewrite (if FAIL or PASS-WITH-NOTES, full TS function):
```typescript
// your corrected version
```
```

## Inputs

### HLSDK reference
(reproduced inline so you don't need to load another file)

```
PASTE: enginefuncs_t, DLL_FUNCTIONS, NEW_DLL_FUNCTIONS, globalvars_t
types from hlsdk-goldsrc-interface.md, plus the reference implementations
of the 4 entry points.
```

### Original disassembly + class context
Load `tools/decompile/chunks/<demangled>.chunk.md`. It contains
the disassembly, the class siblings table, and the external
calls. Use it to verify the decompiled TS is faithful.

### Decompiled TS (from codex)

```typescript
PASTE: the codex-generated TS function here
```