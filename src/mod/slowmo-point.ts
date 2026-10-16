/**
 * The Specialists mod — CTSSlowMotionPoint entity (D.4.5 COMPLETE).
 *
 * Source: ts/dlls/ts_i386.so (NOT stripped, 32-bit ELF).
 * Class: `CTSSlowMotionPoint`.
 * Reference: cross-vendor review (codex decompile + claude review).
 *
 * 5 of 5 public methods decompiled. Methods appear in source-code
 * order: factory first, lifecycle methods after.
 *
 * This entity represents a "slow-motion zone" — a per-player area where
 * slow-mo applies. Distinct from CTSSlowMotion (the global slow-mo
 * trigger); CTSSlowMotionPoint is per-player/per-radius.
 *
 * Class state (consolidated):
 *   pev                       (this+0x00)   — entvars_t*
 *   m_iAffectedPlayerCount    (this+0xe8)   — int
 *   m_flActivationTime        (this+0xec)   — float
 *   m_flDeactivationTime / m_flEndTime (this+0xf0) — float
 *   m_bIsActive / m_bActive   (this+0xf4)   — byte flag
 *   m_affectedPlayers[33]     (this+0x64..0xe7) — player-pointer array
 *   m_flSlowAmount            — float, set by ActivateSlow
 *   m_bReset                  — bool, set by ActivateSlow
 *
 * Methods included (in this file's order):
 *   1. CreateSlowMotionPoint  — factory (alloc + position + ActivateSlow)
 *   2. Spawn                  — entity spawn (zeroes state)
 *   3. ActivateSlow           — start slow-motion (per-zone config)
 *   4. WaitThink              — per-tick apply slowmo to players in zone
 *   5. DeactivateSlow         — stop slow-motion (clears state)
 */

/**
 * CTSSlowMotionPoint::CreateSlowMotionPoint — static factory that
 * allocates a new CTSSlowMotionPoint via GetClassPtr, plants it at
 * `position`, runs Spawn(), then activates slow-mo. Returns null on
 * allocation failure after broadcasting an HUD-centerprint error.
 *
 * Demangled: `CTSSlowMotionPoint::CreateSlowMotionPoint(Vector, float, float, float, bool)`
 * Static method — no implicit `this` in the C++ signature.
 *
 * Disassembly walkthrough (ts/dlls/ts_i386.so @ 0x000614d8, 140 bytes):
 *   1. GetClassPtr(0) — engine-side entity allocation. The trailing
 *      `0x0` push is a void* arg whose meaning is unclear; see
 *      `GetClassPtr__H1Z18CTSSlowMotionPoint_PX01_PX01`.
 *   2. Null-check the result; on failure, broadcast via
 *      UTIL_ClientPrintAll(msg_type=3, <static-error-string>,
 *      4×0[varargs]) — the GOT-relative error string at GOT-0x6ecb0
 *      is unknown (likely an "out of edicts" diagnostic).
 *   3. rep movsd 3 dwords from the position Vector into
 *      `pev->origin` (pev is at this+0x00, origin at pev+0x08).
 *   4. Virtual call through `*(this+0x60) + 0x24` — by elimination
 *      this is most plausibly CBaseEntity::Spawn(); the class's vtable
 *      has 70 entries so the slot index is not pinpointable without
 *      reading `__vt_18CTSSlowMotionPoint` directly.
 *   5. cdecl call to ActivateSlow(this, duration, slowAmount, radius,
 *      bool). Note `push ax` (not `push al`) — compiler packs the
 *      1-byte bool into a 2-byte stack slot.
 *   6. Return the new entity on success, 0 on failure.
 */
