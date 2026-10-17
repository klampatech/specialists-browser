Note up front: the 8-point checklist above is calibrated for the 4 HLSDK entry points (`GiveFnptrsToDll`, `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`). The function under review is `CTSMapGlobals::Spawn`, a C++ member function — not one of those 4 entry points. Items 1–4 don't apply verbatim, so I'm reviewing them in the analogous shape they have for a vanilla HLSDK-style `CBaseEntity::Spawn`.

---

```
VERDICT: PASS-WITH-NOTES

Checklist (re-mapped for a CBaseEntity::Spawn-shaped function):
1. Signature — ✅ — `Spawn(this: CTSMapGlobals): void` matches the demangled
   symbol `CTSMapGlobals::Spawn()` and the class context table at 0x00062534
   (size 264 B). Arg-count from `[esp+0x40]` is `this` only — `void` return
   is correct (no `eax` propagated to caller, function ends in `ret`).
   Conversion-guidance says "one function decl, not the full class", so
   exporting `Spawn` as a free function with explicit `this` is acceptable.

2. Version check — ⚠️ N/A for this function — there is no
   `*interfaceVersion` in `Spawn`. Re-evaluated against the analogous HLSDK
   shape: a `CBaseEntity::Spawn` body should reset pev button/effects,
   zero instance state, schedule a first think, and propagate spawnflags
   to game-rules. All of that is present. No fabricated `if (version) ...`
   path has been inserted.

3. *interfaceVersion assignment — ⚠️ N/A — same reason. Confirmed there is
   no spurious `interfaceVersion` plumbing in the body — the decompile did
   not invent one. ✓ for "no fabricated paths".

4. Success path — ✅ — Every state-setting step in the disassembly is
   captured:
     - vmethod call on [esi+0x60] → `this.subEntity_0x60.vmethod_0x28(this)`
     - pev+0x108 = 0                 → `pev.button = 0`
     - pev+0x10C = 0                 → `pev.effects = 0`
     - UTIL_SetOrigin(pev, pev+0x08) → `UTIL_SetOrigin(pev, pev.origin)`
     - UTIL_SetSize(pev, 0,0,0, 0,0,0) → `UTIL_SetSize(pev, vec3_origin, vec3_origin)`
     - this+{0x14,0x18,0x0C,0x10} = 0 → four dword clears (order is
       permuted in TS, which is fine — STOREs commute)
     - pev+0x104 = gpGlobals.time + K → `pev.nextthink = gpGlobals.time + K`
       (K loaded qword, fadd-ed dword, fstp'd dword; the FPU funnel is
       fine to abstract to scalar arithmetic in TS)
     - g_pGameRules+0x10  = ((sf>>5)^1)&1  ✓ matches `shr 5; xor 1; and 1`
     - g_pGameRules+0x5885 = (sf>>6)&1     ✓ matches `shr 6; and 1`
     - g_pGameRules+{+0x586C,+0x5870} = wr ✓ (stored in +0x5870 then +0x586C)
     - g_pGameRules+{+0x5874,+0x5875} = 0  ✓

5. No fabricated paths — ⚠️ needs review — see "Issues" below. The virtual
   call at 0x62551 is `call DWORD PTR [eax+0x28]` after a single
   `push esi`, with NO `mov ecx, eax` preceding it. Under MSVC __thiscall
   that means the called method's implicit `this` is whatever ECX held at
   function entry (the outer `this` = `esi`), NOT the subobj. The TS
   represents it as `this.subEntity_0x60.vmethod_0x28(this)`, which makes
   subobj the implicit `this` and the outer `this` the explicit arg — i.e.
   the opposite assignment. This is a common decompilation shorthand for
   "call vtable[0x28] on this->field with this as arg", but it's worth
   flagging.

6. No TODO body — ✅ — the body is real code. The TODOs are scoped inline
   comments next to ambiguous mappings (offsets / subobj type / K constant),
   not stubbing out logic.

7. Field names — ⚠️ needs review — `pev.button`, `pev.effects`,
   `pev.nextthink`, `pev.spawnflags`, `pev.origin` all map to documented
   GoldSrc `entvars_t` slots (+0x108 / +0x10C / +0x104 / +0x1A0 / +0x08).
   TS-may-shift offsets is correctly flagged as TODO. The remaining
   `field_0x0C`, `field_0x586C`, etc. are acknowledged placeholders per
   the conversion guidance ("we don't reconstruct the full class yet").

8. Compiles in isolation — ❌ — `CTSMapGlobals` is referenced in the
   signature but not declared; same for `pev: entvars_s` (the field
   accesses would only work if `pev` is `any`, not on a typed struct),
   `gpGlobals`, `g_pGameRules`, `UTIL_SetOrigin`, `UTIL_SetSize`,
   `vec3_origin`, `WAIT_THINK_DELAY_K`. The decompile needs `declare`
   shims or `any`-typed locals to compile standalone. Suggested rewrite
   below adds them.
```

