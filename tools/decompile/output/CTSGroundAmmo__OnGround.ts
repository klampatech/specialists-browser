/**
 * CTSGroundAmmo::OnGround — Called when the ammo entity has landed on
 * the ground. Configures the entity as a static ground pickup: sets
 * spawnflags for the ground state, marks FL_ONGROUND, tweaks effects,
 * re-applies the current origin to sync the engine edict, sets a small
 * bounding box, and updates a handful of internal class fields.
 *
 * @param this  The CTSGroundAmmo entity instance
 * @returns     void
 *
 * GOT constants resolved from disassembly:
 *   GOT-0x6b68c → maxs constant  (ecx at call = arg3 = vecMax)
 *   GOT-0x6b688 → mins constant  (edx at call = arg2 = vecMin)
 *   GOT+0x20c4 → "ammo on ground" state global (loaded into field_0x18)
 *
 * TODO(D.4): cross-reference [esi+0xc/0x10/0x14/0x18] against other
 *   CTSGroundAmmo methods (WaitThink, WaitTouch, Spawn) to name the
 *   class fields. Likely candidates: m_flWaitUntil / m_iState /
 *   m_color / m_iNextThink.
 *
 * TODO(asm-ambiguous): bit 0x80 on pev.effects is almost certainly
 *   EF_NODRAW (128 in HL1) and bit 0x2 is EF_DIMLIGHT. Confirm against
 *   TS's local effects.h.
 */
export function OnGround(this: any): void {
  const pev = this.pev as any;

  // Ground-state spawnflags.
  pev.spawnflags = 5;

  // FL_ONGROUND = 1.
  pev.flags = 1;

  // Clear EF_NODRAW (bit 0x80), set EF_DIMLIGHT (bit 0x2).
  pev.effects = (pev.effects & ~0x80) | 0x2;

  // Re-apply the current origin so the engine re-syncs the edict's
  // server position from pev (no spatial change, just a sync trigger).
  UTIL_SetOrigin(pev, pev.origin);

  // Small ground-pickup bounding box from two GOT-resident cube
  // constants. The asm replicates each constant across all three Vector
  // components (the "cube mins/maxes" pattern). cdecl push order:
  //   push &maxs (ecx)  ← last in slice = arg3
  //   push &mins (edx)  ← middle = arg2
  //   push pev          ← first     = arg1
  // so this matches HLSDK UTIL_SetSize(pev, mins, maxs).
  const MIN: number = (GOT_BASE - 0x6b688) as any;  // mins constant
  const MAX: number = (GOT_BASE - 0x6b68c) as any;  // maxs constant
  const mins: [number, number, number] = [MIN, MIN, MIN];
  const maxs: [number, number, number] = [MAX, MAX, MAX];
  UTIL_SetSize(pev, mins, maxs);

  // Internal class bookkeeping:
  //   field_0x14 = 0xffff0000  (packed word — likely a state flag)
  //   field_0x18 = GOT+0x20c4  (32-bit global — likely an entity counter
  //                              or shared ammo state)
  //   field_0x0c = 0           (cleared timer / state word)
  //   field_0x10 = 0           (cleared timer / state word)
  this.field_0x0c = 0;
  this.field_0x10 = 0;
  this.field_0x14 = 0xffff0000;
  this.field_0x18 = (GOT_BASE + 0x20c4) as any;
}

// Ambient declarations so the snippet type-checks in isolation. In the
// real codebase these come from engine SDK + TS mod headers.
declare const UTIL_SetOrigin: (pev: any, origin: any) => void;
declare const UTIL_SetSize: (
  pev: any,
  mins: [number, number, number],
  maxs: [number, number, number]
) => void;
declare const GOT_BASE: number;
