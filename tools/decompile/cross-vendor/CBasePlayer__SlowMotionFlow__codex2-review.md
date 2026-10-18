```
VERDICT: FAIL

Note on scope: `SlowMotionFlow__11CBasePlayer` is a gameplay
method on `CBasePlayer`, not one of the four engine↔mod
interface entry points the HLSDK reference covers. I've applied
the spirit of checklist items 2/3/4 (early-return correctness,
field-by-field preservation, no fabricated paths) but only
items 1, 5, 6, 7, 8 are strictly applicable in their literal
form. The verdict is driven by mismatches between TS and the
disassembly, plus the isolation-compile failure.

Checklist:
1. Signature — ✅ — Demangled symbol is `CBasePlayer::SlowMotionFlow()`
   (no args, just `this`). TS uses
   `export function SlowMotionFlow(this: CBasePlayer): void`, which
   matches the demangler, the address (0x86bb0), and the prologue
   (saves ebp/edi/esi/ebx, sets ebp = `[esp+0xb0]`). Good.

2. Version check pattern — ⚠️ — N/A literally (not an API function),
   but the two early-return guards in the TS don't faithfully
   reproduce the disassembly:
     • At 0x86bcd–0x86bde, the code is
       `fld [ebx-0x6f408]; fcomp [ebp+0x17c]; test ah,0x40; jne 8728d`.
       `[ebx-0x6f408]` is a static float constant (no double-indirect
       through `[ebx+0x1600]`), and `test ah,0x40; jne` jumps on
       C3=1, i.e., on EQUALITY. The TS has
       `if (gpGlobals.time < (this).m_flSlowMoEnd) return;` — wrong
       operator (`<` vs `==`), wrong operand (`gpGlobals.time` vs a
       static constant), and the comment ("Skip when slow motion is
       still active") inverts the semantics.
     • At 0x86be4–0x86bf9, the code is
       `mov ecx,[ebx+0x1600]; mov edx,[ecx]; fld [ebp+0x178];
        fcomp [edx]; test ah,0x41; je 8728d`. Both
       C3=0 (not equal) and C0=0 (not less) → ZF set → `je` taken
       on "not less than" → exactly equivalent to
       `(this.m_flSlowMoNext) > (gpGlobals.time)`. The TS gets this
       one right (`if (m_flSlowMoNext > gpGlobals.time) return;`).

3. `*interfaceVersion` assignment — N/A — not an API function.

4. Success path / struct copy — ⚠️ — N/A as `memcpy`, but the
   body has a real field-offset mistake:
     • Section 3 (self-slow), 0x86de1–0x86e01:
       `push [ebp+0x17c]; push [ebp+0x175 as byte]; push ebp;
        call DWORD PTR [edx+0x14]`.
       The arg pushed is `this->m_flSlowMoEnd` (offset 0x17c),
       not `this->field_0x180`. TS has
       `this.GoSlow((this).field_0x180, this.buttonByte)` — wrong
       field offset for the first arg.
     • Sections 4 & 5 GoSlow calls (0x86e60–0x6e86, 0x86f7f–0x86f91)
       push `DWORD PTR [ebp+0x180]` and pass it as the float arg.
       Those are correct in the TS (uses `this.field_0x180`). ✅

5. No fabricated code paths — ❌ — The TS has a fabricated
   pre-trace velocity ordering check:
     • TS (with comments around 0x86c98):
       `if (0 >= other.m_flSlowMoEnd) { if (other.0x180 < this.0x180) continue; }`
       This block runs BEFORE the LOS trace. The disassembly has
       no equivalent: the velocity-ordering comparison
       (`fld [edi+0x180]; fcomp [ebp+0x180]; sahf; jae`) at
       0x86d77–0x86d86 sits AFTER the LOS trace, guarded by the
       `!= 0` arm of the `m_flSlowMoEnd` test.
     • The pool-B/C "ceiling" check (TS:
       `if (ent.pev.positionVec.x >= ceil.x && ...)` with `>=`)
       doesn't match the disassembly either. 0x87025–0x8704b uses
       `fcomp; test ah,0x40; je 87050` per component, then `mov edi,1`
       only if all three `je`s failed to jump (i.e., the entity's
       position at offset 0x20 IS EXACTLY equal to the vector at
       `[ebx+0x1888]`). So the comparison is `==` and the entity
       fields are at +0x20, not +0x8 (the TS's `pev.positionVec`).
       Practically this excludes entities occupying one specific
       point — not entities at-or-above a ceiling.

6. No comment-only TODO body — ✅ — Body is fully expressed in
   code; the few TODOs (`someEntityQuery`, the three classnames,
   `frameTimeDouble`, `upperWorldPos`, `exclusionPoint`) are scoped
   notes about genuinely under-specified bits, not placeholder bodies.

7. Field names — ⚠️ — Mostly plausible guesses (`m_flSlowMoEnd` at
   +0x17c, `m_flSlowMoNext` at +0x178, `m_pFrameTargets[]` at +0x04,
   `m_pStoredTargets[]` at +0x208, count at +0x288, button byte at
   +0x175, vtable ptr at +0x60). The mismatches that DO matter:
     • `field_0x180` is used both for the GoSlow float arg
       (legit: pushed as `[ebp+0x180]` in sections 4 & 5) and for the
       self-slow GoSlow call (wrong: should be `m_flSlowMoEnd` at 0x17c).
     • `pev.positionVec` in section 5 should be the entity's
       position vector at offset +0x20, not pev's origin at +0x8.
     • `pevContainingEdict` for `[ebp+0x0]` is fine as a label for
       "what we pass as the ignore-edict to TraceLine", but
       semantically `[ebp+0x0]` is more likely the vtable pointer
       (its indirect access pattern later uses `[eax+0x208]` as a
       function-table index-style load for the live-entity check).

8. Compiles in isolation — ❌ — Uses `CBasePlayer`, `CBaseEntity`,
   `TraceResult`, `gpGlobals`, `UTIL_PlayerByIndex`,
   `UTIL_TraceLine`, `UTIL_EntInArray`, `UTIL_FindEntityByClassname`,
   `entIsAliveInWorld`, `eyePosition` without declaring any of them.
   The convention is `any` for unknowns; the TS breaks that.

Issues to fix:
- Replace the first early-return's expression. Disassembly is
  "static constant == m_flSlowMoEnd" (jne on C3=1), not
  "gpGlobals.time < m_flSlowMoEnd". Either: (a) introduce a
  named sentinel constant for `[ebx-0x6f408]`, or (b) if the
  intent really is "skip if m_flSlowMoEnd just hit its zero
  reset", write `if (SENTINEL === this.m_flSlowMoEnd) return;`
  and resolve what SENTINEL is via `tools/decompile/analysis/`.
- Section 3 GoSlow call must use `this.m_flSlowMoEnd` (0x17c)
  for the float arg, not `field_0x180`.
- Delete the pre-LOS velocity early-continue. The velocity
  check at 0x86d77 sits AFTER the LOS trace, not before. Move it.
- The pool-B/C ceiling should be `==` against a 3-vector at
  `[ebx+0x1888]`, and the position fields are read at entity
  offset +0x20 (a Vector), not `pev.positionVec` (+0x8).
- Re-apply loop (section 4) — the velocity comparison at
  0x86e42–0x86e53 is `fcomp; test ah,0x40; je 86e60` —
  jumps on `C3=0` (NOT equal), so apply when velocities differ,
  clear when equal. Also it should be guarded by
  "m_flSlowMoEnd != SENTINEL" (the `jne 86e60` arm at 0x86e40),
  which the TS omits.
- Add type stubs (`type any_opaque = any;` + `declare function ...`
  for the UTIL_ helpers) so the function compiles in isolation.
- Use `(this as any).m_flSlowMoEnd` consistently in place of
  any "field_0x180" used as a float arg to GoSlow.

Suggested rewrite (key sections only, with the semantic fixes):

```typescript
// ---- Stubs so this compiles in isolation ----
type any_opaque = any;

