/**
 * The Specialists mod — CTSSlowMotion entity (D.4.1 COMPLETE).
 *
 * Source: ts/dlls/ts_i386.so (NOT stripped, 32-bit ELF).
 * Class: `CTSSlowMotion`.
 * Reference: cross-vendor review (codex decompile + claude review).
 *
 * 11 of 11 public methods decompiled. Methods appear here in source-code
 * order (Spawn first, lifecycle methods in between, ObjectCaps last).
 *
 * Class state (consolidated across all methods — see each function's
 * review doc in tools/decompile/cross-vendor/<name>__claude-review.md):
 *   pev                          (this+0x00)   — entvars_t*, set by Spawn
 *   m_iDeactivateFlag            (this+0x0c)   — float? (Use writes 0xffff0000)
 *   m_flSlowEndTime              (this+0x10)   — float, gpGlobals.time-based
 *   m_bSlowActive                (this+0x64)   — byte flag
 *   m_fNextThink                 (this+0x68)   — float, scheduler next-think time
 *   m_affectedEntities[33]       (this+0x70)   — edict-pointer array, 132 B
 *   m_flSlowAmount               (this+0xf4)   — float, from spawn distance calc
 *   m_iUseCount / m_iHasBeenUsed (this+0x100)  — int (use-counter / "has been used" flag)
 *   m_flSlowAmt                  (this+0xf8)   — float, set by KeyValue "slowamt"
 *   m_flSlowTime                 (this+0xfc)   — float, set by KeyValue "slowtime"
 *   m_SaveData[32]               (class-level) — save/load scratch (offset 0x101140)
 *
 * Engine globals accessed (via GOT, see disassembly comments):
 *   gpGlobals                    (ebx+0x1600)  — engine globals struct
 *   Engine.SetModel              (ebx+0x1aa8)  — engine function table
 *   NEXT_THINK_DELAY             (constant)     — scheduler tick
 *   RENDER_MODE                  (constant)     — render mode bitfield
 *   CLASS_ID_SLOWMOTION          (constant)     — engine class id
 *   slowamt                      (cvar)         — set by KeyValue
 *   slowtime                     (cvar)         — set by KeyValue
 *
 * Cross-vendor review files for each function:
 *   tools/decompile/cross-vendor/CTSSlowMotion__<Method>__{codex,claude,claude-review}.{ts,md}
 *
 * Methods included (in this file's order):
 *   1. Spawn                     — entity creation
 *   2. KeyValue                  — map key-value parsing
 *   3. Use                       — player-trigger handler
 *   4. ActivateSlow              — TS gameplay (slowmo on)
 *   5. DeactivateSlow            — TS gameplay (slowmo off)
 *   6. CheckPlayersDistance      — TS gameplay (range check)
 *   7. WaitThink                 — TS gameplay (scheduler)
 *   8. WaitTouch                 — TS gameplay (touch handler)
 *   9. Save                      — save-game serialization
 *  10. Restore                   — save-game deserialization
 *  11. ObjectCaps                — engine capability flags
 *
 * Next: CTSSlowMotionPoint family (D.4.1 follow-up, 5 methods).
 */

/**
 * CTSSlowMotion::Spawn — initialize a slow-motion trigger entity.
 *
 * Sets the class identifier, model string, bounding box, origin,
 * collision and movement flags, initial state, and schedules the
 * first think. Reads spawn flags for behavior options and
 * optionally calls ActivateSlow if the "Start On" flag (0x1) is
 * set.
 *
 * Field offsets follow the TS mod's non-standard entvars_t layout.
 * Names marked TODO must be verified against the actual class
 * definition (D.4 cross-references).
 *
 * @param this  The CTSSlowMotion entity instance
 * @returns     void
 */
