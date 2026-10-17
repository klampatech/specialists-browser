```
VERDICT: FAIL

Note on scope: the review checklist was designed for the 4 engine↔mod
interface entry points (GiveFnptrsToDll, GetEntityAPI, GetEntityAPI2,
GetNewDLLFunctions). CTSStunt::Landing is a gameplay method, not one of
those. Items 2 and 3 are N/A by design. The remaining items still apply
and have been judged against the disassembly.

Checklist:
1. Signature — ✅ — `Landing(this: CTSStunt): void` matches the
   demangled symbol and the disassembly (this in [esp+0x40], no return
   value, ret at 0x8bd99).

2. Version check — N/A — not an engine interface function. No version
   constant applies.

3. interfaceVersion assignment — N/A — no `*interfaceVersion` pointer
   in scope.

4. Success path — ❌ — several control-flow branches are correct, but
   the data flow on Path A's Animate call, the EMIT_SOUND_DYN call, and
   Path B's GetDirection call all have wrong arg order or missing args.
   See issues below.

5. No fabricated paths — ⚠️ — the two main branches (Path A / Path B)
   match the disassembly (test at 0x8bc2e, je 0x8bcac, jmp 0x8bd3b).
   However, the helper invocation before EMIT_SOUND_DYN is misread:
   disassembly pushes three args (0, 0x1f, 0.5) into the helper, but
   TS calls it with only two (0, 0x1f). The 0.5 is real, not invented
   noise — dropping it changes the helper's input.

6. No TODO body — ✅ — the function logic is expressed in code, with
   `TODO(asm-ambiguous)` comments where the assembly genuinely is
   ambiguous (the +0x1a5 packed-flag field). Acceptable per the
   conversion guidance.

7. Field names — ⚠️ — multiple `pev.*` fields are named after HL1
   entvars_t slots, but the offsets in the disassembly don't match the
   standard HL1 layout (origin at +0x74, velocity at +0x174, button at
   +0x250, flags at +0x180). TS mod is presumably using a non-standard
   entvars layout, so the names are speculative. The body uses
   `pev.packedFlags`, `pev.button`, `pev.flags`, `pev.velocity`,
   `pev.origin`, `pev.fuser1`, `pev.fuser2` — only the last two match
   known HL1 offsets (+0x120 and +0x11c). The others should be
   `TODO`-tagged or annotated as TS-layout guesses.

8. Compiles in isolation — ✅ — every external type the function
   references (`CTSStunt`, `CBasePlayer`, `EntVars`, `LandingVec`,
   `LandingSound`, `engineHelper`, `GetDirection`, `EMIT_SOUND_DYN`) is
   declared. The forward declarations are sufficient for tsc.

Issues to fix (material bugs first):

1. ❌ First guard mask is wrong (0x1a5 byte, bit 0x2 vs 0x200).
   The disassembly is `test BYTE PTR [edx+0x1a5],0x2`. The TS code
   uses `if ((pev.packedFlags & 0x200) === 0) return;`. `0x200` is
   bit 9 of an int; the assembly tests bit 1 of a byte. The TS   comment even says "bit 0x2 is being tested" — but the code uses
   0x200. Change to `& 0x02`.

2. ❌ Path B `GetDirection` arg order is swapped.
   Disassembly (pushes are right-to-left):
     push 0x3e99999a (0.3)  ← arg 4
     push 0x3f19999a (0.6)  ← arg 3
     push ecx (origin)      ← arg 2
     push esi (this->vec1)  ← arg 1
   So the call is `GetDirection(vec1, vec2, 0.6, 0.3)`. TS has   `(this.vec1, pev.origin, 0.3, 0.6)` — third and fourth swapped.

3. ❌ Path A's `Animate` call passes the wrong first arg.
   Disassembly does `mov eax, [ebp+0x40]; add eax, 0x28c; push eax`
   where `[ebp+0x40]` is `this->player`. So arg 1 is
   `(char*)this->player + 0x28c`, NOT `this.animation`. The TS calls
   `this.animation.Animate(this.player, 46)` — that's a different
   object. The likely intent is `(player as any).animation` or
   `(player as any).m_pAnimation`, depending on what lives at +0x28c
   in CBasePlayer (which we can't verify without the D.4 layout
   work, but the disassembly clearly says "player + 0x28c", not
   "this alone").

4. ❌ `EMIT_SOUND_DYN` arg count is wrong (8 args vs 7) and order
   is wrong on the last two slots.
   Demangled: `EMIT_SOUND_DYN(edict_t*, int, const char*, float,
   float, int, int)` — 7 args.
   Disassembly pushes (right-to-left): ent, 0x4, sample, 1.0, 0.8,
   0, pitch. So the 6th arg is entindex (= 0) and the 7th is pitch.
   TS has 8 args including a `channel` parameter that does not exist
   in the demangled signature, and pitches/entindex are swapped.
   Correct call: `EMIT_SOUND_DYN(ent, 0x4, sample, 1.0, 0.8, 0, pitch)`.

5. ❌ Pre-sound helper call is missing its third argument.
   Disassembly:
     push 0x3f000000  ← arg 3 (= 0.5)
     push 0x1f        ← arg 2
     push 0x0         ← arg 1
 call [eax+0x168]
   So the helper is `engineHelper.someFunc(0, 0x1f, 0.5)`. TS calls
   `engineHelper.getPitch(0, 0x1f)` — the 0.5 is dropped.

6. ⚠️ Field-name speculation on `pev.*`.
   The TS uses HL1-standard field names, but the offsets in the
   disassembly (`+0x74` for origin, `+0x120` and `+0x11c` for
   fuser1/2, `+0x174` for the 12-byte vector copy, `+0x180` for the
   flag test, `+0x250` for the bitwise ops, `+0x208` for the entity
   pointer) don't all align with HL1's standard entvars layout. The
   TS may be correct or wrong on each, but the names are not
   justified by the disassembly alone. Recommend renaming to
   `pev.field_at_0x250` etc., or adding `TODO(asm-ambiguous)` per
   field, until the TS entvars layout is documented in D.4.

7. ⚠️ The Animate external-call demangling reads as
   `Animate__12CTSAnimationP11CBasePlayeri`, i.e.
   `CTSAnimation::Animate(CTSAnimation*, CBasePlayer*, int)`. The TS
   treats it as `this.animation.Animate(...)` — fine if
   `this.animation` is a CTSAnimation and the prototype is correctly
   captured, but combined with issue #3 above the first arg target
   is wrong.

8. ℹ️ Minor: TS uses `0/1` for `setne` (cmp eax, 0x2; setne byte). The
   disassembly stores the result as a byte; both `0/1` and
   `true/false` compile to the same storage, but using `0/1`
   matches the byte semantics more cleanly.

Suggested rewrite:

```typescript
/**
 * CTSStunt::Landing — handle the player's landing from a stunt maneuver.
 *
 * Bails out unless the player is ducking (byte at pev+0x1a5, bit 0x2)
 * AND has a relevant button held (int at pev+0x250, bit 0x10). Then
 * branches on a flag word at pev+0x180 (mask 0x4006).
 *
 * Path A (high-impact): clear the in-dive bit, set landing-state bits
 * (0x40000 and 0x1), stamp 0.5 into pev+0x120, copy the canned landing
 * Vector (GOT+0x1888) into pev+0x174 (12 bytes), set this->recoveryTimer
 * (this+0x4) to 0.53125, and call Animate with first arg =
 * (char*)this->player + 0x28c.
 *
 * Path B (regular): clear the in-dive bit, set the rolling bit (0x20),
 * copy the landing Vector, call GetDirection(this->vec1, pev->field_0x74,
 * 0.6, 0.3). If the result != 2, set this->facingMismatch (this+0x2c);
 * store the result into player+0x2a0.
 *
 * Common epilogue: stamp 1.0 into pev+0x11c, call the engine helper
 * at GOT+0x1aa8 vtable+0x168 with (0, 0x1f, 0.5), add 0x5f to its
 * return value to get the pitch, then EMIT_SOUND_DYN with the entity
 * at pev+0x208.
 */
