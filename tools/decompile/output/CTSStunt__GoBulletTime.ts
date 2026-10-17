export function GoBulletTime(this: CTSStunt): void {
  const self = this as any;
  const player: any = self.m_pPlayer;
  if (!player) return;

  // Bug 1 fix: m_pPlayer is CBasePlayer*; pev is the first member of
  // CBaseEntity (HLSDK layout). Dereference once.
  const pev: any = player[0];
  const vtable: any = player[0x60];

  // ---- 1. Guard ----
  const resource = vtable[4](player);
  if (resource >= ts.CONST_6EFE8) return;

  // ---- 2. UTIL_MakeVectors from cl_viewangle ----
  // (pev[0x74] is a TS-extended pev field; standard HLSDK v_angle
  // is at +0x5c, the +0x18 shift is TS layout.)
  UTIL_MakeVectors(pev[0x74]);

  // ---- 3. Snapshot dash direction (negated v_forward) on this ----
  const forward = gpGlobals.v_forward;
  self.field_0x20 = -forward.x;
  self.field_0x24 = -forward.y;
  self.field_0x28 = -forward.z;
  self.field_0x2c = 1;

  // ---- 4. Snapshot dash strength cvar + horizontal kick ----
  self.field_0x0 = ts.CONST_6DE90;
  self.field_0x34 = ts.CONST_6DE90 + forward.x;
  // NOTE: in the asm, field_0x30 is written at 0x8a6f6, AFTER the
  // lock-in-place + zero-velocity sequence. Moved here for narrative
  // grouping; semantically equivalent (no intervening read).

  // ---- 5. gmsgTSNextStunt + Animate ----
  g_engfuncs[0xb8 / 4](
    1,
    gmsgTSNextStunt.valueOf(),
    null,
    pev[0x208],
  );
  Animate_BulletTime(player + 0x28c, player, ANIM_BULLET_TIME);

  // ---- 6. Frame-count + vtable timers ----
  const frameCount = Math.floor(ts.CONST_6F06C * self.field_0x0);
  vtable[0xc0 / 4](player, frameCount);
  vtable[0xbc / 4](player);

  // ---- 7. Lock player in place ----
  pev[0x250] = (pev[0x250] as number) | 0x4 | 0x20;
  pev[0x2a0] = 0x3;

  // ---- 8. Zero velocity ----
  pev[0x174] = g_vecZero.x;
  pev[0x178] = g_vecZero.y;
  pev[0x17c] = g_vecZero.z;

  // ---- 9. field_0x30 (asm 8a6f6) — moved for grouping, see note above ----
  self.field_0x30 = ts.CONST_6DE90;

  // ---- 10. Bullet-time whoosh SFX ----
  // TODO(D.4): resolve against the 8-arg EMIT_SOUND_DYN signature —
  // see Bug 3 in the review. The current7-arg call drops the
  // &string arg at [ebx-0x6c364] which the demangled symbol
  // (FP7edict_siPCcffiif) lists as arg #3.
  const edForEmit: any = pev[0x208];
  const rawPtr: number = g_engfuncs[0x168 / 4](0, 0x1f);
  const resolvedPath: string =
    rawPtr === 0 ? ts.STR_6C364 : String(/* readCString(rawPtr + 0x5f) */);

  EMIT_SOUND_DYN(
    edForEmit,
    CHAN_VOICE,
    resolvedPath,
    1.0,
    0.8,
    0,
    0.5,
  );

  // ---- 11. Motion-blur message + slow-mo cycle ----
  g_engfuncs[0xb8 / 4](
    0x4,
    gmsgTSMotionBlur.valueOf(),
    pev[0x8],
    null,
  );
  // Bug 2 fix: asm pushes pev[0x208] (not player) as the explicit  // arg to vtable[71] at 0x8a7a0.
  const currentTier = vtable[0x11c / 4](pev[0x208]);
  vtable[0xc0 / 4](player, currentTier);
  vtable[0xc0 / 4](player, 2);
  vtable[0xbc / 4](player);
}
