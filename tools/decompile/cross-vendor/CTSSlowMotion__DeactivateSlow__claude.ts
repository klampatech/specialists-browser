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