export function CreateSlowMotionPoint(
  position: { x: number; y: number; z: number },
  duration: number,
  slowAmount: number,
  radius: number,
  active: boolean
): any | null {
  // 1. Engine-side entity allocation.
  //    Disassembly pushes a literal 0x0 before the call; we omit it
  //    here for clarity but the meaning (parent ent? init ptr?) is
  //    TODO(asm-ambiguous).
  const point: any = (globalThis as any).GetClassPtr?.(CTSSlowMotionPoint);

  // 2. Allocation failure → broadcast error & return null.
  if (point === null || point === undefined) {
    // TODO(asm-ambiguous): error string is a static C string at
    // GOT-0x6ecb0 in ts_i386.so; msg_type 3 = HUD center print.
    // The 4 trailing zero pushes are likely unused printf-varargs.
    (globalThis as any).UTIL_ClientPrintAll?.(3, /* TODO: GOT-0x6ecb0 */ "");
    return null;
  }

  // 3. Copy position Vector (12 bytes / 3 dwords) into pev->origin.
  //    cld; mov ecx,3; rep movsd → field-by-field copy in TS.
  point.pev.origin.x = position.x;
  point.pev.origin.y = position.y;
  point.pev.origin.z = position.z;

  // 4. Virtual Spawn() — *(this+0x60) is vfptr, target at byte offset
  //    0x24 (= vtable[9] for 4-byte ptrs). Naming it Spawn() is
  //    best-effort: not directly verifiable from disassembly alone.
  //    TODO(vtable-slot): confirm against __vt_18CTSSlowMotionPoint.
  point.Spawn?.();

  // 5. Activate slow-mo effect. The disassembly packs the bool into a
  //    2-byte `ax` slot via `push ax` — TS just passes the bool.
  point.ActivateSlow?.(duration, slowAmount, radius, active);

  return point;
}

// Type placeholders (would be imported from the project's class definitions).
declare const CTSSlowMotionPoint: any;

// ======================================================================
// Spawn
// ======================================================================

/**
 * CTSSlowMotionPoint::Spawn — initializes the slow-motion trigger zone entity:
 * classname, point bounds, origin, render mode, custom state fields, scheduled
 * first think, and zeroed affected-player tracking buffer.
 *
 * @param this  The CTSSlowMotionPoint entity instance
 * @returns     void
 */
export function Spawn(this: CTSSlowMotionPoint): void {
  // PIC-resolved classname string ("slowmo_point")
  this.pev.classname = "slowmo_point";
  // TODO(asm-ambiguous): exact PIC constant derived from GOT - 0x6eea7 - *(*globalPtr + 0x98)

  // mins = maxs = zero vector → point entity, no extent
  const mins = new Vector(0, 0, 0);
  const maxs = new Vector(0, 0, 0);
  UTIL_SetSize(this.pev, mins, maxs);

  // Origin = pev->origin (already engine-set; no offset tweak)
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // Render mode: invisible / semi-transparent trigger zone
  this.pev.rendermode = 0;     // kRenderNormal
  this.pev.renderfx = 0;        // kRenderFxNone
  this.pev.renderamt = 0x80;    // semi-transparent (128)
  // TODO(asm-ambiguous): pev offset 0x118 — confirm field name against SPEC.md

  // Custom CTSSlowMotionPoint state fields (offsets 0x0c..0x18 on `this`)
  this.m_iAffectedPlayerIndex = -1;                       // 0x0c: no player yet
  this.m_flCurrentSlowAmount = cvar_slow_amount.value;    // 0x10: cached cvar value at spawn
  this.m_flStartTime = 0;                                  // 0x14
  this.m_flEndTime = 0;                                    // 0x18

  // Schedule first think: gpGlobals->time + small delay constant
  this.pev.nextthink = gpGlobals.time + NEXT_THINK_DELAY;
  // TODO(asm-ambiguous): NEXT_THINK_DELAY value is the QWORD at [ebx-0x6ecd8]

  // Zero out the affected-player tracking buffer (132 bytes / 33 DWORDs at offset 0x64..0xE7)
  this.m_affectedPlayers.fill(0);

  // Zero out additional state fields (offsets 0xE8..0xF4)
  this.m_iAffectedPlayerCount = 0;     // 0xE8
  this.m_flActivationTime = 0;          // 0xEC
  this.m_flDeactivationTime = 0;        // 0xF0
  this.m_bActive = false;                // 0xF4 (byte)
}

