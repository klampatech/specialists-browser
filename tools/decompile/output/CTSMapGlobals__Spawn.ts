/**
 * CTSMapGlobals::Spawn — initialize the per-map rule entity.
 *
 * Demangled:  CTSMapGlobals::Spawn()
 * Address:    0x00062534  (264 B)
 * Disassembly: tools/decompile/chunks/Spawn__13CTSMapGlobals.chunk.md
 *
 * Faithful to the disassembly:
 *   (a) virtual call on a sub-object at this+0x60, vtable slot 0x28
 *       (10th function pointer), receiving the outer `this` as arg.
 *       Implicit ECX for __thiscall is NOT explicitly set; the called
 *       method therefore sees the *outer* this as its `this`. We flag
 *       this as ambiguous rather than commit to one shape.
 *   (b) reset pev.button (+0x108) and pev.effects (+0x10C); reposition
 *       to origin (+0x08) via UTIL_SetOrigin; resize to a point bbox via
 *       UTIL_SetSize(0,0,0, 0,0,0).
 *   (c) zero four instance dwords (this+0x0C..+0x18).
 *   (d) schedule pev.nextthink (+0x104) = gpGlobals.time + K, where K is
 *       a constant loaded as a qword (double) and converted via the FPU.
 *   (e) mirror pev.spawnflags (+0x1A0) into g_pGameRules:
 *         bit 5 → inverted → g_pGameRules+0x10  (likely m_bTeamplay)
 *         bit 6 →            g_pGameRules+0x5885
 *   (f) seed weapon-restriction state: call this.get_weapon_restriction()
 *       and write into g_pGameRules+0x5870 then +0x586C; clear two flag
 *       bytes at g_pGameRules+0x5874 and +0x5875.
 */
export function Spawn(this: CTSMapGlobals): void {
    // ---- (a) vtable call on subobj at this+0x60 ----
    // TODO(asm-ambiguous): identify the sub-object type at this+0x60 and
    // the vmethod at slot 0x28. The lack of an explicit `mov ecx, eax`
    // before the call suggests the called method's implicit `this` is the
    // *outer* this (esi) — opposite of the TS shorthand below. We keep
    // the TS shape for clarity but the binding layer must mirror asm.
    this.subEntity_0x60.vmethod_0x28(this);

    // ---- (b) reset / reposition / resize ----
    // entvars_t offsets below are canonical GoldSrc (eiface.h); no TODO.
    const pev = this.pev;
    pev.button  = 0;
    pev.effects = 0;
    UTIL_SetOrigin(pev, pev.origin);
    UTIL_SetSize(pev, vec3_origin, vec3_origin);

    // ---- (c) zero four instance dwords ----
    // TODO(asm-ambiguous): name these against the CTSMapGlobals struct in
    // D.4 (TS-specific gameplay). Order is permuted vs. the asm; STOREs
    // commute, so this is safe.
    this.field_0x0C = 0;
    this.field_0x10 = 0;
    this.field_0x14 = 0;
    this.field_0x18 = 0;

    // ---- (d) schedule first WaitThink ----
    // [ebx+0x1600] resolves (via two dereferences) to gpGlobals.time.
    // [ebx-0x6ecd0] is K, loaded qword (double). The FPU funnel is
    // abstracted to scalar arithmetic here.
    // TODO(asm-ambiguous): name `WAIT_THINK_DELAY_K` against
    // strings-n5.txt + TS SDK.
    pev.nextthink = (gpGlobals as any).time + WAIT_THINK_DELAY_K;

    // ---- (e) mirror spawnflags into g_pGameRules ----
    const spawnflags = pev.spawnflags;

    g_pGameRules.field_0x10   = (((spawnflags >> 5) & 1) ^ 1);
    g_pGameRules.field_0x5885 = ((spawnflags >> 6) & 1);

    // ---- (f) seed weapon-restriction state into g_pGameRules ----
    const wr = this.get_weapon_restriction();

    g_pGameRules.field_0x5870 = wr;
    g_pGameRules.field_0x586C = wr;
    g_pGameRules.field_0x5874 = 0;
    g_pGameRules.field_0x5875 = 0;
}

// ---- ambient declarations so this file compiles standalone ----
declare const gpGlobals: any;
declare const g_pGameRules: any;
declare const vec3_origin: any;
declare const WAIT_THINK_DELAY_K: number;
declare function UTIL_SetOrigin(pev: any, origin: any): void;
declare function UTIL_SetSize(pev: any, mins: any, maxs: any): void;

interface CTSMapGlobals {
    pev: any;
    subEntity_0x60: { vmethod_0x28(arg: CTSMapGlobals): void };
    field_0x0C: number;
    field_0x10: number;
    field_0x14: number;
    field_0x18: number;
    get_weapon_restriction(): number;
}