export function Landing(this: CTSStunt): void {
  const player: CBasePlayer = this.player;        // this+0x40
  const pev: EntVars = player.pev;                // entvars_t*

  // Guard 1: byte at pev+0x1a5, bit 0x2 (ducking)
  if ((pev.byte_at_0x1a5 & 0x02) === 0) return;

  // Guard 2: int at pev+0x250, bit 0x10 (button)
  if ((pev.int_at_0x250 & 0x10) === 0) return;

  if ((pev.int_at_0x180 & 0x4006) !== 0) {
    // === Path A: high-impact landing ===
    pev.int_at_0x250 = (pev.int_at_0x250 & ~0x10) | 0x40000 | 0x1;
    pev.float_at_0x120 = 0.5;
    // rep movsd 12 bytes from GOT+0x1888 to pev+0x174
    pev.vec3_at_0x174.copyFrom(LandingVec);
    this.recoveryTimer = 0.53125; // this+0x4
    // Animate signature: CTSAnimation::Animate(this, player, sequence)
    // First arg in disassembly = (char*)this->player + 0x28c
    Animate(player.m_pAnimation_at_0x28c, player, 46);
  } else {
    // === Path B: regular landing ===
    pev.int_at_0x250 = (pev.int_at_0x250 & ~0x10) | 0x20;
    pev.vec3_at_0x174.copyFrom(LandingVec);
    // Disassembly pushes 0.6 as arg 3, 0.3 as arg 4
    const dir = GetDirection(this.vec1, pev.vec3_at_0x74, 0.6, 0.3);
    this.facingMismatch_byte_at_0x2c = (dir !== 2) ? 1 : 0;
    player.int_at_0x2a0 = dir;                    // landingDir
  }

  // === Common epilogue (skipped on bail) ===
  pev.float_at_0x11c = 1.0;

  // engine helper: (0, 0x1f, 0.5) → returns a base pitch; add 0x5f  const pitch = engineHelper.func_at_0x168(0, 0x1f, 0.5) + 0x5f;

  // EMIT_SOUND_DYN(edict_t*, int, const char*, float, float, int, int)
  EMIT_SOUND_DYN(
    pev.ent_at_0x208,         // ent*
    0x4,                      // flags
    LandingSound,             // sample (GOT-0x6c364)
    1.0,                      // vol
    0.8,                      // attn
    0,                        // entindex
    pitch                     // pitch
  );
}

