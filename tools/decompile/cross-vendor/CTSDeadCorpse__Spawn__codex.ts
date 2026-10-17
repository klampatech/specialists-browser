```typescript
/**
 * CTSDeadCorpse::Spawn — initialises a dead-corpse entity when it's
 * spawned into the world.
 *
 * Body:
 *   1. Calls a virtual method on a sub-object at this+0x60 (vtable slot
 *      at +0x28 = method #10), with `this` as the argument.
 *   2. Stores -65536 (0xffff0000) into this+0xc — a TS-specific
 *      sentinel value.
 *   3. Copies a 32-bit engine global (GOT[0x1ec4]) into this+0x10.
 *   4. Updates a float at this+0x0+0x104 (likely pev->frags) by adding
 *      a baked double constant to a chained float pointer.
 *
 * @param this  The CTSDeadCorpse entity instance
 * @returns     void
 */

// GOT slots — resolved at link time; declared here so the file
// compiles in isolation.
declare const GOT_0x1ec4: any;
declare const GOT_0x1600: any;
declare const GOT_minus_0x6f010: any;

export function Spawn(this: CTSDeadCorpse): void {
  // 1. Virtual call: this->field_0_60->vtable[10](this).
  //    The vtable slot at +0x28 is method #10 (10 * sizeof(void*)).
  // TODO(asm-ambiguous): identity of the sub-object and the method.
  ((this as any).field_0_60 as any)[10](this);

  // 2. this->field_0xc = 0xffff0000.
  // TODO: field meaning unclear; -65536 as int (or -infinity bit pattern).
  (this as any).field_0xc = 0xffff0000;

  // 3. this->field_0x10 = *(GOT[0x1ec4]) — a 32-bit engine global.
  // TODO: GOT[0x1ec4] purpose unclear (likely an int entity-class pointer
  //   or cached state).
  (this as any).field_0_10 = GOT_0x1ec4;

  // 4. *(this+0x0+0x104) = *(*(GOT[0x1600])) + *(GOT[-0x6f010]).
  //    Most likely: field_0_0 is `pev`; +0x104 in entvars_t is
  //    `frags` (float). The chained-pointer read + baked-double-add is
  //    the standard "advance the per-entity timer forward by a fixed
  //    delta" idiom (fld QWORD constant / fadd inner DWORD /
  //    fstp DWORD target).
  const pev: any = (this as any).field_0_0;
  const innerPtr: any = GOT_0_1600;
  const baseValue: number = *(innerPtr as any);
  const constant: number = *(GOT_minus_0x6f010 as any);
  (pev as any)[0x104] = baseValue + constant;
}
```
