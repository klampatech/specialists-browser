```
VERDICT: PASS-WITH-NOTES

Scope note: the HLSDK reference covers the 4 API exports
(GiveFnptrsToDll, GetEntityAPI, GetEntityAPI2, GetNewDLLFunctions).
This decompiled TS is CTSStunt::GoWallJump — a gameplay method, not
one of the 4 exports. Checklist items 2 and 3 are therefore N/A;
the rest is reviewed against the disassembly + class context.

Checklist:
1. Signature — ✅ — `export function GoWallJump(this: CTSStunt): void`
   matches `GoWallJump__8CTSStunt`. Disassembly reads its first arg
   at [esp+0x40], has no second explicit arg, and `ret`s without
   touching eax ⇒ void. Class-context table confirms it is a
   CTSStunt member.

2. Version check — ⚠️ N/A — not a GetEntityAPI* / GetNewDLLFunctions
   export; the disassembly never negotiates an interface version.

3. *interfaceVersion assignment-back — ⚠️ N/A — same reason.

4. Success path — ⚠️ needs review — there is no function-table
   memcpy in this code (those live in the 4 API exports). The TS
   does represent the two `rep movsd` 12-byte copies (sign-flipped
   v_forward → this+0x20; global Vec from GOT+0x1888 → entity+0x174),
   the SFX emit, and both svc broadcasts, but several concrete
   values inside those broadcasts are hardcoded literals rather
   than reads from the disassembled GOT globals (see item 5).

5. No fabricated paths — ❌ fail —
   a) First MessageBegin: TS hardcodes `svc_speed = 1`. The
      disassembly reads svc from `[ebx+0x168c]`. svc_maxspeed in
      HL1 is 46, not 1; the literal is invented.
   b) Bonus MessageBegin: TS hardcodes `svc_velocity = 4`. The
      disassembly reads svc from `[ebx+0x1d38]`. Again invented.
   c) Bonus MessageBegin's 3rd arg is `playerEnt.velocity`, but the
      disassembly passes `entity+0x8` (a different field — likely a
      Vector anchor, not the velocity vector).
   d) Bonus block omits an intermediate `WriteShort(eax)` between
      `WriteLong` and `WriteShort(2)`. Disasm bytes 0x8a9f5..0x8a9f8
      show an extra `mov [esp], eax; call [edi+0xc0];` before the
      `WriteShort(2)` at 0x8aa05.
   e) EMIT_SOUND_DYN's channel is hardcoded as `0x1f`. The disassembly
      pushes `0x4` as EMIT_SOUND_DYN's channel arg (8a989); `0x1f` is
      an arg to the *separate* pitch-helper call `[edi+0x168]` at
      0x8a965, not to EMIT_SOUND_DYN.
   f) pitch `0x6f` is a literal; the disassembly computes
      pitch = `[edi+0x168](0, 0x1f, 0x5f000000) + 0x5f`.
   g) `engine.someMethod(0, 0xa)` abstracts `[edi+0x168]` into a
      generic "engineTick" with no enginefuncs_t offset verification.

6. No TODO body — ✅ — body is real code. TODO markers are used as
   comments for genuinely ambiguous values (matches conversion
   guidance).

7. Field names — ⚠️ needs review —
   ✓ m_pPlayer @ this+0x40, viewAngles @ entity+0x74,
     m_fFlags @ entity+0x250, m_vecBaseVelocity @ entity+0x174,
     m_anim @ this+0x28c, m_flMaxSpeed @ entity+0x11c (matches the
     literal 0x3f400000 write at 0x8a8c0).
   ✓ m_flJumpUpVel @ this+0x38 + clamp to 0 written @ this+0x00
     matches the disassembly (0x8a8ca..0x8a8ef).
   ⚠ The double-deref shape `m_pPlayer.entity` implies that the
     pointee's first dword is the entity pointer; standard HLSDK
     CBasePlayer's first dword is the vtable, so the TS's factoring
     needs a class-layout verification (deferred to D.4 per
     conversion guidance — should be flagged in a comment, not
     asserted).

8. Compiles in isolation — ✅ — every external symbol
   (UTIL_MakeVectors, Animate, EMIT_SOUND_DYN, engine.*,
    readGlobalVector, readFString, JUMP_UP_RAMP, SPEED_MULT,
    BONUS_THRESHOLD) is stubbed at the top of the file. Untyped
    shapes use `any`. No circular references.

Issues to fix:
- Replace hardcoded svc literals `1` and `4` with reads from
  `[ebx+0x168c]` and `[ebx+0x1d38]` (e.g. via a `readSvc(gotOffset)`
  helper), and rename them so the call sites show their source.
- Fix the bonus MessageBegin's 3rd argument from `playerEnt.velocity`
  to `&playerEnt.fieldAt8` (and add a TODO flagging what entity+0x8
  is until D.4 lands the full entvars layout).
- Insert the missing intermediate `WriteShort(eax)` in the bonus
  block (between the WriteLong and the WriteShort(2)), with a TODO
  on where eax comes from (post-WriteLong return or some engine
  helper).
- Fix EMIT_SOUND_DYN's channel from `0x1f` to `0x4`. Move the
  `0x1f` into a separate stub `engineGetPitch(0, 0x1f, 0x5f000000)`
  and use its return value + 0x5f as the actual pitch arg.
- Either name the engine helper (offset 0x168 in enginefuncs_t)
  or strip the abstraction to a single TODO with the disasm
  hex; do not silently call it `engine.someMethod`.
- Annotate the m_pPlayer double-deref with a TODO pointing at D.4
  for the full class layout (do not assert the chosen factoring).

Suggested rewrite (only the changed/added parts):

```typescript
// Add these stubs near the existing declarations:
declare function readSvc(gotOffset: number): number;
declare function engineGetPitch(a: number, b: number, c: number): number;

