/**
 * CTSPowerUp::WaitTouch — powerup touch handler.
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x00088614 (660 bytes).
 * Demangled: CTSPowerUp::WaitTouch(CBaseEntity*)
 */

// --- Stubs so this file compiles in isolation. In the real codebase
// these come from the engine / DLL headers / Babylon port layer.
declare const CTSPowerUp: any;
declare const CBaseEntity: any;
declare const CBasePlayer: any;
declare const gpGlobals: {
  time: number;
  pStringBase: number;   // offset 0x98 in HLSDK globalvars_t
};
declare const PlayerAddPowerUp: (
  player: CBasePlayer,
  teamAttr: number,
  powerup: CTSPowerUp,
) => number;
declare const CreatePowerUp: (type: number, flags: number) => CTSPowerUp | null;
declare const SetupPowerUp: (
  powerup: CTSPowerUp,
  a: number,
  b: number,
  c: number,
  d: boolean,
) => void;
declare const UTIL_Remove: (entity: CBaseEntity) => void;
declare const TSHudMessageOne: (
  a1: number, a2: number, a3: number,
  a4: number, a5: number,
  msg: string,
  target: any,        // entvars_s*
) => void;
declare const FireTargets: (
  target: string,
  activator: CBaseEntity,
  caller: CBaseEntity,
  useType: number,
  value: number,
) => void;
declare const USE_TYPE: { USE_TOGGLE: number };
declare const RESPAWN_DELAY_FAST: number;     // static double at [GOT-0x6ecd0]
declare const RESPAWN_DELAY_INITIAL: number;   // static double at [GOT-0x6e760]

