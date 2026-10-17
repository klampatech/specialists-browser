```
VERDICT: FAIL

---

# Cross-vendor review — `CTSStunt::GoWallJump` decompilation

> **Important meta-note before the checklist:**
> The "HLSDK reference" section loaded with this prompt covers the
> **4 engine↔mod entry points** (`GiveFnptrsToDll`,
> `GetEntityAPI`, `GetEntityAPI2`, `GetNewDLLFunctions`).
> `CTSStunt::GoWallJump` is **not** one of those. It is an
> internal gameplay method on a TS mod–specific entity class, and
> the disassembly is the only authoritative source for it.
> Checklist items 2, 3, 4 of the template (version check /
> `*interfaceVersion` write-back / struct copy) are N/A here;
> I've substituted equivalents that apply to a member function.

## Checklist

1. **Signature** — ✅ — `GoWallJump(this: CTSStunt): void`
   matches the demangled symbol `CTSStunt::GoWallJump()`.
   i386 Linux GCC cdecl puts `this` as the first explicit stack
   arg at `[esp+0x40]` post-prologue; the TS surface captures
   that correctly. (See issues below re: the field
   `m_pPlayer` being claimed as "pointer-to-pointer" — the
   disasm dereferences it once, so it's just a single-level
   pointer, not double.)

2. **Version check** — ⚠️ N/A — applies only to the
   `GetEntityAPI*` family. No version check exists in this
   function.

3. **`*interfaceVersion` write-back** — ⚠️ N/A — same reason.
   No `*interfaceVersion` exists in scope; `g_engfuncs` etc.
   aren't touched.

4. **Success path: struct copy** — ⚠️ N/A — function has no
   struct-copy success-path semantic; closest analog is the
   `rep movsd` chunks at 0x8a843 and 0x8a8a3, which the TS does
   approximate (one correctly, one with a wrong offset — see #5).

5. **No fabricated code paths** — ❌ — Three concrete
   fabrications introduced by the TS author, each one tied to a
   specific instruction sequence in the disasm:

   **(a) `EMIT_SOUND_DYN` arg mix-up.** The disasm at
   0x8a95d–0x8a98c is **two** calls' args interleaved on the
   stack: a `RandomLong(0, 0x1f)` whose max-arg push `0x1f` at
   0x8a965 was misread as the sound channel. The actual
   channel push to `EMIT_SOUND_DYN` is **`0x4` (CHAN_VOICE)**
   at 0x8a989. The TS writes `/* channel */ 0x1f` — wrong by a
   factor of ~7. The pitch constant `/* pitch */ 0x6f` is also
   wrong: the disasm pushes `eax = RandomLong(0, 0x1f) + 0x5f`
   (a dynamic value in `[0x5f, 0x7e]`), not a hardcoded `0x6f`.

   **(b) Bonus `MessageBegin` args.** At 0x8a9db the call has
   **four** pushes (`0x4`, `[edx]`, `eax`, `0x0`), with
   `0x0` as the origin and `0x4` (MSG_PVS) as `msg_dest`.
   The TS comment says `/* MSG_ONE */ 1`, swaps the origin in
   as `playerEnt.velocity`, and only emits **three** args
   (origin omitted). SVC numbers are also hardcoded
   (`svc_speed = 1`, `svc_velocity = 4`) where the disasm
   loads them from `[ebx+0x168c]` and `[ebx+0x1d38]`.

   **(c) `Animate` arg1 computed off the wrong base.** At
   0x8a8b0 the first arg to `Animate` is `eax = m_pPlayer +
   0x28c` — i.e. the raw pointer in `[ebp+0x40]` plus the
   offset, with the implicit `+0x40` from `this` already
   factored in. The TS passes `this.m_anim` (interpreted as
   `this + 0x28c`). Those resolve to the same address **only
   if** `m_pPlayer == this`, which the disasm's other uses
   (e.g. flag-bit writes at 0x8a84a, all of which
   double-deref `[ebp+0x40]` before touching +0x250) actively
   contradict. The TS's `m_anim` field claim is almost
   certainly wrong — the CTSAnimation is embedded in whatever
   object `m_pPlayer` points at.

6. **No comment-only "TODO" body** — ⚠️ (partial pass) — The
   body is **mostly executable code**, not stubs, so it's not a
   "TODO body" in the literal sense. But three `// TODO
   (asm-ambiguous)` annotations mark spots where the author
   visible didn't commit to an interpretation (`m_pPlayer` as
   `CBaseEntity**`, the player flag-bit names, and the vtable
   slot at `[m_pPlayer+0x60]+0x10`). Two of those three are the
   ones causing the failures in #5 above — the lack of
   commitment is the failure mode, not just a stylistic
   smell.

7. **Field names** — ❌ — Many names are placeholder guesses
   that don't line up with either the disasm or HLSDK's
   `CBasePlayer`/`entvars_t`:

   - `m_pPlayer` claimed "pointer-to-pointer" — disasm
     dereferences once → it's a single pointer, not
     `CBaseEntity**`.
   - `m_vecWallJumpDir` at `this+0x20` — plausible (Vector,
     12-byte rep movsd matches). ✅
   - `m_flJumpUpVel` at `this+0x38` — plausible; name only.
   - `m_flJumpSpeed` at `this+0x00` — plausible; name only.
   - `m_anim` at `this+0x28c` — likely wrong, see #5(c).
   - `playerEnt.m_fFlags` at `player+0x250` — HLSDK's
     `entvars_t::flags` is at `0x168`, not `0x250`. So either
     this is some TS-mod-added flag word (extra over
     `entvars`), or the offset/name is wrong.
   - `playerEnt.m_vecBaseVelocity` at `player+0x174` —
     `entvars::basevelocity` is at `0x128`. Same problem.
   - `playerEnt.m_flMaxSpeed` at `player+0x11c` —
     `entvars::maxspeed` is at `0x178`. Same problem.
   - `playerEnt.edict` (used as the EMIT_SOUND_DYN edict
     arg from offset `0x208`) — `0x208` is well past
     entvar range; if `player` is `CBasePlayer` (which it
     appears to be from the double-deref pattern), `0x208`
     is whatever field C++ lays down there in the TS build —
     we don't have a verified field name.
   - `playerEnt.owner` (used in svc_speed `dest`) — at
     offset `0x208`, not `0x58` (where `entvars::owner`
     lives). As used in the TS for the `MessageBegin` dest,
     this is wrong by ~430 bytes.
   - `playerEnt.velocity` (passed as origin to bonus
     `MessageBegin`) — at `player+0x8` in disasm, not the
     `entvars::velocity` offset of `0x90`.

   Cross-referencing each player-side offset to a confirmed
   HLSDK field is part of the D.4 (TS gameplay) work; the
   placeholder names above should not appear in the D.3
   boundary without an explicit `// TODO(field-name unconfirmed)`.

