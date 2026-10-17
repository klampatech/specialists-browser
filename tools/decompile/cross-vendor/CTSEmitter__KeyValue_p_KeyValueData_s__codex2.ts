// Standalone decompilation of CTSEmitter::KeyValue(KeyValueData_s*).
// Field offsets verified against the asm at 0x00063e3c:
//   [esi+0x4]  -> szKeyName
//   [esi+0x8]  -> szValue
//   [esi+0xc]  -> fHandled
//   this+0x68  -> embedded sharedemitter_s sub-struct (passed to CTSSharedEmitter::EmitterKeyValue)
//   [ebx+0x13a0] -> GOT slot for the g_sharedEmitter singleton
//
// External types deliberately typed as `any` so this file compiles standalone
// (per the "no external type references we don't define here" rule). Real
// definitions land in D.4 once we recover the CTSEmitter class layout.
type CTSEmitterAny = any;
type KeyValueDataAny = any;
type SharedEmitterAny = any;
type sharedemitter_s_any = any;

// Imported global singleton (resolved at link time). For now, declare as a
// typed alias; D.4 will confirm the symbol name against strings-n5.txt.
declare const g_sharedEmitter: SharedEmitterAny;

export function KeyValue(this: CTSEmitterAny, pKeyValue: KeyValueDataAny): void {
  const sharedEmitter: SharedEmitterAny = g_sharedEmitter;

  // `this + 0x68` -> pointer to embedded sharedemitter_s sub-struct.
  const thisPtr: number = (this as unknown) as number;
  const pShared: sharedemitter_s_any = (thisPtr + 0x68) as unknown as sharedemitter_s_any;

  // cdecl: g_sharedEmitter->EmitterKeyValue(pShared, szKeyName, szValue)
  // Returns 0 or 1 in AL per the asm's `setne dl` pattern.
  const handled: number = sharedEmitter.EmitterKeyValue(
    pShared,
    pKeyValue.szKeyName,
    pKeyValue.szValue,
  );

  // Engine checks fHandled to decide whether to keep cascading KeyValue up
  // the entity inheritance chain; 1 = consumed, 0 = not consumed.
  pKeyValue.fHandled = handled !== 0 ? 1 : 0;
}
