// Module-level stubs so this file is self-contained.
// Replace these with real imports / definitions when D.4 wires up the
// gameplay classes and globals tables.
declare const CTSPowerUp: { Spawn(self: any): void };
declare const globals_0x14f0: any; // pointer-typed global in .data/.bss

/**
 * CTSSuperJump::Spawn — initialize a Super Jump powerup entity.
 * Disassembly: 0x000b9f44, 54 B.
 */
export function Spawn(this: any): void {
  // DWORD store at this+0x84 (256). Likely a count or duration; field
  // identity deferred to D.4 class reconstruction.
  // TODO(asm-ambiguous): verify field purpose against CTSPowerUp layout.
  this.field_0x84 = 0x100;

  // Delegate to base class spawn (call to Spawn__10CTSPowerUp@plt).
  CTSPowerUp.Spawn(this);

  // GOT-relative pointer load: [ebx+0x14f0] holds a pointer to a global
  // struct in .data/.bss.
  // TODO(asm-ambiguous): identify the global via strings-n5.txt cross-ref.
  const pGlobal: any = globals_0x14f0;

  // Byte store at offset +1 of the dereferenced global.
  // TODO(asm-ambiguous): target struct is unknown — could be a cvar flag
  // byte or a per-entity/per-player effect flag.
  pGlobal[1] = 0xff;
}
