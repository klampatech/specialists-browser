/**
 * CTSWind::BlowThink — periodic think that broadcasts the wind
 * entity's current state to all clients and advances the wind-
 * cycle scalar for the next tick.
 *
 * NOTE: This function is NOT one of the 4 mod↔engine interface
 * entries described in the cross-vendor review prompt
 * (GiveFnptrsToDll / GetEntityAPI / GetEntityAPI2 /
 * GetNewDLLFunctions). The HLSDK reference for those entries
 * does not apply here — BlowThink is a CTSWind gameplay-entity
 * method.
 *
 * All engine calls reach the engine function table at raw offsets
 * (e.g. `[esi+0xb8]`). Without the engine function-table symbol
 * map for ts_i386.so, the names of those functions are not
 * recoverable. We index the table by offset.
 *
 * Field offsets within `this` and within `pev` are placeholders.
 * The first dword of `this` is almost certainly `pev` (HLSDK
 * CBaseEntity convention), but without the struct definitions in
 * the binary's HLSDK build, the field names are not recoverable.
 */

// Engine function table — opaque. In a real port, this is the
// engine's exported function table (g_engfuncs / pvEngineFuncs).
// We index it by raw offset, since names are not recoverable.
declare const engine: any;

// gpGlobals — global game state.
declare const gpGlobals: { time: number };

// Wind cvar (e.g. ts_wind_amt or similar — see strings-n5.txt).
declare const windCvar: number;

// gmsgWind — engine message id for the wind-state broadcast.
declare const gmsgWind: number;

// Some engine calls (specifically [esi+0x16c]) leave a value on
// the x87 FPU stack that the C++ compiler is then able to fold
// into a subsequent faddp. Without the engine function-table
// symbol map, we cannot know what that value is — so it is
// modeled as an opaque 0 here. Replace with the real value once
// the engine symbol map is known.
declare const fpuOpaqueFrom16c: number;

/**
 * BlowThink — CTSWind::BlowThink()
 * Demangled:  CTSWind::BlowThink()
 * Address:    0x000643a8
 * Size:       259 bytes
 */
export function BlowThink(this: any): void {
  // ---- 1. messageBegin(MSG_ALL=2, gmsgWind, NULL, NULL) ----
  // [esi+0xb8] — 4-arg. Shape matches HLSDK pfnMessageBegin.
  engine[0xb8](2 /* MSG_ALL */, gmsgWind, 0 /* pOrigin=NULL */, 0 /* ed=NULL */);

  // ---- 2. writeByte(3) ----
  // [esi+0xc0] — 1-arg.
  engine[0xc0](3);

  // ---- 3. 2-arg call (0, 30000) ----
  // [esi+0x168] — semantics unknown (likely a 2-arg coord/short
  // variant). Returns an int (eax) that is consumed below.
  // TODO(asm-ambiguous): function name.
  const ret1: number = engine[0x168](0, 30000);

  // ---- 4. write trunc((float)ret1 + pev[0x54]) ----
  // [esi+0xcc] — 1-arg. The FPU is loaded with (float)ret1,
  // added to pev+0x54, then converted back to int via the
  // control-word dance that forces round-toward-zero (truncate).
  // TODO(asm-ambiguous): pev+0x54 field name.
  const pev: any = this._field_0; // first dword of `this` — almost certainly `pev`
  const packed = Math.trunc(ret1 + pev[0x54]);
  engine[0xcc](packed);

  // ---- 5. 2-arg call (-45, 45) ----
  // [esi+0x168]
  const ret2: number = engine[0x168](-45, 45);

  // ---- 6. write trunc((float)ret2) ----
  // [esi+0xcc]
  engine[0xcc](Math.trunc(ret2));

  // ---- 7. 2-arg call ([this+0x68], -[this+0x68]) ----
  // The second arg has its sign bit flipped via XOR 0x80000000.
  // [esi+0x16c] — semantics unknown (likely pfnWriteAngle or a
  // coord/angle 2-arg variant). Leaves a value on the FPU stack
  // for the faddp at step 11.
  // TODO(asm-ambiguous): this+0x68 field name.
  const v68 = this._field_0x68;
  engine[0x16c](v68, v68 ^ 0x80000000);

  // ---- 8. write ([this+0x64] + ST(0)) ----
  // [esi+0xd4] — 1-arg. ST(0) is whatever [esi+0x16c] left on
  // the FPU stack; modeled here as `fpuOpaqueFrom16c`.
  // TODO(asm-ambiguous): this+0x64 field name; fpuOpaqueFrom16c
  // exact value depends on the engine symbol map.
  engine[0xd4](this._field_0x64 + fpuOpaqueFrom16c);

  // ---- 9. messageEnd() ----
  // [esi+0xbc] — 0-arg. Shape matches HLSDK pfnMessageEnd.
  engine[0xbc]();

  // ---- 10. 2-arg call (-cycle*windCvar, cycle*windCvar) ----
  // [esi+0x16c]. Leaves a value on the FPU stack for step 11.
  // TODO(asm-ambiguous): this+0x6c field name.
  const cycle = this._field_0x6c;
  engine[0x16c](-cycle * windCvar, cycle * windCvar);

  // ---- 11. Update cycle scalar at pev+0x104 ----
  // Adds (gpGlobals->time + this->cycle + ST(0)) and stores at
  // pev+0x104. ST(0) is whatever [esi+0x16c] left on the FPU
  // stack; modeled here as `fpuOpaqueFrom16c`.
  // TODO(asm-ambiguous): pev+0x104 field name; fpuOpaqueFrom16c
  // exact value depends on the engine symbol map.
  pev[0x104] = gpGlobals.time + cycle + fpuOpaqueFrom16c;
}