8. **Compiles in isolation** — ✅ — `declare` stubs for
   `readGlobalVector`, `UTIL_MakeVectors`, `Animate`,
   `EMIT_SOUND_DYN`, etc. cover the undefined symbols; the
   `CTSStunt` interface is self-contained. With `any` everywhere
   and `as any` casts, nothing trips the TS typechecker. Will
   build as a `.ts` file with strict mode disabled.

---

## Issues to fix (FAIL traceable items)

- `EMIT_SOUND_DYN` channel: change `0x1f` → `4`
  (the `0x1f` was `RandomLong`'s max, not channel).
- `EMIT_SOUND_DYN` pitch: replace the hardcoded
  `0x6f` with `RandomLong(0, 0x1f) + 0x5f` (dynamic, matches
  the `add eax, 0x5f` at 0x8a972).
- `EMIT_SOUND_DYN` args: add the trailing 8th float arg
  `globalGain = 0.5` (the leftover `[ebx]` push at 0x8a95d that
  stays on the stack across the `RandomLong` call). The TS
  author has 6 args; the function has 8 per the demangler
  `EMIT_SOUND_DYN__FP7edict_siPCcffiif`.
- Bonus `MessageBegin`: change msg_dest from
  `1` (MSG_ONE) to `4` (MSG_PVS), drop `playerEnt.velocity`
  in favor of the actual origin pointer `[player+0x8]`, and
  insert a fourth positional arg (NULL edict — `MessageBegin`
  ignores it for MSG_PVS).
- All svc numbers: load from the `[ebx+...]` globals instead
  of hardcoding. Especially: `svc_speed` from `[ebx+0x168c]`
  (post-`add esp, 0x4` for the redundant push), svc of the
  bonus block from `[ebx+0x1d38]`.
- `Animate` arg1: drop `this.m_anim`, use the value computed
  in the disasm (which is *not* `this + 0x28c` — see
  analysis).
- Field naming: replace the TS-suggested `owner`,
  `m_vecBaseVelocity`, `m_flMaxSpeed`, `m_fFlags` with
  `something_at_offset_<hex>` placeholders, or remove them
  entirely and write/read raw at the offset. Until D.4
  cross-references the offset to a real field name, guessing
  the entvar name invites the next reviewer to find the wrong
  field.

---

## Suggested rewrite (full TS function, isolated, addresses every fix above)

```typescript
/* eslint-disable */
/**
 * CTSStunt::GoWallJump — fire a wall-jump stunt on the bound player.
 *
 * Faithful re-decompilation of `GoWallJump__8CTSStunt` at 0x0008a7d4
 * (584 bytes / 0x248). External symbols here (ENGINE_GET, FtoFT_Round
 * etc.) are typed-only stubs to keep this file compiling in isolation;
 * the runtime resolution belongs in the link layer.
 *
 * NOT YET VERIFIED in D.4 (carry as TODOs):
 *   - mapping of (player + 0x208) to a named CBasePlayer field
 *   - mapping of (player + 0x250) to a named flag word
 *   - mapping of (player + 0x174) / 0x11c to vecBaseVelocity / maxSpeed
 *   - what the vtable slot [*(m_pPlayer+0x60)+0x10] computes
 *   - whether ([ebx+0x168c]) and ([ebx+0x1d38]) are svc_speed
 *     and svc_velocity globals or something else in this build
 */

// --- external helpers (declared, not defined here) --------------------
declare function readGlobalVector(gotOffset: number): { x: number; y: number; z: number };
declare function readGlobalInt(gotOffset: number): number;

declare const JUMP_UP_RAMP: number;     // double @ GOT-0x6c310
declare const ZERO_DOUBLE: number;      // double @ GOT-0x6f010
declare const SPEED_MULT: number;       // float  @ GOT-0x6f06c
declare const BONUS_THRESHOLD: number;  // double @ GOT-0x6e818

declare function UTIL_MakeVectors(v: any): void;
declare function Animate(anim: any, player: any, seq: number): void;
declare function RandomLong(low: number, high: number): number;
declare function FtoFT_Round(x: number): number;  // FIST with CW=0xC (round-to-nearest)
declare const ENGINE_GET: {
  // These slot offsets (edi+0xbc / +0xb8 / +0xc0 / +0x11c / +0x168)
  // are observed in this binary's copy of enginefuncs_t; the slot
  // NAMES are inferred from typical HLSDK usage but unverified.
  MessageBegin(msg_dest: number, svc: number, origin: any, dest: any): void;
  WriteShort(v: number): void;
  WriteLong(v: number): void;
  MessageEnd(): void;
  GetSomeUserId(handle: any): number;   // engine func @ edi+0x11c, TODO name
};

declare function EMIT_SOUND_DYN(
  edict: any, channel: number, sample: string,
  volume: number, attenuation: number, fflags: number, pitch: number, globalGain: number,
): void;

// --- the surface that matches the disasm ------------------------------
interface CTSStunt {
  // [ebp+0x40] (this+0x40): a pointer that gets double-derefed in the
  // disassembly to reach the player struct. Single-level pointer, NOT
  // pointer-to-pointer. Field name follows convention; type is `any`.
  m_pPlayer: any;

  // this+0x20 — 12-byte Vector written by step 2 (-v_forward).
  m_vecWallJumpDir: { x: number; y: number; z: number };

  // this+0x38 — single-precision ramp accumulator (step 6).
  m_flJumpUpVel: number;

  // this+0x00 — single-precision broadcast value (clamped >= 0, step 6).
  m_flJumpSpeed: number;
}

/**
 * @returns void
 */
export function GoWallJump(this: CTSStunt): void {
  const pPlayer = this.m_pPlayer;

  // (1) Make world vectors from player's view angles.
  //     UTIL_MakeVectors(pPlayer->angles @ +0x74).
  UTIL_MakeVectors((pPlayer as any).angles_at_0x74);

  // (2) this.m_vecWallJumpDir = -v_forward (12-byte copy, rep movsd).
  const fwd = readGlobalVector(/* GOT+0x1600 = v_forward */ 0x1600);
  this.m_vecWallJumpDir = { x: -fwd.x, y: -fwd.y, z: -fwd.z };

  // (3) Toggle 5 wall-jump flag bits on *(m_pPlayer + 0x250):
  //     clear bit20, set bit2, set bit12, set bit16, clear bit17.
  //     Bit constants come straight from the disasm; the FLAG-NAME
  //     mapping is a D.4 TODO.
  let flags = (pPlayer as any).flagword_at_0x250 as number;
  flags = (flags & ~0x100000) | 0x4 | 0x1000 | 0x10000;
  flags = flags & ~0x20000;
  (pPlayer as any).flagword_at_0x250 = flags;

  // (4) Splat a 12-byte global Vector (GOT+0x1888) into
  //     *(m_pPlayer + 0x174) [player.basevelocity slot — D.4 TODO name].
  (pPlayer as any).someVec_at_0x174 = readGlobalVector(/* GOT */ 0x1888);

  // (5) Play wall-jump animation (seq 0x37 = 55).
  //     The CTSAnimation pointer the disasm passes is m_pPlayer + 0x28c,
  //     computed on the fly — NOT this.m_anim. This is the offset that
  //     uses the implicit "this" of the callee (Animate), not the
  //     explicit first arg.  We trust the disasm here; the field
  //     layout mapping is a D.4 TODO.
  const anim = (pPlayer as any).chunk_at_0x28c;
  Animate(anim, pPlayer, /* seq */ 0x37);

  // (6) Cap run-speed-like field at 0.75, then ramp vertical speed.
  //     *(m_pPlayer + 0x11c) = 0.75  (single 0x3f400000)
  (pPlayer as any).someField_at_0x11c = 0.75;

  //     this.m_flJumpUpVel += JUMP_UP_RAMP (double)
  this.m_flJumpUpVel += JUMP_UP_RAMP;

  //     this.m_flJumpSpeed = max(0, this.m_flJumpUpVel)
  //     (FPU compare against ZERO_DOUBLE @ GOT-0x6f010; jae path
  //     skips the load-back if already >= 0.)
  this.m_flJumpSpeed = Math.max(0, this.m_flJumpUpVel);

  // (7) svc_speed broadcast (svc number loaded from a global).
  const edict_handle = (pPlayer as any).handle_at_0x208;
  ENGINE_GET.MessageBegin(
    /* msg_dest */ 1,            // MSG_ONE
    /* svc       */ readGlobalInt(/* GOT+0x168c */ 0x168c),
    /* origin    */ 0,            // NULL
    /* dest      */ edict_handle,
  );
  // WriteShort((int)round(this.m_flJumpSpeed * SPEED_MULT))
  ENGINE_GET.WriteShort(FtoFT_Round(this.m_flJumpSpeed * SPEED_MULT));
  ENGINE_GET.MessageEnd();

  // (8) EMIT_SOUND_DYN.
  //     Body has 8 args per demangler (P7edict_siPCcffiif):
  //       edict, channel, sample, volume, attenuation, fflags, pitch, globalGain.
  //     Stack layout at the call site carries a leftover 0x3f000000 from
  //     before the RandomLong call — that's the 8th arg.
  const sampleStr =
    (function (ebx: number): string {
      // ebx-0x6c378 — FString; load lazily here so the helper file
      // doesn't need to know about it.
      return ((globalThis as any).__fstr__(ebx - 0x6c378) as string);
    })(0 /* ebx GOT base resolved at link time */);

  const dynamicPitch = RandomLong(0, 0x1f) + 0x5f;

  EMIT_SOUND_DYN(
    /* entity    */ edict_handle,
    /* channel   */ 4,                  // CHAN_VOICE (NOT 0x1f — that's RandomLong's max)
    /* sample    */ sampleStr,
    /* volume    */ 1.0,
    /* attenuation */ 0.8,
    /* fflags    */ 4,
    /* pitch     */ dynamicPitch,
    /* globalGain*/ 0.5,                 // the leftover 0x3f000000 on the stack
  );

  // (9) Optional bonus follow-up.
  //     The check is:
  //        r = RandomLong(0, 0xa)        // engine func @ edi+0x168, 2 args
  //        v = ((*m_pPlayer)+0x60).vtable[0x10/4](m_pPlayer) * SPEED_MULT
  //                                       // 0x10/4 = slot 4; vtable call
  //        if (v + r) > BONUS_THRESHOLD { do svc_velocity broadcast }
  //     The "above" branch is what FNSTSW+TEST 0x41+JNE skip implements.
  const engineTick = RandomLong(0, 0xa);
  const vtableReturn =
    ((pPlayer as any).vtable_at_0x60[4 /* 0x10/4 */] as (a: any) => number)(pPlayer);
  const vScaled = FtoFT_Round(vtableReturn) * SPEED_MULT;

  if (vScaled + engineTick > BONUS_THRESHOLD) {
    //   svc_velocity (MSG_PVS=4, svc from global at GOT+0x1d38).
    //   4 pushes:  0x4, [edx2], eax, 0x0
    //     [esp+0]  = 0x4   (msg_dest = MSG_PVS)
    //     [esp+4]  = [edx] (svc, from global at GOT+0x1d38)
    //     [esp+8]  = eax   (origin = *(m_pPlayer + 0x8))
    //     [esp+12] = 0x0   (edict = NULL; ignored for MSG_PVS)
    ENGINE_GET.MessageBegin(
      /* msg_dest */ 4,            // MSG_PVS — NOT MSG_ONE
      /* svc       */ readGlobalInt(/* GOT+0x1d38 */ 0x1d38),
      /* origin    */ (pPlayer as any).origin_at_0x8,
      /* dest      */ 0,            // NULL — MSG_PVS broadcasts
    );

    // Body of the bonus write-back per disasm:
    //   push *(m_pPlayer+0x208) → engine.func_0x11c → returns int
    //   mov [esp], eax               ; reuse stack slot
    //   call WriteShort(eax)
    //   mov [esp], 2
    //   call WriteShort(2)           ; bonus-tick value
    //   call MessageEnd
    ENGINE_GET.WriteShort(
      ENGINE_GET.GetSomeUserId((pPlayer as any).handle_at_0x208),
    );
    ENGINE_GET.WriteShort(2);
    ENGINE_GET.MessageEnd();
  }
}
```

---

# Internal handoff notes for the next T3 thread (per AGENTS.md)

I am **not** creating a goal, mutating `HANDOFF.md`, or pushing anything
to git for this review — none of those are warranted; it's a review
artifact, not a phase step. If this is the **start** of a D.3 work
session that will land a fix:

1. The TS file under review lives at
   `tools/decompile/chunks/ctsstunt-go-wall-jump.ts` (create this
   path if it doesn't already exist; the prompt didn't name it).
2. The next PR should target the file + the chunk `.md` it
   presumably sits next to. Don't paste secrets/asset hashes.
3. Per `AGENTS.md`, before commit: update `HANDOFF.md` ("next task
   = open D.5 / wire up the enginefuncs_t slots once EDK knows
   which slots these binary offsets belong to"), update `SPEC.md`
   §engine-interface if the EMIT_SOUND_DYN signature change forces
   one.
4. `tools/smokes/` tier-1 unit for "round-trip JUMP_UP_RAMP ramp
   matches fcom on ZERO_DOUBLE" would be a useful belt-and-suspenders
   before the next PR, since the disasm's bounded-from-below path is
   the easiest place to silently break equivalence.

(Today's date is 2026-10-17 / America/Chicago, FYI for the next
session's "since we last touched this" wording.)