export function Spawn(this: any /* TODO: CTSSlowMotion */): void {
  // PIC / GOT base established by the prologue. Globals via [ebx + offset]:
  //   [ebx+0x1600] → pointer to engine globals struct (gpGlobals-like)
  //   [ebx+0x1aa8] → engine function table
  //   [ebx+0x1540] → render-mode constant
  //   [ebx-0x6f010] → NEXT_THINK_DELAY (double, value unverified)
  //   [ebx-0x6eeb5] → used in the classname computation

  // TODO: import / declare from project sources; any-stubs for isolation.
  const ENGINE_GLOBALS_PTR: any = null;       // [ebx+0x1600] deref
  const ENGINE_FUNCTIONS: any[] = [];         // [ebx+0x1aa8]
  const NEXT_THINK_DELAY: number = 0;         // [ebx-0x6f010] — TODO: verify
  const RENDER_MODE: number = 0;             // [ebx+0x1540]
  const CLASS_ID_SLOWMOTION: number = 0;      // computed from [ebx-0x6eeb5]

  const pev: any = this.pev;

  // 1. Set class identifier. Value = (GOT-relative code addr)
  //    - (*gpGlobals_struct)[0x98].
  //    TODO(asm-ambiguous): encoding is opaque without engine source.
  pev.classname = CLASS_ID_SLOWMOTION;

  // 2. Call ENGINE_FUNCTIONS[2] (offset 0x8 / 4-byte-fn-ptr = index 2).
  //    Args: (pev+0x208 aux string, pev->model + engine_state_offset).
  //    engine_state_offset = (*gpGlobals)[0x98].
  //    pev->model = pev+0xb8 in this build.
  //    TODO(asm-ambiguous): pev+0x208 is most likely pev->noise2 or  //      another aux string field; the engine_state_offset's purpose
  //      is unclear; the called function's signature isn't a standard
  //      HLSDK enginefuncs_t entry.
  const engineStateOffset =
    ((ENGINE_GLOBALS_PTR as any)[0x98] as number) | 0;
  ENGINE_FUNCTIONS[2](
    /* pev+0x208 */ null,                    // TODO: aux string field
    (pev.model as number) + engineStateOffset
  );

  // 3. Set bounding box. UTIL_SetSize(pev, mins, maxs).
  //    mins/maxs are at pev+0xdc and pev+0xe8 in this build.
  //    TODO(asm-ambiguous): these offsets don't match standard HLSDK
  //      entvars_t; they're likely vuser3/vuser4 or TS-specific.
  UTIL_SetSize(pev, /* pev+0xdc */ null, /* pev+0xe8 */ null);

  // 4. Snap origin to pev->origin (offset 0x8).
  UTIL_SetOrigin(pev, pev.origin);

  // 5. Set collision and movement flags.
  //    TODO(asm-ambiguous): offsets don't match standard HLSDK entvars_t.
  pev.flags |= 0x80;        // FL_PARTIALGROUND or similar; offset 0x118
  pev.solid = 1;            // SOLID_BSP; offset 0x10c
  pev.movetype = 5;         // MOVETYPE_FLY; offset 0x108

  // 6. Initialize instance fields.
  //    TODO: verify names against CTSSlowMotion class definition.
  this.m_iWaitCount = 0;          // offset 0x14 (int)
  this.m_iPlayerCount = 0;        // offset 0x18 (int)
  this.m_color = 0xffff0000;      // offset 0x0c (RGBA packed: B=0xff, A=0xff)
  this.m_renderMode = RENDER_MODE;// offset 0x10
  this.m_iState = 0;              // offset 0x68 (int)
  this.m_bActive = false;         // offset 0x64 (byte)

  // 7. Schedule next think. Both pev->nextthink and m_flActivateTime
  //    are set to gpGlobals->time + NEXT_THINK_DELAY.
  //    TODO(asm-ambiguous): pev->nextthink offset (0x104) doesn't match
  //      standard HLSDK entvars_t; verify.
  const thinkTime = ENGINE_GLOBALS_PTR.time + NEXT_THINK_DELAY;
  pev.nextthink = thinkTime;        // offset 0x104
  this.m_flActivateTime = thinkTime; // offset 0x6c

  // 8. Zero the player tracking array (33 dwords at offset 0x70).
  //    TODO: verify size; likely MAX_PLAYERS (32) + 1 sentinel.
  for (let i = 0; i < 33; i++) {
    (this.m_pTrackedPlayers as any[])[i] = null;
  }

  // 9. Compute distance between two vectors at pev+0xc4 and pev+0xd0.
  //    Store as int (truncated) in m_iMaxDistance (offset 0xf4).
  //    ⚠️ TODO(asm-ambiguous): the disassembly emits `fmulp st(1), st`
  //      after the sqrt that multiplies the distance by a leftover
  //      FPU value from the next_think setup (NEXT_THINK_DELAY).
  //      The value actually stored is (int)(distance * NEXT_THINK_DELAY),
  //      not just (int)distance. Codex1 assumed "the slot holds 1.0
  //      in the normal case" but this isn't justified. The next_think
  //      delay constant is plausibly 1.0 (TS-specific for this entity)
  //      but more commonly 0.1 (10Hz think rate) — needs verification.
  //    TODO(asm-ambiguous): pev+0xc4 / pev+0xd0 are likely vuser1 / vuser2.
  const dx = (pev.v2x as number) - (pev.v1x as number);
  const dy = (pev.v2y as number) - (pev.v1y as number);
  const dz = (pev.v2z as number) - (pev.v1z as number);
  this.m_iMaxDistance = Math.trunc(
    Math.sqrt(dx * dx + dy * dy + dz * dz)
  );

  // 10. Read spawn flags into option fields.
  //     TODO(asm-ambiguous): pev->spawnflags offset (0x1a0) doesn't match
  //       standard HLSDK entvars_t; verify.
  this.m_bOption1 = (pev.spawnflags & 0x2) ? true : false; // offset 0x100 (int)
  this.m_bOption2 = (pev.spawnflags & 0x4) ? true : false; // offset 0x104 (byte)

  // 11. Spawnflag 0x1 = "Start On" — fire ActivateSlow immediately.
  if (pev.spawnflags & 0x1) {
    ActivateSlow(this);
  }
}

