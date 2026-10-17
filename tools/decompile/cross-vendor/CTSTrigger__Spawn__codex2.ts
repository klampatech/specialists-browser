/**
 * CTSTrigger::Spawn — initialize the TS trigger entity on map load.
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x000609b8 (286 bytes).
 * Structure follows the disassembly; field semantics for entvars_t
 * follow the HLSDK layout (pev[0]=classname, pev[0x8]=origin,
 * pev[0x108]=movetype, pev[0x10c]=solid, pev[0x118]=effects,
 * pev[0x104]=nextthink). CBaseEntity member fields are left as
 * raw-offset placeholders for D.4 (TS-specific class layout).
 *
 * NOTE on stack accounting: the original elides a ret-arg-slot
 * between UTIL_SetSize and UTIL_SetOrigin. We reproduce it with
 * `reusedSlot` so the call ordering matches the disassembly; the
 * TS-level semantics are equivalent to "set mins/maxs, then set
 * origin" with the same effect.
 */
export function Spawn(this: CTSTrigger): void {
  const pev: any = this.pev;  // entvars_t* (first field of CBaseEntity)

  // GOT base (set up by the PIC thunk at 0x609be: call;pop ebx;add ebx,0x10544d).
  const GOT: any = GOT_BASE;

  // *esi at 0x609d0 / reloaded at 0x609f1 and 0x60aa4 — engine entity helper table.
  const engineTbl: any = GOT[0x1600][0];

  // ---- 1. pev->classname (entvars_t+0 = string_t) = static - engineTbl.field_0x98
  // Original: lea eax,[ebx-0x6eed5]; sub eax,[edx+0x98]; mov [ecx],eax
  pev[0] = (STATIC_TRIGGER_CLASSNAME as any) - engineTbl[0x98];

  // ---- 2. Indirect engine helper call via GOT[0x1aa8].vfunc8.
  // Args: (engineTbl[0x208], engineTbl[0x98] + engineTbl[0xb8])
  // NOTE: this != pev, and edx (= *esi == engineTbl) is the SAME base
  //       for both args. Earlier decompilation got this wrong.
  const helperVtable: any = GOT[0x1aa8];
  helperVtable[0x8](
    engineTbl[0x208],
    engineTbl[0x98] + engineTbl[0xb8]
  );

  // ---- 3. UTIL_SetSize(pev, mins, maxs) ----
  // Args pushed: pev, pev+0xdc (mins), pev+0xe8 (maxs).
  // The disassembly deliberately leaves one push on the stack and
  // reuses the slot for UTIL_SetOrigin's first push. Mirror that
  // by threading a `reusedSlot` so the slot shows up in the right
  // place when reading the code top-to-bottom.
  const reusedSlot: any = pev;          // stays on the stack between calls
  UTIL_SetSize(pev, pev + 0xdc, pev + 0xe8);  // 3-arg cdecl
  // 4th push (reusedSlot equivalent) is left in place in the disasm.
  // The TS-level effect: pev.mins / pev.maxs are set.

  // ---- 4. UTIL_SetOrigin(pev, origin) ----
  UTIL_SetOrigin(pev, pev + 0x8);

  // ---- 5. Visual + collision flags ----
  // Disassembly order: effects |= 0x80, movetype = 5, solid = 1.
  // (Earlier decompilation swapped the order in comments — wrong.)
  pev[0x118] |= 0x80;  // EF_NODRAW
  pev[0x108] = 5;      // movetype (assumed MOVETYPE_TOSS)
  pev[0x10c] = 1;      // solid (assumed SOLID_TRIGGER)

  // ---- 6. Touch / think plumbing ----
  // this + 0xc and this + 0x10 cleared; this + 0x14 set to 0xffff0000
  // (a sentinel for "no think handler"); this + 0x18 = GOT[0x1cc4]
  // (CTSTrigger::WaitTouch function pointer).
  this.field_0xc  = 0;
  this.field_0x10 = 0;
  this.field_0x14 = 0xffff0000;
  this.field_0x18 = GOT[0x1cc4];  // CTSTrigger::WaitTouch

  // ---- 7. Schedule first think ----
  // nextthink = gpGlobals.time + max(this.field_0x10c as float, 0)
  // Two stores: pev[0x104] (entvars_t->nextthink) AND this.field_0x104
  // (cached CBaseEntity mirror — likely m_flNextThink).
  const delay: number = this.field_0x10c as number;
  const nextThink: number = gpGlobals.time + Math.max(delay, 0);
  pev[0x104] = nextThink;
  this.field_0x104 = nextThink;
}

// ---- Stubs so this file compiles in isolation ----
declare const CTSTrigger: any;
declare const GOT_BASE: any;
declare const STATIC_TRIGGER_CLASSNAME: any;
declare function UTIL_SetSize(pev: any, mins: any, maxs: any): void;
declare function UTIL_SetOrigin(pev: any, origin: any): void;
declare const gpGlobals: { time: number };
