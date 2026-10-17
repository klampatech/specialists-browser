// Stub declarations so this snippet compiles in isolation.
// D.4 will replace these with real definitions from the CTS class layout.
declare class CTSCustomTarget {
  m_iUser1: number;   // formerly this+0x868 — rename in D.4
  m_iUser2: number;   // formerly this+0x86c — rename in D.4
}

interface KeyValueData_s {
  szKeyName: string;
  szValue: string;
  fHandled: 0 | 1;
}

declare function strcmp(a: string, b: string): number;
declare function GetTargets(this: CTSCustomTarget, szValue: string): void;

// TODO(asm-ambiguous): the three key-name string literals live in
// .rodata at GOT-relative offsets -0x6eda4, -0x6ed9c, -0x6ed8e. Their
// actual contents (likely "target" plus two CTS-custom keys) must be
// resolved from tools/decompile/analysis/strings-n5.txt. Until they
// are resolved the placeholders below will not match any real key —
// the function routes every key to the default branch and fHandled
// stays 0. Naming them with the __UNRESOLVED__ prefix prevents them
// from being mistaken for a real (empty) key.
const __UNRESOLVED_KEY_TARGET_LIST = "";  // GOT-0x6eda4
const __UNRESOLVED_KEY_INT_FIELD_1  = "";  // GOT-0x6ed9c
const __UNRESOLVED_KEY_INT_FIELD_2  = "";  // GOT-0x6ed8e

/**
 * CTSCustomTarget::KeyValue — engine key-value handler for CTSCustomTarget.
 *
 * Recognises three keys:
 *   1. A target-list key → forwards the value to CTSCustomTarget::GetTargets.
 *   2. An integer key    → stored as this.m_iUser1  (formerly this+0x868).
 *   3. An integer key    → stored as this.m_iUser2  (formerly this+0x86c).
 *
 * On match, sets fHandled = 1 so the base class skips it.
 * On no match, leaves fHandled = 0 so CBaseEntity::KeyValue can try.
 */
export function KeyValue(this: CTSCustomTarget, keyValueData: KeyValueData_s): void {
  // 1. target-list key
  if (strcmp(keyValueData.szKeyName, __UNRESOLVED_KEY_TARGET_LIST) === 0) {
    GetTargets(this, keyValueData.szValue);
    keyValueData.fHandled = 1;
    return;
  }

  // 2. first integer field
  if (strcmp(keyValueData.szKeyName, __UNRESOLVED_KEY_INT_FIELD_1) === 0) {
    // __strtol_internal(nptr, endptr=NULL, base=10, group=0)
    // — equivalent to parseInt(value, 10) for plain decimal inputs.
    this.m_iUser1 = parseInt(keyValueData.szValue, 10);
    keyValueData.fHandled = 1;
    return;
  }

  // 3. second integer field
  if (strcmp(keyValueData.szKeyName, __UNRESOLVED_KEY_INT_FIELD_2) === 0) {
    this.m_iUser2 = parseInt(keyValueData.szValue, 10);
    keyValueData.fHandled = 1;
    return;
  }

  // Unrecognised key: leave fHandled = 0 so CBaseEntity::KeyValue can try.
  keyValueData.fHandled = 0;
}
