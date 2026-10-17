// Field offsets are from ts_i386.so disassembly; names are placeholders
// to be confirmed in D.4. Symbol types use `any` per D.3 isolation rules.

const CVAR_MIN_SPEED    = 0;     // [gvars-0x6df70]
const CVAR_FALLBACK_VZ  = 0;     // [gvars-0x6f3fc]   unit-Z when speed==0
const CVAR_HELD_VZ_MUL  = 0;     // [gvars-0x6ecd8]   speed scalar in held branch
const CVAR_REFLECT_MUL  = 0;     // [gvars-0x6ec2c]   reflect-push scalar

export function CheckForBreakables(this: any): void {
  // ---- 0x8bdb2: per-tick re-check -----------------------------------
  // fld [this+0x18]; fcom [gvars-0x6deb0]; jne → return.
  // On equal: load vector from [gvars+0x1600] and store first dword
  // back into this+0x18. The TS's "v_forward" wording was speculative.
  const cvarThreshold = (globalThis as any).F32[(globalThis as any).STATE_OFF - 0x6deb0];
  const thisTime      = (this as any).U32[(this as any).off + 0x18];
  if (thisTime !== cvarThreshold) return;

  // ---- 0x8bddd: sync-back (first dword of the vector) ---------------
  (this as any).U32[(this as any).off + 0x18] =
    (globalThis as any).U32[(globalThis as any).STATE_OFF + 0x1600 + 0x00];

  const player: any = (this as any).U32[(this as any).off + 0x40];
  const pev:    any = (player as any).U32[(player as any).off];      // *(player)
  const edict:  any = (pev as any).U32[(pev as any).off + 0x208];

  // ---- 0x8bdf5: TS-private "frozen by stunt" bit --------------------
  // Bit 0x2 of *(player)+0x1a5. NOT pev.flags & FL_FROZEN.
  const frozenStunt = ((player as any).U8[(player as any).off + 0x1a5]) & 0x2;
  const heldTime    = (player as any).F32[(player as any).off + 0x79c];

  if (frozenStunt !== 0) {
    if (heldTime > 0) {
      (player as any).U32[(player as any).off + 0x798] = 0;   // lastBreakableHit = null
      return;
    }
    // fall through to velocity-magnitude check below
  }

  // ---- 0x8be20–0x8be48: ||velocity|| --------------------------------
  const vx = (pev as any).F32[(pev as any).off + 0x20];
  const vy = (pev as any).F32[(pev as any).off + 0x24];
  const vz = (pev as any).F32[(pev as any).off + 0x28];
  const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);

  // ---- 0x8be48–0x8be78: bail when slow AND not holding --------------
  if (speed < CVAR_MIN_SPEED && heldTime === 0) return;

  // ---- 0x8be78–0x8bf30/8be95: held-time branch direction ------------
  // heldTime == 0 → VELOCITY path;  heldTime != 0 → MakeVectors path.
  let forward: any;
  let traceDist: number;
  if (heldTime === 0) {
    if (speed > 0) {
      forward = { x: vx/speed, y: vy/speed, z: vz/speed };
    } else {
      forward = { x: 0, y: 0, z: CVAR_FALLBACK_VZ };
    }
    traceDist = (globalThis as any).F32[(globalThis as any).STATE_OFF - 0x6f018];
  } else {
    // MakeVectors(pev.v_angle). Sub-branch on player+0x7a0 == 0 picks
    // between two trace-distance cvars ([gvars-0x6c31c] vs [gvars-0x6f064]).
    (globalThis as any).UTIL_MakeVectors(
      { x: (pev as any).F32[(pev as any).off + 0x1c],
        y: (pev as any).F32[(pev as any).off + 0x20],
        z: (pev as any).F32[(pev as any).off + 0x24] }, /* = v_angle at 0x1c..0x24 */
    );
    const throwTime = (player as any).F32[(player as any).off + 0x7a0];
    traceDist = throwTime === 0
      ? (globalThis as any).F32[(globalThis as any).STATE_OFF - 0x6c31c]
      : (globalThis as any).F32[(globalThis as any).STATE_OFF - 0x6f064];
    forward = {
      x: (globalThis as any).F32[(globalThis as any).STATE_OFF + 0x1600 + 0x28 + 0],
      y: (globalThis as any).F32[(globalThis as any).STATE_OFF + 0x1600 + 0x28 + 4],
      z: (globalThis as any).F32[(globalThis as any).STATE_OFF + 0x1600 + 0x28 + 8],
    };  // globals.v_forward at +0x28 within that struct
  }

  // ---- 0x8bfb4–0x8c000: trace_end = origin + forward*traceDist ------
  const ox = (pev as any).F32[(pev as any).off + 0x08];
  const oy = (pev as any).F32[(pev as any).off + 0x0c];
  const oz = (pev as any).F32[(pev as any).off + 0x10];
  const ex = ox + forward.x * traceDist;
  const ey = oy + forward.y * traceDist;
  const ez = oz + forward.z * traceDist;

  // ---- 0x8c000–0x8c023: UTIL_TraceHull ------------------------------
  const tr: any = (globalThis as any).UTIL_TraceHull(
    { x: ox, y: oy, z: oz },
    { x: ex, y: ey, z: ez },
    /*ignoreMon*/ 0,
    /*hull    */ 3,
    /*ignore  */ edict,
  );

  // ---- 0x8c026–0x8c033: bail if fraction >= 0.5 ---------------------
  if (tr.F32[(tr as any).off + 0x70] >= 0.5) return;

  // ---- 0x8c039–0x8c068: resolve hitEnt ------------------------------
  let hitEnt: any = tr.U32[(tr as any).off + 0x90];   // ptr slot, not entIndex
  if (hitEnt === 0) {
    const singleton = (globalThis as any).U32[(globalThis as any).STATE_OFF + 0x1aa8];
    hitEnt = (globalThis as any).callVtable(singleton, 0x114, 0);
  }
  if (hitEnt === 0) return;

  // ---- 0x8c06e–0x8c0a3: damageability -------------------------------
  const hitVtable = (hitEnt as any).U32[(hitEnt as any).off + 0x60];
  if ((globalThis as any).callVtable(hitVtable, 0xc8, hitEnt) !== 0 &&
      heldTime > 0) return;

  const hitInner = (hitEnt as any).U32[(hitEnt as any).off + 0x00];
  if ((hitInner as any).F32[(hitInner as any).off + 0x16c] <= 0) return;
  if (((hitInner as any).U8[(hitInner as any).off + 0x1a7]) & 0x2) return;
  if (((hitInner as any).U8[(hitInner as any).off + 0x118]) & 0x80) return;  // DF_* flags

  // ---- 0x8c0d7–0x8c0f3: skip already-killed-with-bonus -------------
  const lastHit = (player as any).U32[(player as any).off + 0x798];
  if (lastHit === hitEnt) return;

  // ---- 0x8c0f3–0x8c150: damage scale --------------------------------
  let flDamage: number;
  if ((globalThis as any).callVtable(hitVtable, 0xb4, pev) !== 0) {
    flDamage = speed * CVAR_HELD_VZ_MUL;     // held-time sub-branch
  } else {
    flDamage = speed;                         // raw sqrt result
  }

  // ---- 0x8c16a/8c1a0: damage bits ----------------------------------
  let damageBits = 0x1080;
  let applyDamage = true;
  const kungfuActive = (globalThis as any).U32[(globalThis as any).STATE_OFF + 0x1920];
  const hitMode = (hitInner as any).U8[(hitInner as any).off + 0x7a4];
  if (hitMode === 0) {                         // 0x8c18e: KUNGFU
    (globalThis as any).U8[(globalThis as any).STATE_OFF + 0x1920] = 1;
    damageBits = 0x4001080;
    // DropWeapon(): 3-arg push, see Issue 6.
    (globalThis as any).DropWeapon(
      (pev as any).off + 0x60 /* reloaded [esp+0x10] */,
      -2,
      hitEnt,
    );
    // Reflection push (0x8c312–0x8c3c2): inline, not via helper.
    const hex = (hitInner as any).F32[(hitInner as any).off + 0x20];
    const hey = (hitInner as any).F32[(hitInner as any).off + 0x24];
    const hez = (hitInner as any).F32[(hitInner as any).off + 0x28];
    let dx = hex - (pev as any).F32[(pev as any).off + 0x20];
    let dy = hey - (pev as any).F32[(pev as any).off + 0x24];
    let dz = hez - (pev as any).F32[(pev as any).off + 0x28];
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    let unit: any;
    if (dist === 0) {
      unit = { x: 0, y: 0, z: CVAR_FALLBACK_VZ };
    } else {
      unit = { x: dx/dist, y: dy/dist, z: dz/dist };
    }
    (hitInner as any).F32[(hitInner as any).off + 0x7a0] =
      ((pev as any).F32[(pev as any).off + 0x7a0]) * CVAR_REFLECT_MUL;

    if ((globalThis as any).VictimKungfuHold(pev, hitEnt, flDamage, tr)) {
      applyDamage = false;
    }
    (globalThis as any).EMIT_SOUND_DYN(
      edict, 0,
      (globalThis as any).CSTR[(globalThis as any).STATE_OFF - 0x6e79b],
      /*vol*/ 1.0, /*attn*/ 0.7, /*pitch*/ 0x3f4ccccd, /*chan*/ 4,
    );
  } else if (hitMode === 2) {                  // 0x8c44e: KATANA
    if ((globalThis as any).VictimKatanaHold(pev, hitEnt, flDamage)) {
      applyDamage = false;
    }
    (globalThis as any).EMIT_SOUND_DYN(
      edict, 0,
      (globalThis as any).CSTR[(globalThis as any).STATE_OFF - 0x6dcb2],
      1.0, 0.7, 0x3f4ccccd, 4,
    );
  } else {                                     // 0x8c4ac: KNIFE / default
    if ((globalThis as any).VictimKnifeHold(pev, hitEnt, flDamage)) {
      applyDamage = false;
    }
    (globalThis as any).EMIT_SOUND_DYN(
      edict, 0,
      (globalThis as any).CSTR[(globalThis as any).STATE_OFF - 0x6df30],
      1.0, 0.7, 0x3f4ccccd, 4,
    );
  }

  // ---- 0x8c51a–0x8c59a: screen punch --------------------------------
  const punchTarget = (pev as any).U32[(pev as any).off + 0xa10];
  if (punchTarget !== 0 &&
      ((punchTarget as any).U8[(punchTarget as any).off + 0xc8]) === 0) {
    const pdx = ((pev as any).F32[(pev as any).off + 0x08]) -
                ((hitInner as any).F32[(hitInner as any).off + 0x08]);
    const pdy = ((pev as any).F32[(pev as any).off + 0x0c]) -
                ((hitInner as any).F32[(hitInner as any).off + 0x0c]);
    const pdz = ((pev as any).F32[(pev as any).off + 0x10]) -
                ((hitInner as any).F32[(hitInner as any).off + 0x10]);
    (globalThis as any).PunchScreen(hitEnt, {
      x: pdx * CVAR_REFLECT_MUL,
      y: pdy * CVAR_REFLECT_MUL,
      z: pdz * CVAR_REFLECT_MUL,
    });
  }

  // ---- 0x8c59e–8c605: apply damage (or skip) ------------------------
  if (applyDamage) {
    (globalThis as any).ClearMultiDamage();
    (globalThis as any).callVtable(hitVtable, 0x54,
      (hitInner as any).F32[(hitInner as any).off + 0x08],
      (hitInner as any).F32[(hitInner as any).off + 0x0c],
      (hitInner as any).F32[(hitInner as any).off + 0x10],
      flDamage,
      forward,
      hitInner,
      edict,
    );
    (globalThis as any).ApplyMultiDamage(pev, pev);
  }

  // ---- 0x8c608–0x8c621: unconditional cleanup -----------------------
  (globalThis as any).U8[(globalThis as any).STATE_OFF + 0x1920] = 0;
  (player as any).U32[(player as any).off + 0x798] = hitEnt;
}
