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
