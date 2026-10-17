// Stubs so this snippet compiles in isolation. Replace with real
// imports in the final source file.
interface CBaseEntity {
  // matches HLSDK CBaseEntity surface; intentionally empty here
}
type USE_TYPE = any;
interface CTSGroundAmmo extends CBaseEntity {
  // TS gameplay-entity fields populated in D.4}

/**
 * CTSGroundAmmo::Use — no-op override.
 *
 * The disassembly is a bare 1-byte `ret`, meaning this override
 * deliberately does nothing. The3-arg signature
 * (`pActivator, useType, value`) matches the demangled symbol
 * `Use__13CTSGroundAmmoP11CBaseEntityT18USE_TYPEf`.
 *
 * NOTE: Standard HLSDK `CBaseEntity::Use` is 4-arg (adds `pCaller`).
 * Either the TS mod redeclared the base signature, or this is not a
 * vtable override — verify against the mod's actual class hierarchy
 * in D.4 before relying on it as an override. Flagged for Kyle.
 *
 * @param this The CTSGroundAmmo entity instance
 * @param _pActivator Entity that triggered the use (ignored)
 * @param _useType    USE_TYPE classification (ignored)
 * @param _value      Float value passed by the user (ignored)
 * @returns           void
 */
export function Use(
  this: CTSGroundAmmo,
  _pActivator: CBaseEntity,
  _useType: USE_TYPE,
  _value: number,
): void {
  // Intentionally empty: the disassembly is a bare `ret`.
  // Ground ammo is picked up via the touch path; this method does
  // not respond to `Use` callbacks.
}
