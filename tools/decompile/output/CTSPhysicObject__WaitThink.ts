/**
 * CTSPhysicObject::WaitThink — polling think function executed
 * while the physics object is in its "waiting" pre-activation
 * state. Each engine tick, the function dispatches through the
 * vtable of `this->m_pPhysics` to check whether the wait condition
 * has been satisfied, then routes to either the wait-complete
 * handler (vtable slot 70) or the still-waiting handler (vtable
 * slot 71).
 *
 * @see demangled symbol: WaitThink__15CTSPhysicObject
 * @see address: 0x0006bd98 (61 bytes) in ts/dlls/ts_i386.so
 */

// Stand-in until D.4 wires up the real class layout.
type CTSPhysicObject = any;

export function WaitThink(this: CTSPhysicObject): void {
  // [esi+0x60] — pointer to a vtable-bearing sub-object. The
  // exact field name and class are unclear; the function name
  // ("WaitThink" on a "Physic" object) is suggestive. Field
  // confirmation belongs to the D.4 source-layout pass.
  // TODO(asm-ambiguous): field purpose — confirm against
  // CTSPhysicObject's source layout in D.4.
  const subobj = this.m_pPhysics;

  // vtable slot 6 (offset 0x18): poll the sub-object for the
  // wait condition. Nonzero return means the wait is done.
  // The disassembly passes the *outer* `this` (esi) as the
  // explicit arg, not subobj — preserved here.
  // TODO(asm-ambiguous): exact semantic of the return value —
  // could be a "ready" flag, a frame counter, or a non-null
  // pointer.
  const ready = subobj.vtable[6](this);

  if (ready !== 0) {
    // vtable slot 70 (offset 0x118): wait-done handler —
    // transition out of the waiting state (e.g., activate
    // physics). D.4 will rename this to a real method name.
    subobj.vtable[70](this);
  } else {
    // vtable slot 71 (offset 0x11c): still-waiting handler —
    // re-arm or continue the wait (e.g., re-schedule the
    // think). D.4 will rename this to a real method name.
    subobj.vtable[71](this);
  }
}
