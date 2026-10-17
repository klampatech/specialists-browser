// Ambient libc declarations so this file compiles in isolation.
declare function __strtol_internal(
  nptr: string,
  endptr: any,
  base: number,
  group: number,
): number;
declare function strcmp(a: string, b: string): number;

// CTSSellZone class layout is reconstructed in D.4 — treat as opaque for now.
// TODO(asm-ambiguous): full class definition not yet built.
type CTSSellZone = any;
// TODO(asm-ambiguous): KeyValueData_s is the engine's key/value descriptor.
// Disassembly offsets (esi+0x4, +0x8, +0xc) suggest
// { _, szKeyName, szValue, fHandled } — likely a TS-mod-flavoured
// compact variant (no szClassName prefix since this is typed).
type KeyValueData_s = any;

/**
 * CTSSellZone::KeyValue — parses one entity property from the engine map
 * loader. If the key matches the team-identifier key (string literal at
 * GOT-0x6EEEE; exact bytes TBD via tools/decompile/analysis/strings-n5.txt),
 * parses the value as a base-10 int and stores it at this+0x64; flags the
 * kv as handled. Otherwise flags it unhandled so the base class can try.
 *
 * Demangled symbol: KeyValue__11CTSSellZoneP14KeyValueData_s
 *
 * @param this  The CTSSellZone entity instance
 * @param kv    Engine-provided key/value descriptor
 * @returns     void
 */
export function KeyValue(this: CTSSellZone, kv: KeyValueData_s): void {
  // PIC string literal at GOT-0x6EEEE — almost certainly the team identifier
  // key (e.g. "team" / "iTeam") for a SellZone.
  // TODO: confirm exact bytes via tools/decompile/analysis/strings-n5.txt.
  const TEAM_KEY = "<GOT-0x6EEEE>";

  if (strcmp(kv.szKeyName, TEAM_KEY) === 0) {
    // __strtol_internal(nptr, endptr, base, group) — glibc internal; group=0
    // disables thousands-grouping (matches the disassembly's push 0x0).
    const value = __strtol_internal(kv.szValue, null, 10, 0);
    // TODO(asm-ambiguous): offset 0x64 inferred to be this->m_iTeam (int).
    // Confirm in D.4 by reading the CTSSellZone class layout.
    this.m_iTeam = value;
    kv.fHandled = 1;
  } else {
    kv.fHandled = 0;
  }
}
