/**
 * CTSBriefcase::Spawn — initialize the TS briefcase entity on spawn:
 * classname + engine-side edict linkage, bounding box + origin via
 * the standard UTIL_SetSize / UTIL_SetOrigin helpers, a fixed set of
 * pev field defaults, two precache-style (string_t, flags) pairs,
 * the briefcase's default model-name string, and a self-pointing
 * owner EHANDLE.
 *
 * Decompiled from `ts/dlls/ts_i386.so` (32-bit Linux MSVC, not
 * stripped). Faithful to the disassembly in
 * tools/decompile/chunks/Spawn__12CTSBriefcase.chunk.md.
 */
export function Spawn(this: CTSBriefcase): void {
  const pev: any = (this as any).pev;

  // The disassembly uses a PIC-relative GOT base (set up via
  // `call $+5; pop ebx; add ebx, 0xe8578`). In the TS rebuild we
  // resolve these to module-level imports under `g_*`.
  const g_engineGlobals: any = (globalThis as any).g_engineGlobals;       // ebx + 0x1600
  const g_serviceObj:     any = (globalThis as any).g_serviceObj;         // ebx + 0x1aa8
  const g_soundA:         any = (globalThis as any).g_soundA;             // ebx + 0x14e8
  const g_soundB:         any = (globalThis as any).g_soundB;             // ebx + 0x1ccc
  const g_classnameAddr:  number = (globalThis as any).g_classnameAddr;  // ebx - 0x6e70d
  const g_timeConst:      number = (globalThis as any).g_timeConst;      // ebx - 0x6f018
  const g_defaultModel:   string = (globalThis as any).g_defaultModel;   // ebx - 0x6cd3c
  const g_linuxOffset:    number = g_engineGlobals[0x98];

  // 1. Set pev->classname (string_t) — classname string-table index.
  //    (ebx - 0x6e70d) is the .so-resident address of a classname
  //    string literal; subtracting the engine's LINUX_OFFSET
  //    normalizes it to an engine-side index. NOT pContainingEntity.
  pev[0] = g_classnameAddr - g_linuxOffset;

  // 2. Engine-side helper call via g_serviceObj->vtable[1].
  //    args: (pev->field_0x208, edict_addr(pev->field_0xb8)).
  //    TODO(asm-ambiguous): g_serviceObj isn't in strings-n5.txt;
  //    needs a runtime trace or NVTR to identify. Probably model
  //    / edict registration.
  (g_serviceObj[0x8] as any)(pev[0x208], pev[0xb8] + g_linuxOffset);

  // 3. UTIL_SetSize(pev, mins@pev+0xdc, maxs@pev+0xe8).
  UTIL_SetSize(pev, /* &pev[0xdc] */ pev, /* &pev[0xe8] */ pev);

  // 4. UTIL_SetOrigin(pev, origin@pev+0x08).
  UTIL_SetOrigin(pev, /* &pev[0x08] */ pev);

  // 5. pev field defaults — sequence=0x80, body=1, frame=0,
  //    effects=(EF_BRIGHTLIGHT | EF_DIMLIGHT = 5).
  pev[0x118] = 0x80;
  pev[0x10c] = 1;
  pev[0x1a4] = 0;
  pev[0x108] = 5;

  // 6. this->m_bFlagState_0x64 = 0 (private mode byte).
  (this as any).m_bFlagState_0x64 = 0;

  // 7. Two precache-style (string_t, flags) pairs. Low 16 bits = 0
  //    (string index), high 16 bits = 0xffff (precache marker).
  //    Assembly order: 0x14/0x18 then 0x0c/0x10; reordered here
  //    for readability (final state is identical).
  (this as any).m_dwField_0x0c = 0xffff0000;
  (this as any).m_dwField_0x10 = g_soundB;
  (this as any).m_dwField_0x14 = 0xffff0000;
  (this as any).m_dwField_0x18 = g_soundA;

  // 8. pev->field_0x104 (float) = gpGlobals->time + baked_in_const.
  //    *(double*)(ebx-0x6f018) is the constant; g_engineGlobals[0]
  //    is gpGlobals->time.
  pev[0x104] = g_engineGlobals[0] + g_timeConst;

  // 9. If model-name string is empty, copy the baked-in default
  //    (7 bytes: 4 dwords + 1 word + 1 byte) from rodata.
  if ((this as any).m_szModelName_0x6c === "") {
    (this as any).m_szModelName_0x6c = g_defaultModel;
  }

  // 10. Cache the engine-side pointer to the model-name field.
  //     Assembly: this->m_pField_0x94 = (this - LINUX_OFFSET) + 0x6c.
  //     TS rebuild drops LINUX-offset translation; cache the
  //     local reference instead.
  (this as any).m_pField_0x94 = (this as any).m_szModelName_0x6c;

  // 11. Mirror cache: this->m_dwField_0x98 = this->m_dwField_0x8c;
  //                    this->m_dwField_0x9c = this->m_dwField_0x68.
  (this as any).m_dwField_0x98 = (this as any).m_dwField_0x8c;
  (this as any).m_dwField_0x9c = (this as any).m_dwField_0x68;

  // 12. EHANDLE owner = self (no carrier yet).
  // The EHANDLE::operator= call is simplified to a raw pointer
  //     assignment since the TS rebuild doesn't model the EHANDLE
  //     CBaseEntity* / edict-number pair.
  (this as any).m_hOwner_0xa4 = this;

  // 13. this->m_dwField_0xa0 = 0 (final dword clear).
  (this as any).m_dwField_0xa0 = 0;
}

// External SDK references — declared `any` so this file compiles in
// isolation. UTIL_SetSize / UTIL_SetOrigin live in GoldSrc `subs.cpp`.
declare const UTIL_SetSize: any;
declare const UTIL_SetOrigin: any;
