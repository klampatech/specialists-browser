// STUBS — replace when the real bindings land in D.4/D.5.
// Using `any` per checklist item 8 (function must compile in isolation).
declare const gpGlobals: any;
declare const EngineSingleton: any;
declare function EngineBroadcast(arg1: number, arg2: number): void;
declare function SetRandomWires(self: any): void;

/**
 * CTSBomb::EnableObjective — arms or disarms the bomb objective.
 *
 * Demangled: `CTSBomb::EnableObjective(bool)`
 * Address: 0x0007c608, Size: 260 B.
 *
 * ARM branch (enable=true):
 *   - +0x64 := enable, +0x7f := 0
 *   - pev+0x118 &= ~0x80; pev+0x10c = 4; pev+0x108 = 7
 *   - pev+0x1a4 |= 0x02000000
 *   - call [GOT+0x1aa8 + 0x8](pev+0x208, pev+0xb8 + (*[GOT+0x1600])+0x98)
 *   - +0x6c := ([GOT+0x14f0])+0x8 - (*[GOT+0x1600])+0   (float)
 *   - +0x70 = +0x78 = +0x74 = 0   (note: order matches disasm 0x70/0x78/0x74)
 *   - SetRandomWires(this)
 *
 * DISARM branch (enable=false):
 *   - pev+0x118 = 0x80; pev+0x10c = 0; pev+0x108 = 0; pev+0x1a4 = 0
 *   - +0x6c = +0x70 = +0x78 = +0x74 = 0
 *
 * @param this   The CTSBomb entity instance
 * @param enable True to arm, false to disarm
 */
export function EnableObjective(this: any, enable: boolean): void {
  // --- Unconditional prologue (executed in both branches) ---
  this.m_bEnabled = enable ? 1 : 0;
  // TODO(asm-ambiguous): cleared in BOTH branches before the if.
  // Likely m_bDefused or m_bWiresExposed — semantics TBD by D.4.
  this.m_bDefused = 0;

  if (enable) {
    // === ARM ===
    this.pev.flags   &= 0xffffff7f;          // pev+0x118
    this.pev.body     = 4;                   // pev+0x10c
    this.pev.skin     = 7;                   // pev+0x108
    this.pev.renderfx |= 0x02000000;         // pev+0x1a4

    // TODO(asm-ambiguous): indirect vtable call into the engine
    // singleton at GOT+0x1aa8, calling its slot at offset 0x8.
    // Reconstructed here as a stubbed EngineBroadcast.
    EngineBroadcast(
      this.pev.handle_0x208,                        // pev+0x208 (arg0)
      this.pev.field_0xb8 + EngineSingleton.field_0x98 // pev+0xb8 + *(GOT+0x1600)+0x98 (arg1)
    );

    // m_flStartTime (+0x6c) = (singleton_at_GOT+0x14f0).field_0x8
    //                         - (*singleton_at_GOT+0x1600).field_0
    // Note: fld/fsub ⇒ first - second; preserves disassembly order.
    this.m_flStartTime = gpGlobals.field_0x8 - EngineSingleton.firstField;

    // TODO(asm-ambiguous): three zeroed offsets (+0x70, +0x78, +0x74).
    // Names below are D.4 guesses; disasm order is 0x70, 0x78, 0x74.
    this.m_iWiresCut       = 0;  // pev+0x70 (?? — disasm zero order 1)
    this.m_flDetonateLength = 0; // pev+0x78 (?? — disasm zero order 2)
    this.m_flDetonateTime   = 0; // pev+0x74 (?? — disasm zero order 3)

    SetRandomWires(this);
  } else {
    // === DISARM ===
    this.pev.flags   = 0x80;                   // pev+0x118
    this.pev.body    = 0;                      // pev+0x10c
    this.pev.renderfx = 0;                     // pev+0x1a4
    this.pev.skin    = 0;                      // pev+0x108

    this.m_flStartTime         = 0;            // +0x6c
    // TODO(asm-ambiguous): same three state fields as ARM, zeroed.
    this.m_iWiresCut        = 0;
    this.m_flDetonateLength = 0;
    this.m_flDetonateTime   = 0;
  }
}
