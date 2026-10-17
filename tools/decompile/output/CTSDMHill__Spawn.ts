/**
 * CTSDMHill::Spawn — initializes a Deathmatch Hill (KOTH) entity.
 *
 * Sets the entity's bounding box, origin, render properties, and
 * team-color state. Queries game state to determine which team (if
 * any) currently controls the hill and stamps that team's color into
 * this.colorLow / this.colorHigh. Schedules the first WaitThink.
 */

declare const UTIL_SetSize: (pev: any, mins: any, maxs: any) => void;
declare const UTIL_SetOrigin: (pev: any, origin: any) => void;
declare const globals: any;

interface CTSDMHill {
    pev: any;
    colorLow: number;       // offset 0x14
    colorHigh: number;      // offset 0x18
    field_0xc: number;
    field_0x10: number;
    field_0x64: number;
    field_0x6c: number;
    field_0x70: number;
    field_0x74: number;
    field_0x78: number;
}

export function Spawn(this: CTSDMHill): void {
    const pev: any = this.pev;

    // --- classname via MAKE_STRING pattern ---
    // pev->classname = (char*)classname_literal - (char*)pStringBase
    pev.classname = globals.classNameLiteral - globals.gpGlobals.pStringBase;

    // --- Engine call: pfn[2](pev->0x208, pStringBase + pev->model) ---
    // TODO(asm-ambiguous): stock HLSDK pfnPrecacheGeneric takes 1 arg;
    // this is either a TS extension or a different pfn. Investigate.
    globals.engineFuncs.vfunc_2(
        pev.field_0x208,
        globals.gpGlobals.pStringBase + pev.model
    );

    // --- Bounding box and origin ---
    UTIL_SetSize(pev, pev.mins, pev.maxs);
    UTIL_SetOrigin(pev, pev.origin);

    // --- Render / solid / movetype-style fields ---
    // TODO(D.4): offsets 0x118, 0x10c, 0x108 — TS may have reordered
    // entvars_s vs stock HLSDK; don't assert field names without
    // cross-referencing readers elsewhere in the mod.
    pev.field_0x118 |= 0x80;
    pev.field_0x10c = 1;
    pev.field_0x108 = 5;

    // --- Determine hill color from game state ---
    // The state singleton's vfunc_9 returns a pointer or null.
    // Logic: zero color unless (first call returned non-null AND
    // this->0x74 <= 0) → fall through to a second vfunc_9 call,
    // which still zeros the color if (result2 == null AND this->0x70 <= 0).
    const state: any = globals.stateSingleton;

    const result1 = state.vfunc_9();
    if (result1 != null && this.field_0x74 <= 0) {
        // No team currently controls the hill.
        this.colorLow = 0;
        this.colorHigh = 0;
    } else {
        const result2 = state.vfunc_9();
        if (result2 != null || this.field_0x70 > 0) {
            // Some team controls the hill — stamp its color pair.
            this.colorLow = 0xFFFF0000;
            this.colorHigh = globals.teamColorConst;
        } else {
            this.colorLow = 0;
            this.colorHigh = 0;
        }
    }

    // --- Reset state counters ---
    this.field_0xc = 0;
    this.field_0x10 = 0;

    // --- Schedule next think, clamped to a minimum delay ---
    // pev->nextthink = gpGlobals->time + max(this->field_0x78, minDelayConst)
    const currentTime: number = globals.gpGlobals.time;
    const minDelay: number = globals.minThinkDelay;
    const scheduledDelay: number =
        this.field_0x78 < minDelay ? minDelay : this.field_0x78;
    pev.nextthink = currentTime + scheduledDelay;

    // --- Stamp lastUpdate timestamp + clear the 0x6c flag ---
    this.field_0x64 = currentTime + globals.extraTimeConst;
    this.field_0x6c = 0;
}
