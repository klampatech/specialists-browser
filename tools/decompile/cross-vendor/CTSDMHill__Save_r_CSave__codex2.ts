// Stubs so this slice compiles on its own.
// TODO(D.4): replace with real types from CTSDMHill/CSave/CBaseEntity
// headers once TYPEDESCRIPTION discovery lands.
declare class CBaseEntity { /* see HLSDK cbase.h */ }
declare class CTSDMHill extends CBaseEntity { /* class fields — D.4 */ }
declare class CSave {
  WriteFields(
    fieldName: string,
    instance: unknown,
    fields: unknown, // TYPEDESCRIPTION[] — wire up in D.4
    count: number,
  ): number;
}

// External CBaseEntity::Save — typically non-virtual member that the
// entity's own Save() calls explicitly as the first step of the
// Save/Restore protocol. Demangled PLT:
//   Save__11CBaseEntityR5CSave -> CBaseEntity::Save(CSave&)
declare function CBaseEntity_Save(self: CBaseEntity, save: CSave): number;

// Static TYPEDESCRIPTION for the 3 CTSDMHill save fields and the
// class-name string passed as the fieldName to WriteFields.
// TODO(D.4): discover the actual field list (probably the standard
// DM-hill fields: m_iGoalState, m_flTimeLastShot, ... — see HLSDK
// cbase.h's BEGIN_DATADESC for similar CBaseDM* classes).
declare const CTSDMHill_DATATABLE_NAME: string; // e.g. "CTSDMHill"
declare const CTSDMHill_DATATABLE: unknown;     // TYPEDESCRIPTION[3]

/**
 * CTSDMHill::Save — serialize CTSDMHill into a save buffer.
 *
 * Forwards to CBaseEntity::Save; if that returns non-zero, writes the
 * 3-entry TYPEDESCRIPTION data table for this entity via
 * CSave::WriteFields.
 *
 * Source: tools/decompile/chunks/Save__9CTSDMHillR5CSave.chunk.md
 * Address: 0x00061918, 80 bytes.
 *
 * @returns 0 if the base-class Save failed, otherwise the value from
 *          CSave::WriteFields (1 on success, 0 on failure).
 */
export function Save(this: CTSDMHill, save: CSave): number {
  // Defer to the parent class save logic first. If it fails, bail out.
  // Disasm: test eax,eax; jne WriteFields_path; mov eax,0; jmp epilogue.
  if (CBaseEntity_Save(this, save) === 0) {
    return 0;
  }

  // Write this entity's typed-description table (3 fields). The field-name
  // string and TYPEDESCRIPTION array are static, PIC-relative globals in
  // the .so (resolved through the GOT base in ebx).
  //
  // Disasm push order (right-to-left = first-to-last arg) maps to the
  // PLT signature:
  //   WriteFields(save, name, this, fields, count)
  // and resolves to this method call.
  return save.WriteFields(
    CTSDMHill_DATATABLE_NAME, // [ebx-0x6ed53]  field/class name string
    this,                     // esi at call-site: instance pointer
    CTSDMHill_DATATABLE,      // [ebx+0x1580] static TYPEDESCRIPTION[3]
    3,                        // field count
  );
}
