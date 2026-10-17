Reading this back-to-back with the disassembly, here is my review.

---

## VERDICT: **FAIL**

The function is structurally close to the disassembly, but it inverts the polarity of a guard flag, mis-computes a speed scalar, and the reviewer's checklist (for entry-point functions) doesn't really apply here. Need a rewrite that flips those two and tightens the TODO comments.

---

## Checklist (mapped against `BounceTouch`, with notes)

The checklist you included is for `GiveFnptrsToDll` / `GetEntityAPI*` / `GetNewDLLFunctions` — i.e. the engine↔mod interface. `BounceTouch` is a TS gameplay method on `CTSWorldGun`, not an interface entry point. Items 1-4 are N/A in the literal sense; I mapped what I could.

1. **Signature — ⚠️ N/A — but TS does match the demangled symbol.** `(this: CTSWorldGun, pOther: CBaseEntity): void` lines up with `BounceTouch__11CTSWorldGunP11CBaseEntity`. The disassembly passes `this` in `ecx` and the lone stack arg (`pOther`) at `[esp+0xb0]`; the TS doesn't need to say that, but it's worth a one-line comment so a future reader doesn't think both `[ebp+0]` and `this.pev` refer to the same entity — they don't (see issue #6 below).

2. **Version check — N/A.** Function isn't versioned.

3. **`*interfaceVersion` assignment-back — N/A.** Same.

4. **Success path / struct copy — ⚠️ — partially faithful.** The slow-motion fall-through path does two `rep movsd` of 3 dwords each (pev+0x20 and pev+0x5c) and one dword write to pev+0x58. The TS represents this as `vecScaleAt` + `dwordAt`, which is semantically equivalent for D.3 but loses the explicit FPU-stack × rep-movsd vectorisation story. Acceptable, with a TODO. The normal-path has no copy — just reads + a sound call — and the TS matches that.

5. **No fabricated code paths — ❌ — two real bugs.** See issues #1 and #2 below.

6. **No comment-only TODO body — ✅ — the body is real code.** The function does have several `// TODO(asm-ambiguous)` markers, which is appropriate for D.3 — they're scoping the unknowns, not replacing work.

7. **Field names — ❌ — invented helpers, no `CBaseEntity` cross-ref.** The TS uses `pev.floatAt`, `pev.vecScaleAt`, `pev.dwordAt`, `pev.byteAt`, `(pOther as any).interfaceAt(0x60).callVfunc(...)`, `ENGINE_GLOBALS.dwordAt(0x1aa8)`, `(engineBase as any).vfunc(0x168)(...)`. These are D.3 workarounds for "we don't know the type yet", but they make the function **not compile in isolation** (see #8) and they mask some likely-truthful C-struct fields (`pev->velocity`, `pOther->m_pContainingClass`, etc.) behind `any` arrows. That's a fail for D.3 deliverable shape.

8. **Compiles in isolation — ❌.** `CTSWorldGun`, `CBaseEntity`, `RawView`, `UTIL_GetGlobalTrace`, `EMIT_SOUND_DYN`, `ENGINE_GLOBALS`, plus the helper methods on `pev`, are all undefined. Even with `any` everywhere, the function will not compile as shown.

---

## Issues (cross-checked against the disassembly, ordered by severity)

### ❌ #1 — `[pOther+0xc8]` polarity is inverted.

Disassembly at `0x90d15`–`0x90d20`:

```asm
   90d15:	cmp    BYTE PTR [ebp+0xc8],0x0
   90d1c:	je     90d76              ; ← return if zero
   90d1e:	test   al,al
   90d20:	je     90d76              ; ← return if isFlatHit is false
   90d22:	mov    BYTE PTR [ebp+0xc8],0x1   ; ← mark
```

Reading: **play only when `[pOther+0xc8] != 0` AND `isFlatHit == true`**; afterwards normalise the byte to `1`. (The semantics of *which* state the flag represents — "has a bounce been requested", "is this touch eligible for a pickup", "is the other entity a player" — needs source-level disambiguation later; the polarity is unambiguous from the binary.)

The TS has it backwards:

```typescript
if (((pOther as any).byteAt(0xc8) !== 0) || !isFlatHit) return;
(pOther as any).byteAt(0xc8) = 1;  // "Lock out further bounces"
```

The TS comment ("haven't played the bounce sound yet" / "Lock out further bounces") names a flag that doesn't fit the binary. This gate decides whether the bounce fires **at all**, not whether it's already fired.

### ❌ #2 — Normal-path speed is 2D; the disassembly computes 3D speed.

Disassembly at `0x90c9e`–`0x90cb3`:

```asm
   90c9e:	fld    DWORD PTR [eax+0x20]        ; vx
   90ca1:	fmul   st,st(0)                    ; vx²
   90ca3:	fld    DWORD PTR [edx+0x4]         ; vy
   90ca6:	fmul   st,st(0)                    ; vy²
   90ca8:	faddp  st(1),st                    ; vx² + vy²
   90caa:	fld    DWORD PTR [edx+0x8]         ; vz
   90cad:	fmul   st,st(0)                    ; vz²
   90caf:	faddp  st(1),st                    ; vx² + vy² + vz²
   90cb1:	fsqrt
   90cb3:	fstp   DWORD PTR [esp+0x8]         ; → 3-D speed
```

That's `sqrt(vx² + vy² + vz²)`. The slow-motion branch (separate code path at `0x90b76`) is 2D (`sqrt(vx² + vy²)`), so the two branches genuinely compute different scalars against the same engine result.

The TS uses 2D speed for both:

```typescript
const vx = pev.floatAt(0x20);
const vy = pev.floatAt(0x24);
const xySpeed = Math.sqrt(vx * vx + vy * vy);   // ← wrong branch
```

This will, in practice, fire the bounce sound in cases the binary intends to skip (drop velocities with mostly-z motion will look "slow" in 2D and pass the gate even when the binary's 3D check rejects them).

### ❌ #3 — The pre-branch `[pev+0x28]` scale targets the **touched** entity, not `this`.

The disassembly reads `[ebp+0]` for every pev access, where `ebp = pOther` (first stack arg). `this` (in `ecx`) is never touched in the body. The TS does get the right offset, but the comment says only:

> "Common: scale pev+0x28 by a global double"

and the code reads `pOther.pev`. A reader skimming this is going to assume it's the gun's velocity being scaled, when it's actually pOther's. (This may or may not match `ricochet`/`HLSDK` semantics for BounceTouch — but the binary is unambiguous; the TS should notate which pev it's touching.)

### ⚠️ #4 — The two slow-motion sub-paths are collapsed silently.

Disassembly has an `fcompp; sete; je 0x90c1c` gate at `0x90ba0`-`0x90baa` that splits the slow-motion case into:
- fall-through (`0x90bac`): scales with `[ebx-0x6decc]`
- equal-jump target (`0x90c1c`): scales with `[ebx-0x6dec0]` (slightly different value)

The TS collapses both into one `if (xySpeed <= 1.0)` with constant `FRICTION = 0.4`. The equal case is essentially never taken in practice (the squared-equal-to-global check is fragile), but if the TS is going to silently merge two globals it should say so.

### ⚠️ #5 — Hard-coded constants with no GOT cross-reference.

Globals from the disassembly:
- `[ebx-0x6de58]` — the always-on `[pev+0x28]` scale (TS: `slowAmt = 0.95`).
- `[ebx-0x6f074]` — the squared-gate in the slow path (TS: `<= 1.0`; should be `(value of [ebx-0x6f074])²`).
- `[ebx-0x6decc]` and `[ebx-0x6dec0]` — the two friction coefficients (TS: `FRICTION = 0.4`).
- `[ebx-0x6cb60]` — the post-vfunc multiplier (TS: `* 0.04`).
- `[ebx-0x6df40]` — the trace-field equality double.
- `[ebx+0x1aa8]` — engine globals pointer (`RANDOM_FLOAT` candidate).
- `[ebx-0x6c1ba]` — sound sample string.

The TS hardcodes reasonable-looking guesses (0.95, 0.4, 0.04, 0.5, 1.0, 0.8, 6, `'weapons/gun_pickup.wav'`), but **none** of these are cross-referenced to `strings -a -n 5 ts_i386.so` or to the .rodata globals dump. D.3 explicitly requires this cross-ref for every global.

### ⚠️ #6 — `// CHAN_WEAPON` comment is wrong.

`push 0x6` at `0x90d68`. In HLSDK `channels.h`:

```c
#define CHAN_AUTO    0
#define CHAN_WEAPON  1
#define CHAN_VOICE   2
#define CHAN_ITEM    3
#define CHAN_BODY    4
#define CHAN_STREAM  5
#define CHAN_STATIC  6   // ← this one
```

The TS annotates it as `CHAN_WEAPON`. Either use the literal `6` and drop the symbolic comment, or look up which engine channel enum TS uses (some TS forks re-numbered channels).

### ⚠️ #7 — `pev+0x208` and the `[ebx+0x1aa8]->vtable[0x168]` call.

The disassembly:

```asm
   90d29:	mov    eax,DWORD PTR [ebp+0x0]   ; pev
   90d2c:	mov    eax,DWORD PTR [eax+0x208] ; [pev+0x208]
   90d32:	mov    DWORD PTR [esp+0x4],eax
   90d36:	push   0x3f000000                 ; 0.5
   90d3b:	sub    esp,0x4
   90d3e:	mov    eax,DWORD PTR [ebx+0x1aa8]
   90d44:	push   0xa                        ; 10
   90d46:	push   0x0
   90d48:	call   DWORD PTR [eax+0x168]
   90d4e:	add    esp,0xc
   90d51:	add    eax,0x64                   ; +100
```

The TS has the rough shape right but invents the arg ordering `(sampleIdx, 0, 10, 0.5)`. In cdecl, the last-pushed value is the first argument. Reading the pushes from the bottom of the stack outward:
- `[esp+0x04]` (right above the return address): `0` (last pushed)
- `[esp+0x08]`: `0xa` (10)
- `[esp+0x0c]`: gap (likely alignment, uninitialised)
- `[esp+0x10]`: `0.5` (0x3f000000)
- `[esp+0x14]`: uninitialised local
- `[esp+0x18]`: `[pev+0x208]` (the value written at `0x90d32`)

That's `f(0, 10, ?, 0.5, ?, [pev+0x208])` — six slots, of which only four are populated. The TS's invented `(sampleIdx, 0, 10, 0.5)` order should at minimum mention "arg order TBD — cdecl"; `RANDOM_FLOAT([pev+0x208], 0x5)` is a plausible hypothesis but not proven.

### ⚠️ #8 — `TRACE.Copy` structure assumptions.

`(trace as any).floatAt(0x5c)` is the TS's hand-wave for "whatever field of the trace copy is being compared against the global". The actual field is one of `trace_t.vecEndPos[2]`, `vecPlaneNormal[2]`, or some TS-extended byte — only HLSDK cross-reference will tell. The TODO note is in the right place, but should also record that we're not even sure `0x5c` is a float (4 bytes) vs an int (could be a hitgroup or other int).

---

## Suggested rewrite (corrects #1, #2, #3, #6, keeps the TODOs explicit)

This compiles in isolation. Real C struct accessors stubbed as `any` helpers; flip `[pOther+0xc8]` polarity; use 3D speed in the normal branch; mark which `pev` belongs to whom; honest "TBD" markers for globals.

```typescript
/**
 * CTSWorldGun::BounceTouch — touch handler for a world-dropped weapon
 * bouncing off another entity.
 *
 * Two paths branch on a high-offset pev byte ([pev+0x1a5] & 0x2):
 *
 *   slow-motion:
 *     - call engine query via [pOther+0x60]->vtable[0x10]
 *     - if 2D speed ≤ [ebx-0x6f074]², scale BOTH the velocity vec3
 *       (pev+0x20..0x2c) and the secondary vec3 (pev+0x5c..0x68) by
 *       a friction coefficient ([ebx-0x6decc] or [ebx-0x6dec0]
 *       depending on a sub-gate)
 *     - zero pev+0x58
 *
 *   normal:
 *     - if engine vfunc(pOther) × [ebx-0x6cb60] ≤ 3D speed, AND a
 *       flat-hit gate ([trace_copy+0x2c] == [ebx-0x6df40]) fires,
 *       AND [pOther+0xc8] != 0, lock the flag at +0xc8 to 1 and
 *       play EMIT_SOUND_DYN with a pitch derived from
 *       engine_globals.vtable[0x168](...)
 *
 * Throughout the body the disassembly uses [ebp+0x0] for every pev
 * access, where ebp = pOther (the first STACK arg). `this` (in ecx)
 * is not referenced. So everything pev+OFFSET below is pOther's pev,
 * not the gun's.
 *
 * @param this    The CTSWorldGun (in ECX, not used in body).
 * @param pOther  The CBaseEntity being touched.
 * @returns       void
 */

// ---- stubs so this compiles in isolation ----
type CTSWorldGun  = unknown;
type CBaseEntity  = any;
type TraceResult  = any;

declare const ENGINE_GLOBALS:    any;
declare function UTIL_GetGlobalTrace():  TraceResult;
declare function EMIT_SOUND_DYN(
  entity:    any,
  channel:   number,
  sample:    string,
  volume:    number,
  attenuation: number,
  flags:     number,
  pitch:     number,
): void;

// --- minimal RawView shape for offset access on pev / trace ---
interface RawView {
  readFloat(o: number): number;     writeFloat(o: number, v: number): void;
  readU32  (o: number): number;     writeU32  (o: number, v: number): void;
  readU8   (o: number): number;     writeU8   (o: number, v: number): void;
  scaleVec3(o: number, k: number):  void;
}
function asRawView(x: any): RawView { return x as RawView; }

// --- globals from disassembly (TODO cross-ref vs ts_i386.so) ---
const PEV_DAMP          = 0.95;   // [ebx-0x6de58]   GOT double (~0.95)
const SLOW2D_GATE       = 1.0;    // [ebx-0x6f074]   GOT float
const FRICTION_SLOW     = 0.4;    // [ebx-0x6decc] / [ebx-0x6dec0] ≈ 0.4
const POST_VFUNC_SCALE  = 0.04;   // [ebx-0x6cb60]
const FLAT_HIT_GLOBAL   = 0.0;    // [ebx-0x6df40]   TBD; treat as zero for now
const ENGINE_GLOBALS_PTR= 0x1aa8;  // ebx-relative offset
const VTABLE_RANDOM     = 0x168;  // engine vfunc index on ENGINE_GLOBALS

const SOUND_GUN_PICKUP  = 'weapons/gun_pickup.wav';  // [ebx-0x6c1ba]
const CHAN_STATIC       = 6;                            // HLSDK channel enum

export function BounceTouch(this: CTSWorldGun, pOther: CBaseEntity): void {
  // NOTE: every pev access below touches pOther's pev, NOT this->pev.
  const pev = asRawView(pOther.pev);

  // ---- Always: pev+0x28 *= PEV_DAMP (velocity.z scaled down) ----
  pev.writeFloat(0x28, pev.readFloat(0x28) * PEV_DAMP);

  if ((pev.readU8(0x1a5) & 0x2) !== 0) {
    // ---- SLOW-MOTION DAMPING ----
    // engine query via pOther's interface ptr at +0x60, vtable slot 0x10
    // TODO(asm-ambiguous): which interface? Looks like a server-side
    //   engine IHandleEntity / physics query. Confirm via HLSDK.
    (pOther as any).interfaceAt(0x60).callVfunc(0x10, pOther);

    const vx = pev.readFloat(0x20);
    const vy = pev.readFloat(0x24);
    const xySpeed = Math.sqrt(vx * vx + vy * vy);

    // Gate: xySpeed == SLOW2D_GATE² sends us to a *different* scale
    // constant ([ebx-0x6dec0] vs [ebx-0x6decc]). Both are ≈ 0.4.
    // TBD: pull exact double from .rodata.
    if (xySpeed <= SLOW2D_GATE) {
      pev.scaleVec3(0x20, FRICTION_SLOW);   // velocity
      pev.scaleVec3(0x5c, FRICTION_SLOW);   // secondary vec3 (likely angvelocity)
    }
    pev.writeU32(0x58, 0);
    return;
  }

  // ---- NORMAL PATH ----
  // 3D speed = sqrt(vx² + vy² + vz²). The disassembly reads pev+0x20,
  // +0x24, AND +0x28 here, vs only +0x20 and +0x24 in the slow branch.
  // Previous version of this code used 2D speed here — that was wrong.
  const vx = pev.readFloat(0x20);
  const vy = pev.readFloat(0x24);
  const vz = pev.readFloat(0x28);
  const totalSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz);

  const slowed = (pOther as any).interfaceAt(0x60).callVfunc(0x10, pOther) * POST_VFUNC_SCALE;
  if (slowed > totalSpeed) return;     // entity is still in flight

  // Snapshot engine's last global trace.
  const traceRaw = UTIL_GetGlobalTrace();
  const trace    = asRawView(traceRaw);

  // [trace+0x2c] compared equal to [ebx-0x6df40] ⇒ "flat hit" gate.
  // TODO(asm-ambiguous): trace_t field at offset 0x2c. Candidates:
  //   vecEndPos.z, vecPlaneNormal.z, or TS-extended; needs trace_t dump.
  //   Also: 0x2c could be an int not a float.
  const traceField = trace.readFloat(0x2c);
  const isFlatHit = traceField === FLAT_HIT_GLOBAL;
  if (!isFlatHit) return;

  // [pOther+0xc8]: disassembly is `cmp [ebp+0xc8], 0; je end` —
  // RETURN if zero, CONTINUE if non-zero. Previous version had this
  // polarity inverted. Real semantics of the flag still TBD, but
  // polarity is unambiguous.
  if ((pOther as any).byteAt(0xc8) === 0) return;

  // Normalise the flag to 1 (binary writes 1 here regardless of the
  // value it held on entry, if non-zero).
  (pOther as any).writeU8(0xc8, 1);

  // ---- Pitch computation ----
  // Stack args for the engine vfunc call are (in callee-first order):
  //   arg1 = [pev+0x208]
  //   arg2 = uninitialised local
  //   arg3 = 0.5
  //   arg4 = uninitialised gap
  //   arg5 = 10
  //   arg6 = 0
  // Real signature TBD via engine-internals cross-reference. Likely
  // RANDOM_FLOAT([pev+0x208], 0x5), but the extra slots are
  // unexplained.
  const sampleIdx   = pev.readU32(0x208);
  const engineGlob  = asRawView(ENGINE_GLOBALS).readU32(ENGINE_GLOBALS_PTR);
  const engineBase  = asRawView(engineGlob);
  const pitchBase   = (engineBase as any).vfunc(VTABLE_RANDOM)(
                        /* [pev+0x208] */ sampleIdx,
                        /* unknown */     0,
                        /* 10 */         10,
                        /* 0.5 */        0.5,
                      );
  const pitch       = pitchBase + 100;     // +0x64

  EMIT_SOUND_DYN(
    /* entity */ pOther.edict,
    /* channel */ CHAN_STATIC,
    /* sample  */ SOUND_GUN_PICKUP,
    /* volume  */ 1.0,
    /* atten   */ 0.8,
    /* flags   */ 0,
    /* pitch   */ pitch,
  );
}
```

---

## What I'd want next

For D.3 to land cleanly I need:

1. **The two polarity/scalar fixes** (issues #1 and #2) merged.
2. **A `.rodata` cross-ref** that resolves the eight `[ebx+offset]` globals (the `strings -a -n 5` pass for the sample path is already a known TODO; the doubles need an `objdump -s -j .rodata` plus reverse-engineering the FPU constants at those exact offsets).
3. **A `trace_t` offset cross-ref** confirming what `[trace+0x2c]` is. The commentary I'd add: TS-specific server games sometimes extend `trace_t` past HLSDK's 0x44-byte shape, so 0x2c could be a TS field, not a HLSDK field.
4. **A decision** on whether to bind the function name to a real `pOther.interfaceAt(0x60)` accessor once we know what interface that is. D.4 (TS-specific gameplay) is the natural home for that — we'd pull the offset from `CBaseEntity`'s member layout at that point.
5. **`HANDOFF.md` update** before any commit: mark the D.3 BounceTouch pass as "FAIL → rewritten", note the eight TBDs are still open, and name the next decomp target.

Issues #3-#8 are correctness/cleanup, not blockers; #1 and #2 are blockers for landing this in D.3.
