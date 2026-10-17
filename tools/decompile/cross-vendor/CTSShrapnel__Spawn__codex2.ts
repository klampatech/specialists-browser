/**
 * CTSShrapnel::Spawn — initialize a freshly-created shrapnel entity.
 *
 * Decompiled from ts/dlls/ts_i386.so.
 * See tools/decompile/chunks/Spawn__11CTSShrapnel.chunk.md.
 */
export function Spawn(this: CTSShrapnel): void {
  // Compiler-generated PIC/GOT base is in EBX after the prologue:
  //   call $+5; pop ebx; add ebx, 0xf9d66
  // After this, [ebx ± N] reads globals / GOT entries.

  // ── 1. Parent spawn (CTSPhysicObject::Spawn) ─────────────────────
  CTSPhysicObject.Spawn(this);

  // ── 2. Attach model ──────────────────────────────────────────────
  // Disassembly: push [ecx+0x208]; push modelName; call pfnSetModel
  //   ecx = pev, so first arg is pev->field_at_0x208, NOT pev itself.
  // TODO(asm-ambiguous): identify the field at pev+0x208. Standard HLSDK
  // entvars_s doesn't extend to 0x208, so this is a TS-specific pointer  // (likely a "containing entity" override or owner pointer).
  SET_MODEL(
    /* pev+0x208 (unknown TS field) */ this.pev as any,
    /* modelName from [ebx-0x6e067] */ ""  // TODO: look up in strings-n5.txt
  );

  // ── 3. Visual scale + body/skin ──────────────────────────────────
  this.pev.scale = 1.0;       // [pev+0x11c]
  // TODO(verify): [pev+0x120] — likely maxs[0] in HLSDK (overwritten by
  // UTIL_SetSize below), not a TS "scale2". Cross-check entvars_s layout.
  this.pev.body = 10;         // [pev+0x108]
  this.pev.skin = 2;          // [pev+0x10c]

  // ── 4. Bounding box (point-sized) ────────────────────────────────
  // Disassembly loads a 3-float Vector from [ebx-0x6f408] and uses it
  // for BOTH mins and maxs. Treat the constant as a TODO until we read
  // it from the data section.
  const bounds: Vector = /* Vector at [ebx-0x6f408] */ Vector.zero;
  UTIL_SetSize(this.pev, bounds, bounds);

  // ── 5. Cached identifier pairs (class fields at this+0xc..0x18) ──
  // Disassembly emits `mov cx, 0x60; mov edx, ecx; mov [esi+0x10], edx`
  // which only writes the LOW 16 bits. ecx is caller-saved across the
  // UTIL_SetSize call, so its high 16 bits are NOT guaranteed zero.
  // In TS we zero-extend at the language level — STRICTER than asm.
  // The fields are speculative; values 0x460000/0x490000 look like
  // string_t indices. TODO(asm-ambiguous): purpose unclear.
  this.m_iCachedA = 0x460000;   // [this+0xc]  — 32-bit write
  this.m_iCachedB = 0x60;       // [this+0x10] — 16-bit write (low only)
  this.m_iCachedC = 0x490000;   // [this+0x14] — 32-bit write
  this.m_iCachedD = 0x60;       // [this+0x18] — 16-bit write (low only)

  // ── 6. Schedule the first WaitThink ──────────────────────────────
  this.pev.next_think    = gpGlobals.time;                  // [pev+0x104]
  this.m_flWaitThinkTime = gpGlobals.time + WAIT_THINK_DELAY;  // [this+0x88]

  // ── 7. Gameplay flags ────────────────────────────────────────────
  this.pev.fuser4     = 1.0;     // [pev+0x254]
  this.pev.eflags     = 0x4;     // [pev+0x250]: cleared then |= 0x4
  this.pev.spawnflags |= 0x80;   // [pev+0x118]: |= 0x80 (TS-specific)
}
