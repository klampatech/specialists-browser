```typescript
// Ambient libc declarations so this file compiles in isolation.
declare const strcmp: (a: string, b: string) => number;
declare const strtol: (s: string, endptr: any, base: number, group?: number) => number;

// CTSSellZone class layout is reconstructed in D.4 — treat as opaque for now.
// TODO(asm-ambiguous): full class definition not yet built.
type CTSSellZone = any;
// TODO(asm-ambiguous): KeyValueData_s is the engine's key/value descriptor.
// GoldSrc layout: { szClassName, szKeyName, szValue, fHandled }.
type KeyValueData_s = any;

/**
 * CTSSellZone::KeyValue — parses one entity property from the engine map
 * loader. If the key matches the team-identifier key, parses the value as
 * a base-10 int and stores it at this+0x64; flags the kv as handled.
 * Otherwise flags it unhandled so the base class can try.
 *
 * @param this  The CTSSellZone entity instance
 * @param kv    Engine-provided key/value descriptor
 * @returns     void
 */
export function KeyValue(this: CTSSellZone, kv: KeyValueData_s): void {
  // PIC/GOT string literal at GOT-0x6EEEE — almost certainly the team
  // identifier key (e.g. "team" / "iTeam") for a SellZone.
  // TODO: confirm exact bytes via tools/decompile/analysis/strings-n5.txt.
  const TEAM_KEY = "<GOT-0x6EEEE>";

  if (strcmp(kv.szKeyName, TEAM_KEY) === 0) {
    // __strtol_internal(nptr, endptr, base, group) — glibc internal with
    // a 4th arg for thousands-grouping (pushed0 = none).
    const value = strtol(kv.szValue, null, 10);
    // TODO(asm-ambiguous): offset 0x64 inferred to be this->m_iTeam (int).
    // Offset meaning unclear without CTSSellZone class layout (D.4).
    this.m_iTeam = value;
    kv.fHandled = 1;
  } else {
    kv.fHandled = 0;
  }
}
```
