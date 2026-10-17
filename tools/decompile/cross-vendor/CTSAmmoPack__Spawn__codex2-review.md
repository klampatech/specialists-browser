# Code review — `CTSAmmoPack::Spawn`

## Domain note (important)

The HLSDK reference and review checklist are scoped to the **4 mod↔engine entry
points** (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`,
`GetNewDLLFunctions`). `CTSAmmoPack::Spawn` is **not** one of those — it's a
gameplay entity method. Items 1–4 of the checklist don't apply directly. I'm
reviewing against the disassembly + general TS idiom fitness instead.

---

## VERDICT: FAIL

One real correctness bug (step 2, off-by-one indirection level) plus a few
secondary issues. The bulk of the TS is faithful to the disassembly.

### Checklist

1. **Signature — ✅ pass.** Disassembly shows a parameterless void method
   (caller pushes only `this`; body ends with `pop esi; pop ebx; ret`).
   TS: `function Spawn(this: CTSAmmoPack): void` matches.

2. **Version check — N/A.** Not a `GetEntityAPI*` or
   `GetNewDLLFunctions` function.

3. **`*interfaceVersion` assignment-back — N/A.**

4. **Success path: struct copy — N/A.** No engine table copy here.

5. **No fabricated paths — ⚠️ mostly clean, but one real bug.**
   Steps 3–9 mirror the disassembly faithfully. Step 2 (the
   `pfnSetModel` call) drops one level of indirection. Detail below.

6. **No comment-only TODO body — ✅ pass.** Body is real code (calls,
   assignments, FPU-style arithmetic). The `TODO(asm-ambiguous)`
   markers are appropriate per the conversion guidance.

7. **Field names — ⚠️ mostly placeholder, with one internal
   contradiction.** Many `field_0xXXX` placeholders
   (`field_0x60`, `field_0x208`, `field_0xc`, `field_0x10`,
   `field_0x14`, `field_0x18`, `pev.field_0x250`,
   `pev.field_0x1bc`, `pev.field_0x198`, `pev.field_0x104`,
   `pev.field_0x108`, `pev.field_0x10c`). Acceptable for D.3 — we
   don't have the class def yet. **However**, the step-2 comment
   says `[esi+0x208]` but the code reads `this.field_0x208`,
   while the actual disassembly is `push [ecx+0x208]` with
   `ecx = [esi]`. The comment and the code disagree, and both
   disagree with the assembly.

8. **Compiles in isolation — ❌ fail.** Uses `CTSAmmoPack`,
   `g_engfuncs`, `UTIL_SetOrigin`, `UTIL_SetSize`,
   `CVAR_AMMO_PACK_*`, `MODEL_NAME_RODATA` — none defined in this
   snippet. Per the conversion guidance, unknowns should be
   `any`. Either swap to `any` or declare stub interfaces.

---

### Issues to fix

**1. Step 2 — wrong indirection level (real bug).**

Disassembly:

```asm
91405: mov esi, [esp+0x40]     ; esi = this
...
91416: mov ecx, [esi]          ; ecx = *(this+0)  ← one dereference
91418: mov edx, [ebx+0x1aa8]   ; edx = g_engfuncs
9141e: lea eax, [ebx-0x6bcd4]  ; eax = model_name string
91424: push eax                 ; arg2 = model_name
91425: push [ecx+0x208]         ; arg1 = *(ecx+0x208) = *(*(this+0)+0x208)
9142b: call [edx+0x8]           ; pfnSetModel
```

That's **two** levels of indirection from `this`: first through
whatever is at offset 0 (most naturally `pev`), then through
offset 0x208 in that struct. The TS code

```typescript
g_engfuncs.pfnSetModel(this.field_0x208, MODEL_NAME_RODATA);
```

is only **one** level (`*(this+0x208)`), and would compile to
`push [esi+0x208]`, which is not what the binary does. The fix is
to walk through the first field explicitly:

```typescript
g_engfuncs.pfnSetModel(this.pev.field_0x208, MODEL_NAME_RODATA);
```

(assuming `[esi]=pev`, which is consistent with how `[esi]` is
read as the first argument to `UTIL_SetOrigin`, `UTIL_SetSize`,
etc. later in the function).

**2. Step 2 — comment-vs-code mismatch.** The inline comment
refers to `[esi+0x208]`, but the assembly reads `[ecx+0x208]` with
`ecx = [esi]`. The comment misreads the indirection. Worth
correcting so D.4 reviewers don't propagate the mistake.

**3. `pev.field_0xXXX` for large offsets is plausible but
unverified.** Offsets like `0x108`, `0x10c`, `0x198`, `0x1bc`,
`0x250` are all beyond the canonical HL1 `entvars_t` (which ends
~`0x15c`). This means either TS extends `entvars_t` or these slots
are owned by something else (engine-private extension, custom
mod-side struct). Mark them as D.4 work — current placeholders
are fine.

**4. Standalone compilation.** Either parameterize all unknowns
as `any` or declare stub interfaces. Quickest fix:

```typescript
declare const this: any;
declare const g_engfuncs: any;
declare function UTIL_SetOrigin(...args: any[]): void;
declare function UTIL_SetSize(...args: any[]): void;
declare const CVAR_AMMO_PACK_SIZE: number;
// ... etc.
declare const MODEL_NAME_RODATA: string;
```

**5. Minor: `UTIL_SetOrigin` arg form.** Disassembly pushes
`(pev, pev+8)` — i.e. `&pev->origin`, not `pev.origin` by value.
For a `Vector` passed as `const Vector&` this is a non-issue, but
the inline comment says `&pev->origin` while the TS passes the
value. Doesn't affect correctness; flagged for tidiness.

---

### Suggested rewrite (full TS function)

```typescript
/**
 * CTSAmmoPack::Spawn — initialize a CTSAmmoPack entity on spawn.
 * Mirrors `Spawn__11CTSAmmoPack` @ 0x000913f4 (329 B) in ts_i386.so.
 *
 * @param this  CTSAmmoPack instance.
 */
export function Spawn(this: CTSAmmoPack): void {
  // PIC / GOT setup: ebx = 0x101e10 by the prologue.
  // All [ebx±offset] accesses below resolve to globals (cvars,
  // engine function table, rodata constants).

  // ── 1. Parent-class virtual call ────────────────────────────
  // eax = [esi+0x60] (vtable ptr, possibly a secondary MI base);
  // call [eax+0x28] (vtable[10]) with `this` as arg1.
  // TODO(asm-ambiguous): what exactly is at offset 0x60 — true MI
  // sub-object vtable, or a hand-rolled interface table. D.4.
  this.callBaseVFunc(0x28, this);

  // ── 2. SET_MODEL via g_engfuncs.pfnSetModel ─────────────────
  // Disassembly:
  //   ecx   = *(this+0)               ← first field of `this`, i.e. pev
  //   edx   = *(ebx+0x1aa8)           ← g_engfuncs
  //   eax   = lea [ebx-0x6bcd4]       ← rodata: model name
  //   push eax                        ← arg2 = model name
  //   push [ecx+0x208]                ← arg1 = *(pev+0x208)  (TWO LEVELS)
  //   call [edx+0x8]                  ← pfnSetModel at offset 8
  // The TS as supplied read this as `this.field_0x208` (one level)
  // — fixed below to walk through `pev` first.
  // TODO(decompile-D.4): `pev+0x208` is beyond standard entvars_t;
  // identifies the TS-extended slot and the meaning of the value
  // stored there (likely an entvars_t* to a target entity).
  g_engfuncs.pfnSetModel(this.pev.field_0x208, MODEL_NAME_RODATA);

  // ── 3. Visual properties on pev ─────────────────────────────
  this.pev.colormap = 6;   // pev+0x108 (TS-extended)
  this.pev.skin     = 2;   // pev+0x10c (TS-extended)

  // ── 4. UTIL_SetOrigin(pev, &pev->origin) ────────────────────
  // push (pev+8); push pev; call UTIL_SetOrigin
  // (pev+8 == &pev->origin because origin is the 2nd Vector field
  // at offset 8 in entvars_t.)
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // ── 5. UTIL_SetSize(pev, mins, maxs) — uniform cube ─────────
  // Half-extent is the cvar/constant at [ebx-0x6f408].
  // mins = maxs = (half-extent, half-extent, half-extent).
  // TODO(asm-ambiguous): [ebx-0x6f408] — TS-specific size cvar or
  // compile-time constant. D.4.
  const halfExtent: number = CVAR_AMMO_PACK_SIZE;
  const cube: any = { x: halfExtent, y: halfExtent, z: halfExtent };
  UTIL_SetSize(this.pev, cube, cube);

  // ── 6. Wait-time clamp + random offset ─────────────────────
  // base = float at [ebx+0x16a4]+0xc (cvar/global)
  // min  = float at [ebx-0x6d368]
  // max  = float at [ebx-0x6e818]
  // rand = float at *(*([ebx+0x1600]))         ← double-deref cvar chain
  // Result at this+0xa4 (interpreted here as `m_flWaitTime`).
  // Disassembly: X = clamp(base, min, max); m_flWaitTime = X + rand.
  // TODO(decompile-D.4): resolve those four globals via strings-n5.txt.
  const baseWait = CVAR_AMMO_PACK_BASE_WAIT;
  const minWait  = CVAR_AMMO_PACK_MIN_WAIT;
  const maxWait  = CVAR_AMMO_PACK_MAX_WAIT;
  const randOff  = CVAR_AMMO_PACK_RANDOM;
  this.m_flWaitTime =
    Math.max(minWait, Math.min(maxWait, baseWait)) + randOff;

  // ── 7. Custom CTSAmmoPack state fields ─────────────────────
  // 0x14/0x18  → zero
  // 0xc        → 0xffff0000 (16-bit zero + 16-bit all-ones, set via
  //             `mov ax,0; or eax,0xffff0000`)
  // 0x10       → cvar at [ebx+0x1a14]
  // TODO(decompile-D.4): identify the 0xc/0x10/0x14/0x18 fields.
  this.field_0xc  = 0xffff0000;
  this.field_0x10 = CVAR_AMMO_PACK_STATE;
  this.field_0x14 = 0;
  this.field_0x18 = 0;

  // ── 8. Schedule the first think ───────────────────────────
  // ST0 = double at [ebx-0x6ecd8] (= 2.5); ST0 += float at
  // *(*([ebx+0x1600])) (same indirection as #6's randOff);
  // store to pev+0x104 (nextthink).
  // TODO(decompile-D.4): which cvar — possibly ts_ammo_pack_nextthink?
  this.pev.nextthink = CVAR_AMMO_PACK_NEXT_THINK + 2.5;

  // ── 9. TS-extended flag fields on pev ─────────────────────
  // pev+0x250 : cleared, then OR-ed with 0x2
  // pev+0x1bc : cleared
  // pev+0x198 : cleared
  // All beyond canonical entvars_t (~0x15c).
  // TODO(decompile-D.4): identify each flag field.
  this.pev.field_0x250 = 0;
  this.pev.field_0x250 |= 0x2;
  this.pev.field_0x1bc  = 0;
  this.pev.field_0x198  = 0;
}
```

---

### Bottom line

- **Don't merge as-is.** Step 2 needs `this.pev.field_0x208` not
  `this.field_0x208` — this is a real correctness bug that will
  diverge from the binary if compiled.
- The other 8 steps are faithful, the comments are well-placed, and
  the placeholder field naming is appropriate for a D.3
  decompilation that hasn't seen the C++ class def yet.
- Once `pev+0x208` (and the 5 other TS-extended slots) get proper
  names from D.4, the placeholder `field_0xXXX` should be replaced
  everywhere — but that's a separate task.
