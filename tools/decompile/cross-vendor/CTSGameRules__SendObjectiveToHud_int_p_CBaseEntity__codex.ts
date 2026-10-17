```typescript
/**
 * CTSGameRules::SendObjectiveToHud — Send a HUD objective update to a
 * single recipient entity (typically a player).
 *
 * Validates the recipient and objective index, looks up the recipient's
 * team via GetTeamIndex, copies a per-team display string into a local
 * 64-byte buffer (when applicable), then opens a HUD message of type
 * gmsgObjective and writes: three strings derived from the objective's
 * goal entity, the recipient, and one final string.
 *
 * @param this     The CTSGameRules game-rules instance.
 * @param index    Objective index; must satisfy 0 <= index < m_nObjectives.
 * @param pEntity  Recipient entity; null is rejected.
 */
export function SendObjectiveToHud(
  this: any, // TODO: CTSGameRules
  index: number,
  pEntity: any, // TODO: CBaseEntity
): void {
  // Reject null recipient.
  if (!pEntity) return;

  // Bounds-check the index against m_nObjectives (+0x2d0).
  if (index < 0 || index >= this.m_nObjectives) return;

  // Local 64-byte string buffer (zero-initialized).
  let buffer = "\0";

  // Pointer to the index-th objective struct.
  // m_Objectives starts at +0x2d4; each entry is 20 bytes.
  // Layout: { goalEntity*, teamData[4] }.
  const obj = &this.m_Objectives[index];

  // Determine the recipient's team from its classname.
  // [pEntity+0x60] is dereferenced as a vtable pointer; vtable slot 0xd0
  // returns the classname string.
  // TODO(asm-ambiguous): exact role of [pEntity+0x60] (peer entity / interface).
  const classname = pEntity[0x60].vtableCall(0xd0)();
  const teamIndex = this.GetTeamIndex(classname);

  // If a valid team and non-zero per-team data exist, copy the per-team
  // string into the local buffer (64-byte cap, force null-terminated).
  if (teamIndex >= 0 && obj.teamData[teamIndex] !== 0) {
    // g_StringRegistry dereferenced then indexed at 0x98 yields a base
    // string pointer; teamData[teamIndex] is a byte offset within it.
    // TODO(asm-ambiguous): g_StringRegistry exact type.
    const src: any = g_StringRegistry[0][0x98] + obj.teamData[teamIndex];
    buffer = strncpy(src, 64);
    buffer = buffer + "\0"; // force null-termination at byte 64
  }

  // Begin a HUD message: dest=MSG_ONE, type=gmsgObjective, origin=NULL,
  // recipient=[pEntity+0]+0x208.
  // TODO(asm-ambiguous): [pEntity+0]+0x208 is the recipient passed to
  // MessageBegin (likely pev->somefield or an entity index).
  g_NetworkMsgHelper.messageBegin(
    MSG_ONE,                    // msg_dest
    gmsgObjective,              // msg_type
    null,                       // origin
    pEntity[0][0x208],          // recipient
  );

  // Write three strings derived from the objective's goal entity.
  // Each iteration: vtable slot 0xf8 fills the buffer with a string
  // from the goal entity; slot 0xd4 (WriteString) pushes the buffer.
  // TODO(asm-ambiguous): vtable slot 0xf8 likely returns the classname.
  for (let i = 0; i < 3; i++) {
    obj.goalEntity.vtableCall(0xf8)(buffer); // fill buffer
    g_NetworkMsgHelper.writeString(buffer); // slot 0xd4
  }

  // Write the recipient (likely as a short or entity reference).
  // TODO(asm-ambiguous): slot 0xc0 could be WriteShort or WriteEntity.
  g_NetworkMsgHelper.writeEntity(pEntity);

  // Write one more string (or possibly a coord).
  // TODO(asm-ambiguous): slot 0xd8 could be WriteCoord or WriteString.
  g_NetworkMsgHelper.writeString(buffer);

  // End the HUD message.
  g_NetworkMsgHelper.messageEnd();
}
```