// Stubs — replace with actual definitions or import from the project.
declare const ENGINE_GLOBALS_PTR: any;
declare const ENGINE_FUNCTIONS: any[];
declare const NEXT_THINK_DELAY: number;
declare const RENDER_MODE: number;
declare const CLASS_ID_SLOWMOTION: number;
declare function UTIL_SetSize(pev: any, mins: any, maxs: any): void;
declare function UTIL_SetOrigin(pev: any, origin: any): void;
declare function ActivateSlow(self: any): void;

// ======================================================================
// KeyValue
// ======================================================================

/**
 * CTSSlowMotion::KeyValue — handles level-designer key/value pairs for the
 * slow-motion trigger entity. Two float-typed keys are recognised; their
 * values are parsed with strtod and stored in adjacent `float` fields on
 * the entity. The matching arm sets `fHandled = true`; the fallthrough
 * clears it so the base CBaseEntity::KeyValue path runs.
 *
 * ASM source: `KeyValue__13CTSSlowMotionP14KeyValueData_s` @ 0x00060d74
 *   (158 B, 5/11 CTSSlowMotion methods decompiled — see HANDOFF.md D.4.1)
 *
 * Field & key inferences (all TODO — verify by reading the strings at the
 * noted GOT offsets in tools/decompile/analysis/strings-n5.txt):
 *   • 1st key string:   GOT (ebx - 0x6c69c)        → "slowamt"   (inferred)
 *   • 1st field offset: this+0xf8                  → m_flSlowAmt (inferred)
 *   • 2nd key string:   GOT (ebx - 0x6eebd)        → "slowtime"  (inferred)
 *   • 2nd field offset: this+0xfc                  → m_flSlowTime(inferred)
 *   where ebx (PIC base) = 0x166e10.
 *
 * `parseFloat` matches `__strtod_internal(szValue, NULL, 0)` semantics
 * (stops at first non-parseable char; NaN on no leading digits).
 */
export function KeyValue(this: any, keyValueData: any): void {
  if (keyValueData.szKeyName === "slowamt") {
    this.m_flSlowAmt = parseFloat(keyValueData.szValue);
    keyValueData.fHandled = 1;
    return;
  }
  if (keyValueData.szKeyName === "slowtime") {
    this.m_flSlowTime = parseFloat(keyValueData.szValue);
    keyValueData.fHandled = 1;
    return;
  }
  keyValueData.fHandled = 0;
}

// ======================================================================
// Use
// ======================================================================

/**
 * CTSSlowMotion::Use — handle the "use" event for a slow-motion trigger entity.
 *
 * When the entity is "used":
 *   1. ActivateSlow() runs unconditionally.
 *   2. On the first use (use-count gate at offset 0x100 == 0), schedule
 *      deactivation by writing a sentinel + current game time into the
 *      schedule fields (offsets 0x14 and 0x18).
 *   3. If pev.message (string_t) is non-null, broadcast a HUD message.
 *   4. If pev.target (string_t) is non-null, fire the target with
 *      USE_TOGGLE semantics.
 *
 * @param this        The CTSSlowMotion entity instance.
 * @param pActivator  Entity that triggered the use (unused here).
 * @param useType     USE_TYPE value (unused here).
 * @param value       Float value (unused here — FireTargets gets a hard 0.0).
 */
