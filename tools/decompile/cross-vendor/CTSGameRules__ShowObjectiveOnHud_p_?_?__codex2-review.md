VERDICT: **PASS-WITH-NOTES**

The decompiled TS captures the function's behavior faithfully — the 2-byte HUD message burst (FindIndexByObjective → MessageBegin(4-arg) → WriteByte(index) → WriteByte(show?1:0) → MessageEnd) is correct. The issues are all in comments / placeholders, not in logic. Code-level structure is sound.

---

**Checklist**

1. **Signature — ✅** The demangled symbol `ShowObjectiveOnHud__12CTSGameRulesP12CTSObjectiveb` decodes to `CTSGameRules::ShowObjectiveOnHud(CTSObjective*, bool)`. The TS signature `(this: CTSGameRules, pObjective: CTSObjective, show: boolean): void` matches. `__12CTSGameRules` → `CTSGameRules`, `P12CTSObjective` → `CTSObjective*`, trailing `b` → `bool`. Pass.

2. **Version check — N/A** — This is not one of the engine↔mod interface exports (GiveFnptrsToDll / GetEntityAPI{2} / GetNewDLLFunctions). The checklist item doesn't apply. (Skipped, not failing.)

3. **`*interfaceVersion` assignment-back — N/A** — Same reason. (Skipped, not failing.)

4. **Success path — ✅** — There's no `memcpy` here (this function sends an engine message rather than copying an interface table). The equivalent "data flow" — engine writes its message via `pfnMessageBegin`/`pfnWriteByte`/`pfnMessageEnd` — is captured faithfully. Pass.

5. **No fabricated paths — ⚠️** — The 6-step message burst is correct. However, the explanatory comment is wrong on a subtle point:
   - **FindIndexByObjective push order.** The comment "the asm pushes [esp+0x1c] (the bool arg) twice" is incorrect. Standard MSVC right-to-left pushes `show` first (at `[esp+0x1c]` *before* any inner push) then `pObjective` (at the same offset after `esp` shifted by 4). So the two pushes are `show`, `pObjective` — not "twice the bool." The demangled symbol `FindIndexByObjective__12CTSGameRulesP12CTSObjective` only takes `CTSObjective*`, so the `show` arg is a stack-alignment artifact that's discarded by FindIndexByObjective. The actual TS code `this.FindIndexByObjective(pObjective)` is correct.

   The TS code itself is faithful to the disassembly — only the in-line comment is wrong.

6. **No TODO body — ✅** — The body is real code; TODOs are inline annotations, not the bulk of the function. Pass.

7. **Field names — ⚠️** — Several concerns:
   - `GOT_0x1884` / `GOT_0x1aa8` are not real TS identifiers. They're placeholder names for `[ebx+0x1884]` (local-player handle) and `[ebx+0x1aa8]` (engine-funcs vtable) — needs cross-check against `tools/decompile/analysis/strings-n5.txt` and the mod's actual globals. Most likely candidates are something like `g_pLocalPlayer` and `g_engfuncs` (or per-mod names).
   - The vtable access style `pEngine.vtable[0xb8](...)` is verbose and not idiomatic. The offsets `[esi+0xb8]/[0xc0]/[0xbc]` *probably* correspond to `pfnMessageBegin` / `pfnWriteByte` / `pfnMessageEnd` per HLSDK's `enginefuncs_t`, but the offset positions depend on the TS build. Verify against TS's exact `enginefuncs_t` enum order.
   - `pPlayer[0]` does capture the disassembly's `push DWORD PTR [eax]` (single dereference of a pointer-to-pointer). Whether that's the right value to pass as the recipient depends on whether `[ebx+0x1884]` is an `edict_t**` (then `pPlayer[0]` resolves to `edict_t*`, correct) or an `edict_t*` (then `pPlayer[0]` would read `edict.v`, an `entvars_t*`, which would be wrong). Needs a peek at the global's actual type.

8. **Compiles in isolation — ❌** — Fails. The function relies on:
   - `CTSGameRules` (class type) — undefined
   - `CTSObjective` (class type) — undefined
   - `GOT_0x1884` / `GOT_0x1aa8` — undefined; also not valid TS identifiers
   - `pEngine.vtable[...]` — `vtable` is undefined on `pEngine`
   
   To compile, you'd need stub declarations like:
   ```typescript
   declare const __GLOBAL_player: any;
   declare const __GLOBAL_engine: any;
   ```

---

**Issues to fix**

