/**
 * CTSDeadCorpse::Spawn — initialises a dead-corpse entity on spawn.
 *
 * Demangled: CTSDeadCorpse::Spawn()
 * Disassembly: tools/decompile/chunks/Spawn__13CTSDeadCorpse.chunk.md
 *
 * Body (from disassembly):
 *   1. this->field_0x60->vtable[10](this)   — virtual call
 *   2. this->field_0xc  = 0xffff0000         — write 32-bit constant
 *   3. this->field_0x10 = *(GOT[0x1ec4])    — copy engine global
 *   4. *(pev+0x104) = *(*GOT[0x1600]) + *GOT[-0x6f010]
 */

// GOT slots — populated at link time. Indexed via [0] for dereference.
declare const GOT_0x1ec4: any;        // pointer to int
declare const GOT_0x1600: any;         // pointer to (pointer to float)
declare const GOT_minus_0x6f010: any;  // pointer to 8-byte double constant

// Forward-declared types — full definitions land in D.4.
type CTSDeadCorpse = any;
type entvars_t = any;

export function Spawn(this: CTSDeadCorpse): void {
  // 1. Virtual call on the sub-object pointed to by this+0x60.
  //    vtable slot #10 = byte offset 0x28 (= 10 * sizeof(void*)).
  // TODO(asm-ambiguous): identity of the sub-object and the method.
  const subObjectVptr: any = (this as any).field_0x60;
  subObjectVptr[10](this);

  // 2. this->field_0xc = 0xffff0000.
  // TODO: meaning unclear (likely a flag bitmask / -65536 sentinel).
  (this as any).field_0xc = 0xffff0000;

  // 3. this->field_0x10 = *(GOT[0x1ec4]).
  (this as any).field_0x10 = GOT_0x1ec4[0];

  // 4. *(pev+0x104) = *(*GOT[0x1600]) + *GOT[-0x6f010].
  //    pev is at this+0x0 (first field of CBaseEntity).
  //    pev+0x104 is a float — likely gravity or fuser2, used here
  //    as a per-entity timer ("advance the corpse timer by a baked
  //    constant"). The 80-bit x87 fld/fadd/fstp round-trip is
  //    approximated by JS double arithmetic; result truncates to
  //    32-bit float on store (acceptable for this use).
  const pev: entvars_t = (this as any).field_0x0;
  const innerFloatPtr: any = GOT_0_1600[0]; // *GOT[0x1600]
  const baseValue: number = innerFloatPtr[0];  // *(*GOT[0x1600])
  const constant: number = GOT_minus_0x6f010[0]; // *GOT[-0x6f010] (QWORD)
  (pev as any)[0x104] = baseValue + constant;
}
