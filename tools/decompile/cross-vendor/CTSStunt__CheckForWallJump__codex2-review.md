```
VERDICT: FAIL

NOTE — checklist mismatch:
The review template's checklist (signature / version check / *interfaceVersion
write-back / struct-copy success / engine↔mod fields) is designed for the
four HLSDK entry points (GiveFnptrsToDll, GetEntityAPI{,2}, GetNewDLLFunctions).
The function under review is CTSStunt::CheckForWallJump — a TS gameplay
method, not an engine↔mod interface symbol. Items 1, 2, 3, 4, and 7 of the
template do not apply. I've re-purposed them below to what *does* apply
(disassembly fidelity / gate semantics / field-path / compile-in-isolation).

Checklist (re-scoped for a gameplay method):
1. Signature / arg count / return type — ⚠️ — `void Push(this, …)` / no other
   args / returns bool. The TS signature `(this: CTSStunt): boolean` is
   right in shape, but the body re-binds `this` to `ebp` and then passes
   `ebp` *as an explicit argument* to `this.CanDiveHigh(ebp)`. The   disassembly pushes `ebp` itself (`push ebp; call CanDiveHigh@plt`), so the
   TS is right that `this == ebp`, but the call shape `this.CanDiveHigh(ebp)`
   is double-passing `this` and reads as a free function call, not a
   __thiscall method. Treat the rest of the body as a free function
   (`CheckForWallJump(ebp)` style) or drop the explicit `ebp` arg.
2. Capability gate (CanDiveHigh) — ✅ — early `return false` on
   non-zero-equality matches the `je 8ad38` early-out path.
3. Trace gate (fraction ≥ 1.0 ⇒ fail) — ✅ — `fcomp 1.0; jae 8ad38` is
   "ST ≥ 1.0 → fail", which is `trace.fraction >= 1.0`. Correct, including
   the `>=` (not `>`).
4. Height-band gate — ✅ — `cl = 1 iff UPPER < y < LOWER`. The TS uses
   `y > UPPER && y < LOWER`, which is the same. The comments correctly
   mark LOWER / UPPER as TODO constants.
5. **Vertical-state gate — ❌** — the disassembly does
   `fcomp DWORD PTR [ebx-0x6c32c]; fnstsw ax; test ah,0x41; jne 8ad32;
   mov dl,0x1`. After fnstsw, AH bit 0 = C0 and AH bit 6 = C3. With
   fcomp, X > Y ⇒ C0=0 ∧ C3=0 ⇒ `ah & 0x41 == 0` ⇒ `jne` is **not taken**
   ⇒ fall-through sets dl = 1. So the gate is **`velocity.z > THRESHOLD`**
   (strict greater-than). The TS uses `===` (exact equality) and even
   comments "dl=1 only when value == threshold" — both are wrong. This
   is the kind of x86-FPU mistake (`test ah,0x41; jne` ≠ "jump if not
   equal"; it tests two condition-code bits, not a ZF-vs-zero result).
6. Success-path struct copy — N/A — none here.
7. *interfaceVersion write-back — N/A — none here.
8. Indirection pattern — ⚠️ — every pev-shaped access in the body uses
   `*(*(ebp+0x40)) + offset` (double indirection), e.g. for `+0x8` (origin),
   `+0x74` (Angles), `+0x208` (ignore edict), `+0x20→+0x28` (velocity.z).
   The TS collapses all of these into `ebp.pev.<Field>` (single indirection)
   and `ebp.edict`. That's a structural lossy step: any reader of the TS
   can't see the two-hop walk the binary performs. If `ebp + 0x40` is
   `pev` (entvars_t*), then `*pev + 0x74` is nonsense — `*pev` is the
   value of `classname` (a string offset). The TS hides this either by
   guessing `.pev.Angles` is one hop, or by using `as any`. Flag this in
   HANDOFF.md as a TODO that needs a class-layout pass for TS.
9. Probe source — ⚠️ — `*(*(GOT + 0x1600)) + 0x28` is read with FPU math
   against `K` (`[ebx-0x6f068]`). The +0x28 offset lives in a *singleton
   pointer* reached via GOT, which is almost certainly `gpGlobals`
   (the only well-known global holding a 3-vector near that offset —
   `vecForward`). The TS interprets it as the player's velocity. That is
   a different vector. Even if it's not `vecForward`, it's *not* the
   player; the player reads at `*(*(ebp+0x40))+0x28` (with the *other*
   `+0x28` coming from `+0x20 + 0x8 = velocity.z`, a different layer).
   The TS comment flags it as ambiguous — keep the TODO, but rename the
   local to something like `gpGlobals_vec` so it can't be confused with
   the player's `pev.velocity`.
10. TODO body — ⚠️ — body is more than TODO; not a fail on item 6. But
    several fields/values are TODOs (K, LOWER, UPPER, VERT_THRESHOLD,
    the GOT-singleton field, the +0x74 pev field, the +0x208 edict
    field). That's expected for D-class decompilation, just make sure
    HANDOFF.md tracks each one.
11. Field names — ⚠️ — `Origin`, `Angles` are reasonable guesses for
    `*pev + 0x8` and `*pev + 0x74`. `velocity` for the probe is wrong
    (see #9). `edict` for the +0x208 field is plausible (ignore-target
    in `UTIL_TraceLine` is `edict_t*`).
12. Compiles in isolation — ✅ — `Vector`, `TraceResult`, `CTSStunt`,
    `UTIL_MakeVectors`, `UTIL_TraceLine` are all `any`/`undefined as any` placeholders; no external type references break.

Issues to fix:
- **Critical:** gate3 must use `>` not `===`. The comment claiming  `jne` means "jump if not equal" is also wrong.
- **Structural:** the `*(*(ebp+0x40)) + offset` indirection needs a
  TS-side representation (or a clear `// TODO(layout):` note). Right
  now the TS hides the double hop behind `.pev.<Field>`, which loses
  information.