export function Use(
  this: CTSSlowMotion,
  pActivator: CBaseEntity,
  useType: USE_TYPE,
  value: number,
): void {
  // 1. Activate the slow-motion effect right now.
  this.ActivateSlow();

  // 2. First-use gate: writes the deactivation schedule.
  //    m_iHasBeenUsed is at offset 0x100 from `this` (verified against asm
  //    `cmp DWORD PTR [esi+0x100], 0x0; jne skip`).
  //    m_flDeactivateTimeout is at offset 0x14.
  //    m_flActivatedAt is at offset 0x18.
  // TODO(class-layout): the field names above are inferred from register
  //   usage patterns; confirm against CTSSlowMotion source when available.
  // TODO(asm-ambiguous): the 0xffff0000 sentinel's meaning — NaN-until-explicit
  //   time vs packed flag — is unclear until cross-vendored with WaitThink
  //   and DeactivateSlow chunks.
  if (this.m_iHasBeenUsed === 0) {
    this.m_flDeactivateTimeout = 0xffff0000;
    // TODO(verify-globals): [ebx+0x1c78] is treated as gpGlobals.time here;
    //   could equally be a CVAR or other global. Confirm via symbol table.
    this.m_flActivatedAt = gpGlobals.time;
  }

  // 3. If a HUD message is configured on this entity, broadcast it.
  //    The string argument is built via the STRING() macro:
  //    gpGlobals.pStringBase + pev->message.
  if (this.pev.message !== 0) {
    TSHudMessageAll(0, 0xff, 0x00, 0x08, 0x1e, STRING(this.pev.message));
  }

  // 4. If a target is configured, fire it with toggle semantics.
  //    FireTargets(targetString, pCaller=this, pActivator=this, USE_TOGGLE, 0.0).
  if (this.pev.target !== 0) {
    FireTargets(STRING(this.pev.target), this, this, USE_TYPE.TOGGLE, 0.0);
  }
}

// ======================================================================
// ActivateSlow
// ======================================================================

/**
 * CTSSlowMotion::ActivateSlow — toggles the slow-motion active state.
 *
 * Extends the target time by adding a cvar value (slowamt-style) when the
 * entity still has remaining time; otherwise zeros the target, flips the
 * active flag, and (when transitioning to inactive) calls DeactivateSlow.
 * When the entity has no owner, also seeds pev->origin to sentinel values.
 *
 * @param this  The CTSSlowMotion entity instance (the `this` of the original C++)
 * @returns     void
 */
export function ActivateSlow(this: CTSSlowMotion): void {
  // The original asm opens with the standard `call $+5; pop ebx; add ebx,
  // 0x104a82` PIC/GOT-base computation; from there `[ebx ± k]` addresses
  // globals. We elide the prologue and reference globals symbolically.

  const self = this as unknown as Record<string, any>;
  const remaining = self.m_flTimeRemaining; // float, [esi+0xf8]

  // Branch at 0x61399..0x613aa: compare a global float at [ebx - 0x6f408]
  // against `remaining` and take the "global < remaining" arm (C0 = 1).
  //   "global < remaining" → extend arm    (0x613cc..0x613df)
  //   else                 → reset+toggle  (0x613ac..0x613c9)
  // TODO(asm-ambiguous): the [ebx - 0x6f408] global is unidentified without
  // consulting tools/decompile/analysis/strings-n5.txt. It might be a
  // constant `0.f`, or a slowamt-style cvar. We model the branch
  // heuristically as `remaining > 0` (extend-active vs reset-and-stop).
  if (remaining > 0) {
    // Extend arm (0x613cc..0x613df): m_flTargetTime = cvar.value + remaining.
    // The cvar pointer is at [ebx + 0x1600]; double dereference reaches the
    // float `value` field at the head of the cvar_t struct.
    // TODO(asm-ambiguous): the cvar's identity is unknown — likely `slowamt`.
    const slowamt = 0;
    self.m_flTargetTime = slowamt + remaining; // [esi+0x68]
  } else {
    // Reset + toggle arm (0x613ac..0x613c9):
    self.m_flTargetTime = 0; // [esi+0x68]
    self.m_bActive ^= 1;     // [esi+0x64] XOR 1 (byte flag)
    if (self.m_bActive === 0) {
      self.DeactivateSlow();
    }
  }

  // Owner-null arm (0x613df..0x613fa): seed origin when pev->owner is null.
  if (self.pev.owner == null /* [esi+0x100] */) {
    // TODO(asm-ambiguous): the assembly stores `0xffff0000` to pev->origin.x
    // as a packed 32-bit IEEE-754 float (which is -Infinity — likely a
    // "no fixed origin / anywhere" sentinel). origin.y takes a global dword
    // loaded from [ebx + 0x1c78]. Both values' identities are ambiguous.
    self.pev.origin.x = -Infinity; // [esi+0x14]
    self.pev.origin.y = 0;         // [esi+0x18] ← [ebx+0x1c78]
  }
}

// ======================================================================
// DeactivateSlow
// ======================================================================

