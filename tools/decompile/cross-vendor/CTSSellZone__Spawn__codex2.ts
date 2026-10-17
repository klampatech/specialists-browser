// Stub declarations so the function compiles in isolation.
declare const GOT_BASE: number;
declare const GOT_0x1600: any;   // TODO(asm-ambiguous): identify global
declare const GOT_0x1824: any;   // TODO(asm-ambiguous): identify global

interface Entvars {
  [offset: number]: number;
  // Confirmed offsets: 0x08=origin, 0x98=?, 0xb8=?, 0xdc=mins,
  // 0xe8=maxs, 0x108=?, 0x10c=?, 0x118=?, 0x208=?
}

interface CTSSellZone {
  pev: Entvars;
  // Per-instance fields at offsets 0x0c, 0x10, 0x14, 0x18 — names TODO.
}

declare function UTIL_SetSize(pev: Entvars, mins: Entvars, maxs: Entvars): void;
declare function UTIL_SetOrigin(pev: Entvars, origin: Entvars): void;

/**
 * CTSSellZone::Spawn — initializes a sell zone when placed in the map.
 *
 * Decompiled from `Spawn__11CTSSellZone` at 0x00062720 (198 bytes).
 * Field-name mappings are speculative until TS source is available.
 */
export function Spawn(this: CTSSellZone): void {
  const pev = this.pev;
  const globalsInner = GOT_0x1600[0];  // *(*GOT[0x1600])

  // ── 1. Write 4 bytes at pev[0]. asm 0x6273d–0x62749:
  //      eax = (GOT_BASE - 0x6EDED) - globalsInner[0x98]
  //      pev[0] = eax
  //    Standard HLSDK entvars_s has `classname` (string_t) at offset 0,
  //    not `nextthink`. The asm writes to pev[0]; the field at that
  //    offset in this build is unknown.
  //    TODO(asm-ambiguous): identify GOT[0x1600], the field at
  //    globalsInner[0x98], and what pev[0] represents here.
  pev[0] = (GOT_BASE - 0x6EDED) - globalsInner[0x98];

  // ── 2. Engine helper call through a vtable. asm 0x6274b–0x6276e:
  //      edx = *esi = pev      (RELOADED at 0x6274b, so edx is pev here)
  //      ecx = GOT[0x1aa8]     (vtable ptr)
  //      eax = pev[0x98] + pev[0xb8]
  //      push eax              (last push → last arg)
  //      push pev[0x208]       (first push → first arg)
  //      call [ecx+0x8]        (3rd vtable entry)
  //    TODO(asm-ambiguous): identify the vtable, the function, and the
  //    meaning of pev[0x98]/[0xb8]/[0x208].
  const helperVtable: any = undefined; /* TODO: GOT[0x1aa8] */
  helperVtable[2](pev[0x208], pev[0x98] + pev[0xb8]);

  // ── 3. Apply size keyvalue. asm pushes &pev[0xdc] (mins) and
  //    &pev[0xe8] (maxs);12-byte stride confirms they are Vector.
  UTIL_SetSize(pev, pev, pev);

  // ── 4. Apply origin keyvalue. asm pushes &pev[0x8] (= pev->origin).
  UTIL_SetOrigin(pev, pev);

  // ── 5. Set a pev flag bit. asm 0x6279a: pev[0x118] |= 0x80.
  //    0x80 = FL_FAKECLIENT in HLSDK (NOT FL_AIMTARGET = 0x80000).
  //    Offset 0x118 is not the standard HLSDK offset for `flags`.
  //    TODO(asm-ambiguous): verify offset-to-field mapping and flag bit.
  pev[0x118] |= 0x80;

  // ── 6. Configure collision. asm 0x627a6 / 0x627b2:
  //      pev[0x10c] = 1; pev[0x108] = 5.
  //    1 likely SOLID_TRIGGER; 5 likely MOVETYPE_TOSS (unusual for a
  //    stationary trigger — possibly overridden later).
  //    TODO(asm-ambiguous): offset-to-field mapping for solid/movetype.
  pev[0x10c] = 1;
  pev[0x108] = 5;

  // ── 7. Per-instance state. asm 0x627cb–0x627d8:
  //      this[0xc]  = 0
  //      this[0x10] = 0
  //      this[0x14] = 0xffff0000
  //      this[0x18] = GOT[0x1824]
  //    TODO(asm-ambiguous): field names without TS source.
  (this as any)[0x0c] = 0;
  (this as any)[0x10] = 0;
  (this as any)[0x14] = 0xffff0000;
  (this as any)[0x18] = GOT_0x1824;
}