- **Semantic:** the probe is `K * <gpGlobals-vector-at-+0x28>`, not
  `K * player_velocity`. Rename and re-comment.
- **Style:** `this.CanDiveHigh(ebp)` is redundant. Either write
  `CanDiveHigh(ebp)` (free function form) or `this.CanDiveHigh()`
  (method form). Don't do both.
- **Cosmetic:** K is loaded as `DWORD PTR` (4-byte float); LOWER and
  UPPER are `QWORD PTR` (8-byte double). The TS lumps them all under
  `number`. Either leave a TODO note or declare `K` as a `Float32Array`
  / `float` alias and the bands as `float64` for honesty.

Suggested rewrite (only the body — keep the function header you have):

```typescript
export function CheckForWallJump(this: CTSStunt): boolean {
  // Disassembly loads 'this' from [esp+0x90] into ebp at entry, then reuses
  // ebp throughout. Treat the function as a free function that takes `this`
  // as its first explicit arg — matches the push-ebp call convention you
  // see at 0x8ac3a (CanDiveHigh@plt) and 0x8acd7 (UTIL_TraceLine@plt).
  const self = this as any;

  // ---- 1. Capability: CanDiveHigh must pass (test eax,eax; je fail).
  if (!CanDiveHigh(self)) return false;

  // ---- 2. Refresh globals (v_forward / v_right / v_up) from the player's
  //         view angles. Disassembly: *(*(ebp+0x40)) + 0x74 is the source
  //         Vector passed to UTIL_MakeVectors. The double indirection
  //         (ebp+0x40 → pev → entvars → +0x74) is hidden behind .pev.Angles;
  //         TODO(layout): confirm the two-hop walk resolves to pev->angles
  //         in this build's CTSStunt / entvars_t layout.
  UTIL_MakeVectors(self.pev.Angles);

  // ---- 3. Build the probe. The disassembly reads
  //         K = DWORD PTR [ebx-0x6f068]              // 4-byte float, ~1.0
  //         V = *(*(GOT+0x1600)) + 0x28 // 3-float vector in  //                                                   //   some singleton
  //                                                   //   (almost certainly
  //                                                   //   gpGlobals->v_forward
  //                                                   //   set by step 2)
  //         probe = K * V
  // TODO(asm-ambiguous): confirm the GOT+0x1600 singleton is gpGlobals
  // and +0x28 is v_forward in this build. The TS previously misnamed this
  // as the player's velocity — it isn't.
  const K: number = 1.0;
  const forwardVec: Vector = undefined as any; // gpGlobals->v_forward (after MakeVectors)
  const probe: Vector = {
    x: K * forwardVec.x,
    y: K * forwardVec.y,
    z: K * forwardVec.z,
  };

  // ---- 4. Trace from origin to origin+probe. The end Vector lives at
  //         [esp+0x20]; the start is *(*(ebp+0x40)) + 0x8 (pev->origin).
  //         ignore target is *(*(ebp+0x40)) + 0x208 (probably the player's
  //         containing edict or its private-data ptr — TODO(layout)).
  const origin: Vector = self.pev.Origin;
  const end: Vector = {
    x: origin.x + probe.x,
    y: origin.y + probe.y,
    z: origin.z + probe.z,
  };
  const tr: TraceResult = {} as TraceResult;
  UTIL_TraceLine(origin, end, /* IGNORE_MONSTERS */ 1, self.edict, tr);

  // ---- 5. No hit ⇒ no wall ⇒ fail.
  // Disassembly: fcomp 1.0; jae fail (i.e. fraction >= 1.0).
  if (tr.fraction >= 1.0) return false;

  // ---- 6. Wall height band. Disassembly:
  //         fcom  LOWER (no pop); sahf; jae skip (X >= LOWER ⇒ skip)
  //         fcomp UPPER (pop);    test ah,0x41; jne skip (X <= UPPER ⇒ skip)
  //         Net: cl=1 iff LOWER > X > UPPER.
  //         TODO(values): LOWER / UPPER cvars (QWORD = double).
  const LOWER = 0;
  const UPPER = 0;
  const wallHeightOk = tr.vecEndPos.y > UPPER && tr.vecEndPos.y < LOWER;

  // ---- 7. Vertical state. Disassembly:
  //         fld   *(*(ebp+0x40) + 0x20 + 0x8)   // pev->velocity.z
  //         fcomp DWORD PTR [ebx-0x6c32c]      // threshold (float)
  //         fnstsw ax
  //         test  ah,0x41                       // tests C0 (ah.0) and C3 (ah.6)
  //         jne   skip                         // jumps when NOT (X > Y)
  //         mov   dl,0x1                       // dl=1 iff X > Y (strict gt)
  //         The earlier "jne = jump if not equal" interpretation was wrong.
  //         TODO(values): VERT_THRESHOLD cvar (DWORD = float).
  const VERT_THRESHOLD = 0;
  const verticalOk = self.pev.velocity.z > VERT_THRESHOLD;

  return wallHeightOk && verticalOk;
}
```

Action items for HANDOFF.md / SPEC.md:
- Note that this D.3 pass got the third gate's comparison operator wrong
  (strict gt vs. exact equality) — a real cross-vendor-review catch.
- The pev indirection is *(*(this+0x40)) in the binary; the TS hides it.
  D.4 (class-layout pass) needs to either (a) define a two-hop accessor
  on `CTSStunt`, or (b) document the lossy mapping with a TODO.
- The probe is `K * v_forward` (gpGlobals), not player velocity. Update
  the field-name catalog when D.4 lands.
- LOWER / UPPER / VERT_THRESHOLD / K / GOT+0x1600 / +0x208 all need
  source-side values from a debug build or cvar dump before this
  compiles to runtime behavior.