---

### Issues to fix

1. **Implicit-`this` for the vtable call (item 5, ⚠️).** The disassembly
   doesn't `mov ecx, eax` before `call [eax+0x28]`, so the called method's
   implicit `this` is the *outer* instance, with `esi` (`this`) pushed as
   an explicit arg. The current TS inverts that. If we keep the call's
   explicit arg = outer `this` and the implicit `this` on the called
   method = outer `this` too, we should write the call as a non-method
   shape: pass subobj as the receiver but document the ambiguity.

   In practice for a higher-level decompile, the vtable call's exact
   `this`-binding is a TODO(asm-ambiguous) — flag it and move on. Don't
   silently pick the wrong convention.

2. **Won't compile in isolation (item 8, ❌).** Needs ambient declarations
   for the symbols it touches, or `any`-typed locals.

3. **Minor:** the TS comments the offsets (`+0x108 == pev.button`,
   `+0x10C == pev.effects`, `+0x08 == pev.origin`) as ambiguous. They are
   actually canonical GoldSrc `entvars_t` offsets. The TODO can be
   downgraded or removed for those three — it's a known-good mapping,
   not TS-specific.

4. **Minor:** `(pev as any).origin` cast — `pev` is already `any` if you
   follow the standalone-shape suggestion, so the inner cast is redundant.
   Also, `pev.origin` passes by value; the C++ takes `const Vector &`. As
   long as the engine binding marshals vectors by ref, this works, but
   a tighter expression would be `pev.origin` (no cast) once `pev` is
   `any`.

5. **Minor:** `K` is loaded qword (double) then fadd-ed dword (single);
   the TS treats it as a plain numeric scalar. That's an acceptable
   abstraction, but the comment should note K is double-precision at the
   asm boundary.

---

### Suggested rewrite (compiles standalone, ambiguous-this flagged)

