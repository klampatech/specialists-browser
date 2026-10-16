The shell environment isn't returning command output through `write_stdin` (every session echoes back input but never produces stdout). The sandbox is also read-only, so I can't persist the file the polling script is watching. I'll deliver the decompiled TypeScript inline per the conversion guidance ("Output ONLY the TypeScript code block").

Here's the decompilation:

```typescript
/**
 * CTSSlowMotion::KeyValue — handles level-designer key/value pairs for the
 * slow-motion trigger entity. Recognises "slowamt" (the time-scale multiplier
 * applied to the player) and a second key (the slow-motion duration or a
 * related timing field), parses each value with strtod, and stamps the
 * KeyValueData payload as handled iff a key matched. If neither key matches,
 * fHandled is cleared so the engine falls through to the base
 * CBaseEntity::KeyValue path.
 *
 * @param this          The CTSSlowMotion entity instance
 * @param keyValueData  Engine-supplied {szKeyName, szValue, fHandled} pair
 * @returns             void
 */
export function KeyValue(this: CTSSlowMotion, keyValueData: KeyValueData_s): void {
  if (keyValueData.szKeyName === "slowamt") {
    this.m_flSlowAmt = parseFloat(keyValueData.szValue);
    keyValueData.fHandled = 1;
    return;
  }
  // TODO(asm-ambiguous): second key name inferred as "slowtime" — confirm by
  // looking up the string at GOT offset (ebx - 0x6eebd) in
  // tools/decompile/analysis/strings-n5.txt, where ebx = 0x166e10.
  if (keyValueData.szKeyName === "slowtime") {
    this.m_flSlowTime = parseFloat(keyValueData.szValue);
    keyValueData.fHandled = 1;
    return;
  }
  keyValueData.fHandled = 0;
}
```

Two notes on the decompilation choices:

- **Field names (`m_flSlowAmt` / `m_flSlowTime`)** — both `fstp DWORD` writes go to two adjacent 4-byte slots at `this+0xf8` and `this+0xfc`, and both come from `__strtod_internal`, so they're floats. `slowamt` is the most idiomatic match for the first write (the multiplier); the second is most plausibly the duration. Both names are inferences; the binary string for the second key is the one ambiguity.
- **Parser choice (`parseFloat` vs `strtod`)** — the C++ call is `__strtod_internal(szValue, NULL, 0)`. `parseFloat` matches that semantics (stops at first non-parseable char, returns NaN on no leading digits) and is the idiomatic TS equivalent; no need to import a C-string-compat helper.

What I couldn't do, briefly:
- I could not write the file at `tools/decompile/cross-vendor/CTSSlowMotion__KeyValue_p_KeyValueData_s__codex.ts` that the polling script is watching — the sandbox is `read-only` (`filesystem` permission profile is restricted to `read`), and the approval policy is `never`, so I can't escalate to a write either. The polling script will time out without finding a file. Copy the code block above into that path manually if you want the watcher to pick it up.
- I could not read `tools/decompile/analysis/strings-n5.txt` to confirm the second key name. Every `exec_command` session I started returned no stdout (only the echoed command line), so I couldn't look up either the cvar strings or any existing decompilation examples. The TODO comment above is where to plug in the verified name.
