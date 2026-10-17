**VERDICT: PASS-WITH-NOTES**

The disassembly provided is for `CTSShrapnel::Spawn` (a gameplay entity method), not for an engine↔mod interface function. Items 2, 3, and 4 of the checklist are explicitly scoped to `GetEntityAPI*` / `GetNewDLLFunctions` and are **N/A** here. I've evaluated the rest of the checklist against the disassembly.

---

**Checklist:**

1. **Signature — ✅** — `Spawn(this: CTSShrapnel): void` matches the demangled symbol `CTSShrapnel::Spawn()`. Disassembly loads `this` from `[esp+0x40]` (after `push esi; push ebx; sub esp, 0x34`); never writes a return value. ✓

2. **Version check — N/A** — Not applicable; this is a gameplay method, not an engine interface function.

3. **`*interfaceVersion` assignment — N/A** — Not applicable.

4. **Success path / struct copy — N/A** — Not applicable. (The closest analog is the `UTIL_SetSize(pev, mins, maxs)` call that writes a Vector pair into `pev->mins` / `pev->maxs`. Maps correctly.)

5. **No fabricated paths — ✅** — The disassembly is branchless (no jumps, no conditional flow). TS is a linear sequence that mirrors the disassembly step-for-step. No invented control flow.

6. **No TODO body — ⚠️** — The body is real code, not a `// TODO` stub. Two inline `TODO(asm-ambiguous):` comments and one `/* modelName */ ""` placeholder remain — they document genuine ambiguity rather than skipping logic. Mostly fine.

7. **Field names — ⚠️** —
   - **Correct:** `gpGlobals`, `pev`, `pev.scale` (0x11C), `pev.body` (0x108), `pev.skin` (0x10C), `pev.next_think` (0x104), `pev.spawnflags` (0x118), `pev.eflags` (0x250), `pev.fuser4` (0x254) — all map to known HLSDK `entvars_s` offsets.
   - **Suspect:** `pev.scale2` at 0x120. `scale2` is not a standard HLSDK field. In standard `entvars_s`, 0x120 is more typically `maxs[0]` (which would be overwritten by the immediately-following `UTIL_SetSize`). Treat as a TODO until the TS-specific `entvars_s` layout is verified.
   - **Speculative class fields:** `m_iCachedA/B/C/D` at offsets 0xc, 0x10, 0x14, 0x18 and `m_flWaitThinkTime` at 0x88 — names are reasonable guesses, but their *purposes* aren't deducible from this function alone. The values `0x460000 / 0x60 / 0x490000 / 0x60` look like they could be `string_t` indices (since `string_t` is 32-bit in HLSDK) or shrapnel-type tag pairs; worth cross-referencing `tools/decompile/analysis/strings-n5.txt`.

8. **Compiles in isolation — ❌** — Uses undefined helpers: `CTSShrapnel` (class type), `CTSPhysicObject.Spawn`, `SET_MODEL`, `UTIL_SetSize`, `Vector`, `Vector.zero`, `gpGlobals`, `WAIT_THINK_DELAY`. None defined in this snippet. Per the prompt's "no external type references we don't define here" rule, this needs stubs or `any`.

---

**Issues to fix:**

