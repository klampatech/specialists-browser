/**
 * Local stubs — in the full TS port these come from the engine-emulator
 * layer and the entity-runtime layer. `any` is used here per the
 * review-checklist rule for unknowns.
 */
declare const engine: {
  pfnMessageBegin: (msg_dest: number, msg_type: number, pOrigin: any, ed: any) => void;
  pfnMessageEnd:   () => void;
  pfnWriteByte:    (v: number) => void;
  pfnWriteShort:   (v: number) => void;
  pfnWriteCoord:   (v: number) => void;
  pfnRandomLong:   (lo: number, hi: number) => number;
  pfnRandomFloat:  (lo: number, hi: number) => number;
};
declare const global: any;
const MSG_ALL = 2;

interface entvars_t { angles: { x: number; y: number; z: number }; [k: string]: any; }
interface CTSWind {
  pev: entvars_t;
  windBaseSpeed: number;   // offset 0x64 (direct class member)
  windAngle:     number;   // offset 0x68
  windMagnitude: number;   // offset 0x6c
}

/**
 * CTSWind::BlowThink — broadcast a wind-state update and write a derived
 * scalar into pev+0x104 (purpose unknown; flag for D.4 follow-up).
 *
 * Faithful to disassembly at 0x000643a8 (259 B):
 *   pfnMessageBegin(MSG_ALL, g_msgWind, NULL, NULL)
 *   pfnWriteByte(3)
 *   pfnWriteShort(RANDOM_LONG(0, 30000))
 *   pfnWriteShort(trunc_to_int(RANDOM_LONG(-45, 45) + pev->angles.y))
 *   pfnWriteCoord(RANDOM_FLOAT(-windAngle, windAngle) + windBaseSpeed)
 *   pfnMessageEnd()
 *   pev+0x104 = gpGlobals->time + windMagnitude
 *              + RANDOM_FLOAT(-windMagnitude * windScale,
 *                             +windMagnitude * windScale)
 */
export function BlowThink(this: CTSWind): void {
  // ---- PIC/GOT globals, loaded once via call/pop/add at function entry ----
  const msgType   = global.windMsgTypeAddr.derefInt32(); // [ebx+0x1cf8] (2-level indirection)
  const windScale = global.windScale;                    // [ebx-0x6ec2c] (single float in .rodata)
  const time      = global.timePtr.derefFloat();         // [ebx+0x1600] (3-level: addr→ptr→float)

  // ---- 1. Open the broadcast message ----
  engine.pfnMessageBegin(MSG_ALL, msgType, null, null);   // [esi+0xb8]

  // ---- 2. Subcommand byte ----
  engine.pfnWriteByte(3);                                // [esi+0xc0]

  // ---- 3. Random long in [0, 30000) → short ----
  // [esi+0x168] = pfnRandomLong(int, int). Returns int in eax.
  engine.pfnWriteShort(engine.pfnRandomLong(0, 30000));  // [esi+0xcc]

  // ---- 4. Random long + pitch, truncated to int via FPU control word ----
  // fnstcw / ldcw sets rounding-mode bits 10..11 = 0b11 (truncate) before fistp.
  const seed2    = engine.pfnRandomLong(-45, 45);        // [esi+0x168]
  const combined = (seed2 + this.pev.angles.y) | 0;       // truncate-to-int (JS `|0` ≈ FPU truncate)
  engine.pfnWriteShort(combined);                         // [esi+0xcc]

  // ---- 5. Random float in [-windAngle, +windAngle); result via FPU ----
  // [esi+0x16c] = pfnRandomFloat(float, float). Both pushed values are real
  // args (the float return is delivered on the x87 stack, NOT an "alignment push").
  // Original C: pfnRandomFloat(...) + m_windBaseSpeed, fed to pfnWriteCoord.
  const rf1 = engine.pfnRandomFloat(-this.windAngle, this.windAngle); // [esi+0x16c]
  engine.pfnWriteCoord(rf1 + this.windBaseSpeed);                      // [esi+0xd4]

  // ---- 6. End the message ----
  engine.pfnMessageEnd();                                              // [esi+0xbc]

  // ---- 7. Second [esi+0x16c] call — same function as step 5 ----
  // faddp st(1), st  ⇒  pev+0x104 = time + windMagnitude + RANDOM_FLOAT(...)
  const rf2 = engine.pfnRandomFloat(
    -this.windMagnitude * windScale,
     this.windMagnitude * windScale,
  );                                                                  // [esi+0x16c]
  this.pev.field104 = time + this.windMagnitude + rf2;                // [edx+0x104]
}
