/**
 * CTSMapGlobals::WaitThink — re-arm the entity's wait timer so the
 * thinking loop keeps ticking on a fixed interval.
 *
 * Disassembly source: tools/decompile/chunks/WaitThink__13CTSMapGlobals.chunk.md
 *
 * Calling convention: GoldSrc engine dispatches `pev->think` as a
 * __cdecl callback, so `this` arrives on the stack as the first
 * explicit arg (at [esp+0xc] after our prologue), NOT in ECX.
 *
 * Open layout question (TODO-d4-layout, see also the prompt file
 * tools/.codex-prompts/.codex-prompt-d4-layout.md): the class has
 * a vtable (`__vt_13CTSMapGlobals`, 280 B at 0x00101be0), yet the
 * disassembly dereferences `*this` (offset 0) as if `pev` lives
 * there. Either this build places pev at offset 0 (non-standard
 * vptr placement), or the read at [esp+0xc] is not exactly
 * `this->pev`. Resolve before tightening the field names.
 */

// TODO(d5-wireup): wire `gpGlobals` to the engine pointer handed
// to us via GiveFnptrsToDll. Declared here so this decompilation
// compiles in isolation; replaced in the D.5 pass. Until then,
// reads through this global are valid type-checked code only.
declare const gpGlobals: { time: number };

// TODO(d4-const-extract): literal at GOT-0x6ecd0 (8 bytes / QWORD
// load). 0.1s is the canonical GoldSrc think cadence for
// self-rescheduling thinks, but the byte sequence has not been
// pulled out of ts_i386.so. Verify before this becomes "real"
// code.
const WAIT_THINK_INTERVAL = 0.1;

/**
 * Placeholder entity class. Real layout reconstructed in D.4
 * against the disassembly + HLSDK CBaseEntity.
 *
 * For now, `pev` is typed `any` because (a) we don't know its
 * offset within `this` yet (see TODO-d4-layout), and (b) the
 * field written at +0x104 doesn't match any HLSDK entvars_s
 * field by name.
 */
declare class CTSMapGlobals {
  // The disassembly reads *this and uses the result as a pointer
  // base. Under the (current, unverified) assumption that this
  // pointer is the pev storage.
  // TODO(d4-layout): confirm offset of pev within `this`.
  pev: { [k: string]: number } | undefined;
}

export function WaitThink(this: CTSMapGlobals): void {
  // Stack picture after prologue:
  //   [esp+0x0]  4 B local
  //   [esp+0x4]  saved ebx (after pop ebx this is the GOT base)
  //   [esp+0x8]  return address
  //   [esp+0xc]  this (passed by the engine via __cdecl)
  //
  // `[[this]]` lands in edx and is used as the base for the
  // float store at [edx + 0x104].
  const target = this.pev as { [k: string]: number } | undefined;

  // [pev + 0x104] is a float field. It is NOT GoldSrc HLSDK's
  // `nextthink` (which lives at 0xFC). Treat as an opaque
  // wait-timer slot. Rename to a real field once D.4 resolves
  // the offset against TS's entvars_s extension.
  if (target) {
    target["field_0x104"] = gpGlobals.time + WAIT_THINK_INTERVAL;
  }
}
