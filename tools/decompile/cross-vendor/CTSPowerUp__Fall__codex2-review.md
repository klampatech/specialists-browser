```
VERDICT: PASS-WITH-NOTES

Checklist:
1. Signature — ✅ — `Fall(this: CTSPowerUp): void` matches the demangled
   `Fall__10CTSPowerUp` exactly: void return, single implicit-this arg.
   (Note: items 2 and 3 are not applicable — this is a gameplay method,
   not an engine↔mod interface function. Marking ⚠️ to flag the N/A.)
2. Version check — ⚠️ — N/A for gameplay method; no interface version
   comparison is appropriate here.
3. interfaceVersion assignment — ⚠️ — N/A; this method does not negotiate
   a protocol version with the engine.
4. Success path / data flow — ✅ — both LIGHT and HEAVY paths preserve
   the asm's `pev+0x104 = gpGlobals.time + CONST` pattern, with CONST
   differing between paths (QWORD at GOT[-0x6f008] vs QWORD at
   GOT[-0x6ecd8]). The HEAVY-path fcomp+jae timeout also matches.
5. No fabricated paths — ✅ — every branch in the TS maps to a real asm
   branch. The two light-path conditions (global compare + state byte)
   are correctly OR'd. The HEAVY-path conditional sequence
   (OnGround → m_bOnGround → m_flFallTimeout) matches asm 88444-88482
   step-for-step.
6. No TODO body — ⚠️ — body is NOT comment-only; the algorithm is fully
   expressed. However, three TODO placeholders (`useLightFromGlobal =
   false`, `stateByte = 0`, `pev.someField = 0x80`) make one whole
   branch effectively dead until resolved. Each TODO is justified by
   asm ambiguity, but the C3 (equal) branch is fully suppressed by the
   hardcoded `false`, which is a smell.
7. Field names — ⚠️ — three issues:
     a. `pev.someField` is a fabricated placeholder for pev+0x118; even
        with TODO, the name carries no information and reads as if the
        decompiler just gave up.
     b. `m_bOnGround` (this+0x80) and `m_flFallTimeout` (this+0x88) are
        reasonable inferences but invented; they need explicit TODO
        justification, not bare naming.
     c. `pev.nextthink` for offset 0x104 is plausible (the asm stores
        `gpGlobals.time + CONST`, the canonical nextthink-write pattern),
        but in canonical HLSDK entvars_t this field is at 0xa0 — the 0x104
        offset is build-specific and should be flagged.
 Plus: the inline comment claims "light if constant > [edx+0xc]", but
   the asm's `test ah,0x40 ; jne` jumps on C3=1 which is the **equal**
   (or unordered/NaN) case, NOT the greater-than case. The comment is
   semantically wrong even though the dead `false` constant means the
   wrong code path is never executed.
8. Compiles in isolation — ❌ — references `CTSPowerUp`, `pev`, `gpGlobals`,
   `UTIL_Remove`, `FALL_RESCHEDULE_LIGHT`, `FALL_RESCHEDULE_HEAVY`, and
   `FL_ONGROUND` without defining any of them. Per the review rules, all
   of these should be either declared as `any` stubs in the file or
   imported from a types module. As written, this will not compile in a
   fresh file.

Issues to fix:
- Add self-contained type/const stubs at the top so the file compiles
  in isolation (`declare const gpGlobals: any; declare function
  UTIL_Remove(ent: any): void; declare const FALL_RESCHEDULE_LIGHT:
  number; declare const FALL_RESCHEDULE_HEAVY: number; declare const
  FL_ONGROUND: number; interface CTSPowerUp { ... }`).
- Replace `pev.someField = 0x80` with `(pev as any).someField_0x118 =
  0x80` (or `[0x118] = 0x80`) plus a stronger TODO comment explaining
  that 0x118 is the offset and 0x80 looks like a status flag set by the
  LIGHT path.
- Add `// TODO(asm-ambiguous):` to `m_bOnGround` and `m_flFallTimeout`
  to mark them as offset-inferred names.
- Fix the inline comment: `test ah,0x40; jne` jumps when C3 is set,
  i.e., when the comparison is **equal** (or NaN), not when the constant
  is greater than the field. State this correctly.
- The two hardcoded values (`useLightFromGlobal = false`, `stateByte =
  0`) should be at minimum flagged as a known TODO stub; consider
  extracting them as `declare var _tsPowerUp_lightGlobal: boolean;
  declare var _tsPowerUp_stateByte: number;` so the resolved names can
  be filled in by D.4 without re-editing this function.
- Note in the docstring that `pev.nextthink` is interpreted from offset
  0x104, which differs from HLSDK's canonical 0xa0 — flag this as a
  build-specific assumption to be verified.

Suggested rewrite (full TS function):