// ======================================================================
// ActivateSlow
// ======================================================================

// Stubs for isolation — these come from the engine bindings module
// and the reconstructed CTSSlowMotionPoint class respectively.
declare const gpGlobals: { time: number };

/**
 * CTSSlowMotionPoint::ActivateSlow — arms this slow-motion point entity
 * with the given parameters. Computes the absolute start time as
 * `gpGlobals.time + flStartTime` and stores the duration, slow amount,
 * and reset flag on the entity.
 *
 * Field offsets inferred from the disassembly (TODO: confirm names
 * against TS source if/when it becomes available):
 *   +0xe8 m_flStartTime  (float, absolute start time)
 *   +0xec m_flDuration   (float)
 *   +0xf0 m_flSlowAmount (float)
 *   +0xf4 m_bReset       (bool)
 */
export function ActivateSlow(
  this: any, // CTSSlowMotionPoint — class reconstructed separately
  flDuration: number,
  flStartTime: number,
  flSlowAmount: number,
  bReset: boolean,
): void {
  this.m_flStartTime = gpGlobals.time + flStartTime;
  this.m_flDuration = flDuration;
  this.m_flSlowAmount = flSlowAmount;
  this.m_bReset = bReset;
}

// ======================================================================
// WaitThink
// ======================================================================

/**
 * CTSSlowMotionPoint::WaitThink — per-tick think handler for a slow-motion zone.
 *
 * Each call:
 *   1. Reschedules itself to run again at gpGlobals.time + 0.1.
 *   2. If m_flEndTime has passed, calls DeactivateSlow and removes this entity.
 *   3. Iterates connected players (1..gpGlobals.maxClients). For each that
 *      passes two state checks, traces from the zone origin to the player's
 *      slightly-predicted origin. If LOS is clear, applies slow-motion to
 *      that player and records them in m_pAffectedPlayers[slot].
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x61728 (386 bytes).
 */

// External references (declare for compile-in-isolation).
declare const gpGlobals: any;
declare function UTIL_Remove(entity: any): void;
declare function UTIL_PlayerByIndex(idx: number): any;
declare function UTIL_TraceLine(...args: any[]): void;
declare function engineSlotLookup(arg: any): number;
interface Vector { x: number; y: number; z: number; }
interface TraceResult { flFraction: number; /* ... */ }

export function WaitThink(this: any): void {
  // (1) Schedule next think ~0.1s out
  this.pev.nextthink = gpGlobals.time + 0.1;

  // (2) Lifetime expired — retire the zone
  if (this.m_flEndTime < gpGlobals.time) {
    this.DeactivateSlow();
    UTIL_Remove(this);
    return;
  }

  // (3) For each player, apply slow-motion if they're visible from the zone
  for (let i = 1; i <= gpGlobals.maxClients; i++) {
    const player: any = UTIL_PlayerByIndex(i);
    if (!player) continue;

    // Two vtable calls through the player's vtable pointer at +0x60.
    // Pattern: "alive AND not already in slow-motion".
    // TODO(asm-ambiguous): exact vtable names / indices to be confirmed.
    const vtable: any = player[0x60];
    if (vtable[0xc8 / 4](player) === 0) continue;   // ~ IsAlive
    if (vtable[0x18 / 4](player) !== 0) continue;   // ~ !IsInSlowMotion

    // LOS-trace from the zone origin to a one-tick-ahead player position.
    // Floats at pev+0x174/0x178/0x17c form a delta vector (semantically:
    // per-tick velocity). TODO(asm-ambiguous): confirm field meaning.
    const start: Vector = this.pev.origin;
    const end: Vector = {
      x: player.pev.origin.x + player.pev[0x174],
      y: player.pev.origin.y + player.pev[0x178],
      z: player.pev.origin.z + player.pev[0x17c],
    };
    const result: TraceResult = {};
    UTIL_TraceLine(
      start,
      end,
      /*ignoreMonsters*/ 1,
      /*ignoreGlass*/    1,
      /*ignoreEnt*/      null,
      result,
    );
    if (result.flFraction < 1.0) continue; // LOS blocked

    // Apply slow-motion to this player for one tick.
    // Cdecl args (pushed R→L): 0 (force), this.m_flSlowAmount, player.
    // TODO(asm-ambiguous): vtable[5] identity.
    vtable[0x14 / 4](player, this.m_flSlowAmount, 0);

    // Mirror zone's active flag onto the player's slow-motion flag.
    // [edi+0xf4]=this.m_bIsActive, [esi+0x175]=player.m_bIsInSlowMotion.
    player.m_bIsInSlowMotion = (this.m_bIsActive !== 0);

    // Engine slot-lookup: maps player.pev+0x208 -> 0..0x20 slot index.
    // Disassembly: call [ebx+0x1aa8][0x11c](player.pev+0x208).
    // TODO(asm-ambiguous): exact engine function / what pev+0x208 holds.
    const slot: number = engineSlotLookup(player.pev[0x208]);
    if (slot > 0x20) continue;
    this.m_pAffectedPlayers[slot] = player;
  }
}

