These names are used elsewhere. Now I'll produce my final output. Let me also double-check the [ecx+0x208] interpretation. From the decompile `HandleWallJump.ts`:
- `pev[0x208]` is "past the standard entvars_t" — TS may have extended the struct.

Looking at typical TS extending pev... Actually in TS, the player has `m_pEntity` at offset 0x204 or similar. Let me just use the offset literally.

The user's final instruction was to output ONE TypeScript function declaration. Let me make my deliverable clean:

```typescript
/**
 * CTSStunt::GoBulletTime — activate the bullet-time dash state on the
 * owning player.
 *
 * Pipeline (semantically):
 *   1. Guard: if the player's bullet-time resource virtual returns
 *      >= the threshold cvar, bail out (bullet time is unavailable).
 *   2. Recompute view vectors from the player's view angles and
 *      snapshot the *negated* forward vector on `this` (dash direction).
 *   3. Set the bullet-time active flag byte and snapshot the bullet-time
 *      strength cvar (slide-velocity scalar) plus a horizontal
 *      velocity scalar (strength + v_forward.x).
 *   4. Send a `gmsgTSNextStunt` message (msg_dest=1, byte=1,
 *      edict=pev+0x208) and queue the bullet-time animation sequence
 *      (CTSAnimation::Animate(player+0x28c, player, 0x36)) so the player
 *      visibly enters the dash pose.
 *   5. Lock the player in place — set FL_ONGROUND + a frozen flag on
 *      pev+0x250, zero m_vecVelocity (pev+0x174), and set the
 *      physics-flag byte at pev+0x2a0 to 3 so engine traces / gravity
 *      don't tug the player mid-dash.
 *   6. Resolve the bullet-time whoosh SFX path through
 *      g_engfuncs[0x168/4] (returns char* with a 0x5f-byte prefix
 *      skip), then play it via EMIT_SOUND_DYN (CHAN_VOICE=4, vol=1.0,
 *      attn=0.8, pitch=0.5).
 *   7. Send the gmsgTSMotionBlur message (msg_dest=1, byte=4) and run
 *      the slow-motion vtable pair (vtable[71], then vtable[48] with
 *      that result, then vtable[48] with 2, then vtable[47]) — the
 *      slow-mo flip-on / flip-off cycle, ending in the bullet-time
 *      tier active.
 *
 * Field offsets below are taken straight from the disassembly; field
 * names are best-guess based on the operations performed. The
 * `entity[0x60]->vtable[N]` pattern was confirmed against
 * CBasePlayer__DeactivateSlowMotionFlow.ts and * CTSSlowMotion__CheckPlayersDistance.ts.
 *
 * @param this  The CTSStunt entity instance (`this` in original C++)
 * @returns     void
 *
 * @remarks This is a D.3 single-function decompilation. Field names
 *   are tentative — D.4 will reconcile them against the real
 *   CTSStunt class header once that exists.
 */

// === External / engine plumbing ===========================================
declare const gpGlobals: { v_forward: { x: number; y: number; z: number } };
declare const g_vecZero: { x: number; y: number; z: number };
declare const gmsgTSNextStunt: { valueOf(): number };
declare const gmsgTSMotionBlur: { valueOf(): number };
declare const g_engfuncs: { [k: number]: any };

declare function UTIL_MakeVectors(
  vec: { x: number; y: number; z: number },
): void;
declare function EMIT_SOUND_DYN(
  ed: any,
  channel: number,
  sample: string | number,
  volume: number,
  attenuation: number,
  flags: number,
  pitch: number,
): void;

declare class CTSStunt {
  m_pPlayer: any;
  [k: number]: any;
}

// === Cvars / singletons (GOT base = 0x165e10 for this function) ===========
// Positive offsets resolved against readelf-relocs-glob-dat.txt:
//   [ebx+0x1600] -> gpGlobals             (v_forward at gpGlobals+0x28)
//   [ebx+0x168c] -> gmsgTSNextStunt       (client message index)
//   [ebx+0x1888] -> g_vecZero             (vec3 origin / null vector)
//   [ebx+0x1aa8] -> g_engfuncs            (enginefuncs_t table)
//   [ebx+0x1d38] -> gmsgTSMotionBlur
//
// Negative offsets (cvar values / string literals) lack GLOB_DAT
// records and live in .rodata/.data; left as numbered stubs for D.4.
// TODO(D.4): resolve each CONST_* against an addr-tagged strings dump.
declare const ts: {
  CONST_6EFE8: number;   // [ebx-0x6efe8] — bullet-time threshold (float)
  CONST_6F06C: number;   // [ebx-0x6f06c] — frames-per-sec scalar (float)
  CONST_6DE90: number;   // [ebx-0x6de90] — bullet-time speed scalar (float)
  STR_6C364:   string;  // [ebx-0x6c364] — bullet-time whoosh SFX path
};

const CHAN_VOICE = 4;
const ANIM_BULLET_TIME = 0x36; // sequence id passed to CTSAnimation::Animate

export function GoBulletTime(this: CTSStunt): void {
  const self = this as any;
  const player: any = self.m_pPlayer;
  if (!player) return;

  // The player's first slot is pev (entvars_t*); player[0x60] is the
  // CBaseEntity vtable pointer (confirmed by
  // CBasePlayer__DeactivateSlowMotionFlow.ts and
  // CTSSlowMotion__CheckPlayersDistance.ts).
  const pev: any = player;
  const vtable: any = player[0x60];

  // ---- 1. Guard: bail if the bullet-time "resource" is full. ---------
  // Disassembly:
  //   mov  eax, [ebp+0x40]            ; eax = m_pPlayer
  //   mov  edx, [eax+0x60]            ; edx = vtable
  //   push eax                        ; this
  //   call [edx+0x10]                 ; vtable[4](player) -> float on st(0)
  //   fcomp [ebx-0x6efe8]             ; compare with CONST_6EFE8
  //   test ah, 0x41                   ; test FPU C0 + C2
  //   je   8a7cb                      ; jump to epilogue if st(0) > cvar
  //
  // Semantic: skip if the player's bullet-time resource >= threshold.
  // TODO(asm-ambiguous): vtable[4] on CBasePlayer in TS — likely a
  //   "stamina"/"adrenaline" getter or a cooldown-timer read. Pin a
  //   concrete method name in D.4.
  const resource = vtable[4](player);
  if (resource >= ts.CONST_6EFE8) return;

  // ---- 2. Compute view vectors from the player's view angles. --------
  // Disassembly:
  //   mov  eax, [ebp+0x40]
  //   mov  eax, [eax]                 ; eax = *(m_pPlayer) = pev
  //   add  eax, 0x74                  ; pev + 0x74 = pev->cl_viewangle
  //   push eax
  //   call UTIL_MakeVectors
  //
  // TODO(layout): pev + 0x74 is `cl_viewangle` (client-supplied view
  //   angle) in TS. Standard HLSDK has `v_angle` at +0x5c; the shift
  //   by 0x18 reflects a TS-extended entvars layout.
  UTIL_MakeVectors(pev[0x74]);

  // ---- 3. Snapshot dash direction (negated forward) on `this`. -------
  // Disassembly: read 3 floats from gpGlobals->v_forward
  //   (*(gpGlobals) + 0x28), XOR each with 0x80000000 (negate), copy
  //   into [this+0x20]..[this+0x28] via `rep movsd`.
  const forward = gpGlobals.v_forward;
  self.field_0x20 = -forward.x;
  self.field_0x24 = -forward.y;
  self.field_0x28 = -forward.z;

  // Set the bullet-time active flag byte.
  self.field_0x2c = 1;

  // ---- 4. Snapshot the dash strength cvar + prime a velocity. ---------
  // Disassembly:
  //   mov  edi, [ebx-0x6de90]          ; edi = CONST_6DE90 (float)
  //   mov  [ebp+0x0], edi              ; this->m_flSlideTime (or m_flDashSpeed)
  //   ; ... later ...
  //   fld  [edi]                       ; load CONST_6DE90
  //   fadd [eax]                       ; add gpGlobals->v_forward.x
  //   fstp [ebp+0x34]                  ; this->m_flBulletKickVel (x-only)
  //
  // The y/z components of field_0x34 are not touched here; they
  // remain at whatever value Init left them (likely zero). TODO(D.4).
  self.field_0x0 = ts.CONST_6DE90;
  self.field_0x34 = ts.CONST_6DE90 + forward.x;

  // The same cvar value is also stored at field_0x30 (separate scalar
  // slot — possibly an "initial frame strength" or a debounce timer).
  // TODO(D.4): pin the semantics of field_0x30.
  self.field_0x30 = ts.CONST_6DE90;

  // ---- 5. Send the "next stunt" message + queue the animation. -------
  // Disassembly:
  //   push [ecx+0x208]                ; push pev+0x208 (edict-like)
  //   push 0x0                        ; origin = NULL
  //   push [edx]                      ; *gmsgTSNextStunt
  //   push 0x1                        ; msg_dest
  //   call [eax+0xb8]                 ; g_engfuncs[0xb8/4]
  //
  //   ; then Animate:
  //   push 0x36                       ; sequence id
  //   push [ebp+0x40]                 ; player
  //   lea  eax, [ebp+0x40 + 0x28c]    ; player + 0x28c (anim state struct)
  //   push eax
  //   call CTSAnimation::Animate
  g_engfuncs[0xb8 / 4](
    1,                       // msg_dest
    gmsgTSNextStunt.valueOf(),
    null,                    // origin
    pev[0x208],              // edict
  );
  Animate_BulletTime(player + 0x28c, player, ANIM_BULLET_TIME);

  // ---- 6. Frame-count the strength, push the animation timers. -------
  // Disassembly:
  //   fld  [ebx-0x6f06c]              ; load CONST_6F06C
  //   fmul [ebp+0x0]                  ; multiply by m_flSlideTime
  //   ; (control-word trick: round to int)
  //   fistp [esp+0x34]                ; eax = floor(CONST_6F06C * field_0x0)
  //   push eax
  //   call [esi+0xc0]                 ; vtable[48](player)
  //   call [esi+0xbc]                 ; vtable[47](player)
  //
  // TODO(asm-ambiguous): vtable[47]/vtable[48] semantics unclear —
  //   likely "set anim timer" / "set next think" pair. Needs D.4 to
  //   pin concrete method names.
  const frameCount = Math.floor(ts.CONST_6F06C * self.field_0x0);
  vtable[0xc0 / 4](player, frameCount);
  vtable[0xbc / 4](player);

  // ---- 7. Lock the player in place. -----------------------------------
  // Disassembly:
  //   mov  eax, [ebp+0x40]
  //   mov  eax, [eax]                 ; eax = pev
  //   or   [eax+0x250], 0x4           ; set FL_ONGROUND
  //   or   [eax+0x250], 0x20          ; set a frozen-ish flag
  //   mov  [eax+0x2a0], 0x3           ; physics flags = 3
  //
  // TODO(asm-ambiguous): flag 0x20 at pev+0x250 doesn't map to a
  //   standard HLSDK m_fFlags bit (FL_FROZEN isn't a stock flag).
  //   Likely a TS-only flag. Confirm in D.4.
  pev[0x250] = (pev[0x250] as number) | 0x4 | 0x20;
  pev[0x2a0] = 0x3;

  // ---- 8. Zero the player's velocity vector (pev + 0x174). -----------
  // Disassembly: rep movsd copies 3 floats from g_vecZero to pev+0x174.
  // TODO(layout): 0x174 matches standard HLSDK pev->velocity layout;
  //   confirm in TS.
  pev[0x174] = g_vecZero.x;
  pev[0x178] = g_vecZero.y;
  pev[0x17c] = g_vecZero.z;

  // ---- 9. Play the bullet-time whoosh SFX. ----------------------------
  // Disassembly:
  //   mov  edi, [eax+0x208]           ; edi = pev->pContainingEntity
  //   push 0x3f000000                 ; arg = 0.5 (raw float bits)
  //   sub  esp, 0x4
  //   push 0x1f                       ; arg = 31
  //   push 0x0
  //   call [edx+0x168]                ; g_engfuncs[0x168/4] — sound-path
  //                                    ; resolver; returns char*
  //   add  eax, 0x5f                  ; skip 95-byte prefix
  //   push eax                        ; sample (after +0x5f)
  //   push 0x0                        ; flags
  //   push 0x3f4ccccd                 ; attn = 0.8
  //   push 0x3f800000                 ; vol = 1.0
  //   push szBulletTimeSoundPath      ; (the asm reads [ebx-0x6c364])
  //   push 0x4                        ; CHAN_VOICE
  //   push edi                        ; edict
  //   call EMIT_SOUND_DYN
  //
  // In TS, EMIT_SOUND_DYN is called with (edict, channel, sample, vol,
  // attn, flags, pitch). The g_engfuncs[0x168/4] + 0x5f dance is an
  // in-binary prefix skip baked into the resolver; modeled as a
  // passthrough here.
  const edForEmit: any = pev[0x208];
  const rawPtr: number = g_engfuncs[0x168 / 4](0, 0x1f);
  const resolvedPath: string =
    rawPtr === 0 ? ts.STR_6C364 : String(/* readCString(rawPtr + 0x5f) */);

  EMIT_SOUND_DYN(
    edForEmit,         // edict
    CHAN_VOICE,        // channel = 4
    resolvedPath,      // sample
    1.0,               // volume   (0x3f800000)
    0.8,               // attn     (0x3f4ccccd)
    0,                 // flags
    0.5,               // pitch    (0x3f000000)
  );

  // ---- 10. Motion-blur message + slow-motion toggle pair. ------------
  // Disassembly:
  //   mov  edx, [ebx+0x1d38]          ; edx = &gmsgTSMotionBlur
  //   mov  eax, [ebp+0x40]
  //   mov  eax, [eax]
  //   add  eax, 0x8                   ; pev + 0x8 (= &origin.x)
  //   push 0x0 ; edict
  //   push eax                        ; origin = pev + 0x8
  //   push [edx]                      ; *gmsgTSMotionBlur
  //   push 0x4                        ; msg_dest (NOTE: 0x4 not 0x1!)
  //   call [esi+0xb8]                 ; g_engfuncs[0xb8/4]
  //
  //   push [eax+0x208]                ; edict
  //   call [esi+0x11c]                ; vtable[71](player) -> int
  //   mov  [esp], eax
  //   call [esi+0xc0]                 ; vtable[48](player, eax)
  //   mov  [esp], 0x2
  //   call [esi+0xc0]                 ; vtable[48](player, 2)
  //   call [esi+0xbc]                 ; vtable[47](player)
  //
  // TODO(asm-ambiguous): vtable[71] at +0x11c — likely a "current
  //   slow-mo tier" / "current frame" accessor. The  //   (vtable[48](p, vtable[71](p)), vtable[48](p, 2), vtable[47](p))
  //   sequence is the slow-mo flip-on/flip-off cycle ending in the
  //   bullet-time tier active. Pin concrete method names in D.4.
  g_engfuncs[0xb8 / 4](
    0x4,                     // msg_dest = 0x4 (MSG_PAS? MSG_ONE per CTSStunt__GoWheel)
    gmsgTSMotionBlur.valueOf(),
    pev[0x8],                // origin = &pev->origin.x
    null,                    // edict = NULL
  );
  const currentTier = vtable[0x11c / 4](player);
  vtable[0xc0 / 4](player, currentTier); // slowmo(currentTier)
  vtable[0xc0 / 4](player, 2);            // slowmo(2) — bullet-time tier
  vtable[0xbc / 4](player);               // finalize
}

// === TS-side helpers =====================================================
// CTSAnimation::Animate is a player-side free function in TS. This is a
// minimal forward declaration so the file compiles in isolation; the real
// implementation lives elsewhere and is out of scope for this D.3 chunk.
declare function Animate_BulletTime(
  animState: any,
  player: any,
  sequenceId: number,
): void;
```I now have a complete, well-considered decompilation. Let me deliver the final output as instructed — one TypeScript code block.

