// === External declarations (would live in a shared cts-bridge.d.ts) ===
declare const gpGlobals_time: number;
declare const g_pStringBase: any;
declare const USE_TYPE_3: number;
declare function STRING(p: any): string;
declare function FireTargets(
  targetName: string, pCaller: any, pActivator: any,
  useType: number, delay: number,
): void;
declare function TSHudMessageAll(
  ch: number, r: number, g: number, y: number, hold: number, msg: string,
): void;

interface CBasePlayer {
  colorByte0: number;
  colorByte1: number;
  colorByte2: number;
}

interface CTSBomb {
  armedFlag: number;             // byte  [esi+0x64]
  ownerPtr: number;              // dword [esi+0x84]
  flDetonateTime: number;        // float [esi+0x6c]
  flSecondary: number;           // dword [esi+0x70]
  wireState: Uint8Array;         // 3 bytes [esi+0x7c..0x7e], indexed by wireIndex
  someFlag: number;              // byte  [esi+0x7f] — set on state-2 cut
  colorByte0: number;            // byte  [esi+0x7c]
  colorByte1: number;            // byte  [esi+0x7d]
  colorByte2: number;            // byte  [esi+0x7e]
  /* First-member pointer ([esi+0]) that resolves message-table offsets at
     +0x1c8 and +0x1d4 via a string base. NOT a vtable.            */
  defuseMessagesPtr: any;
  /* Pointer at [esi+0x60] to a virtual-dispatch table;
     [this][0x60][0x114/4] is the function called at the end of state 1.
     NOT pev (pev lives at CBaseEntity offset 0).                   */
  dispatchTable: any;
}

/**
 * CTSBomb::CutWire — player cuts one of the bomb's three wires.
 *
 *  Preconditions: armed, has owner, timer not yet expired, wireIndex ∈ {0,1,2},
 *                 wire-byte != 0, player != null.
 *  State dispatch on the wire byte:
 *    3 → silent disarm (clear wire + zero timer).
 *    2 → clear wire, set internal flag, copy [esi+0x7c..0x7e] onto player+0x78c..0x78e.
 *    1 → clear wire; optionally FireTargets and/or TSHudMessageAll (gated by
 *        non-zero offsets in the message table); zero both timer fields;
 *        dispatch through [esi+0x60][0x114/4](this, 1).
 */
export function CutWire(
  this: CTSBomb,
  wireIndex: number,
  player: CBasePlayer,
): void {
  const self = this as any;
  const playerAny = player as any;

  // ---- Preconditions --------------------------------------------------
  if (self.armedFlag === 0) return;                          // [esi+0x64] byte
  if (self.ownerPtr === 0) return;                          // [esi+0x84] dword
  // x87 pattern: fld [gpGlobals_time]; fcomp [esi+0x6c]; sahf; jae end
  if (gpGlobals_time >= self.flDetonateTime) return;
  if (wireIndex > 2) return;
  const wireByte: number = self.wireState[wireIndex];       // [esi+0x7c + wireIndex]
  if (wireByte === 0) return;
  if (player == null) return;

  // ---- state 3: silent disarm -----------------------------------------
  if (wireByte === 3) {
    self.wireState[wireIndex] = 0;
    self.flDetonateTime = 0;
    return;
  }

  // ---- state 2: clear wire, set flag, snapshot color onto player -----
  if (wireByte === 2) {
    self.someFlag = 1;                                      // [esi+0x7f]
    self.wireState[wireIndex] = 0;
    playerAny.colorByte0 = self.colorByte0;                 // [esi+0x7c] → [edi+0x78c]
    playerAny.colorByte1 = self.colorByte1;                 // [esi+0x7d] → [edi+0x78d]
    playerAny.colorByte2 = self.colorByte2;                 // [esi+0x7e] → [edi+0x78e]
    return;
  }

  // ---- state 1: full defuse ------------------------------------------
  if (wireByte !== 1) return;                               // disasm: cmp 0x1; jne end
  self.wireState[wireIndex] = 0;

  // Optional FireTargets — gated by a non-zero offset in the message table.
  const fireOffset: number = (self.defuseMessagesPtr as any)[0x1c8 / 4];
  if (fireOffset !== 0) {
    // TODO(asm-ambiguous): the cstring-resolution triple-deref chain
    //   `*(*(ebx + 0x1600))[0x98/4] + offset` cannot be reconstructed
    //   in TS without a C bridge; the `+0x98` is elided below.
    const szFire = STRING(
      (*(g_pStringBase as any) /* +0x98 after the GOT walk */) + fireOffset,
    ) as string;
    FireTargets(szFire, self, self, USE_TYPE_3, 0.0);
  }

  // Optional HUD broadcast — gated by a non-zero offset in the message table.
  const hudOffset: number = (self.defuseMessagesPtr as any)[0x1d4 / 4];
  if (hudOffset !== 0) {
    const szHud = STRING(
      (*(g_pStringBase as any) /* +0x98 */) + hudOffset,
    ) as string;
    // Disasm push order: eax(string), 0x1e, 0x8, 0x0, 0xff, 0x0.
    // cdecl source order = reverse of push order, so string goes LAST.
    TSHudMessageAll(0, 0xff, 0, 0x8, 0x1e, szHud);
  }

  self.flDetonateTime = 0;                                   // [esi+0x6c]
  self.flSecondary = 0;                                      // [esi+0x70]

  // Virtual dispatch through [esi+0x60][0x114/4](self, 1).
  (self.dispatchTable as any)[0x114 / 4](self, 1);
}
