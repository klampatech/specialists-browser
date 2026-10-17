/**
 * CTSHack::Spawn — initialize a CTSHack objective entity at level
 * spawn. Pulls a static origin offset against a player-derived
 * value, fires a 2-arg engine dispatch, re-snaps origin via
 * UTIL_SetOrigin, zeroes standard entvars + CTSHack state, then
 * schedules the first think.
 *
 * D.3 deliverable. Field names + global identities land in D.4.
 * Compiles against the decompile pipeline's ambient stubs.
 */
declare class CTSHack { pev: any }
declare const engineDispatch: (a: any, b: any) => void;
declare const UTIL_SetOrigin: (pev: any, origin: { x: number; y: number; z: number }) => void;
declare const MODEL_HACK: number;

export function Spawn(this: CTSHack): void {
  const pev: any = this.pev;

  // (1) origin.x = static_const - player->field_0x98.
  // TODO(asm-ambiguous): [ebx + 0x1600] global identity, +0x98
  //                      field semantics, and whether  //                      `lea [ebx - 0x6cdc9]` was meant as a
  //                      value or a PIC-relative load.
  const HACK_SPAWN_OFFSET_X =0;          // lower 32 bits of [ebx - 0x6cdc9]
  const playerX = 0;                       // [ebx + 0x1600] → ptr → +0x98
  pev.origin.x = HACK_SPAWN_OFFSET_X - playerX;

  // (2) 2-arg engine dispatch via [ebx + 0x1aa8][0x8].
  // TODO(asm-ambiguous): which enginefuncs slot is at offset 0x8.
  engineDispatch(pev.field_0x208, pev.field_0xb8 + playerX);

  // (3) UTIL_SetOrigin(pev, &pev->origin) — by-ref Vector.
  // disassembly pushes pev+8 (i.e., &pev->origin).
  UTIL_SetOrigin(pev, pev.origin);

  // (4) entvars zero/initial values — fields named in D.4.
  pev.field_0x118 = 0x80;   // TODO: name (movetype?)
  pev.field_0x10c = 0;      // TODO: name
  pev.field_0x1a4 = 0;      // TODO: name
  pev.field_0x108 = 0;      // TODO: name

  // (5) CTSHack instance state — names land in D.4.
  this.flagByte_0x64 = 0;            // TODO: name (1-byte flag)
  this.dword_0x14 = 0;               // TODO: name
  this.dword_0x18 = 0;               // TODO: name
  this.dword_0xc = 0xffff0000;       // alpha=ff, blue=ff — likely render colour
  this.handle_0x10 = MODEL_HACK;     // [ebx + 0x1fbc] — likely model handle

  // (6) Schedule first think. fld QWORD + fadd DWORD + fstp DWORD
  // means the upper 32 bits of the constant at [ebx - 0x6f018]
  // are discarded; the effective constant is the lower 32 bits
  // interpreted as single-precision.
  // TODO(asm-ambiguous): which time field (+0x100 / +0x104) and
  //                      what the delay constant is in seconds.
  const HACK_THINK_DELAY = 0;        // lower 32 bits of [ebx - 0x6f018]
  pev.field_0x104 = pev.field_0x100 + HACK_THINK_DELAY;

  // (7) Final CTSHack state zero-init.
  this.dword_0x6c = 0;               // TODO: name
  this.dword_0x74 = 0;               // TODO: name
  this.dword_0x70 = 0;               // TODO: name
}