// --- placeholders so this file compiles in isolation ---
type EntityPtr = any; // edict_t* / CBaseEntity* — actual type deferred to D.4
interface CTSSlowMotion {
  m_fActive: number; // offset 0x68 — exact semantics TBD
  m_affectedEntities: EntityPtr[]; // offset 0x70, length 33 (0x21 dwords)
  m_fGlobal: number;              // offset 0x100 — branch flag; semantics TBD
  [k: string]: any;               // allow speculative fields without breaking the file
}

// TODO: confirm identity of GOT+0x14f0 against strings-n5.txt
//       (likely the cached `slowamt` cvar value)
declare const gSlowMotionScalar: number;

// Demangled signature: `void GlobalSlowMotion2(float, bool)` — `fb`
declare function GlobalSlowMotion2(
  amount: number,
  deactivate: boolean,
): void;

/**
 * CTSSlowMotion::DeactivateSlow — deactivates this slow-motion trigger.
 *
 * Branches on this->m_fGlobal (offset 0x100):
 *  - Global: tell CTSGameRules::GlobalSlowMotion2 to drop the world-wide
 *    slowmo with the cached amount and `deactivate = false`.
 *  - Local : for each of 33 slots in m_affectedEntities, if non-null,
 *            dispatch the entity's "reset slowmo" vmethod
 *            (ent, 1.0f, false) and null the slot.
 * Both paths converge on a final 33-dword zero-fill of m_affectedEntities
 * (matches the trailing `rep stosd` with ecx=0x21).
 */
export function DeactivateSlow(this: CTSSlowMotion): void {
  // [this + 0x68] = 0
  this.m_fActive = 0;

  if (this.m_fGlobal !== 0) {
    // Global path: float arg from GOT+0x14f0, bool false.
    // The disassembly's `sub esp,0x6` + `pushw 0x0` is stack-alignment
    // padding for the float arg, not a third parameter.
    GlobalSlowMotion2(gSlowMotionScalar, false);
  } else {
    // Local path: walk 33 slots. The disassembly unrolls 3 slots per
    // iteration with `counter += 3; jle 0x20`; flattened here —
    // same 33 slots processed (0..32 inclusive).
    for (let i = 0; i < 33; i++) {
      const ent = this.m_affectedEntities[i];
      if (ent != null) {                 // mirrors `cmp [edi], 0x0; je`
        // vcall through [ent + 0x60][+0x14] with args (ent, 1.0f, false)
        // TODO: identify the actual method on CBaseEntity. Offset 0x60 is
        // not a standard vtable slot — likely an embedded controller
        // object (CTSSlowMotion's vtable is at 0x00101880; the affected
        // entities are CBaseEntity* with vtable at the usual +0x0, so
        // 0x60 here strongly suggests a non-standard offset that needs
        // a sibling-function cross-reference to resolve).
        const controller: any = ent[0x60];
        controller[0x14](ent, 1.0, false);
        this.m_affectedEntities[i] = 0;  // null-out after the call
      }
    }
  }

  // Final zero-fill of the 33-slot array (matches `rep stosd` with
  // ecx=0x21 at the end of the function). Runs in both paths.
  for (let i = 0; i < 33; i++) {
    this.m_affectedEntities[i] = 0;
  }
}

// ======================================================================
// CheckPlayersDistance
// ======================================================================

/**
 * CTSSlowMotion::CheckPlayersDistance — for each affected player,
 * restore normal playback if they've moved beyond the threshold.
 *
 * Iterates the 33 affected-player slots at this+0x70 (4 bytes each).
 * For each non-null, alive player, computes the Euclidean distance
 * to this entity; if it exceeds the threshold at this+0xf4
 * (loaded via `fild` so stored as int32), calls the entity vtable's
 * SetSlowMotion slot with (player, 1.0f, 0) and clears the slot.
 */
