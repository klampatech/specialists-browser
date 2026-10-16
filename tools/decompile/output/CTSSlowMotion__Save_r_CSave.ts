/**
 * CTSSlowMotion::Save — serializes this entity's saveable fields to CSave.
 *
 * Calls CBaseEntity::Save first; if it returns non-zero (success), writes
 * the 2 derived-class fields via CSave::WriteFields using the entity's
 * TYPEDESCRIPTION table. Returns 0 if the base save fails; otherwise
 * returns the value WriteFields returns (typically 1 on success).
 *
 * @param this  The CTSSlowMotion entity instance
 * @param save  The CSave stream/state being written to
 * @returns     0 if the base save fails; otherwise the result of
 *              WriteFields (typically 1 on success)
 */
export function Save(this: CTSSlowMotion, save: CSave): number {
  // Base class first: let CBaseEntity serialize its own state. A 0 return
  // here means we couldn't safely proceed with the derived fields.
  if (CBaseEntity_Save(this, save) === 0) {
    return 0;
  }

  // Derived-class fields: 2 entries in the typedescription table.
  // TODO(asm-ambiguous): CLASS_NAME is the engine-visible entity classname
  //   string at GOT-0x6ed47 — verify against strings-n5.txt (expected:
  //   "ts_slowmotion" or similar).
  // TODO(asm-ambiguous): gSlowMotionTypeDescriptions is the TYPEDESCRIPTION
  //   table for CTSSlowMotion at GOT+0x18c4; entry count = 2, matching the
  //   integer literal passed as the last arg to WriteFields.
  return CSave_WriteFields(save, CLASS_NAME, this, gSlowMotionTypeDescriptions, 2);
}

// --- Stub declarations so this file compiles in isolation. ---
// (Real definitions land when the CBaseEntity / CSave / CTSSlowMotion
// class ports land in D.4.)

// TODO(D.4): define CTSSlowMotion; expected to derive from CBaseEntity with
// 2 saveable fields (likely m_flSlowAmt + a starting time/duration float
// based on "slowamt" / "ts_slowmotion" cvars in strings-n5.txt).
declare class CTSSlowMotion {}

// TODO(D.4): CSave — engine serialization sink.
//   className lives at GOT-0x6ed47 (string table reference).
declare class CSave {}

// TODO(D.4): TYPEDESCRIPTION layout for the engine's typed-field system.
declare interface TYPEDESCRIPTION { _ts_placeholder: true; }

// TODO(D.4): string literal resolved at runtime from GOT-0x6ed47.
declare const CLASS_NAME: string;

// TODO(D.4): TYPEDESCRIPTION[2] array resolved at runtime from GOT+0x18c4.
declare const gSlowMotionTypeDescriptions: TYPEDESCRIPTION[];

// TODO(D.4): base Save — should call this->CBaseEntity::Save(save) and
// return 1 on success / 0 on failure.
declare function CBaseEntity_Save(this: CTSSlowMotion, save: CSave): number;

// TODO(D.4): WriteFields — from the demangled PLT name, takes
// (className: string, this: void*, typeDesc: TYPEDESCRIPTION*, numFields: int).
// In the Save pattern CSave is the `this` of WriteFields and is pushed
// explicitly here (x86 thiscall with both this + args on stack).
declare function CSave_WriteFields(
  save: CSave,
  className: string,
  thisPtr: CTSSlowMotion,
  typeDesc: TYPEDESCRIPTION[],
  numFields: number
): number;