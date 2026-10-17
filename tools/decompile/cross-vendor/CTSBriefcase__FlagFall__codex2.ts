/**
 * CTSBriefcase::FlagFall — drops the carried flag from the briefcase into the world.
 *
 * Creates a new CTSFlag at the briefcase's s_flag_status slot (no owning player),
 * gives it a launch velocity of (pev.velocity + pev.basevelocity) scaled by
 * the `slowamt` cvar, marks the briefcase as having dropped its flag,
 * broadcasts a 4-byte client message (MSG_ALL, id = *GOT[0x1f20], payload:
 * 0, team, roundOrId+1, 0), schedules the next think as
 * gpGlobals->time + delayConstant, and resets two state fields.
 *
 * @param this  The CTSBriefcase entity instance.
 * @returns     void
 */
export function FlagFall(this: any): void {
  // PIC / GOT base computed in the prologue (call $+5 ; pop ebx ; add ebx, 0xe8405).
  // The runtime will expose this; for D.3 we read through a stub.
  const GOT: any = 0;
  const self: any = this;

  // 1. CTSFlag::CreateFlag(nullptr, &this->m_FlagStatus)
  //    cdecl right-to-left push order: push &m_FlagStatus; push 0; call
  const flag: any = (globalThis as any).CTSFlag_CreateFlag(
    /* CBasePlayer*   */ null,
    /* s_flag_status* */ { __ptr: self.field_0x90 }, // LEA — pass address, not value
  );

  // 2. flag->m_bDroppedState = 0
  flag.field_0x88 = 0;

  // 3. flag->pev.velocity = (this->pev.velocity + this->pev.basevelocity) * slowamt
  //    cvar `slowamt` lives in the GOT at offset -0x6ec2c (float, single-precision).
  const pev: any     = self.subobj;       // this->pev (entvars_t*)
  const flagPe: any  = flag.subobj;       // flag->pev
  const slowamt: number = (GOT as any)[(-0x6ec2c) >>> 0];
  flagPe.field_0x08 = (pev.field_0xdc + pev.field_0xe8) * slowamt; // x
  flagPe.field_0x0c = (pev.field_0xe0 + pev.field_0xec) * slowamt; // y
  flagPe.field_0x10 = (pev.field_0xe4 + pev.field_0xf0) * slowamt; // z

  // 4. this->m_bHasDropped = 1
  self.field_0x64 = 1;

  // 5. Broadcast "flag dropped" to all clients.
  //    Disassembly: push 0; push 0; push msg_id; push 2; call [esi+0xb8]
  //    cdecl right-to-left → pfnMessageBegin(MSG_ALL=2, msg_id, NULL, NULL)
  const eng: any  = (GOT as any)[0x1aa8];                // g_engfuncs
  const msgId: number = ((GOT as any)[0x1f20] as any)[0]; // network message id
  eng.pfnMessageBegin(/* msg_dest */ 2, /* msg_type */ msgId, /* pOrigin */ 0, /* ed */ 0);
  eng.pfnWriteByte(0);                              // padding
  eng.pfnWriteByte(self.field_0x98);                // team id
  eng.pfnWriteByte((self.field_0x9c + 1) & 0xff);   // round/score counter + 1
  eng.pfnWriteByte(0);                              // padding
  eng.pfnMessageEnd();

  // 6. Schedule next think: this->pev.nextthink = gpGlobals->time + delayConstant
  //    delayConstant is a static double at [ebx-0x6f018] (loaded as QWORD).
  const gpGlobals: any       = ((GOT as any)[0x1600] as any)[0];
  const delayConstant: number = (GOT as any)[(-0x6f018) >>> 0];
  pev.field_0x104 = delayConstant + gpGlobals.time;

  // 7. Reset two state fields.
  //    The 0xffff0000 value is a signed -1 sentinel (likely "stop thinking" / state reset).
  //    The [ebx+0x1c1c] value is a model index or state constant; TODO(asm-ambiguous)
  //    whether it's a modelindex or a state-machine enum.
  self.field_0x0c = 0xffff0000;
  self.field_0x10  = (GOT as any)[0x1c1c];
}