```typescript
/**
 * CTSPowerUp::Fall — per-tick logic for a falling power-up entity.
 *
 * Decompiled from `ts/dlls/ts_i386.so` @0x000883cc (191 bytes).
 *
 * Two-path dispatch driven by asm 883e1-88404:
 *   A) static constant at GOT[-0x6f3fc] == *(GOT[0x1e24])+0xc
 *      (tested via fcomp + fnstsw + test ah,0x40 + jne — jne on C3 means
 *       "equal" or unordered/NaN, NOT greater-than)
 *   B) state byte at *(GOT[0x14f0]) is in {2, 3}
 *      (tested via sub 0x2 ; cmp 1 ; ja — ja on (al-2) > 1 means original
 *       byte was 0, 1, or > 3 → fall through (LIGHT) iff byte ∈ {2,3})
 *
 * LIGHT path (asm 88406-8842a):
 *   pev+0x104 = gpGlobals.time + FALL_RESCHEDULE_LIGHT
 *   *(pev+0x118) = 0x80
 *   return
 *
 * HEAVY path (asm 8842c-88482):
 *   pev+0x104 = gpGlobals.time + FALL_RESCHEDULE_HEAVY
 *   if FL_ONGROUND: this.OnGround()
 *   if this.m_bOnGround: return
 *   if this.m_flFallTimeout < gpGlobals.time: UTIL_Remove(this)
 */

// --- Minimal stubs so this file compiles in isolation. ----------------
// In the real project these live in `src/types/hlsdk.ts` and
// `src/game/ts_powerup.ts` respectively. We use `any` for any unknown.
declare const gpGlobals: any;
declare function UTIL_Remove(ent: any): void;

// TODO(asm-ambiguous): resolve from data-section dumps of GOT[-0x6f008]
// (QWORD constant — QWORD load in x87, but interpreted as float seconds).
declare const FALL_RESCHEDULE_LIGHT: number;
// TODO(asm-ambiguous): resolve from data-section dumps of GOT[-0x6ecd8].
declare const FALL_RESCHEDULE_HEAVY: number;

// HL1 canonical: FL_ONGROUND = 1 << 9 = 0x200.
declare const FL_ONGROUND: number;

interface Entvars {
    // TODO(asm-ambiguous): HLSDK canonical offset for nextthink is 0xa0;
    // TS-specific layout has it at 0x104. Verify against TS source.
    nextthink: number;
    flags: number;
    [key: string]: any;
}

interface CBaseEntity {
    pev: Entvars;
}

interface CTSPowerUp extends CBaseEntity {
    // TODO(asm-ambiguous): byte at this+0x80 — inferred name; real
    // member name TBD once the CTSPowerUp header is recovered.
    m_bOnGround: number;
    // TODO(asm-ambiguous): float at this+0x88 — inferred name; real
    // member name TBD once the CTSPowerUp header is recovered.
    m_flFallTimeout: number;
    OnGround(): void;
}

// TODO(asm-ambiguous): the two light-path condition inputs are globals
// (likely TS slow-motion / game-mode state and a spawn-type byte).
// Place these behind accessor stubs so D.4 can fill them in without
// editing Fall() directly.
declare function _ts_powerup_lightGlobal(): boolean;
declare function _ts_powerup_stateByte(): number;

export function Fall(this: CTSPowerUp): void {
    const pev = this.pev;

    // LIGHT if (A) equal-compare holds OR (B) state byte ∈ {2, 3}.
    const useLightFromGlobal: boolean = _ts_powerup_lightGlobal();
    const stateByte: number = _ts_powerup_stateByte();

    if (useLightFromGlobal || stateByte === 2 || stateByte === 3) {
        // LIGHT tick.
        pev.nextthink = gpGlobals.time + FALL_RESCHEDULE_LIGHT;
        // TODO(asm-ambiguous): offset 0x118 in pev (NOT nextthink). 0x80
        // looks like a status byte (probable "settled/landed" flag the
        // LIGHT path sets before returning). Real field name TBD.
        (pev as any).someField_0x118 = 0x80;
        return;
    }

    // HEAVY tick.
    pev.nextthink = gpGlobals.time + FALL_RESCHEDULE_HEAVY;

    // FL_ONGROUND check: asm tests BYTE PTR [pev+0x1a5], 0x02, which is
    // bit 1 of the second byte of pev->flags (DWORD at 0x1a4). With
    // FL_ONGROUND = 1<<9 = 0x200, this is equivalent to
    // (pev.flags & FL_ONGROUND) !== 0.
    if ((pev.flags & FL_ONGROUND) !== 0) {
        this.OnGround();
    }

    // If already settled, this tick is done.
    if (this.m_bOnGround !== 0) {
        return;
    }

    // Timeout: asm does fcomp m_flFallTimeout vs gpGlobals.time ; jae
    // (skip remove) iff m_flFallTimeout >= gpGlobals.time. Fall through
    // (remove) iff m_flFallTimeout < gpGlobals.time (strict less-than).
    if (this.m_flFallTimeout < gpGlobals.time) {
        UTIL_Remove(this);
    }
}
```

Net assessment: the algorithm is faithful to the disassembly and there
are no fabricated control-flow paths. The two real blockers are (a)
type/constant stubs so the file compiles in isolation, and (b) the
`pev.someField` placeholder being renamed to a self-describing
`someField_0x118` (or similar). Everything else is cosmetic / TODO
tightening — D.4 (CTS-specific gameplay recovery) is where the
globals, the state byte, and the `0x118` field name will get real
values.
