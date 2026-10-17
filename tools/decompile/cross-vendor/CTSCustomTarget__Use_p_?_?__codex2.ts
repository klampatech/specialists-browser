// Forward-declare unknown callees + class so this file type-checks
// in isolation. Wire up real definitions in D.4.
type CTSCustomTarget = any;
declare const TSHudMessageAll: (...args: any[]) => void;
declare const FireTarget: (self: any, targetIdx: number) => void;

export function Use(
  this: CTSCustomTarget,
  pActivator: any,        // CBaseEntity * — unused
  useType: any,           // USE_TYPE — unused
  value: number,          // float — unused
): void {
  const self = this;

  // Throttle: increment every call; only proceed every Nth Use.
  // Disasm: [esi+0x870]++ ; if (new < [esi+0x86c]) ret ; else [esi+0x870]=0.
  if (++self.m_iFrameCount < self.m_iFrameLimit) {
    return;
  }
  self.m_iFrameCount = 0;

  // Optional HUD broadcast. The disassembly gates this on a 2-level
  // pointer deref: [esi]; cmp [edx+0x1d4], 0. Treat that as a stub
  // until D.4 names the actual base pointer / field.
  // TODO(asm-ambiguous): the `[esi+0]` base pointer and `[base+0x1d4]`
  //   field aren't named in this chunk — likely a localization/
  //   string-table indirection.
  const hudOffset = (self as any).__ts_hud_offset as (number | undefined);
  if (hudOffset !== undefined && hudOffset !== 0) {
    // Disasm: [ebx+0x1600] → *ptr → [ptr+0x98] (cvar string base)
    // + the per-entity offset, then TSHudMessageAll(0,0xff,0,1,0x1e,msg).
    const baseStr = (self as any).__ts_hud_cvar_base as number;
    const msg = (baseStr + hudOffset) as any;
    TSHudMessageAll(0, 0xff, 0, 1, 0x1e, msg);
  }

  switch (self.m_iMode) {
    case 1: {
      // Disasm: [ebx+0x1aa8] → helper struct, then call [helper+0x168].
      // Args (0, m_iTarget - 1). Return value is the entity index
      // passed to FireTarget.
      // TODO(asm-ambiguous): name the actual engine subsystem (likely
      //   a FindEntityByClassname-like lookup).
      const helper = (self as any).__ts_engine_helper as
        (a: number, b: number) => number;
      const targetIdx = helper(0, self.m_iTarget - 1);
      FireTarget(this, targetIdx);
      break;
    }
    case 2: {
      // Disasm pushes the *original* m_iCycleIndex, then increments,
      // then calls FireTarget — so FireTarget sees the pre-increment
      // value. Don't reorder this.
      FireTarget(this, self.m_iCycleIndex);
      self.m_iCycleIndex++;
      if (self.m_iCycleIndex >= self.m_iTarget) {
        self.m_iCycleIndex = 0;
      }
      break;
    }
    default: {
      // Disasm: m_iMode < 1 (incl. m_iMode == 0) and m_iMode > 2 both
      // jump here with -1 pushed.
      FireTarget(this, -1);
      break;
    }
  }
}
