/**
 * CTSGameRules::Init — initialize game-rule state for a fresh round.
 *
 * Resets per-team scores, the objective slot table, the embedded bullet
 * manager, the powerup / slow-motion subsystem, and the weapon-restriction
 * list. Seeds round-timing fields with `gpGlobals->time + cvar` so the
 * first round starts after the configured delay. Sub-initializers are
 * called in the order the Half-Life server expects them.
 *
 * @param this  The CTSGameRules entity instance.
 * @returns     void
 */

// ---- External stubs (replace with real imports / class members) ----
// Kept as `any` so this file compiles in isolation per the D.3 review
// checklist item 8.
declare const gpGlobals: any;
declare const GOT: any;
declare const CVAR_TIME_A: number; // GOT-relative: [ebx-0x6e760]
declare const CVAR_TIME_B: number; // GOT-relative: [ebx-0x6f008]
declare const CVAR_TIME_C: number; // GOT-relative: [ebx-0x6ecd0]
declare function readPtr(base: any, off: number): any;
declare function readU8(addr: any): number;
declare function zeroFillDwords(obj: any, off: number, count: number): void;
declare function InitWeaponRestriction(): any;

class CTSGameRules {
  // Numeric placeholders preserve the asm offset; semantic names are
  // only used where justified by the disassembly (sub-object with a
  // typed Reset call). Everything else is TODO.
  field_0x00: number = 0;            // byte from cvar via [ebx+0x210c]
  field_0x01: number = 0;            // byte 0xff sentinel
  field_0x04: number = 0;
  field_0x08: number = 0;
  field_0x0c: number = 0;            // float: gpGlobals.time + CVAR_TIME_B
  field_0x10: number = 0;            // byte, set to 1
  field_0x14: number = 0;
  field_0x18: number = 0;            // byte
  field_0x558: number = 0;
  field_0x55c: number = 0;
  field_0x560: number = 0;
  field_0x564: number = 0;
  field_0x568: number = 0;
  field_0x56c: number = 0;
  field_0x570: number = 0;            // float: gpGlobals.time + CVAR_TIME_A
  field_0x574: number = 0;            // float: -1.0 (0xbf800000)
  field_0x578: number = 0;            // int: -1 (0xffffffff)
  field_0x684_to_0xf83: any[] = [];  // zeroed as576 dwords
  field_0xf84: number = 0;            // float: gpGlobals.time + CVAR_TIME_C
  field_0x1824: number = 0;
  m_BulletManager: any;              // +0x1864, sub-object (justified: Reset call)
  field_0x586c: any = null;           // weapon restriction head
  field_0x5870: any = null;           // weapon restriction tail
  field_0x5874: number = 0;
  field_0x5875: number = 0;
  field_0x5876: number = 0;
  field_0x5878: number = 0;
  field_0x587c: number = 0;           // float: gpGlobals.time + CVAR_TIME_C
  field_0x5880: number = 0;
  field_0x5884: number = 0;
  field_0x5885: number = 0;
  field_0x5888: number = 0;           // float 0x3dcccccd
  field_0x588c: number = 0;           // float 0x3e59999a
  field_0x5890: number = 0;
  field_0x5891: number = 0;

  // Class methods referenced from Init — declared here so this file
  // compiles in isolation. Implementations land in D.4.
  InitTeams(): void { /* D.4 */ }
  InitObjectives(): void { /* D.4 */ }
  SetObjective(): void { /* D.4 */ }
}

export function Init(this: CTSGameRules): void {
  // ---- 1) Initial byte from a 2-deep global pointer chain. ----
  // TODO(asm-ambiguous): which global / struct the byte comes from.
  this.field_0x00 = readU8(readPtr(GOT, /* slot */ 0x210c));

  // ---- 2) Teams registry (call before clearing score slots). ----
  this.InitTeams();
  this.field_0x01 = 0xff; // byte

  // ---- 3) Per-team score + round-timing state (0x558..0x578). ----
  // Mirrors asm order: 0x56c first, then 0x560/0x564/0x568, then
  // 0x574/-1.0, 0x578/-1, 0x55c/-1, 0x558/-1, then the +0x570 seed.
  this.field_0x56c = 0;
  this.field_0x560 = 0;
  this.field_0x564 = 0;
  this.field_0x568 = 0;
  this.field_0x574 = -1.0;             // 0xbf800000 (float -1.0)
  this.field_0x578 = -1;               // 0xffffffff
  this.field_0x55c = -1;
  this.field_0x558 = -1;
  this.field_0x570 = gpGlobals.time + CVAR_TIME_A;

  // ---- 4) Zero 33 dwords at +0x57c (rep stosd, ecx=0x21, eax=0). ----
  zeroFillDwords(this, /* offset */ 0x57c, /* count */ 33);

  // ---- 5) Early state ints + flags (0x4..0x18); round-time seed. ----
  this.field_0x04 = 0;
  this.field_0x14 = 0;
  this.field_0x18 = 0;                 // byte
  this.field_0x08 = 0;
  this.field_0x0c = gpGlobals.time + CVAR_TIME_B; // float
  this.field_0x10 = 1;                 // byte

  this.InitObjectives();
  this.SetObjective();

  // ---- 6) Zero 576 dwords at +0x684 (rep stosd, ecx=0x240, eax=0). ----
  zeroFillDwords(this, /* offset */ 0x684, /* count */ 0x240);

  this.field_0xf84 = gpGlobals.time + CVAR_TIME_C; // float
  this.field_0x1824 = 0;

  // ---- 7) Reset the embedded bullet manager (sub-object at +0x1864). ----
  this.m_BulletManager.Reset();

  // ---- 8) Weapon restriction: global init returns a list pointer; ----
  //       both head and tail of the restriction list are seeded with it.
  const weaponList = InitWeaponRestriction();
  this.field_0x586c = weaponList; // head
  this.field_0x5870 = weaponList; // tail

  // ---- 9) Powerup / slow-motion subsystem defaults (0x5874..0x5891). ----
  this.field_0x5878 = 0;
  this.field_0x587c = gpGlobals.time + CVAR_TIME_C; // float
  this.field_0x5880 = 0;
  this.field_0x5884 = 0;               // byte
  this.field_0x5885 = 0;               // byte
  this.field_0x5875 = 0;               // byte
  this.field_0x5874 = 0;               // byte
  this.field_0x5876 = 0;               // byte
  // TODO(asm-ambiguous): role of these slow-motion constants; likely
  //  defaults consumed by `ts_slowmotion` per `strings-n5.txt`.
  this.field_0x5888 = 0.1;             // 0x3dcccccd
  this.field_0x588c = 0.169;           // 0x3e59999a
  this.field_0x5890 = 0;               // byte
  this.field_0x5891 = 0;               // byte
}
