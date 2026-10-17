/**
 * CTSScoreGiver::KeyValue — virtual-method override that forwards the
 * engine-dispatched key/value pair straight to the CTSWinGiver base
 * class. Disassembly is a passthrough thunk: PIC prologue (EBX saved
 * for the callee's GOT base — no direct GOT access here), tail-call
 * `CTSWinGiver::KeyValue(this, kv)`, EBX restore, ret.
 *
 * @param this  The CTSScoreGiver entity instance (this in C++).
 * @param kv    The engine-dispatched KeyValueData_s* pointer.
 */
export function KeyValue(this: any, kv: any): void {
  // Forward (this, kv) to CTSWinGiver::KeyValue. In a real class
  // hierarchy this is `super.KeyValue(kv)`; spelled out because the
  // base class is defined in a separate decompile chunk.
  (CTSWinGiver as any).prototype.KeyValue.call(this, kv);
}
