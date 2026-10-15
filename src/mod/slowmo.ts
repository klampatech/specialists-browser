/**
 * The Specialists mod — slowmo system (D.4.1 deliverable).
 *
 * Source: ts/dlls/ts_i386.so (NOT stripped, 32-bit ELF).
 * Class: `CTSSlowMotion` + `CTSSlowMotionPoint`.
 * Reference: cross-vendor review (codex decompile + claude review).
 *
 * What this module contains:
 * - The CTSSlowMotion entity's primary gameplay methods. Together
 *   they implement the TS slow-motion system: spawn → use/check →
 *   activate/wait → deactivate.
 * - Each function is one TS function declaration; class state is
 *   `any` for D.4.1 — the host (D.5) wires up Babylon.js entities
 *   to this shape.
 *
 * Shared state (inferred from the decompiled methods, see
 * `tools/decompile/cross-vendor/<name>__claude-review.md` for
 * each function's notes):
 *   this.m_fActive            (0x68)         — float, slow-end time
 *   this.m_affectedEntities   (0x70, 33*4)   — array of edict pointers
 *   this.m_flMaxDistance      (offset TBD)   — used in CheckPlayersDistance
 *   this.m_fGlobal            (0x100)        — bool, "global" mode flag
 *
 * Cross-vendor review files:
 *   tools/decompile/cross-vendor/CTSSlowMotion__<Method>__{codex,claude,claude-review}.{ts,md}
 *
 * Methods included in D.4.1 (in this order):
 *   1. ActivateSlow           — D.2 test
 *   2. DeactivateSlow         — D.4.1
 *   3. CheckPlayersDistance   — D.4.1
 *   4. WaitThink              — D.4.1
 *   5. WaitTouch              — D.4.1
 *
 * Pending for D.4.1 (next session or this session if time):
 *   - Spawn, Use, KeyValue, Save, Restore, ObjectCaps
 *   - CTSSlowMotionPoint family (7 methods)
 */

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