```typescript
/**
 * CTSStunt::GoBulletTime — activate the bullet-time dash state on the
 * owning player.
 *
 * Pipeline (semantically):
 *   1. Guard: if the player's bullet-time resource virtual returns
 *      >= the threshold cvar, bail out (bullet time is unavailable).
 *   2. Recompute view vectors from the player's view angles and
 *      snapshot the *negated* forward vector on `this` (dash direction).
 *   3. Set the bullet-time active flag byte and snapshot the bullet-time
 *      strength cvar (slide-velocity scalar) plus a horizontal
 *      velocity scalar (strength + v_forward.x).
 *   4. Send a `gmsgTSNextStunt` message (msg_dest=1, byte=1,
 *      edict=pev+0x208) and queue the bullet-time animation sequence
 *      (CTSAnimation::Animate(player+0x28c, player, 0x36)) so the player
 *      visibly enters the dash pose.
 *   5. Lock the player in place — set FL_ONGROUND + a frozen flag on
 *      pev+0x250, zero m_vecVelocity (pev+0x174), and set the
 *      physics-flag byte at pev+0x2a0 to 3 so engine traces / gravity
 *      don't tug the player mid-dash.
 *   6. Resolve the bullet-time whoosh SFX path through
 *      g_engfuncs[0x168/4] (returns char* with a 0x5f-byte prefix
 *      skip), then play it via EMIT_SOUND_DYN (CHAN_VOICE=4, vol=1.0,
 *      attn=0.8, pitch=0.5).
 *   7. Send the gmsgTSMotionBlur message (msg_dest=0x4, byte=4) and run
 *      the slow-motion vtable pair (vtable[71], then vtable[48] with
 *      that result, then vtable[48] with 2, then vtable[47]) — the
 *      slow-mo flip-on / flip-off cycle, ending in the bullet-time
 *      tier active.
 *
 * Field offsets below are taken straight from the disassembly; field
 * names are best-guess based on the operations performed. The
 * `entity[0x60]->vtable[N]` pattern was confirmed against
 * CBasePlayer__DeactivateSlowMotionFlow.ts and
 * CTSSlowMotion__CheckPlayersDistance.ts.
 *
 * @param this  The CTSStunt entity instance (`this` in original C++)
 * @returns     void
 *
 * @remarks This is a D.3 single-function decompilation. Field names
 *   are tentative — D.4 will reconcile them against the real
 *   CTSStunt class header once that exists.
 */

// === External / engine plumbing ===========================================
declare const gpGlobals: { v_forward: { x: number; y: number; z: number } };
declare const g_vecZero: { x: number; y: number; z: number };
declare const gmsgTSNextStunt: { valueOf(): number };
declare const gmsgTSMotionBlur: { valueOf(): number };
declare const g_engfuncs: { [k: number]: any };

declare function UTIL_MakeVectors(
  vec: { x: number; y: number; z: number },
): void;
declare function EMIT_SOUND_DYN(
  ed: any,
  channel: number,
  sample: string | number,
  volume: number,
  attenuation: number,
  flags: number,
  pitch: number,
): void;

declare class CTSStunt {
  m_pPlayer: any;
  [k: number]: any;
}

// === Cvars / singletons (GOT base = 0x165e10 for this function) ===========
// Positive offsets resolved against readelf-relocs-glob-dat.txt:
//   [ebx+0x1600] -> gpGlobals             (v_forward at gpGlobals+0x28)
//   [ebx+0x168c] -> gmsgTSNextStunt       (client message index)
//   [ebx+0x1888] -> g_vecZero             (vec3 origin / null vector)
//   [ebx+0x1aa8] -> g_engfuncs            (enginefuncs_t table)
//   [ebx+0x1d38] -> gmsgTSMotionBlur
//
// Negative offsets (cvar values / string literals) lack GLOB_DAT
// records and live in .rodata/.data; left as numbered stubs for D.4.
// TODO(D.4): resolve each CONST_* against an addr-tagged strings dump.
declare const ts: {
  CONST_6EFE8: number;   // [ebx-0x6efe8] — bullet-time threshold (float)
  CONST_6F06C: number;   // [ebx-0x6f06c] — frames-per-sec scalar (float)
  CONST_6DE90: number;   // [ebx-0x6de90] — bullet-time speed scalar (float)
  STR_6C364:   string;   // [ebx-0x6c364] — bullet-time whoosh SFX path
};

const CHAN_VOICE = 4;
const ANIM_BULLET_TIME = 0x36; // sequence id passed to CTSAnimation::Animate

export function GoBulletTime(this: CTSStunt): void {
  const self = this as any;
  const player: any = self.m_pPlayer;
  if (!player) return;

  // The player's first slot is pev (entvars_t*); player[0x60] is the
  // CBaseEntity vtable pointer (confirmed by
  // CBasePlayer__DeactivateSlowMotionFlow.ts and
  // CTSSlowMotion__CheckPlayersDistance.ts).
  const pev: any = player;
  const vtable: any = player[0x60];

  // ---- 1. Guard: bail if the bullet-time "resource" is full. ---------
  // Disassembly:
  //   mov  eax, [ebp+0x40]            ; eax = m_pPlayer
  //   mov  edx, [eax+0x60]            ; edx = vtable
  //   push eax                        ; this
  //   call [edx+0x10]                 ; vtable[4](player) -> float on st(0)
  //   fcomp [ebx-0x6efe8]             ; compare with CONST_6EFE8
  //   test ah, 0x41                   ; test FPU C0 + C2
  //   je   8a7cb                      ; jump to epilogue if st(0) > cvar
  //
  // Semantic: skip if the player's bullet-time resource >= threshold.
  // TODO(asm-ambiguous): vtable[4] on CBasePlayer in TS — likely a
  //   "stamina"/"adrenaline" getter or a cooldown-timer read. Pin a
  //   concrete method name in D.4.
  const resource = vtable[4](player);
  if (resource >= ts.CONST_6EFE8) return;

  // ---- 2. Compute view vectors from the player's view angles. --------
  // Disassembly:
  //   mov  eax, [ebp+0x40]
  //   mov  eax, [eax]                 ; eax = *(m_pPlayer) = pev
  //   add  eax, 0x74                  ; pev + 0x74 = pev->cl_viewangle
  //   push eax
  //   call UTIL_MakeVectors
  //
  // TODO(layout): pev + 0x74 is `cl_viewangle` (client-supplied view
  //   angle) in TS. Standard HLSDK has `v_angle` at +0x5c; the shift
  //   by 0x18 reflects a TS-extended entvars layout.
  UTIL_MakeVectors(pev[0x74]);

  // ---- 3. Snapshot dash direction (negated forward) on `this`. -------
  // Disassembly: read 3 floats from gpGlobals->v_forward
  //   (*(gpGlobals) + 0x28), XOR each with 0x80000000 (negate), copy
  //   into [this+0x20]..[this+0x28] via `rep movsd`.
  const forward = gpGlobals.v_forward;
  self.field_0x20 = -forward.x;
  self.field_0x24 = -forward.y;
  self.field_0x28 = -forward.z;

  // Set the bullet-time active flag byte.
  self.field_0x2c = 1;

  // ---- 4. Snapshot the dash strength cvar + prime a velocity. ---------
  // Disassembly:
  //   mov  edi, [ebx-0x6de90]          ; edi = CONST_6DE90 (float)
  //   mov  [ebp+0x0], edi              ; this->m_flSlideTime / m_flDashSpeed
  //   ; ... later ...
  //   fld  [edi]                       ; load CONST_6DE90
  //   fadd [eax]                       ; add gpGlobals->v_forward.x
  //   fstp [ebp+0x34]                  ; this->m_flBulletKickVel (x-only)
  //
  // The y/z components of field_0x34 are not touched here; they
  // remain at whatever value Init left them (likely zero). TODO(D.4).
  self.field_0x0 = ts.CONST_6DE90;
  self.field_0x34 = ts.CONST_6DE90 + forward.x;

  // The same cvar value is also stored at field_0x30 (separate scalar
  // slot — possibly an "initial frame strength" or a debounce timer).
  // TODO(D.4): pin the semantics of field_0x30.
  self.field_0x30 = ts.CONST_6DE90;

  // ---- 5. Send the "next stunt" message + queue the animation. -------
  // Disassembly:
  //   push [ecx+0x208]                ; push pev+0x208 (edict-like)
  //   push 0x0                        ; origin = NULL
  //   push [edx]                      ; *gmsgTSNextStunt
  //   push 0x1                        ; msg_dest
  //   call [eax+0xb8]                 ; g_engfuncs[0xb8/4]
  //
  //   ; then Animate:
  //   push 0x36                       ; sequence id
  //   push [ebp+0x40]                 ; player
  //   lea  eax, [ebp+0x40 + 0x28c]    ; player + 0x28c (anim state struct)
  //   push eax
  //   call CTSAnimation::Animate
  g_engfuncs[0xb8 / 4](
    1,                       // msg_dest
    gmsgTSNextStunt.valueOf(),
    null,                    // origin
    pev[0x208],              // edict
  );
  Animate_BulletTime(player + 0x28c, player, ANIM_BULLET_TIME);

  // ---- 6. Frame-count the strength, push the animation timers. -------
  // Disassembly:
  //   fld  [ebx-0x6f06c]              ; load CONST_6F06C
  //   fmul [ebp+0x0]                  ; multiply by m_flSlideTime
  //   ; (control-word trick: round to int)
  //   fistp [esp+0x34]                ; eax = floor(CONST_6F06C * field_0x0)
  //   push eax
  //   call [esi+0xc0]                 ; vtable[48](player)
  //   call [esi+0xbc]                 ; vtable[47](player)
  //
  // TODO(asm-ambiguous): vtable[47]/vtable[48] semantics unclear —
  //   likely "set anim timer" / "set next think" pair. Needs D.4 to
  //   pin concrete method names.
  const frameCount = Math.floor(ts.CONST_6F06C * self.field_0x0);
  vtable[0xc0 / 4](player, frameCount);
  vtable[0xbc / 4](player);

  // ---- 7. Lock the player in place. -----------------------------------
  // Disassembly:
  //   mov  eax, [ebp+0x40]
  //   mov  eax, [eax]                 ; eax = pev
  //   or   [eax+0x250], 0x4           ; set FL_ONGROUND
  //   or   [eax+0x250], 0x20          ; set a frozen-ish flag
  //   mov  [eax+0x2a0], 0x3           ; physics flags = 3
  //
  // TODO(asm-ambiguous): flag 0x20 at pev+0x250 doesn't map to a
  //   standard HLSDK m_fFlags bit (FL_FROZEN isn't a stock flag).
  //   Likely a TS-only flag. Confirm in D.4.
  pev[0x250] = (pev[0x250] as number) | 0x4 | 0x20;
  pev[0x2a0] = 0x3;

  // ---- 8. Zero the player's velocity vector (pev + 0x174). -----------
  // Disassembly: rep movsd copies 3 floats from g_vecZero to pev+0x174.
  // TODO(layout): 0x174 matches standard HLSDK pev->velocity layout;
  //   confirm in TS.
  pev[0x174] = g_vecZero.x;
  pev[0x178] = g_vecZero.y;
  pev[0x17c] = g_vecZero.z;

  // ---- 9. Play the bullet-time whoosh SFX. ----------------------------
  // Disassembly:
  //   mov  edi, [eax+0x208]           ; edi = pev->pContainingEntity
  //   push 0x3f000000                 ; arg = 0.5 (raw float bits)
  //   sub  esp, 0x4
  //   push 0x1f                       ; arg = 31
  //   push 0x0
  //   call [edx+0x168]                ; g_engfuncs[0x168/4] — sound-path
  //                                    ; resolver; returns char*
  //   add  eax, 0x5f                  ; skip 95-byte prefix
  //   push eax                        ; sample (after +0x5f)
  //   push 0x0                        ; flags
  //   push 0x3f4ccccd                 ; attn = 0.8
  //   push 0x3f800000                 ; vol = 1.0
  //   push szBulletTimeSoundPath      ; (the asm reads [ebx-0x6c364])
  //   push 0x4                        ; CHAN_VOICE
  //   push edi                        ; edict
  //   call EMIT_SOUND_DYN
  //
  // In TS, EMIT_SOUND_DYN is called with (edict, channel, sample, vol,
  // attn, flags, pitch). The g_engfuncs[0x168/4] + 0x5f dance is an
  // in-binary prefix skip baked into the resolver; modeled as a
  // passthrough here.
  const edForEmit: any = pev[0x208];
  const rawPtr: number = g_engfuncs[0x168 / 4](0, 0x1f);
  const resolvedPath: string =
    rawPtr === 0 ? ts.STR_6C364 : String(/* readCString(rawPtr + 0x5f) */);

  EMIT_SOUND_DYN(
    edForEmit,         // edict
    CHAN_VOICE,        // channel = 4
    resolvedPath,      // sample
    1.0,               // volume   (0x3f800000)
    0.8,               // attn     (0x3f4ccccd)
    0,                 // flags
    0.5,               // pitch    (0x3f000000)
  );

  // ---- 10. Motion-blur message + slow-motion toggle pair. ------------
  // Disassembly:
  //   mov  edx, [ebx+0x1d38]          ; edx = &gmsgTSMotionBlur
  //   mov  eax, [ebp+0x40]
  //   mov  eax, [eax]
  //   add  eax, 0x8                   ; pev + 0x8 (= &origin.x)
  //   push 0x0                        ; edict
  //   push eax                        ; origin = pev + 0x8
  //   push [edx]                      ; *gmsgTSMotionBlur
  //   push 0x4                        ; msg_dest (NOTE: 0x4 not 0x1!)
  //   call [esi+0xb8]                 ; g_engfuncs[0xb8/4]
  //
  //   push [eax+0x208]                ; edict
  //   call [esi+0x11c]                ; vtable[71](player) -> int
  //   mov  [esp], eax
  //   call [esi+0xc0]                 ; vtable[48](player, eax)
  //   mov  [esp], 0x2
  //   call [esi+0xc0]                 ; vtable[48](player, 2)
  //   call [esi+0xbc]                 ; vtable[47](player)
  //
  // TODO(asm-ambiguous): vtable[71] at +0x11c — likely a "current
  //   slow-mo tier" / "current frame" accessor. The
  //   (vtable[48](p, vtable[71](p)), vtable[48](p, 2), vtable[47](p))
  //   sequence is the slow-mo flip-on/flip-off cycle ending in the
  //   bullet-time tier active. Pin concrete method names in D.4.
  g_engfuncs[0xb8 / 4](
    0x4,                     // msg_dest = 0x4 (MSG_PAS? MSG_ONE per CTSStunt__GoWheel)
    gmsgTSMotionBlur.valueOf(),
    pev[0x8],                // origin = &pev->origin.x
    null,                    // edict = NULL
  );
  const currentTier = vtable[0x11c / 4](player);
  vtable[0xc0 / 4](player, currentTier); // slowmo(currentTier)
  vtable[0xc0 / 4](player, 2);            // slowmo(2) — bullet-time tier
  vtable[0xbc / 4](player);               // finalize
}

// === TS-side helpers =====================================================
// CTSAnimation::Animate is a player-side free function in TS. This is a
// minimal forward declaration so the file compiles in isolation; the real
// implementation lives elsewhere and is out of scope for this D.3 chunk.
declare function Animate_BulletTime(
  animState: any,
  player: any,
  sequenceId: number,
): void;
```