// ...inside GoWallJump, replace the first broadcast:
const svcSpeed = readSvc(/* got+0x168c */ 0x168c);
engine.MessageBegin(/* MSG_ONE */ 1, svcSpeed, playerEnt.owner);
engine.WriteShort(Math.trunc(this.m_flJumpSpeed * SPEED_MULT));
engine.MessageEnd();

// ...and the SFX block:
const pitch = engineGetPitch(0, 0x1f, 0x3f000000) + 0x5f;
EMIT_SOUND_DYN(playerEnt.edict, /* channel */ 0x4,
               readFString(/* got-0x6c378 */ -0x6c378),
               /* vol */ 1.0, /* attn */ 0.8, pitch, /* flags */ 0);

// ...and the bonus block (note: msg_type comes from the `push 0x4`
// at 0x8a9d9; dest is entity+0x8, NOT velocity; svc is the second
// GOT-sourced value; intermediate WriteShort(eax) is added):
const svcBonus = readSvc(/* got+0x1d38 */ 0x1d38);
// TODO(asm-ambiguous): entity+0x8 is a pointer/lvalue the engine
//   expects in MessageBegin's dest slot — confirm in D.4 (entvars
//   layout) what field aliases offset 0x8.
engine.MessageBegin(/* msg_type */ 4, svcBonus, &playerEnt.fieldAt8);
engine.WriteLong(playerEnt.owner);
// TODO(asm-ambiguous): disasm writes short(eax) here, where eax
//   is the post-WriteLong return value (undefined) overwritten from
//   [esp] then pushed as a short. Mark as TODO until the engine
//   helper at offset 0x168 is resolved.
engine.WriteShort(/* TODO */ 0);
engine.WriteShort(/* bonus tick */ 2);
engine.MessageEnd();
```

Bottom line: structure and control flow are faithful to the
disassembly, but five concrete values inside the broadcasts and
EMIT_SOUND_DYN call are either hardcoded or pointed at the wrong
field. Address items 5a–5g and field TODO before promoting this
to a real D.4 source file.
