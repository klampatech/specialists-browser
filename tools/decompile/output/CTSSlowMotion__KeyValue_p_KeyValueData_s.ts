/**
 * CTSSlowMotion::KeyValue — handles level-designer key/value pairs for the
 * slow-motion trigger entity. Two float-typed keys are recognised; their
 * values are parsed with strtod and stored in adjacent `float` fields on
 * the entity. The matching arm sets `fHandled = true`; the fallthrough
 * clears it so the base CBaseEntity::KeyValue path runs.
 *
 * ASM source: `KeyValue__13CTSSlowMotionP14KeyValueData_s` @ 0x00060d74
 *   (158 B, 5/11 CTSSlowMotion methods decompiled — see HANDOFF.md D.4.1)
 *
 * Field & key inferences (all TODO — verify by reading the strings at the
 * noted GOT offsets in tools/decompile/analysis/strings-n5.txt):
 *   • 1st key string:   GOT (ebx - 0x6c69c)        → "slowamt"   (inferred)
 *   • 1st field offset: this+0xf8                  → m_flSlowAmt (inferred)
 *   • 2nd key string:   GOT (ebx - 0x6eebd)        → "slowtime"  (inferred)
 *   • 2nd field offset: this+0xfc                  → m_flSlowTime(inferred)
 *   where ebx (PIC base) = 0x166e10.
 *
 * `parseFloat` matches `__strtod_internal(szValue, NULL, 0)` semantics
 * (stops at first non-parseable char; NaN on no leading digits).
 */
export function KeyValue(this: any, keyValueData: any): void {
  if (keyValueData.szKeyName === "slowamt") {
    this.m_flSlowAmt = parseFloat(keyValueData.szValue);
    keyValueData.fHandled = 1;
    return;
  }
  if (keyValueData.szKeyName === "slowtime") {
    this.m_flSlowTime = parseFloat(keyValueData.szValue);
    keyValueData.fHandled = 1;
    return;
  }
  keyValueData.fHandled = 0;
}
