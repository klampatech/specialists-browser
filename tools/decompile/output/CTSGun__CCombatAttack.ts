// NOTE: this is a STRUCTURAL rewrite that fixes the blockers above.
// Field names remain TODO until verified against CTSGun's layout.

import {
  Vector,
  // externals — TODO: declare in a single externals.ts module
} from "./externals";

declare const player: any;       // CBasePlayer
declare const this_: any;        // CTSGun (renamed to avoid shadowing)
declare const pev: any;          // pev_t = player.pev
declare function UTIL_WeaponTimeBase(): number;
declare function UTIL_MakeVectors(v: Vector): void;
declare function GetMeleeMultiplier(p: any): number;
declare function KungFu(p: any): boolean;
declare function CloseCombatAttack(p: any, origin: Vector, fwd: Vector,
  traceMask: number, dmg: number, kd: number, b: boolean, u: number,
  hit: Vector, k: number): boolean;
declare function BlockPlayer(p: any, kd: number): void;
declare function W_FireBullets(...args: any[]): void;
declare function RANDOM_LONG(min: number, max: number): number;
declare function player_GetAutoaimVector(p: any, scale: number): Vector;
// cvars — TODO: resolve names from strings-n5.txt and the [ebx±k] offsets
declare const cvar_closeCombat_range: number;       // [ebx-0x6e7f4]
declare const cvar_closeCombat_main: number;        // [ebx-0x6f408]  ≈ 1.0
declare const cvar_closeCombat_other: number;       // [ebx-0x6f3fc]  ≈ 1.0
declare const cvar_closeCombat_max: number;         // [ebx-0x6f3f8]
declare const cvar_closeCombat_min: number;         // [ebx-0x6de8c]
declare const cvar_closeCombat_damMul: number;      // [ebx-0x6debc]
declare const cvar_closeCombat_damMax: number;      // [ebx-0x6dec4]
declare const cvar_closeCombat_lowMul: number;      // [ebx-0x6ecd8] QWORD/double
declare const cvar_closeCombat_lowMin: number;      // [ebx-0x6ecc8] QWORD
declare const cvar_closeCombat_lowMax: number;      // [ebx-0x6de20] QWORD
declare const cvar_closeCombat_bigKick: number;     // [ebx-0x6dee8]
declare const cvar_closeCombat_farDelay: number;    // [ebx-0x6df04]
declare const cvar_closeCombat_kfDelay: number;     // [ebx-0x6de80]
declare const cvar_closeCombat_kfDamage: number;    // [ebx-0x6de7c]
declare const cvar_closeCombat_sweep: number;       // [ebx-0x6ec2c]
declare const cvar_closeCombat_kickDur: number;     // [ebx-0x6de78]
declare const cvar_closeCombat_highKick: number;    // [ebx-0x6df78]
declare const cvar_closeCombat_lowDelay: number;    // [ebx-0x6de88]
declare const cvar_closeCombat_jumpDelay: number;   // [ebx-0x6de84]
declare const cvar_closeCombat_jumpDuration: number;// [ebx-0x6e810]
declare const cvar_closeCombat_jumpHigh: number;    // [ebx-0x6f078]
declare const cvar_closeCombat_jumpLow: number;     // [ebx-0x6f06c]
declare const cvar_closeCombat_kfTime: number;      // [ebx-0x6df4c]
declare const cvar_closeCombat_backKick: number;   // [ebx-0x6dec8]
declare const cvar_closeCombat_backKick2: number;  // [ebx-0x6de6c]
declare const cvar_closeCombat_rampage: number;     // [ebx-0x6deb0]
declare const cvar_closeCombat_expDelay: number;    // [ebx-0x6f3f4]
declare const cvar_closeCombat_lowDelta: number;    // [ebx-0x6df6c]
declare const cvar_closeCombat_bigKickDur: number;  // [ebx-0x6e7e8]

