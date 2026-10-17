// Add these stubs near the existing declarations:
declare function readSvc(gotOffset: number): number;
declare function engineGetPitch(a: number, b: number, c: number): number;

// ...inside GoWallJump, replace the first broadcast:
const svcSpeed = readSvc(/* got+0x168c */ 0x168c);
engine.MessageBegin(/* MSG_ONE */ 1, svcSpeed, playerEnt.owner);
engine.WriteShort(Math.trunc(this.m_flJumpSpeed * SPEED_MULT));
engine.MessageEnd();

// ...and the SFX block:
const pitch = engineGetPitch(0, 0x1f, 0x3f000000) + 0x5f;
EMIT_SOUND_DYN(playerEnt.edict, /* channel */ 0x4,
               readFString(/* got-0x6c378 */ -0x6c378),
               /* vol */ 1.0, /* attn */ 0.8, pitch, /* flags */ 0);

// ...and the bonus block (note: msg_type comes from the `push 0x4`
// at 0x8a9d9; dest is entity+0x8, NOT velocity; svc is the second
// GOT-sourced value; intermediate WriteShort(eax) is added):
const svcBonus = readSvc(/* got+0x1d38 */ 0x1d38);
// TODO(asm-ambiguous): entity+0x8 is a pointer/lvalue the engine
//   expects in MessageBegin's dest slot — confirm in D.4 (entvars
//   layout) what field aliases offset 0x8.
engine.MessageBegin(/* msg_type */ 4, svcBonus, &playerEnt.fieldAt8);
engine.WriteLong(playerEnt.owner);
// TODO(asm-ambiguous): disasm writes short(eax) here, where eax
//   is the post-WriteLong return value (undefined) overwritten from
//   [esp] then pushed as a short. Mark as TODO until the engine
//   helper at offset 0x168 is resolved.
engine.WriteShort(/* TODO */ 0);
engine.WriteShort(/* bonus tick */ 2);
engine.MessageEnd();