- **Comment accuracy (FindIndexByObjective).** The "twice the bool" comment is wrong. The disassembly pushes `show` then `pObjective`; the `show` arg is stack-alignment padding that `FindIndexByObjective` discards (its demangled symbol only takes `CTSObjective*`). The TS *code* (`this.FindIndexByObjective(pObjective)`) is correct; only the prose comment misrepresents the assembly.
- **Message-type literal.** `0x2` is faithfully taken from the disassembly, but the comment `MSG_ONE (msgtype = 2)` may be a TS-specific enum and not match HL1's standard `MSG_ONE=1, MSG_ALL=2`. If HL1's standard is in use here, this is `MSG_ALL` (broadcast), not `MSG_ONE`. Cross-check TS's enginefuncs_t + the actual MSG_* defines in `tools/decompile/references/` before labeling it as `MSG_ONE`.
- **Player-handle dereference.** `pPlayer[0]` does capture `push DWORD PTR [eax]`, but whether `[ebx+0x1884]` is `edict_t**` (then `[eax]` is `edict_t*` — what `pfnMessageBegin` expects) or `edict_t*` (then `[eax]` is `edict_t.v` = `entvars_t*` — wrong) depends on the global's true type. Without resolving the global, the recipient argument is a guess.
- **Placeholder identifiers.** `GOT_0x1884` / `GOT_0x1aa8` don't compile in TS. Either resolve to real symbol names or use `any`-typed stubs with explicit TODO comments.
- **Verbose vtable access.** `pEngine.vtable[0xb8](...)` should become `pEngine[0xb8](...)` or a properly typed `pEngine.pfnMessageBegin(...)` once `enginefuncs_t` is wired up in D.5.
- **Origin args are zero, not vector.** The TS passes `(2, pPlayer[0], 0, 0)` for the 4-arg MessageBegin. In HL1's `pfnMessageBegin(int msg_type, edict_t *pPlayer, const float *pOrigin, int flags)` signature, the third arg is a `float*` (pointer to vec3). Passing the integer `0` instead of a zero-vec3 is technically undefined in C, but in practice on x86 the engine reads three floats from that address — if `[0]` is a valid read (likely SIGSEGV) or if the engine treats NULL specially. Worth a comment that the original asm passed `0` literally (probably a NULL pointer that the engine interprets as "no origin").

---

**Suggested rewrite**

```typescript
// Stubs (would live in the actual project; declared here so the function compiles):
declare const __GLOBAL_player: any;
declare const __GLOBAL_engine_funcs: any;

interface CTSObjective { /* TODO(D.4) — fields TBD */ }
interface CTSGameRules {
  FindIndexByObjective(pObjective: CTSObjective): number;
}

/**
 * CTSGameRules::ShowObjectiveOnHud — emit a 2-byte HUD message to inform
 * the local client of an objective's show/hide state.
 *
 * Disassembly flow:
 *   1. FindIndexByObjective(pObjective) → index.
 *      (The asm pushes both `show` and `pObjective` for this call; the
 *      symbol only consumes `pObjective`; `show` is stack-alignment padding.)
 *   2. Load engine globals via ebx+GOT:
 *        [ebx+0x1884] -> local player
 *        [ebx+0x1aa8] -> engine-funcs dispatch vtable
 *   3. pfnMessageBegin(msgtype=2, *player, 0, 0)  [4 args]
 *   4. pfnWriteByte(index)
 *   5. pfnWriteByte(show ? 1 : 0)                 (asm: `setne al` after cmp)
 *   6. pfnMessageEnd()
 *
 * @param this       CTSGameRules instance (thiscall: `this` in ECX)
 * @param pObjective The objective whose HUD state to update
 * @param show       true = show on HUD, false = hide
 */
export function ShowObjectiveOnHud(
  this: CTSGameRules,
  pObjective: CTSObjective,
  show: boolean,
): void {
  // 1. Look up the objective's slot index.
  //    asm: push show; push pObjective; call FindIndexByObjective; add esp,0x10
  //    (the `show` push is stack alignment; FindIndexByObjective ignores it.)
  const index: number = this.FindIndexByObjective(pObjective);

  // 2. Engine globals via GOT (ebx = 0x105e10 in the disassembled binary).
  //    TODO(D.4): resolve [ebx+0x1884] and [ebx+0x1aa8] against the mod's
  //    actual globals (likely `g_pLocalPlayer` / `g_engfuncs`).
  const pPlayer = __GLOBAL_player;
  const pEngine = __GLOBAL_engine_funcs;

  // 3. Begin a 2-payload-byte message targeting *pPlayer.
  //    asm: push 0; push 0; push [eax]; push 0x2; call [esi+0xb8]
  //    The literal `0x2` is the msg_type. Whether TS's enum uses
  //    MSG_ONE=1 / MSG_ALL=2 (HL1 standard) or its own mapping needs
  //    confirmation against the actual enginefuncs_t header.
  pEngine[0xb8](2, pPlayer, 0, 0);

  // 4. WRITE_BYTE(index). asm: mov [esp],edi; call [esi+0xc0]
  pEngine[0xc0](index);

  // 5. WRITE_BYTE(show ? 1 : 0).
  //    asm: mov eax,0; cmp BYTE PTR [esp+0x24],0; setne al; push eax;
  //         call [esi+0xc0]
  pEngine[0xc0](show ? 1 : 0);

  // 6. End the message. asm: call [esi+0xbc]; add esp,0x10
  pEngine[0xbc]();
}
```

**Summary for the next T3 thread:** This function is shaped correctly (the message-burst structure is exactly what the disassembly does). What's left:

1. Resolve `[ebx+0x1884]` and `[ebx+0x1aa8]` against actual TS globals (D.4 task).
2. Verify whether `0x2` is MSG_ONE or MSG_ALL in TS's enum (cross-check `enginefuncs_t`).
3. Verify `[ebx+0x1884]`'s type so `pPlayer[0]` vs. bare `pPlayer` is correctly chosen.
4. Replace the GOT_*-prefixed placeholders with real symbol names or proper TS stubs.
5. Fix the FindIndexByObjective push-order comment (currently claims "twice the bool"; actually `show` then `pObjective`).

None of these are blocked; all are answerable from the disassembly + a peek at the actual TS global symbols in the .so.
