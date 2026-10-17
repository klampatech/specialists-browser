I'll review this against the disassembly and HLSDK reference. First, a quick scope note per AGENTS.md: this is a D.3 single-function decompile, all needed context is inline, so I'm proceeding without loading project files.

I worked through the disassembly line-by-line. The function is `CTSStunt::GoBulletTime()`, a class method (not one of the 4 engine↔mod interface entry points), so items 2–4 of the checklist are N/A. The interesting items are 1, 5, 7, 8 and some field/arg-mapping questions I uncovered.

```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — `export function GoBulletTime(this: CTSStunt): void`
   matches `GoBulletTime__8CTSStunt` (void, no args, instance method).
   The `this: CTSStunt` parameter is idiomatic TypeScript for the
   C++ `this` argument.
2. Version check — N/A — class method, not `GetEntityAPI*` /
   `GetNewDLLFunctions`.
3. interfaceVersion assignment — N/A — same reason.
4. Success path (struct copy) — N/A — no engine↔mod table copy.
5. No fabricated paths — ❌ — two real bugs vs. the disassembly:
   (a) `pev` is mis-aliased; (b) the `vtable[71]` arg is the wrong
   value. Detail below.
6. No TODO body — ✅ — body is substantial (≈90 lines of executable
   code). TODO comments are per the conversion guidance, not stub
   placeholders.
7. Field names — ⚠️ — most `this` fields are placeholders
   (`field_0x20`, `field_0x24`, `field_0x28`, `field_0x2c`, `field_0x0`,
   `field_0x30`, `field_0x34`). Explicitly TODO'd for D.4 and called
   out in the conversion guidance, so this is acceptable for D.3, but
   I'd want the D.4 follow-up actually scheduled in HANDOFF.md before
   shipping this as anything more than a working scratch.
8. Compiles in isolation — ✅ — all external symbols are `declare`-ed
   or `any`-typed; no runtime/imports referenced.
```

## Issues to fix

**Bug 1 (major): `pev` is mis-aliased. Every `pev[...]` access reads the wrong memory.**

The disassembly does this at the top of every block:

```asm
mov  eax, [ebp+0x40]        ; eax = this->m_pPlayer   (a CBasePlayer*)
mov  eax, [eax]              ; eax = *m_pPlayer        (DEREFERENCE ONCE)
add  eax, 0x74               ; eax = pev + 0x74
```

i.e. `pev` = `(*m_pPlayer)`. In HLSDK, `CBaseEntity` declares
`entvars_t *pev` as the first explicit member, so `(*m_pPlayer)[0]`
is the `entvars_t *pev`. The TS does `const pev: any = player` (no
deref), which the TS author's own comment contradicts ("The player's
first slot is pev (entvars_t*)"). The fix is one line:

```typescript
const pev: any = player[0];
```

This bug propagates to: `pev[0x74]` (UTIL_MakeVectors arg),
`pev[0x208]` (sound + slow-mo edicts), `pev[0x250]` (FL lock flags),
`pev[0x2a0]` (physics flags), `pev[0x174..0x17c]` (velocity),
`pev[0x8]` (origin). All of those read 4 bytes off the wrong struct.

**Bug 2 (clear): `vtable[71]` is called with the wrong arg.**

Disassembly:

```asm
8a79b: mov  eax, [ebp+0x40]
8a79e: mov  eax, [eax]            ; eax = pev
8a7a0: push [eax+0x208]           ; arg = pev[0x208]
8a7a6: call [esi+0x11c]           ; vtable[71](pev[0x208]) -> eax
8a7ac: mov  [esp], eax
8a7af: call [esi+0xc0]            ; vtable[48](player, eax)
```

TS:

```typescript
const currentTier = vtable[0x11c / 4](player);
```

TS passes `player`; the asm pushes `pev[0x208]`. These are different
memory locations (and after Bug 1 is fixed, `pev[0x208]` is even more
clearly the right answer). Fix:

```typescript
const currentTier = vtable[0x11c / 4](pev[0x208]);
```