interface Vector   { x: number; y: number; z: number; }
interface TraceResult extends any_opaque { fraction: number; }
interface CBaseEntity extends any_opaque { /* pev, originVec at +0x20 */ }
interface CBasePlayer extends any_opaque { /* ... */ }

const gpGlobals: any_opaque = {} as any_opaque;     // .time, .frameTimeDouble, .maxClients
declare function UTIL_PlayerByIndex(i: number): CBasePlayer | null;
declare function UTIL_TraceLine(
    a: Vector, b: Vector,
    ignoreMonsters: number, ignoreGlass: number,
    pentIgnore: any_opaque, tr: TraceResult,
): void;
declare function UTIL_EntInArray(
    arr: any_opaque, count: number, ent: CBaseEntity,
): number;
declare function UTIL_FindEntityByClassname(
    start: CBaseEntity | null, classname: string,
): CBaseEntity | null;
declare function entIsAliveInWorld(ent: CBaseEntity): boolean;
declare function eyePosition(self: any_opaque): Vector;

// Sentinel at [ebx-0x6f408] — likely the
// "m_flSlowMoEnd reset" sentinel. Verify via
// tools/decompile/analysis/.
const SLOWMO_END_SENTINEL: number = 0;

export function SlowMotionFlow(this: CBasePlayer): void {
    // ---- 1. Bail-outs (disassembly-driven) -----------------------------
    // 0x86bcd-86bde: fld [ebx-0x6f408]; fcomp [ebp+0x17c];
    //                test ah,0x40; jne 8728d   (== comparison on C3=1)
    if ((this as any).m_flSlowMoEnd === SLOWMO_END_SENTINEL) return;

    // 0x86be4-86bf9: ebp+0x178 > *(*(ebx+0x1600))  (= gpGlobals.time)
    if ((this as any).m_flSlowMoNext > gpGlobals.time) return;

    // 0x86bff-86c07: schedule next trigger.
    (this as any).m_flSlowMoNext =
        gpGlobals.frameTimeDouble + gpGlobals.time;

    // ---- 2. Per-frame player sweep ------------------------------------
    const trace: TraceResult = new TraceResult();
    let anyBlocked = false;

    for (let i = 1; i <= gpGlobals.maxClients; i++) {
        const stale = (this as any).m_pFrameTargets[i];
        if (stale && (stale as any).m_flSlowMoEnd === SLOWMO_END_SENTINEL) {
            (this as any).m_pFrameTargets[i] = null;
        }

        const other = UTIL_PlayerByIndex(i);
        if (!other) continue;
        if (!(other as any).isValidCandidate?.()) continue;
        if (other === this) continue;

        // LOS trace (0x86cd8-86d63).
        const myEye = eyePosition(this);
        const theirEye = eyePosition(other);
        UTIL_TraceLine(
            myEye, theirEye, 1, 1,
            (this as any).pevContainingEdict, trace,
        );
        if (trace.fraction >= 1.0) continue;  // blocked; skip

        // 0x86d68-86da3 — gate AFTER the trace:
        //   if (other.m_flSlowMoEnd == 0) -> store
        //   else if (other.0x180 >= this.0x180) -> store
        //   else -> clear + flag blocked
        if ((other as any).m_flSlowMoEnd === 0) {
            (this as any).m_pFrameTargets[i] = other;
        } else if (
            (other as any).field_0x180 >= (this as any).field_0x180
        ) {
            (this as any).m_pFrameTargets[i] = other;
        } else {
            (this as any).m_pFrameTargets[i] = null;
            anyBlocked = true;
        }
    }

    // ---- 3. Apply slow motion to self (0x86dd6-86dfc) ----------------
    if (!anyBlocked) {
        // Push order was: this, m_flSlowMoEnd (0x17c), buttonByte.
        (this as any).GoSlow(
            (this as any).m_flSlowMoEnd,
            (this as any).buttonByte,
        );
    }

    // ---- 4. Re-apply / prune (0x86e1c-86ea2) -------------------------
    for (let i = 1; i <= gpGlobals.maxClients; i++) {
        const target = (this as any).m_pFrameTargets[i];
        if (!target) continue;

        // 0x86e2f-86e55:
        //   if (SENTINEL == target.m_flSlowMoEnd)              -> keep
        //   else if (target.0x180 != this.0x180) [je jumps on !=] -> keep
        //   else -> clear
        const isStale =
            (target as any).m_flSlowMoEnd === SLOWMO_END_SENTINEL;
        const velocitiesDiffer =
            (target as any).field_0x180 !== (this as any).field_0x180;

        if (!isStale && !velocitiesDiffer) {
            (this as any).m_pFrameTargets[i] = null;
            continue;
        }

        // 0x86e60-86e86: GoSlow(target, this.0x180, 0);
        //                then copy this.buttonByte -> target.buttonByte.
        (target as any).GoSlow((this as any).field_0x180, 0);
        (target as any).buttonByte = (this as any).buttonByte;
    }

    // ---- 5. Persistent-target scan (0x86ea4-8728b) -------------------
    if ((this as any).m_iStoredTargetCount > 31) return;

    const classNames: string[] = [
        "TODO_classname_A",  // ebx - 0x696dc
        "TODO_classname_B",  // ebx - 0x6e62b
        "TODO_classname_C",  // ebx - 0x6b6c5
    ];
    const myEye2 = eyePosition(this);
    const myEdict = (this as any).pevContainingEdict;
    // The "exclusion point" vector at [ebx+0x1888]; a 3-float
    // array against which pool B/C entity-origin values are compared
    // for EXACT equality.
    const exclusionPoint: Vector = (gpGlobals as any).exclusionPoint;

    for (let poolIdx = 0; poolIdx < classNames.length; poolIdx++) {
        let ent: CBaseEntity | null = null;
        while ((ent = UTIL_FindEntityByClassname(ent, classNames[poolIdx])) !== null) {
            if (!entIsAliveInWorld(ent)) continue;
            if (UTIL_EntInArray(
                (this as any).m_pStoredTargets, 32, ent,
            ) !== -1) continue;

            // Pools B & C additionally: skip if entity origin (at +0x20)
            // is the EXACT exclusion point, not "at or above a ceiling".
            if (poolIdx !== 0) {
                const origin: Vector = (ent as any).originVec;
                if (
                    origin.x === exclusionPoint.x &&
                    origin.y === exclusionPoint.y &&
                    origin.z === exclusionPoint.z
                ) continue;
            }

            const entEye = eyePosition(ent);
            UTIL_TraceLine(myEye2, entEye, 1, 1, myEdict, trace);
            if (trace.fraction >= 1.0) continue;

            (ent as any).GoSlow((this as any).field_0x180, 0);
            if ((this as any).m_iStoredTargetCount <= 31) {
                const idx = (this as any).m_iStoredTargetCount;
                (this as any).m_pStoredTargets[idx] = ent;
                (this as any).m_iStoredTargetCount = idx + 1;
            }
        }
    }
}
```

Bottom line: the high-level shape (sweep connected clients,
re-apply frame targets, then walk three classname pools) is
right, and most field-name guesses are defensible. The
specific bugs — wrong operator on the first early-return, wrong
field offset on the section-3 GoSlow call, fabricated
pre-trace velocity check, wrong ceiling operator (>= vs ==) in
pool B/C, and the missing isolation stubs — are individually
fixable but they collectively move this from "PASS-WITH-NOTES"
into FAIL. Resolve the issues above, re-run the comparison, and
this should land in PASS-WITH-NOTES on the next pass.
