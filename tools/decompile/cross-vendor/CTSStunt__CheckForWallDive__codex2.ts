// D.3.3 — CTSStunt gameplay method (decompiled from ts_i386.so).
//
// Stub declarations so this file compiles in isolation. Real types
// live in `ts-types/` (D.5 work) and engine/mod header mirrors.
declare const wallDiveTraceScale: number;
declare const wallNormalZMin: number;     // asm: [ebx-0x6f010] (or [ebx-0x6de40]; see below)
declare const wallNormalZMax: number;     // asm: [ebx-0x6de40] (or [ebx-0x6f010]; see below)
declare const wallDiveVelocityZThreshold: number; // asm: [ebx-0x6c32c]
declare const IGNORE_MONSTERS: 1;

declare const g_vecForward: { x: number; y: number; z: number };
declare const g_vecRight:   { x: number; y: number; z: number };
declare const g_vecUp:      { x: number; y: number; z: number };

declare function UTIL_MakeVectors(v: unknown): void;
declare function UTIL_TraceLine(
  vecStart: unknown,
  vecEnd: unknown,
  fIgnMonsters: number,
  pentIgnore: unknown,
  pTraceResult: unknown,
): void;

declare class TraceResult {
  flFraction: number;
  vecEndPos: { x: number; y: number; z: number };
  vecPlaneNormal: { x: number; y: number; z: number };
  // ... rest of HLSDK TraceResult
}

declare class CTSStunt {
  m_pPlayer: {
    pev: {
      // HLSDK + TS-shifted offsets observed in the disassembly:
      //   TS origin is at pev+0x8 (HLSDK: 0xc — TS appears to shift
      //   the start of Vector fields earlier by 4 bytes; same shift
      //   observed for velocity at pev+0x20, HLSDK: 0x24).
      origin:  { x: number; y: number; z: number };
      velocity:{ x: number; y: number; z: number };
      // TODO(asm-ambiguous): verify; asm uses pev+0x74 for the view
      // angles passed to UTIL_MakeVectors. HLSDK v_angle is at 0x118.
      // May be a TS Player-class extension slot.
      v_angle: { x: number; y: number; z: number };
      euser1: unknown;
      // TODO(asm-ambiguous): asm tests BYTE [pev+0x1a5] & 0x2, which
      // equals bit 9 of the DWORD at pev+0x1a4. HLSDK flags is at
      // 0x104, so TS likely uses a custom field or has reordered
      // entvars_t. The 0x200 (= bit 9) mask is the TS-side
      // "FL_ONWALL" assumption — verify against `strings-n5.txt`
      // and `FL_*` enum dumps (D.4 work).
      flags: number;
    };
  };
}

/**
 * CTSStunt::CheckForWallDive — probes whether the player can initiate
 * a wall-dive stunt right now.
 *
 *  Asm flow summary:
 *    1. if (pev+0x1a5 & 0x2) return false         // already on a wall
 *    2. UTIL_MakeVectors(pev+0x74)                // refresh engine v_*
 *    3. vecEnd = origin - scale * v_forward       // asm: scale*[ebx-0x6f068]
 *    4. UTIL_TraceLine(origin, vecEnd, IGNORE_MONSTERS, pev->euser1, &tr)
 *    5. if (tr.flFraction >= 1.0) return false
 *    6. if (planeNormal.z < lower || planeNormal.z > upper) return false
 *    7. if (velocity.z <= threshold) return false
 *    8. return true
 *
 * @returns true if a wall dive is feasible, false otherwise.
 */
export function CheckForWallDive(this: CTSStunt): boolean {
  // Gate 1: bail if already on a wall.
  // TODO(asm-ambiguous): confirm flag offset / "FL_ONWALL" naming in TS.
  const pev = this.m_pPlayer.pev;
  if ((pev.flags & 0x200) !== 0) return false;

  // Refresh the engine's g_vecForward / g_vecRight / g_vecUp from the
  // player's view angles.
  UTIL_MakeVectors(pev.v_angle);

  // Gate 2: cast a trace straight ahead of the player, ignoring monsters.
  // The trace endpoint is origin − scale·g_vecForward, with `scale` taken
  // from the negative-distance global at [ebx−0x6f068] (the negative
  // sign pushes the endpoint forward along g_vecForward).
  // TODO(asm-ambiguous): exact float value at [ebx-0x6f068]; sign + magnitude
  // (used in the negate-then-fsub pattern at 8ada0…8adc1).
  // TODO(asm-ambiguous): TS origin/velocity offsets shifted ~−4 bytes vs
  // HLSDK entvars_t; see CTSStunt.pev type declaration above.
  const end = {
    x: pev.origin.x - wallDiveTraceScale * g_vecForward.x,
    y: pev.origin.y - wallDiveTraceScale * g_vecForward.y,
    z: pev.origin.z - wallDiveTraceScale * g_vecForward.z,
  };

  const tr = new TraceResult();
  UTIL_TraceLine(
    pev.origin,
    end,
    IGNORE_MONSTERS,  // = 1
    pev.euser1,       // asm: [pev+0x208] == HLSDK pev->euser1. ✓
    tr,
  );

  // Gate 3: trace must have hit something within the scaler window.
  if (tr.flFraction >= 1.0) return false;

  // Gate 4: hit surface must be roughly vertical (plane normal Z within
  // the open interval (wallNormalZMin, wallNormalZMax)).
  // TODO(asm-ambiguous): exact thresholds at [ebx−0x6f010] and [ebx−0x6de40];
  // the asm does a > upper (jae) then a <= lower (test ah,0x41 / jne) check.
  // TODO(asm-ambiguous): plane-normal field accessed as [esp+0x5c] post-call;
  // not pinned to a fixed offset within `TraceResult` in TS.
  const nz = tr.vecPlaneNormal.z;
  if (nz >= wallNormalZMax || nz <= wallNormalZMin) return false;

  // Gate 5: player must be moving downward fast enough (or upward fast
  // enough?) past the threshold to "stick" the dive.
  // TODO(asm-ambiguous): exact float at [ebx−0x6c32c].
  // Asm enforces velocity.z > threshold (using fcomp + test ah,0x41 +
  // jne → al=0 on failure).
  if (pev.velocity.z <= wallDiveVelocityZThreshold) return false;

  return true;
}