export function CCombatAttack(this_: any): void {
  const player = this_.m_pPlayer;
  const pev = player.pev;
  const velocity = pev.velocity;
  const velocityMag = Math.hypot(velocity.x, velocity.y, velocity.z);

  const now = UTIL_WeaponTimeBase();
  if (now < player.m_flNextAttack /* [esi+0x12c] */) return;
  if (now < this_.m_flNextPrimaryAttack /* [ebp+0x9c] */) return;
  if (now < this_.m_flTimeWeaponIdle /* [ebp+0xa0] */) return;

  // ---- local state defaults (TODO: field names unverified) ----
  let attackType: 2 | 3 = 2;
  let damage = 0;
  let damageMult = 0;
  let sequence = 0;
  let animIdx = 0;
  let duration = cvar_closeCombat_main;       // [esp+0x24]
  let kickDuration = cvar_closeCombat_main;   // [esp+0x20]
  let kickDelay = cvar_closeCombat_main;      // [esp+0x1c]
  let applyBlock = false;
  let doFireBullets = true;
  const isDoingAction = (pev.flags & 0x50c30) !== 0; // [esp+0x6]

  // ---- pre-compute derived fields ----
  // TODO(asm-ambiguous): each offset below is a *different* field on the
  // player entity, NOT a pev.flags bit. Names TBD.
  const player_f180 = pev; // pseudo — really *(uint8*)(player+0x180)
  const player_f1a5 = pev;
  const player_f814 = pev; // 0x814 — TODO name
  const player_f815 = pev; // 0x815 — TODO name
  const hasA = !!(player_f1a5.readU8(0x1a5) & 0x2);
  const hasB = !!(player_f1a5.readU8(0x1a5) & 0x40);
  const hasC = !!(player_f180.readU8(0x180) & 0x4);
  const hasD = !!(player_f180.readU8(0x180) & 0x1);
  const hasE = !!(player_f180.readU8(0x180) & 0x10);
  const isFrozen = !!(player_f180.readU8(0x180) & 0x800);

  // ====== close-combat range check (0x761a6) ======
  // asm: jne 0x76298 if velocityMag > range  →  goto ranged branch
  //      else fall through to UTIL_MakeVectors path
  let isCloseCombat = false;
  if (velocityMag > cvar_closeCombat_range) {
    // ---- ranged: pick attackType based on player-state flag (0x76298) ----
    attackType = (hasE ? 3 : 2) as 2 | 3;
    // jmp to in-water check at 0x76314 (after applyAttack setup)
    return processRanged();
  } else {
    isCloseCombat = true;
  }

  // ---- close-combat main path (0x761ae) ----
  // Copy pev.origin → local forward, zero x
  const fwd: Vector = { x: 0, y: pev.origin.y, z: pev.origin.z };
  UTIL_MakeVectors(fwd);

  // Compute unit velocity, fall back to (0,0,1) if mag ≈ 0
  const vp = velocity;
  const vmag = velocityMag;
  let unit: Vector;
  if (vmag > cvar_closeCombat_other) {
    // [eax+0xac] sqrt reload → magnitude > 1 → safe to divide
    unit = { x: 0, y: 0, z: cvar_closeCombat_other };
  } else {
    const inv = cvar_closeCombat_other / vmag;
    unit = { x: vp.x * inv, y: vp.y * inv, z: vp.z * inv };
  }

  // Dot product selects forward (==2) vs back (==3)
  const dot = unit.x * vp.x + unit.y * vp.y + unit.z * vp.z;
  attackType = (dot > /* closeCombatMulti [ebx-0x6de40] QWORD */ 0 ? 3 : 2) as 2 | 3;

  if (!isDoingAction) {
    return processCloseCombatPath();   //0x76458
  }

  // ---- in-water branch (0x76314) ----
  if (!hasD) {
    // not in water → frozen branch (0x76458) again
    return processCloseCombatPath();
  }
  // in water → process
  return processInWater();

  // ---- helpers ----
  function processRanged(): void { /* TODO */ }
  function processCloseCombatPath(): void { /* TODO */ }
  function processInWater(): void { /* TODO */ }
  // ...
}