// --- Forward declarations (real definitions in D.4 / engine module) ---
type Vector = { x: number; y: number; z: number };
declare class CTSStunt { /* D.4 */ }
declare class CBasePlayer { /* external */ }
declare class EntVars { /* external */ }
declare const LandingVec: Vector;
declare const LandingSound: string;
declare const engineHelper: {
  // vtable+0x168: takes (int, int, float) per disassembly
  func_at_0x168(a1: number, a2: number, a3: number): number;
};
declare function GetDirection(
  v1: Vector,
  v2: Vector,
  f1: number,    // 0.6 (arg 3)
  f2: number     // 0.3 (arg 4)
): number;
declare function Animate(
  thisAnim: unknown,   // (char*)player + 0x28c, treated as CTSAnimation*
  player: CBasePlayer,
  sequence: number
): void;
declare function EMIT_SOUND_DYN(
  ent: unknown,
  flags: number,
  sample: string,
  vol: number,
  attn: number,
  entindex: number,
  pitch: number
): void;
```

Pre-commit checklist for D.3 / D.4 follow-ups:
- Resolve the field-name speculation (item 6) by documenting the TS
  entvars_t layout in D.4 — every `pev.field_at_OFFSET` in this rewrite
  should become a real named field once the layout is mapped.
- Resolve `player.m_pAnimation_at_0x28c` — likely `player.m_pAnimation`
  or similar, but needs the CBasePlayer layout.
- Resolve `engineHelper.func_at_0x168` — it's a virtual call on an
  engine object (`[ebx+0x1aa8]` is a global pointer to some engine
  helper struct; `+0x168` is the vtable slot). Naming requires D.5
  work where the engine↔mod interface is wired up.
- Re-run tier-1 smokes once the function is rewritten to confirm the
  arg-order fixes don't regress behavior.
```
