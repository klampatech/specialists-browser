// CTSPowerUp::OnGround — faithful reconstruction from the disassembly.
// Compiles in isolation; field names use TODO placeholders for the unknowns.

declare const g_ebx_mins_xy: any;     // [ebx-0x6DEC8]
declare const g_ebx_mins_z:  any;     // [ebx-0x6DF70]
declare const g_ebx_maxs_xy: any;     // [ebx-0x6CB5C]
declare const g_ebx_maxs_z:  any;     // [ebx-0x6F408]
declare const g_ebx_f10:     any;     // [ebx+0x2038]
declare const g_ebx_f18:     any;     // [ebx+0x1930]

export function CTSPowerUp_OnGround(this: CTSPowerUp): void {
    // 'this' is on the stack at [esp+0x30] (not ECX) — caller-style pass.
    const pev = this.pev; // CBaseEntity::pev at offset 0

    // pev->field_0x10c = 1   (asm uses MOV, not OR — full overwrite with 1)
    // TODO(asm-ambiguous): 0x10c is FL_ONGROUND if pev->flags is at0x10c
    //                      (matches the clear-bit-0x80 / set-bit-0x02 follow-up),
    //                      OR it's movetype=MOVETYPE_NONE if the TS mod's
    //                      entvars_s layout shifts things. Resolve against the
    //                      TS mod's entvars_s in D.4 / class-definition lookup.
    pev.field_0x10c = 1;

    // pev->field_0x118: clear bit 0x80, set bit 0x02 (probably pev->flags)
    pev.field_0x118 = (pev.field_0x118 & ~0x80) | 0x02;

    // UTIL_SetOrigin(pev, pev->origin) — second arg is &pev->origin by const-ref
    UTIL_SetOrigin(pev, pev.origin);

    // UTIL_SetSize(pev, maxs, mins) — asm push order (mins, maxs, pev) means
    // cdecl sees arg1=pev, arg2=maxs, arg3=mins. HLSDK prototype is (min, max).
    // TODO: confirm TS mod's UTIL_SetSize prototype — either args are swapped
    // or my edi/ecx assignment is inverted.
    const mins: Vector = { x: g_ebx_mins_xy, y: g_ebx_mins_xy, z: g_ebx_mins_z };
    const maxs: Vector = { x: g_ebx_maxs_xy, y: g_ebx_maxs_xy, z: g_ebx_maxs_z };
    UTIL_SetSize(pev, maxs, mins);

    // this->field_0xc = 0xffff0000; this->field_0x10 = global_at_ebx_plus_0x2038
    // this->field_0x14 = 0xffff0000; this->field_0x18 = global_at_ebx_plus_0x1930
    // Two (0xffff0000, float) pairs. 0xffff0000 as a 32-bit float is NaN;
    // as a 32-bit int is -65536; as two shorts is [0, -1]. Probably a sentinel
    // bit-pattern. TODO: identify the real CTSPowerUp member layout in D.4.
    this.field_0xc = 0xffff0000;
    this.field_0x10 = g_ebx_f10;
    this.field_0x14 = 0xffff0000;
    this.field_0x18 = g_ebx_f18;
}