export function CheckPlayersDistance(this: CTSSlowMotion): void {
  // Iterate the 33 affected-player slots at this+0x70.
  for (let i = 0; i <= 32; i++) {
    const player: any = this.m_rgAffectedPlayers[i];
    if (player == null) continue;

    // IsAlive via player->[0x60]->vtable[6](player).
    if (!player.m_pEntityVTable.IsAlive(player)) continue;

    // GetAbsOrigin via this->[0x60]->vtable[62](this, &out).
    // Same vtable pointer slot used on `player` for IsAlive / SetSlowMotion.
    const thisOrigin: any = { x: 0, y: 0, z: 0 };
    this.m_pEntityVTable.GetAbsOrigin(this, thisOrigin);

    // Read player origin: dereference player[0] (first field as ptr),
    // then load 3-float Vector at +0x8, +0xc, +0x10 of the pointed struct.
    // TODO(asm-ambiguous): offset 0x8 of *player doesn't match standard
    // pev->origin (0x78). Likely a TS-specific direct origin field.
    const playerBase: any = (player as any).__pbase;
    const playerOrigin: any = {
      x: playerBase[0x8 / 4],
      y: playerBase[0xc / 4],
      z: playerBase[0x10 / 4],
    };

    // Euclidean distance: sqrt(dx*dx + dy*dy + dz*dz).
    const dx = playerOrigin.x - thisOrigin.x;
    const dy = playerOrigin.y - thisOrigin.y;
    const dz = playerOrigin.z - thisOrigin.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Threshold comparison: dist > threshold → deactivate.
    // (fcompp + test ah,0x41 matches > or< ; exact equality edges to "skip".)
    if (dist > this.m_iMaxDistance) {
      // SetSlowMotion via player->[0x60]->vtable[5](player, 1.0f, 0).
      player.m_pEntityVTable.SetSlowMotion(player, 1.0, 0);
      this.m_rgAffectedPlayers[i] = null;
    }
  }
}

// ======================================================================
// WaitThink
// ======================================================================

// TODO: Bind to actual engine globals when the engine layer is ready.
declare const gpGlobals: any;
declare const gpGameRules: any;
declare const g_flSlowTimeThreshold: number;

/**
 * CTSSlowMotion::WaitThink — periodic think handler for the slow-motion
 * "wait" state. Reschedules itself, conditionally applies global or
 * per-player slow motion, and deactivates once the duration has elapsed.
 *
 * @param this  The CTSSlowMotion entity instance
 * @returns     void
 */
export function WaitThink(this: CTSSlowMotion): void {
  const self = this as any;

  // Reschedule: pev->nextthink = gpGlobals->time + 0.1
  // [esi+0] is the pev pointer (offset 0 of CTSSlowMotion); nextthink
  // lives at +0x104 in the linked entvars_t. The QWORD at [ebx-0x6f010]
  // is the float 0.1.
  self.pev.nextthink = gpGlobals.time + 0.1;

  // While the active flag is set, either apply global slow motion or
  // fall back to per-player distance checks.
  if (self.m_bActive) {
    if (self.m_bUseGlobal) {
      gpGameRules.GlobalSlowMotion2(self.m_flSlowAmount, self.m_bRestore);
    } else {
      self.CheckPlayersDistance();
    }
  }

  // Early-return when the slow-time threshold exactly matches the
  // duration. Disassembly: fld g_flSlowTimeThreshold; fcomp m_flDuration;
  // fnstsw ax; test ah,0x40; jne <epilogue>. The mask 0x40 in AH is bit 6
  // = FPU status bit 14 = C3 ("equal / unordered"); jne fires when C3 is
  // set, so this is a == check, not a >= check.
  if (g_flSlowTimeThreshold === self.m_flDuration) {
    return;
  }

  // Disassembly: fld m_flDuration; fcomp gpGlobals->time; fnstsw ax;
  // sahf; jae <continue>. After sahf, CF = C0 and ZF = C3; jae jumps
  // when CF=0, i.e. when m_flDuration >= gpGlobals->time. Fall-through
  // is the deactivate path.
  if (self.m_flDuration < gpGlobals.time) {
    // Duration has elapsed — drop the tracked entity refs and deactivate.
    self.m_pEnt1 = 0;
    self.m_pEnt2 = 0;
    self.DeactivateSlow();
  } else {
    // Duration still ahead — keep the slow motion going.
    if (self.m_bUseGlobal) {
      gpGameRules.GlobalSlowMotion2(self.m_flSlowAmount, self.m_bRestore);
    } else {
      self.CheckPlayersDistance();
    }
  }
}

// ======================================================================
// WaitTouch
// ======================================================================

// TODO(asm-ambiguous): bind to the actual cvar pointer (likely `slowamt`,
// `ts_slowmotion`, or `sv_timescale`). Read at [ebx-0x6f408].
declare const slowmoCvar: any;

// TODO(asm-ambiguous): bind to the engine's player-slot helper singleton.
// Read at [ebx+0x1aa8]; vtable entry at offset 0x11c.
declare const engineGlobal: any;

