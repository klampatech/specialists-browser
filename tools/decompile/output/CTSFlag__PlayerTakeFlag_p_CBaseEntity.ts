/**
 * CTSFlag::PlayerTakeFlag — handle a player touching the flag entity.
 *
 * Decompiled from `ts/dlls/ts_i386.so` at0x0008e330 (682 B).
 * Field names and globals marked TODO need D.4 / cross-reference
 * verification before being treated as authoritative.
 */
export function PlayerTakeFlag(this: CTSFlag, pOther: CBaseEntity): void {
  const flag = this as any;
  const player = pOther as any;

  // TODO(field-name): +0xac byte. Non-zero means the flag is in a
  // transitional state (e.g. mid-respawn) and can't be picked up.
  if (flag.m_bDisabled !== 0) return;

  // ── Validate pOther is a live, non-spectator player ──
  // [pOther+0x60] holds an interface pointer (pev? or wrapper?). vtable
  // indices 0xc8 / 0xb4 read as IsPlayer / IsAlive; +0x118 is deadflag.
  const ent = player.engineWrapper as any;
  if (!ent) return;
  if (!ent.IsPlayer()) return;              // vtable +0xc8
  if (!ent.IsAlive()) return;               // vtable +0xb4
  if (ent.deadflagByte < 0) return;         // signed byte at +0x118

  // vtable +0xd0 → team-name string; mapped to a small int.
  const playerTeam = GetTeamIndex(ent.GetTeamID());

  // TODO(field-name): +0x9c dword. -1 = neutral (either team may take it).
  // Otherwise the opposing team takes it; touching from the owning team
  // counts as a capture.
  const owningTeam = flag.m_iOwningTeam;

  if (owningTeam !== -1 && owningTeam === playerTeam) {
    // ── Capture path ──
    // TODO(field-name): +0x8c dword. Zero means the flag isn't eligible
    // for capture right now (already returned / at rest).
    if (flag.m_bCaptureArmed === 0) return;

    // TODO(field-name): +0xa4 EHANDLE → m_hBase (home base entity).
    // Asm: EHANDLE op runs *before* the +0x8c check (output is equivalent
    // because both early-return on the same conditions).
    const base = flag.m_hBase.Get() as any;
    if (!base) return;

    // Bookkeeping on the home base entity. Offsets +0xc and +0x10 are real
    // but the semantics are guesses. TODO(field-name): base+0xc, base+0x10;
    // global at [ebx+0x1ccc].
    base.captureFlag_0xc = 0xffff0000;
    base.captureFlag_0x10 = gCaptureSomethingElse;

    // Capture timer. Asm computes:
    //   edx  = *(base+0)
    //   eax  = *(*[ebx+0x1600])        // double-dereference (float ptr)
    //   esi  = [ebx-0x6f3fc]           // global float bits
    //   *(edx+0x104) += esi + *(eax)   // add two floats
    // The TS below drops the *(*[ebx+0x1600]) addend.
    // TODO(asm-ambiguous): restore the second addend and confirm offsets.
    base.engineWrapper.captureReturnTimer += gCaptureTimeScalar;

    flag.Destroy();

    // EMIT_SOUND_DYN has 7 typed params; asm pushes 8 dwords (1 leftover
    // from prior sub esp, 0x14). The 8th arg's role is unclear.
    // TODO(asm-ambiguous): confirm the 8th EMIT_SOUND_DYN arg.
    // TODO(field-name): [edx+0x208] where edx = *(player+0). Unclear what
    // *(player+0) actually is — not safe to call it "pev->containing_edict".
    EMIT_SOUND_DYN(
      player.edict, // [edx+0x208] (identity uncertain)
      3,                              // CHAN_ITEM
      "ts/flags/capture.wav",         // sample path at [ebx-0x6c918]
      gCaptureVolume,                 // float bits, from [ebx-0x6f3fc]
      gCaptureAttenuation,            // from [ebx-0x6e7e4]
      0,                              // pitch
      0x64,                           // flags = 100
      gSoundLevel,                    // from [ebx-0x6ec2c] — extra arg?
    );

    // Only broadcast a HUD message / update scoreboard if more than one
    // player is connected.
    if (CountPlayers() <= 1) return;

    // Bump frags by 5. Asm: fadd [edx+0x164]; fstp [edx+0x164]. Offset
    // 0x164 likely maps to entvars_t->frags on the engine wrapper.
    player.engineWrapper.frags = player.engineWrapper.frags + 5;

    // Format string at [ebx-0x6c170] (not verified against strings dump).
    // Asm pushes 5 as the trailing vararg. TODO(string-verify).
    const msg = UTIL_VarArgs(
      "%s captured the flag!",          // [ebx-0x6c170]
      player.engineWrapper.netname,
      5,                                // extra vararg
    );
    // TSHudMessageAll has 7 typed params (Uc, Uc, Uc, i, c, i, Pc).
    // The 5th arg (c type) is 0 in the asm and was previously dropped.
    TSHudMessageAll(0, 0xff, 0, 4, 0, 30, msg);

    // ── Scoreboard svc update ──
    // [ebx+0x1aa8] = svc messages interface; [ebx+0x12f8] = its data.
    // Asm pushes 4 args to Begin (2, longVal, 0, 0); TS had only 2.
    const svc = gSvcMessages;
    const svcData = gSvcData;
    svc.Begin(2, svcData.longVal, 0, 0); // vtable +0xb8
    svc.WriteLong(player.edict.index);                            // vtable +0x11c
    svc.EndHeader();                                              // vtable +0xc0
    svc.WriteShort(Math.floor(player.engineWrapper.frags));       // vtable +0xc8 (1st)
    svc.WriteShort(player.m_iPrimaryWeapon);                      // [edi+0xb30] +0xc8 (2nd)
    svc.WriteShort(0);                                            // +0xc8 (3rd)
    // [ebx+0x2060] resolves to an interface whose vtable +0xd0 counts
    // the player's weapon array at +0xb48. Result bumped by 1.
    // TODO(field-name): +0xb48 array; +0x1d0? unclear.
    const wpnCount = gWeaponArrayHelper.GetCount(player.m_rgpPlayerItems);
    svc.WriteShort(wpnCount + 1);                                 // vtable +0xc8 (4th)
    svc.End();                                                    // vtable +0xbc
    return;
  }

  // ── Take-flag path ──
  // TODO(field-name): +0x90 s_flag_status passed to TakeFlag.
  if (!player.TakeFlag(flag.m_sFlagStatus)) return;

  // When m_bCaptureArmed is 0 (flag at home, never moved) AND the base
  // EHANDLE resolves, clear byte +0x64 on the base. Otherwise skip.
  // TODO(field-name): +0x64 byte on base; +0xa4 EHANDLE (re-resolved here).
  if (flag.m_bCaptureArmed === 0 && base) {
    base.hasFlag_0x64 = 0;
  }

  flag.Destroy();
}

// ── Engine globals / wrappers (declared for isolation) ──
declare const gSvcMessages: any;
declare const gSvcData: any;
declare const gWeaponArrayHelper: any;
declare const gCaptureSomethingElse: any;
declare const gCaptureTimeScalar: number;
declare const gCaptureVolume: number;
declare const gCaptureAttenuation: number;
declare const gSoundLevel: any;
declare function GetTeamIndex(teamName: string): number;
declare function EMIT_SOUND_DYN(...args: any[]): void;
declare function CountPlayers(): number;
declare function UTIL_VarArgs(fmt: string, ...args: any[]): string;
declare function TSHudMessageAll(
  r: number, g: number, b: number,
  x: number, c: number, y: number, msg: string,
): void;