```typescript
/**
 * CTSMapGlobals::Spawn — initialize the per-map rule entity.
 *
 * Demangled:  CTSMapGlobals::Spawn()
 * Address:    0x00062534  (264 B)
 * Disassembly: tools/decompile/chunks/Spawn__13CTSMapGlobals.chunk.md
 *
 * Faithful to the disassembly:
 *   (a) virtual call on a sub-object at this+0x60, vtable slot 0x28
 *       (10th function pointer), receiving the outer `this` as arg.
 *       Implicit ECX for __thiscall is NOT explicitly set; the called
 *       method therefore sees the *outer* this as its `this`. We flag
 *       this as ambiguous rather than commit to one shape.
 *   (b) reset pev.button (+0x108) and pev.effects (+0x10C); reposition
 *       to origin (+0x08) via UTIL_SetOrigin; resize to a point bbox via
 *       UTIL_SetSize(0,0,0, 0,0,0).
 *   (c) zero four instance dwords (this+0x0C..+0x18).
 *   (d) schedule pev.nextthink (+0x104) = gpGlobals.time + K, where K is
 *       a constant loaded as a qword (double) and converted via the FPU.
 *   (e) mirror pev.spawnflags (+0x1A0) into g_pGameRules:
 *         bit 5 → inverted → g_pGameRules+0x10  (likely m_bTeamplay)
 *         bit 6 →            g_pGameRules+0x5885
 *   (f) seed weapon-restriction state: call this.get_weapon_restriction()
 *       and write into g_pGameRules+0x5870 then +0x586C; clear two flag
 *       bytes at g_pGameRules+0x5874 and +0x5875.
 */
export function Spawn(this: CTSMapGlobals): void {
    // ---- (a) vtable call on subobj at this+0x60 ----
    // TODO(asm-ambiguous): identify the sub-object type at this+0x60 and
    // the vmethod at slot 0x28. The lack of an explicit `mov ecx, eax`
    // before the call suggests the called method's implicit `this` is the
    // *outer* this (esi) — opposite of the TS shorthand below. We keep
    // the TS shape for clarity but the binding layer must mirror asm.
    this.subEntity_0x60.vmethod_0x28(this);

    // ---- (b) reset / reposition / resize ----
    // entvars_t offsets below are canonical GoldSrc (eiface.h); no TODO.
    const pev = this.pev;
    pev.button  = 0;
    pev.effects = 0;
    UTIL_SetOrigin(pev, pev.origin);
    UTIL_SetSize(pev, vec3_origin, vec3_origin);

    // ---- (c) zero four instance dwords ----
    // TODO(asm-ambiguous): name these against the CTSMapGlobals struct in
    // D.4 (TS-specific gameplay). Order is permuted vs. the asm; STOREs
    // commute, so this is safe.
    this.field_0x0C = 0;
    this.field_0x10 = 0;
    this.field_0x14 = 0;
    this.field_0x18 = 0;

    // ---- (d) schedule first WaitThink ----
    // [ebx+0x1600] resolves (via two dereferences) to gpGlobals.time.
    // [ebx-0x6ecd0] is K, loaded qword (double). The FPU funnel is
    // abstracted to scalar arithmetic here.
    // TODO(asm-ambiguous): name `WAIT_THINK_DELAY_K` against
    // strings-n5.txt + TS SDK.
    pev.nextthink = (gpGlobals as any).time + WAIT_THINK_DELAY_K;

    // ---- (e) mirror spawnflags into g_pGameRules ----
    const spawnflags = pev.spawnflags;

    g_pGameRules.field_0x10   = (((spawnflags >> 5) & 1) ^ 1);
    g_pGameRules.field_0x5885 = ((spawnflags >> 6) & 1);

    // ---- (f) seed weapon-restriction state into g_pGameRules ----
    const wr = this.get_weapon_restriction();

    g_pGameRules.field_0x5870 = wr;
    g_pGameRules.field_0x586C = wr;
    g_pGameRules.field_0x5874 = 0;
    g_pGameRules.field_0x5875 = 0;
}

// ---- ambient declarations so this file compiles standalone ----
declare const gpGlobals: any;
declare const g_pGameRules: any;
declare const vec3_origin: any;
declare const WAIT_THINK_DELAY_K: number;
declare function UTIL_SetOrigin(pev: any, origin: any): void;
declare function UTIL_SetSize(pev: any, mins: any, maxs: any): void;

interface CTSMapGlobals {
    pev: any;
    subEntity_0x60: { vmethod_0x28(arg: CTSMapGlobals): void };
    field_0x0C: number;
    field_0x10: number;
    field_0x14: number;
    field_0x18: number;
    get_weapon_restriction(): number;
}
```

---

### Summary for `HANDOFF.md` / dispatch notes

- `Spawn__13CTSMapGlobals` decompiles cleanly to the TS above. Field
  mapping for `pev.{button,effects,nextthink,spawnflags,origin}` is
  canonical GoldSrc, not ambiguous.
- The remaining unknown offsets (`this+0x0C..0x18`, the four g_pGameRules
  fields) are correctly left as placeholders per the D.3 scope rule ("we
  don't reconstruct the full class yet").
- One real ambiguity worth carrying forward to D.4: the virtual call at
  vtable slot 0x28 has no `mov ecx, eax` in the disassembly, so the
  called method's implicit `this` is the outer `CTSMapGlobals`, not the
  subobj at `this+0x60`. The TS shorthand treats it the other way;
  whatever binds the vtable back to the TS runtime needs to honor asm.