// ======================================================================
// DeactivateSlow
// ======================================================================

/**
 * CTSSlowMotionPoint::DeactivateSlow — For each entity currently being slowed
 * by this point, restore its normal scale (1.0) via a per-entity vtable
 * dispatch and null the tracking slot. Then zero the entire 132-byte
 * tracking buffer.
 *
 * @param this  The CTSSlowMotionPoint entity instance
 * @returns     void
 */
export function DeactivateSlow(this: any): void {
  // Per-point tracking layout (inferred from asm offsets + loop bounds):
  //   this+0x60:   4 bytes  -- header / count field (untouched in this fn)
  //   this+0x64: 132 bytes  -- array of 33 entity pointers (33 * 4 = 0x84)
  //
  // TODO(asm-ambiguous): the slot count (33) is inferred from the asm loop
  // counter (init 0, +=3 per iteration, jle 0x20 -> 11 iterations * 3 slots)
  // and cross-checked with the trailing rep stosd length of 0x21 dwords.
  // TODO(asm-ambiguous): the field name `affectedEntities` is an inferred
  // convenience name; the actual C struct field is at offset 0x64 and
  // contains 33 entity pointers (edict_t*).
  const NUM_SLOTS = 33;

  // The compiler unrolls 3 slots per iteration (esi/edi/ebp all walk the
  // same array in lockstep, advancing by 0xc per pass). We just iterate
  // once per slot — the unroll is a perf choice, not behavior.
  for (let i = 0; i < NUM_SLOTS; i++) {
    const ent = this.affectedEntities[i];

    if (ent) {
      // Per-entity dispatch (asm):
      //   edx = *(ent + 0x60)             // per-entity method table
      //   eax = ent
      //   push 0                          // arg3
      //   push 0x3f800000                 // arg2 == 1.0f
      //   push eax                        // arg1 (ent)
      //   call DWORD PTR [edx + 0x14]     // table[5]
      //   then [this->slot] = 0
      //
      // TODO(asm-ambiguous): the meaning of the table at ent+0x60 and the
      // specific target of the call at index 0x14 are engine-specific and
      // not visible in this slice. The (ent, 1.0f, 0) signature strongly
      // suggests "restore normal scale immediately" — likely a SlowMotion-
      // aware SetSpeed / RestoreTimeScale / SetNextThink — but the exact
      // method name is inferred, not confirmed.
      const fn: (self: any, scale: number, delay: number) => void =
        ent[0x60][0x14];
      fn(ent, 1.0, 0);

      // Clear the tracking slot — asm writes 0 to [ebp+0x4] after the call.
      this.affectedEntities[i] = 0;
    }
  }

  // Final memset: 0x21 dwords (132 bytes) of zero starting at this+0x64.
  // Translates to `memset(this+0x64, 0, 132)`. The per-slot clears above
  // already nulled the previously-non-null entries; this catches null-on-
  // entry slots too and ensures the buffer is clean.
  for (let i = 0; i < NUM_SLOTS; i++) {
    this.affectedEntities[i] = 0;
  }
}