// Stub classes so the function is self-contained.
declare class CTSSlowMotion {
  // Field offsets inferred from the disassembly. Purpose is tentative —
  // confirm against the TS source in D.4.
  field_0x64: number;        // byte — activation flag
  field_0x68: number;        // float — timer / cached cvar value
  field_0x70: any[];         // ptr[<=32] — tracked players
  field_0xfc: number;        // ptr — passed to vtable[5] on pOther
  field_0x104: number;       // byte — mirrored onto pOther.field_0x175
}
declare class CBaseEntity {
  field_0x175: number;       // byte — receives mirror of this.field_0x104
}

export function WaitTouch(
  this: CTSSlowMotion,
  pOther: CBaseEntity,
): void {
  // Early-out gate: return only when the trigger is fully dormant
  // (timer equals the slowmo cvar AND activation flag is unset).
  //
  // Disassembly: fcomp + test ah,0x40 + je + cmp field_0x64,0 + je
  // → return iff (cvar == field_0x68) && (field_0x64 == 0).
  if (this.field_0x68 === slowmoCvar && this.field_0x64 === 0) {
    return;
  }

  // Only entities passing the vtable[51] check proceed.
  // TODO(asm-ambiguous): vtable entry at offset 0xc8 (index 51) on
  // pOther. Returns non-zero for "yes proceed". Plausibly IsPlayer()
  // but the index is high for IsPlayer — confirm against HLSDK vtable
  // layout.
  if (pOther.vtable_method_51() === 0) return;

  // Reject when vtable[6] returns non-zero.
  // TODO(asm-ambiguous): vtable entry at offset 0x18 (index 6) on
  // pOther. The jne on non-zero means: return when the function
  // returns truthy. Most likely candidates (in HLSDK/TS):
  //   - IsDead()    (1 when dead)
  //   - !IsAlive() (1 when not alive)
  //   - IsObserver(), or a TS-specific validity check.
  // Pick ONE before committing — `if (pOther.IsAlive())` was the
  // original codex choice and is the WRONG direction for any of
  // these (would skip alive players).
  if (pOther.vtable_method_6() !== 0) return;

  // Apply the slow-mo hook to the player.
  // Args (right-to-left on stack): 0, this.field_0xfc, pOther (as this).
  // Vtable entry at offset 0x14 (index 5) on pOther.
  // TODO(asm-ambiguous): exact method name (slowmo hook).
  pOther.vtable_method_5(this.field_0xfc, 0);

  // Mirror this.field_0x104 (byte) onto pOther.field_0x175 (byte).
  // Disassembly: cmp byte + setne → 1 = (this.field_0x104 != 0).
  pOther.field_0x175 = this.field_0x104 !== 0 ? 1 : 0;

  // Resolve the player's engine slot (0..32), then store pOther in
  // this.trackedPlayers[slot]. Slots > 32 are silently rejected (ja
  // branches to the epilogue, so the array write is skipped).
  // TODO(asm-ambiguous): engine global at [ebx+0x1aa8], vtable entry
  // at offset 0x11c (index 71). Arg is `*(pOther) + 0x208` — some
  // pev- or interface-derived field. Plausibly GetPlayerSlot() but
  // confirm.
  const slot = engineGlobal.vtable_method_71(pOther.engineField);
  if (slot <= 0x20) {
    this.field_0x70[slot] = pOther;
  }
}

// ======================================================================
// Save
// ======================================================================

/**
 * CTSSlowMotion::Save — serializes this entity's saveable fields to CSave.
 *
 * Calls CBaseEntity::Save first; if it returns non-zero (success), writes
 * the 2 derived-class fields via CSave::WriteFields using the entity's
 * TYPEDESCRIPTION table. Returns 0 if the base save fails; otherwise
 * returns the value WriteFields returns (typically 1 on success).
 *
 * @param this  The CTSSlowMotion entity instance
 * @param save  The CSave stream/state being written to
 * @returns     0 if the base save fails; otherwise the result of
 *              WriteFields (typically 1 on success)
 */
export function Save(this: CTSSlowMotion, save: CSave): number {
  // Base class first: let CBaseEntity serialize its own state. A 0 return
  // here means we couldn't safely proceed with the derived fields.
  if (CBaseEntity_Save(this, save) === 0) {
    return 0;
  }

  // Derived-class fields: 2 entries in the typedescription table.
  // TODO(asm-ambiguous): CLASS_NAME is the engine-visible entity classname
  //   string at GOT-0x6ed47 — verify against strings-n5.txt (expected:
  //   "ts_slowmotion" or similar).
  // TODO(asm-ambiguous): gSlowMotionTypeDescriptions is the TYPEDESCRIPTION
  //   table for CTSSlowMotion at GOT+0x18c4; entry count = 2, matching the
  //   integer literal passed as the last arg to WriteFields.
  return CSave_WriteFields(save, CLASS_NAME, this, gSlowMotionTypeDescriptions, 2);
}

