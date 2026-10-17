```typescript
/**
 * CTSCustomTarget::KeyValue — engine key-value handler for CTSCustomTarget.
 *
 * Recognizes three keys:
 *   1. A target-list key  → forwards the value to GetTargets(this, szValue).
 *   2. An integer key     → parsed via strtol, stored at this+0x868.
 *   3. An integer key     → parsed via strtol, stored at this+0x86c.
 *
 * On match, sets KeyValueData_s.fHandled = 1 so the base class skips it.
 * On no match, leaves fHandled = 0 so CBaseEntity::KeyValue can try.
 *
 * @param this          The CTSCustomTarget entity instance
 * @param keyValueData  Engine-supplied { szKeyName, szValue, fHandled }
 */
export function KeyValue(this: CTSCustomTarget, keyValueData: KeyValueData_s): void {
  // The three key-name string literals live in .rodata at GOT-relative
  // offsets -0x6eda4, -0x6ed9c, and -0x6ed8e. Their actual contents
  // (likely "target" plus two CTS-custom keys) are listed in
  // tools/decompile/analysis/strings-n5.txt.
  // TODO(asm-ambiguous): resolve the three key names from strings-n5.txt.
  // The empty-string placeholders below mark each GOT-resident string.

  if (strcmp(keyValueData.szKeyName, /* GOT-0x6eda4 */ "") === 0) {
    // Target list: bind the comma-separated target string to this entity.
    GetTargets.call(this, keyValueData.szValue);
    keyValueData.fHandled = 1;
    return;
  }

  if (strcmp(keyValueData.szKeyName, /* GOT-0x6ed9c */ "") === 0) {
    // First integer field at this+0x868. The asm calls
    // __strtol_internal(nptr, endptr=NULL, base=10, group=0), which is
    // equivalent to parseInt(value, 10) for plain decimal inputs.
    this.m_iField0x868 = parseInt(keyValueData.szValue, 10);
    keyValueData.fHandled = 1;
    return;
  }

  if (strcmp(keyValueData.szKeyName, /* GOT-0x6ed8e */ "") === 0) {
    // Second integer field at this+0x86c, same parse as above.
    this.m_iField0x86c = parseInt(keyValueData.szValue, 10);
    keyValueData.fHandled = 1;
    return;
  }

  // Unrecognized key: leave fHandled = 0 so CBaseEntity::KeyValue can try.
  keyValueData.fHandled = 0;
}
```