export function WaitTouch(
  this: CTSPowerUp,
  pEntity: CBaseEntity,
): void {
  // ----------------------------------------------------------------------
  // Early-out: must be an alive player. The asm calls through
  // [pEntity + 0x60] (vtable) at offsets 0xc8 and 0xb4 (= vtable[50] and
  // vtable[45]). In HLSDK those are CBaseEntity::IsPlayer / IsAlive.
  // ----------------------------------------------------------------------
  const vtable: any = (pEntity as any).vtable;
  if (!vtable[0x32](pEntity)) return;        // IsPlayer()
  if (!vtable[0x2d](pEntity)) return;        // IsAlive()

  // ----------------------------------------------------------------------
  // Pickup-eligibility chain. Fields below are best-guess labels for
  // TS-specific offsets; confirm against CBasePlayer / CTSPowerUp in D.4.
  // ----------------------------------------------------------------------
  const playerTeam:  number = (pEntity as any).m_iTeam    ?? 0;  // [esi+0x728]
  const playerClass: number = (pEntity as any).m_iClass   ?? 0;  // [esi+0x730]
  const playerExtra: number = (pEntity as any).m_iClassEx ?? 0;  // [esi+0x724]
  const pev: any             = (pEntity as any).pev;             // *pEntity == pev

  // [ebp+0x84] is one 4-byte field, used two ways in the asm:
  //   - compared to 1  → team indicator
  //   - ANDed with 0x1e6 → bit flags
  // Most likely m_iTeam with overload semantics.
  const powerupAttr: number = (this as any).m_iTeam;             // [ebp+0x84]
  const powerupMode: number = (this as any).m_iMode ?? 0;        // [ebp+0x94]

  // pev->field_180 (TS-specific) tested for bit 0x20 — bypass/admin/etc.
  // TODO(asm-ambiguous): identify which entvars_t/TS field 0x180 is.
  const bypassFlag: boolean = ((pev.field_180 & 0x20) !== 0);

  // Stage 1 (al): team == 0, OR (team == 1 AND powerupAttr == 1 AND class <= 2)
  const stage1 =
    playerTeam === 0 ||
    (playerTeam === 1 && powerupAttr === 1 && playerClass <= 2);

  // Stage 2 (dl): stage1 OR bypassFlag
  const stage2 = stage1 || bypassFlag;

  // Stage 3 (al): stage2 AND playerExtra == 0
  const stage3 = stage2 && playerExtra === 0;

  // Stage 4 (dl): stage3 OR (powerupAttr & 0x1e6) !== 0
  // Saved into edi and used both for the early-out below AND as the
  // starting point for the respawnVariant chain.
  const stage4 = stage3 || (powerupAttr & 0x1e6) !== 0;

  if (!stage4) return;                                              // asm @ 8871d

  // ----------------------------------------------------------------------
  // respawnVariant (edi @ 88723). This is NOT stage1; the asm builds
  // a separate chain from bypassFlag through team/class refinements.
  // ----------------------------------------------------------------------
  const bypassActive     = bypassFlag && playerTeam !== 0; // block 5
  const bypassNotFlagged = bypassActive && (powerupAttr & 0x1e6) === 0; // block 6
  const finalCl =
    (playerTeam === 1)
      ? (bypassNotFlagged && playerClass > 2 ? 1 : 0)               // team==1 path
      : bypassNotFlagged;                                           // team!=1 path
  const respawnVariant = finalCl ? playerTeam : 0;                  // asm @ 8872c

  // ----------------------------------------------------------------------
  // Grant the powerup. PlayerAddPowerUp returns 0 if the player can't
  // accept it (already carrying, etc.).
  // ----------------------------------------------------------------------
  if (!PlayerAddPowerUp(pEntity as CBasePlayer, powerupAttr, this)) return;

  // ----------------------------------------------------------------------
  // If a respawn variant is set, recreate the powerup at the player's
  // origin. CreatePowerUp(type, -1) returns a new CTSPowerUp*; we copy
  // pev->origin (12 bytes = 3 dwords) from pEntity to it via rep movsd.
  // ----------------------------------------------------------------------
  if (respawnVariant !== 0) {
    const newPowerUp = CreatePowerUp(respawnVariant, -1);
    if (newPowerUp) {
      const srcPeV: any = pev; // *pEntity == pEntity.pev
      const dstPeV: any = (newPowerUp as any).pev;
      dstPeV.origin.x = srcPeV.origin.x;
      dstPeV.origin.y = srcPeV.origin.y;
      dstPeV.origin.z = srcPeV.origin.z;
    }
  }

  // ----------------------------------------------------------------------
  // Handle this powerup instance: either remove outright or reschedule.
  // ----------------------------------------------------------------------
  const removeOnPickup: boolean = (this as any).m_bRemove === 0;     // [ebp+0x80]
  if (removeOnPickup) {
    UTIL_Remove(this);
    return;
  }

  const setupOnRespawn: boolean = (this as any).m_bSetupRespawn !== 0; // [ebp+0x81]
  if (setupOnRespawn) {
    // Args (right-to-left pushw/push): bool true, float 0.0, int -1, int 0, this
    SetupPowerUp(this, 0, -1, 0.0, true);
  }

  (this as any).m_flRespawnTime = 0;        // [ebp+0x14]
  (this as any).m_flSomeTime    = 0;        // [ebp+0x18]

  // Mark as taken: pev->field_118 |= 0x80 (likely iuser2 in TS-extended entvars_t)
  // TODO(asm-ambiguous): confirm entvars_t field at 0x118.
  (this as any).pev.field_118 |= 0x80;

  (this as any).field_0c = 0xffff0000;      // [ebp+0xc]
  // TODO: identify the global at [GOT+0x1e18] and preserve the load below.
  const _globalAtGOT1E18: any = (this as any).m_pSomeGlobal ??0;
  (this as any).field_10 = _globalAtGOT1E18; // [ebp+0x10]

  // ----------------------------------------------------------------------
  // Schedule the next-think time. Base = gpGlobals.time; delta depends
  // on powerupMode ([ebp+0x94]):
  //   - mode <= 0   -> + RESPAWN_DELAY_INITIAL (small static double)
  //   - mode 1..10  -> + RESPAWN_DELAY_FAST    (small static double)
  //   - mode > 10   -> + min(mode, 180) (clamped at 0xb4)
  // Stored at pev + 0x104 — NOT HLSDK nextthink (0xfc); TS-extended.
  // ----------------------------------------------------------------------
  const thisPeV: any = (this as any).pev;
  let nextThink: number = gpGlobals.time;
  if (powerupMode > 0) {
    if (powerupMode > 10) {
      nextThink += Math.min(powerupMode, 180);   // clamp at 0xb4
    } else {
      nextThink += RESPAWN_DELAY_FAST;          // [GOT-0x6ecd0]
    }
  } else {
    nextThink += RESPAWN_DELAY_INITIAL;         // [GOT-0x6e760]
  }
  thisPeV.field_104 = nextThink;                // NOT .nextthink

  // ----------------------------------------------------------------------
  // Optional HUD message. pev->field_1d4 is a string-table offset;
  // gpGlobals->pStringBase (offset 0x98) is the base. Last arg to
  // TSHudMessageOne is pEntity's pev (the TOUCHING player's entvars),
  // NOT this->pev. The asm reads pEntity at 8882b and pushes *pEntity.
  // ----------------------------------------------------------------------
  const hudMsgOffset: number | undefined = thisPeV.field_1d4;
  if (hudMsgOffset) {
    TSHudMessageOne(
      0, 0, 0,                            // uchar uchar uchar (3 zero args)
      1, 30,                              // int int (1, 30)
      gpGlobals.pStringBase + hudMsgOffset, // char* format string
      pev,                                // entvars_t* of the TOUCHING player
    );
  }

  // ----------------------------------------------------------------------
  // Optional fire-targets. pev->field_1c8 is a string-table offset.
  // FireTargets called with USE_TOGGLE; activator and caller are both  // `this` (the powerup). Signature has 5 args; cdecl right-to-left push.
  // ----------------------------------------------------------------------
  const targetOffset: number | undefined = thisPeV.field_1c8;
  if (targetOffset) {
    FireTargets(
      gpGlobals.pStringBase + targetOffset,
      this, this,                         // activator & caller
      USE_TYPE.USE_TOGGLE,
      0.0,
    );
  }
}
