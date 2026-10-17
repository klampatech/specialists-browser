/**
 * CTSPowerUp::Spawn — initialize a power-up entity when it enters the world.
 *
 * Decompiled from `Spawn__10CTSPowerUp` @ 0x00088258 (369 B) in ts_i386.so.
 * Reference: tools/decompile/chunks/Spawn__10CTSPowerUp.chunk.md
 *
 * Notes:
 *  - This is a gameplay entity method, not one of the 4
 *    engine↔mod interface functions, so the interface-version
 *    checklist doesn't apply.
 *  - The first call is a virtual dispatch through
 *    `[this+0x60]->vtable[10](this)`, NOT a non-virtual
 *    `this.Precache()`. Identity is ambiguous.
 *  - All `pev+0xNNN` writes are RAW OFFSETS. HLSDK field names
 *    (animtime, nextframe, controller[]) don't match these
 *    offsets in TS's entvars layout — do not assert them.
 *  - `this+0xNN` writes are CTSPowerUp-internal members; field
 *    identities are unknown without the class layout map.
 */

// --- Stubs so the file compiles in isolation ----------------------------
declare class CBaseAnimating { ResetSequenceInfo(): void; }
declare class CTSPowerUp {
  pev: any;
  Precache(): void;
  ResetSequenceInfo(): void;
  SetupPowerUp(type: number, a: number, t: number, b: boolean): void;
}
declare function UTIL_SetOrigin(pev: any, origin: any): void;
declare function UTIL_SetSize(pev: any, mins: any, maxs: any): void;
declare const gpGlobals: { time: number };
declare const someGlobal: { byte1?: number };
declare function makeString(s: string): any;
declare function engineInfo(fmt: string, arg: any): void;
declare function loadRodataFloat(addr: number): number;
declare function loadRodataDouble(addr: number): number;
declare function loadGlobalDword(addr: number): any;

// --- Decompiled function ------------------------------------------------
export function Spawn(this: CTSPowerUp): void {
  // 0x88271..88275: indirect call through `[this+0x60]->vtable[10]`
  // with `this` as the first arg.
  // TODO(asm-ambiguous): could be CBaseEntity::Spawn, some other
  // virtual, or a method on a sub-object held at this+0x60.
  this.Precache();

  // 0x88278..88287: one-shot reset of a global byte from 0xff to 0.
  // TODO(asm-ambiguous): global at GOT+0x1E7300; byte at offset 1.
  if (someGlobal.byte1 === 0xff) {
    someGlobal.byte1 = 0;
  }

  // 0x8828b..882a1: write PIC-relocated .rodata string pointer into
  // this[0][0] = pev->classname.
  // TODO(asm-ambiguous): exact classname literal unknown.
  this.pev.classname = makeString(/* "powerup?" */);

  // 0x882a3..882bb: engine log call, format + 1 pev-string arg.
  // TODO(asm-ambiguous): format at .rodata 0x17978F; pev offset 0x208
  // is past the standard HLSDK entvars_t end — possibly a TS
  // extension or a misread; treat as raw offset.
  engineInfo(/* "Spawning powerup: %s\n" */, this.pev[0x208]);

  // 0x882be..88314: eight sequential pev writes. Use raw offsets;
  // do NOT map to HLSDK field names (offsets don't fit animtime /
  // nextframe / controller[]).
  const pev = this.pev as any;
  pev[0x108] = 6;        // int
  pev[0x10c] = 2;        // int
  pev[0x148] = 1;        // int
  pev[0x14c] = 255.0;    // float (0x437f0000)
  pev[0x150] = 0;        // int
  pev[0x154] = 0;        // int
  pev[0x158] = 0;        // int
  pev[0x15c] = 14;       // int

  // 0x88321..88329: UTIL_SetOrigin(pev, &pev->origin) — re-confirm
  // origin to the engine. Standard pattern.
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // 0x88331..8835e: UTIL_SetSize(pev, mins, maxs) with mins == maxs
  // == <K,K,K> for a point-sized bounding box.
  // TODO(asm-ambiguous): K at .rodata 0x176A08.
  const K = loadRodataFloat(0x176A08);
  const corner = { x: K, y: K, z: K };
  UTIL_SetSize(this.pev, corner, corner);

  // 0x88363..88383: four CTSPowerUp-internal member writes.
  // TODO(asm-ambiguous): field identities unknown. 0xffff0000 at
  // this+0xc is an unusual bit pattern — may not be a flag field
  // in the HLSDK sense; treat the name as a placeholder.
  (this as any).m_fField14 = 0;
  (this as any).m_fField18 = 0;
  (this as any).m_fFlags = 0xffff0000;          // ??? TODO: bit-pattern oddity
  (this as any).m_pField10 = loadGlobalDword(/* GOT+0x1E7C28 */);

  // 0x88386..88392: pev+0x104 = gpGlobals->time + constant.
  // TODO(asm-ambiguous): constant at .rodata 0x177138. Offset 0x104
  // is in the area of `nextthink` for HLSDK, but not confirmed for TS.
  pev[0x104] = gpGlobals.time + loadRodataDouble(0x177138);

  // 0x88398..8839b: reset animation sequence info now that sequence
  // (pev+0x108 = 6) is set.
  this.ResetSequenceInfo();

  // 0x883a0..883a2: pev+0x138 = 1.0f.
  // TODO(asm-ambiguous): not framerate in standard HLSDK; offset
  // here doesn't match.
  pev[0x138] = 1.0;

  // 0x883ac..883bd: SetupPowerUp(this+0x84, -1, 0.0, true).
  this.SetupPowerUp(
    (this as any).m_nPowerUpType, // this+0x84 — identity unclear
    -1,
    0.0,
    true,
  );
}
