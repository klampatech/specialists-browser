```typescript
/**
 * CTSShotgunWeapon::Spawn — Spawn the shotgun weapon: dispatch a
 * virtual initializer through the sub-object at this+0x60, stash the
 * returned pointer at this+0xa4, then delegate to
 * CTSGroundWeapon::Spawn().
 *
 * @param this  The CTSShotgunWeapon entity instance
 * @returns     void
 */
export function Spawn(this: CTSShotgunWeapon): void {
  // PIC/GOT base setup emitted by the compiler
  //   (call $+5; pop ebx; add ebx, 0xac892)
  // — no [ebx ± k] global access follows in this body, so the GOT
  //   base is unused here.

  // Load the pointer at this+0x60, then dispatch through offset
  // 0x11c with `this` as the explicit argument. Store the returned
  // value (eax) at this+0xa4.
  // TODO(asm-ambiguous): identity of this+0x60 is not derivable
  //   from this chunk — likely pev, a member pointer, or a vtable
  //   holder for a base class sub-object. Needs D.4 class layout.
  // TODO: offset meaning unclear for 0x60 and 0xa4.
  (this as any)[0xa4] = (this as any)[0x60][0x11c](this);

  // Delegate to CTSGroundWeapon::Spawn(this) — the PLT-resolved
  // parent class spawn.
  (CTSGroundWeapon as any).Spawn(this);
}
```
