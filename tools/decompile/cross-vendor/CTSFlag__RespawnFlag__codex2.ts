// CTSFlag::RespawnFlag — TS server mod (decompiled from ts_i386.so @ 0x8de58)
// Self-contained: every external reference is `any`-typed or stubbed.
// TODO(asm-ambiguous): flagStatusTable has a 0x1c-byte (7-dword) header
//                      before the first entry; the +0x1c is folded into
//                      `flagStatusTable`'s definition in globals.
// TODO(asm-ambiguous): owner+0xc and owner+0x10 are unknown fields
//                      (their 0xffff0000 / GOT[+0x1ccc] values are
//                      captured but their semantics aren't).
// TODO(asm-ambiguous): byte order of the 0xffff0000 sentinel at owner+0xc.

type CTSFlag = any;          // real type defined elsewhere
type CBaseEntity = any;     // real type defined elsewhere

// Minimal stubs so the file compiles in isolation.
declare const globals: any;            // GOT-rooted namespace
declare function UTIL_VarArgs(fmt: any, ...args: any[]): string;
declare function TSHudMessageAll(
  r: number, g: number, b: number,
  effect: number, hold: number,
  message: string,
): void;

export function RespawnFlag(this: CTSFlag): void {
  // Resolve m_hOwner (EHANDLE @ this+0xa4) → CBaseEntity*.
  // The operator is invoked with `&this->m_hOwner` pushed on the stack
  // (i386 thiscall convention for unary member operators).
  const ownerEntity: CBaseEntity = (this.m_hOwner as any).getEntity?.() ?? null;

  if (ownerEntity !== null) {
    // [owner+0xc]  := 0xffff0000  (packed-color sentinel, byte-order TBD)
    // [owner+0x10] := globals.flagStatusReset
    ownerEntity.field_0x0c = 0xffff0000;
    ownerEntity.field_0x10 = globals.flagStatusReset;

    // pev->nextthink = gpGlobals->time + globals.flagRespawnDelay
    // GOT[+0x1600] is a `globalvars_t**`; time is at offset 0 of
    // globalvars_t. The TS shortcut `globals.time` assumes globals
    // already exposes the resolved gpGlobals struct.
    const pev = ownerEntity.pev;                 // [owner+0x00] = pev
    pev.nextthink = globals.time + globals.flagRespawnDelay;
  }

  // Broadcast a HUD message naming the flag status, but only for valid
  // statuses (0..3). ja 0x8deff skips the message for status > 3.
  if (this.m_iStatus <= 3) {
    // Status name lives at flagStatusTable[status].nameAt0x0c; each entry
    // is 35 dwords = 140 bytes. The +0x1c header offset is folded into
    // flagStatusTable's definition.
    const statusName = globals.flagStatusTable[this.m_iStatus].nameAt0x0c;
    const message = UTIL_VarArgs(globals.szFlagRespawnFormat, statusName);
    // cdecl push order: message, hold(30), effect(4), b(0), g(255), r(0)
    TSHudMessageAll(/*r*/ 0, /*g*/ 0xff, /*b*/ 0, /*effect*/ 4, /*hold*/ 30, message);
  }

  // Unconditional Destroy — both branches (no owner / status>3) merge
  // here at 0x8deff.
  this.Destroy();
}