**Bug 3 (ambiguous, worth flagging): EMIT_SOUND_DYN signature.**

The demangled PLT entry is `EMIT_SOUND_DYN__FP7edict_siPCcffiif`, i.e.
**(edict_s\*, int, const char\*, float, float, int, int, float)** —
8 args. The asm pushes 7 args *for EMIT_SOUND_DYN* plus 1 leftover
from the resolver setup (the `0x3f000000 = 0.5` push at 0x8a73e is
not cleaned by the resolver's `add esp, 0xc` at 0x8a754 because of
the `sub esp, 0x4` at 0x8a743). Net stack at the call:

| offset | arg | value |
|---|---|---|
| [esp+0]  | 1 | edi (edict) |
| [esp+4]  | 2 | 0x4 (channel) |
| [esp+8]  | 3 | `[ebx-0x6c364]` (string ptr) |
| [esp+12] | 4 | 1.0 |
| [esp+16] | 5 | 0.8 |
| [esp+20] | 6 | 0 |
| [esp+24] | 7 | `eax = resolver + 0x5f` |
| [esp+28] | 8 | 0.5 (leftover from before resolver) |

TS drops the `[ebx-0x6c364]` arg and treats `resolver+0x5f` as the
sample. Per the demangled name, `const char*` is arg #3 = the string
pointer at `[ebx-0x6c364]`. The TS author's interpretation is
internally consistent (TS author explicitly notes "modeled as a
passthrough") but the arg mapping doesn't match the symbol. Either
(a) the TS author's mental model is right and `[ebx-0x6c364]` is
something else (a prefix string baked into the resolver, unused by
EMIT_SOUND_DYN itself), or (b) the asm is wrong (unlikely). **Worth
a real-TS-source cross-check before this PR lands.** I'd lean (a) —
HLSDK has a similar pattern where the resolver returns a fully-baked
sample pointer and the original string is just a default.

**Minor: `field_0x30` set order.**

The asm sets `field_0x30 = CONST_6DE90` at `0x8a6f6`, **after**
lock-player-in-place (0x8a6ec) and **just before** the velocityzero-out (0x8a702). The TS moves it into step 4 alongside
`field_0x0`/`field_0x34`. Semantically equivalent (no intervening
read), but a deliberate source-order deviation — call it out in the
file's commit message.

**Minor: pointer-vs-value semantics.**

The asm pushes pointers for `pev+0x74` (UTIL_MakeVectors),
`pev+0x8` (origin), `pev[0x208]` (sound + slow-mo edict). TS passes
`pev[0x74]`, `pev[0x8]`, `pev[0x208]` as values. C++ `UTIL_MakeVectors`
takes `const Vector&` and `g_engfuncs[0xb8/4]` (`pfnMessageBegin`)
takes `const float *pOrigin` + `edict_t *`, so the asm's pointer-pushes
are reference-on-the-wire. Whether TS reads these as values or pointers
depends on the TS `pev` runtime representation (typed struct? index
proxy?). If `pev` becomes a typed object in D.5, these become
`pev.cl_viewangle`, `pev.origin`, etc. — note in HANDOFF.md.

## Suggested rewrite

(Only the changed lines; rest is unchanged.)

```typescript
export function GoBulletTime(this: CTSStunt): void {
  const self = this as any;
  const player: any = self.m_pPlayer;
  if (!player) return;

  // Bug 1 fix: m_pPlayer is CBasePlayer*; pev is the first member of
  // CBaseEntity (HLSDK layout). Dereference once.
  const pev: any = player[0];
  const vtable: any = player[0x60];

  // ---- 1. Guard ----
  const resource = vtable[4](player);
  if (resource >= ts.CONST_6EFE8) return;

  // ---- 2. UTIL_MakeVectors from cl_viewangle ----
  // (pev[0x74] is a TS-extended pev field; standard HLSDK v_angle
  // is at +0x5c, the +0x18 shift is TS layout.)
  UTIL_MakeVectors(pev[0x74]);

  // ---- 3. Snapshot dash direction (negated v_forward) on this ----
  const forward = gpGlobals.v_forward;
  self.field_0x20 = -forward.x;
  self.field_0x24 = -forward.y;
  self.field_0x28 = -forward.z;
  self.field_0x2c = 1;

  // ---- 4. Snapshot dash strength cvar + horizontal kick ----
  self.field_0x0 = ts.CONST_6DE90;
  self.field_0x34 = ts.CONST_6DE90 + forward.x;
  // NOTE: in the asm, field_0x30 is written at 0x8a6f6, AFTER the
  // lock-in-place + zero-velocity sequence. Moved here for narrative
  // grouping; semantically equivalent (no intervening read).

  // ---- 5. gmsgTSNextStunt + Animate ----
  g_engfuncs[0xb8 / 4](
    1,
    gmsgTSNextStunt.valueOf(),
    null,
    pev[0x208],
  );
  Animate_BulletTime(player + 0x28c, player, ANIM_BULLET_TIME);

  // ---- 6. Frame-count + vtable timers ----
  const frameCount = Math.floor(ts.CONST_6F06C * self.field_0x0);
  vtable[0xc0 / 4](player, frameCount);
  vtable[0xbc / 4](player);

  // ---- 7. Lock player in place ----
  pev[0x250] = (pev[0x250] as number) | 0x4 | 0x20;
  pev[0x2a0] = 0x3;

  // ---- 8. Zero velocity ----
  pev[0x174] = g_vecZero.x;
  pev[0x178] = g_vecZero.y;
  pev[0x17c] = g_vecZero.z;

  // ---- 9. field_0x30 (asm 8a6f6) — moved for grouping, see note above ----
  self.field_0x30 = ts.CONST_6DE90;

  // ---- 10. Bullet-time whoosh SFX ----
  // TODO(D.4): resolve against the 8-arg EMIT_SOUND_DYN signature —
  // see Bug 3 in the review. The current7-arg call drops the
  // &string arg at [ebx-0x6c364] which the demangled symbol
  // (FP7edict_siPCcffiif) lists as arg #3.
  const edForEmit: any = pev[0x208];
  const rawPtr: number = g_engfuncs[0x168 / 4](0, 0x1f);
  const resolvedPath: string =
    rawPtr === 0 ? ts.STR_6C364 : String(/* readCString(rawPtr + 0x5f) */);

  EMIT_SOUND_DYN(
    edForEmit,
    CHAN_VOICE,
    resolvedPath,
    1.0,
    0.8,
    0,
    0.5,
  );

  // ---- 11. Motion-blur message + slow-mo cycle ----
  g_engfuncs[0xb8 / 4](
    0x4,
    gmsgTSMotionBlur.valueOf(),
    pev[0x8],
    null,
  );
  // Bug 2 fix: asm pushes pev[0x208] (not player) as the explicit  // arg to vtable[71] at 0x8a7a0.
  const currentTier = vtable[0x11c / 4](pev[0x208]);
  vtable[0xc0 / 4](player, currentTier);
  vtable[0xc0 / 4](player, 2);
  vtable[0xbc / 4](player);
}
```

## Verdict rationale

**FAIL** because Bug 1 is unambiguous, propagates to ~6 sites in the
function, and the TS comment explicitly contradicts the buggy code
("player's first slot is pev" + `pev = player`). Bug 2 is also
unambiguous. Bug 3 is ambiguous and may be intentional but needs the
real TS source to confirm — call it out in HANDOFF.md as a D.4
verification item.

Once Bug 1 + Bug 2 are fixed, the rest of the function is faithful
to the disassembly and the field-naming gaps are honestly scoped as
D.4 work (which matches the conversion guidance). No fabricatedcontrol flow, no comment-only stubs, compiles in isolation.

**Recommended next step:** fix Bugs 1+2, file Bug 3 against the real
TS source as a D.4 blocker, update HANDOFF.md to record this review
and the D.4 items it surfaced (resolve the 8-arg EMIT_SOUND_DYN,
name the `field_0xNN` slots, pin the `vtable[47]/[48]/[71]` method
names on `CBasePlayer`).
