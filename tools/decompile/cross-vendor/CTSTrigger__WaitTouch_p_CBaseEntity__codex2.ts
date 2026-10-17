// CTSTrigger::WaitTouch — handle an entity touching a TS trigger.
//
// Validates the touching entity (must be an alive player matching the
// optional team filter and "must have flag" requirement), fires the
// trigger's `target` string (USE_TOGGLE), broadcasts an HUD message
// derived from `message` + the touching player's netname, then
// reschedules the next trigger time using `m_delay` clamped by a cvar
// floor.
//
// Field offsets (from disassembly @ 0x60ad8, TS-i386):
//   this->m_nextTriggerTime @ 0x104
//   this->m_iTeamFilter     @ 0x108
//   this->m_delay           @ 0x10c
//   pev->spawnflags         @ 0x1a0  (bit 0x8 = "must have flag")
//   pev->target             @ 0x1c8
//   pev->netname            @ 0x1d0
//   pev->message            @ 0x1d4
//   gpGlobals->time         @ 0x00
//   gpGlobals->pStringBase  @ 0x98   // TODO: vanilla HLSDK has 0x54;
//                                    //  TS likely extends globalvars_t.
//
// External type references are typed as `any` so this function compiles
// in isolation. Concrete types are wired up in D.4 / D.5.

// ── external symbol stubs (replace with real imports in D.4) ──────
type CTSTrigger = any;
type CBaseEntity = any;
type CTSGameRules = any;
declare const CTSGameRules_: { GetTeamIndex(a: any, b: any): number };
declare const HaveFlag: (e: CBaseEntity) => boolean;
declare const FireTargets: (
  target: string, pActivator: CBaseEntity, pCaller: CBaseEntity,
  useType: number, value: number
) => void;
declare const TSHudMessageAll: (
  channel: number, r: number, g: number, b: number,
  x: number, y: number, msg: string
) => void;
declare const STRING: (offset: number) => string;
// format(...) is a sprintf-style helper that returns a string,
// *not* C sprintf. The disassembly uses a stack buffer; the TS
// abstracts that into a return value.
declare function format(fmt: string, ...args: any[]): string;
declare enum USE_TYPE { USE_OFF = 0, USE_ON = 1, USE_SET = 2, USE_TOGGLE = 3 }
declare const gpGlobals: { time: number };
// TODO(asm-ambiguous): cvar name TBD. Disassembly has only the GOT
// offset [ebx-0x6f010]. Check tools/decompile/strings-n5.txt for
// candidates (e.g. slowamt, ts_slowmotion).
declare const waitFloor: number;
// TODO(asm-ambiguous): cvar name TBD. Disassembly has [ebx+0x14f0].
declare const g_teamCvarName: string;

export function WaitTouch(this: CTSTrigger, pEntity: CBaseEntity): void {
  // Bail out if still inside the wait window.
  //   fcomp [gpGlobals.time]; test ah,0x41; je <end>
  //   → jumps when st(0) > src, i.e. m_nextTriggerTime > gpGlobals.time.
  if (this.m_nextTriggerTime > gpGlobals.time) return;

  // Two virtual calls on pEntity (vtable pointer at [pEntity+0x60]).
  // The touching entity must be a player AND alive.
  //   vcall 0xc8 → IsPlayer()-like (returns ptr or null)
  //   vcall 0xb4 → IsAlive()-like  (returns 0/1)
  // TODO(asm-ambiguous): exact class hierarchy placing these at these
  // vtable slots isn't visible from this chunk.
  if (!pEntity.IsPlayer()) return;
  if (!pEntity.IsAlive()) return;

  // Team filter (-1 == "any team").
  let teamMatches = false;
  if (this.m_iTeamFilter === -1) {
    teamMatches = true;
  } else {
    // pEntity.TeamName() (vtable 0xd0) returns the entity's team-name
    // string; GetTeamIndex maps it to an index using the global
    // team-cvar name. C call shape: GetTeamIndex(cvarName, teamName).
    // TODO(asm-ambiguous): the demangled name lists only one PCc for
    // GetTeamIndex; the second arg is inferred from the disassembly.
    const teamName = pEntity.TeamName();
    const teamIndex = CTSGameRules_.GetTeamIndex(g_teamCvarName, teamName);
    if (this.m_iTeamFilter === teamIndex) {
      teamMatches = true;
    }
  }

  // "must have flag" spawnflag (bit 0x8 at pev+0x1a0).
  if ((this.pev.spawnflags & 0x8) !== 0) {
    if (!HaveFlag(pEntity)) return;
  }

  // If team matched and a target string is set, fire USE_TOGGLE.
  //   pActivator = pCaller = this.
  //   FireTargets(char const*, CBaseEntity*, CBaseEntity*, USE_TYPE, float)
  // — 5 args, despite the demangler only showing 4.
  if (teamMatches && this.pev.target !== 0) {
    FireTargets(
      STRING(this.pev.target),
      this,
      this,
      USE_TYPE.USE_TOGGLE,
      0.0
    );
  }

  // If a HUD message is set, format it (using `message` as the format
  // string and the touching player's netname as the only variadic arg)
  // and broadcast it to all players.
  if (this.pev.message !== 0) {
    const msg = format(
      STRING(this.pev.message),
      STRING(pEntity.pev.netname)
    );
    // TSHudMessageAll(channel, r, g, b, x, y, msg) — TS-specific layout.
    // Args decoded from the disassembly pushes (right-to-left):
    //   0x0   → channel
    //   0xff  → r
    //   0x0   → g
    //   0x8   → b
    //   0x1e  → x (30)
    //   msg   → message buffer
    TSHudMessageAll(0, 0xff, 0, 0x8, 0x1e, msg);
  }

  // Reschedule: m_nextTriggerTime = gpGlobals.time + max(m_delay, cvar_floor)
  // The FPU dance (fcom cvar; jae; fstp st(0); fld cvar; faddp) is the
  // standard `max(a, b)` pattern.
  const nextDelay = (this.m_delay >= waitFloor) ? this.m_delay : waitFloor;
  this.m_nextTriggerTime = gpGlobals.time + nextDelay;
}
