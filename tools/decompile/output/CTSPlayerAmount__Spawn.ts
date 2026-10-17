/**
 * CTSPlayerAmount::Spawn — initializes the player-amount entity on map start.
 *
 * Sets pev->model (via MAKE_STRING), pev->flags (FL_NOTARGET),
 * pev->rendermode (kRenderNormal), pev->renderfx (kRenderFxFadeSlow),
 * and zeroes the runtime tracking fields that ClientConnect /
 * ClientDisconnect maintain.
 *
 * Implementation note: the entity holds pev* at offset 0 (esi = [this]).
 * `this`-side slots are addressed directly off `this`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface CTSPlayerAmountPe {
  model: number;
  flags: number;
  rendermode: number;
  renderfx: number;
  [k: string]: any;
}

interface CTSPlayerAmount {
  pev: CTSPlayerAmountPe;
  m_field_0x0c: number;
  m_field_0x10: number;
  m_field_0x14: number;
  m_field_0x18: number;
  m_field_0x6c: number;
  [k: string]: any;
}

export function Spawn(this: CTSPlayerAmount): void {
  // TODO(asm-ambiguous): pev->model = MAKE_STRING(<unknown model name>)
  // The disasm LEA's [ebx-0x6edc8] for the string *literal*, then
  // SUBs [[[ebx+0x1600]] + 0x98] which is gpGlobals->pStringBase in
  // HLSDK globalvars_t. The literal name string lives in rodata; this
  // chunk doesn't contain it.
  // this.pev.model = MAKE_STRING(<model>);

  this.pev.flags     |= 0x80; // FL_NOTARGET in stock HL1; sensible for a
                              // player-count tracker that should never
                              // be a fire target.
  this.pev.rendermode = 0;    // kRenderNormal
  this.pev.renderfx   = 5;    // kRenderFxFadeSlow

  // Zero runtime counters/timers consumed by ClientConnect /
  // ClientDisconnect. Names are pending D.4 cross-reference with
  // KeyValue__15CTSPlayerAmount and the sibling methods. Offsets
  // 0x0c / 0x10 look integer-ish (counters); 0x14 / 0x18 / 0x6c
  // look float-ish (timestamps or thresholds).
  this.m_field_0x0c = 0;
  this.m_field_0x10 = 0;
  this.m_field_0x14 = 0;
  this.m_field_0x18 = 0;
  this.m_field_0x6c = 0;
}