// --- Stub declarations so this file compiles in isolation. ---
// (Real definitions land when the CBaseEntity / CSave / CTSSlowMotion
// class ports land in D.4.)

// TODO(D.4): define CTSSlowMotion; expected to derive from CBaseEntity with
// 2 saveable fields (likely m_flSlowAmt + a starting time/duration float
// based on "slowamt" / "ts_slowmotion" cvars in strings-n5.txt).
declare class CTSSlowMotion {}

// TODO(D.4): CSave — engine serialization sink.
//   className lives at GOT-0x6ed47 (string table reference).
declare class CSave {}

// TODO(D.4): TYPEDESCRIPTION layout for the engine's typed-field system.
declare interface TYPEDESCRIPTION { _ts_placeholder: true; }

// TODO(D.4): string literal resolved at runtime from GOT-0x6ed47.
declare const CLASS_NAME: string;

// TODO(D.4): TYPEDESCRIPTION[2] array resolved at runtime from GOT+0x18c4.
declare const gSlowMotionTypeDescriptions: TYPEDESCRIPTION[];

// TODO(D.4): base Save — should call this->CBaseEntity::Save(save) and
// return 1 on success / 0 on failure.
declare function CBaseEntity_Save(this: CTSSlowMotion, save: CSave): number;

// TODO(D.4): WriteFields — from the demangled PLT name, takes
// (className: string, this: void*, typeDesc: TYPEDESCRIPTION*, numFields: int).
// In the Save pattern CSave is the `this` of WriteFields and is pushed
// explicitly here (x86 thiscall with both this + args on stack).
declare function CSave_WriteFields(
  save: CSave,
  className: string,
  thisPtr: CTSSlowMotion,
  typeDesc: TYPEDESCRIPTION[],
  numFields: number
): number;

// ======================================================================
// Restore
// ======================================================================

/**
 * CTSSlowMotion::Restore — restore this entity's state from a save game.
 *
 * Defers to the base class (CBaseEntity::Restore) for the shared entity
 * state, then loads CTSSlowMotion's two extra fields through
 * CRestore::ReadFields and the data-driven TYPEDESCRIPTION table.
 *
 * @param this    The CTSSlowMotion entity instance
 * @param restore The CRestore helper used to read save data
 * @returns       0 if the base class restore failed; otherwise the
 *                result of CRestore::ReadFields (typically 1 on success).
 */
// External references — ambient stubs so the snippet type-checks in
// isolation. D.4 will replace these with real CBaseEntity / CRestore /
// CTSSlowMotion declarations.
declare const CBaseEntity: any;

export function Restore(this: any, restore: any): number {
  // Defer to the base class. CRestore-style restore returns 1 on success,
  // 0 on failure — propagate that failure if it happened.
  if (CBaseEntity.Restore(this, restore) === 0) {
    return 0;
  }

  // Restore this class's two extra fields via the data-driven save table.
  // ReadFields args (source order): pName, pData, pTypeDesc, nFields.
  //   pName:     static label         — lea eax, [ebx-0x6ed47]
  //   pData:     pointer to `this`    — pushed esi (the `this` register)
  //   pTypeDesc: TYPEDESCRIPTION ptr  — push DWORD PTR [ebx+0x18c4]
  //   nFields:   2                    — push 0x2
  // TODO(asm-ambiguous): the exact contract for pName (class-name string
  //                       used for error reporting vs. a data-block
  //                       identifier) is inferred — not visible from the
  //                       disassembly alone.
  // TODO: resolve the two globals at offsets -0x6ed47 (below GOT) and
  //       +0x18c4 (above GOT) once the GOT layout and strings-n5.txt
  //       are fully mapped.
  return restore.ReadFields(
    undefined as any, // TODO: static label (GOT - 0x6ed47)
    this,
    undefined as any, // TODO: TYPEDESCRIPTION table (GOT + 0x18c4)
    2,
  );
}

// ======================================================================
// ObjectCaps
// ======================================================================

/**
 * CTSSlowMotion::ObjectCaps — returns 0 (FCAP_NONE).
 *
 * The entity exposes no engine capabilities: no save/restore transition,
 * no think override, no use-traversal, etc. Server-side only — clients
 * never query ObjectCaps for this class.
 *
 * @param this  The CTSSlowMotion entity instance (this in the original C++)
 * @returns     0 (FCAP_NONE)
 */
export function ObjectCaps(this: CTSSlowMotion): number {
  return 0;
}