- **SET_MODEL first argument is wrong.** Disassembly: `push [ecx+0x208]` then `push modelName` then `call [edx+0x8]`. `ecx = pev`, so the first arg is `pev->field_at_0x208`, **not `pev` itself**. The TS writes `SET_MODEL(this.pev, …)`, which misrepresents the call. Either resolve `[pev+0x208]` against the TS-specific `entvars_s` layout, or mark it as a TODO. (Standard HLSDK `entvars_s` doesn't extend to 0x208, so this is a TS-specific field.)
- **`m_iCachedB = 0x60` and `m_iCachedD = 0x60` are unsafe.** Disassembly emits `mov cx, 0x60; mov edx, ecx; mov [esi+0x10], edx`. `ecx` is caller-saved across the intervening `UTIL_SetSize` call, so its high 16 bits are **not guaranteed zero**. The TS reviewer's own TODO says "assumed zero" — but "assumed" ≠ "known." In TS, `number = 0x60` zero-extends at the language level, which is **stricter than the assembly**. Either note that this write only sets the low 16 bits (and rely on a static initializer to keep the upper bits zero), or type the field as `uint16`. Flag this as a deliberate divergence from the disassembly.
- **`pev.scale2` at 0x120 is unverified.** As above — verify the TS `entvars_s` layout. If 0x120 is `maxs[0]`, the write is a no-op (immediately overwritten by `UTIL_SetSize`); rename or remove.
- **`m_iCachedA/C = 0x460000 / 0x490000`** look like `string_t` indices. Worth cross-referencing `tools/decompile/analysis/strings-n5.txt` to see if 0x46 and 0x49 are real string-table slots.
- **Model name placeholder.** Empty string at `[ebx-0x6e067]` is a TODO, not a value.
- **Doesn't compile in isolation.** Helpers undefined.

---

**Suggested rewrite:**

```typescript
/**
 * CTSShrapnel::Spawn — initialize a freshly-created shrapnel entity.
 *
 * Decompiled from ts/dlls/ts_i386.so.
 * See tools/decompile/chunks/Spawn__11CTSShrapnel.chunk.md.
 */
export function Spawn(this: CTSShrapnel): void {
  // Compiler-generated PIC/GOT base is in EBX after the prologue:
  //   call $+5; pop ebx; add ebx, 0xf9d66
  // After this, [ebx ± N] reads globals / GOT entries.

  // ── 1. Parent spawn (CTSPhysicObject::Spawn) ─────────────────────
  CTSPhysicObject.Spawn(this);

  // ── 2. Attach model ──────────────────────────────────────────────
  // Disassembly: push [ecx+0x208]; push modelName; call pfnSetModel
  //   ecx = pev, so first arg is pev->field_at_0x208, NOT pev itself.
  // TODO(asm-ambiguous): identify the field at pev+0x208. Standard HLSDK
  // entvars_s doesn't extend to 0x208, so this is a TS-specific pointer  // (likely a "containing entity" override or owner pointer).
  SET_MODEL(
    /* pev+0x208 (unknown TS field) */ this.pev as any,
    /* modelName from [ebx-0x6e067] */ ""  // TODO: look up in strings-n5.txt
  );

  // ── 3. Visual scale + body/skin ──────────────────────────────────
  this.pev.scale = 1.0;       // [pev+0x11c]
  // TODO(verify): [pev+0x120] — likely maxs[0] in HLSDK (overwritten by
  // UTIL_SetSize below), not a TS "scale2". Cross-check entvars_s layout.
  this.pev.body = 10;         // [pev+0x108]
  this.pev.skin = 2;          // [pev+0x10c]

  // ── 4. Bounding box (point-sized) ────────────────────────────────
  // Disassembly loads a 3-float Vector from [ebx-0x6f408] and uses it
  // for BOTH mins and maxs. Treat the constant as a TODO until we read
  // it from the data section.
  const bounds: Vector = /* Vector at [ebx-0x6f408] */ Vector.zero;
  UTIL_SetSize(this.pev, bounds, bounds);

  // ── 5. Cached identifier pairs (class fields at this+0xc..0x18) ──
  // Disassembly emits `mov cx, 0x60; mov edx, ecx; mov [esi+0x10], edx`
  // which only writes the LOW 16 bits. ecx is caller-saved across the
  // UTIL_SetSize call, so its high 16 bits are NOT guaranteed zero.
  // In TS we zero-extend at the language level — STRICTER than asm.
  // The fields are speculative; values 0x460000/0x490000 look like
  // string_t indices. TODO(asm-ambiguous): purpose unclear.
  this.m_iCachedA = 0x460000;   // [this+0xc]  — 32-bit write
  this.m_iCachedB = 0x60;       // [this+0x10] — 16-bit write (low only)
  this.m_iCachedC = 0x490000;   // [this+0x14] — 32-bit write
  this.m_iCachedD = 0x60;       // [this+0x18] — 16-bit write (low only)

  // ── 6. Schedule the first WaitThink ──────────────────────────────
  this.pev.next_think    = gpGlobals.time;                  // [pev+0x104]
  this.m_flWaitThinkTime = gpGlobals.time + WAIT_THINK_DELAY;  // [this+0x88]

  // ── 7. Gameplay flags ────────────────────────────────────────────
  this.pev.fuser4     = 1.0;     // [pev+0x254]
  this.pev.eflags     = 0x4;     // [pev+0x250]: cleared then |= 0x4
  this.pev.spawnflags |= 0x80;   // [pev+0x118]: |= 0x80 (TS-specific)
}
```

**Bottom line:** the body faithfully tracks the disassembly, but the SET_MODEL first-arg error and the `m_iCachedB/D` upper-bit ambiguity are real bugs in the TS that need either resolution or stronger TODO language. Item 8 (compilation in isolation) requires the helpers to be defined elsewhere — acceptable if this file is consumed alongside the rest of the codebase, but a fail for strict in-isolation review.
