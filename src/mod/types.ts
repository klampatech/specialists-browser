/**
 * D.4.9 Type contracts — the bridge between decompiled TS modules
 * and the Babylon.js scene driver.
 *
 * The original C++ code passes `entvars_t*` and `CBaseEntity*`
 * pointers around. In TS-land we use plain numbers (entity indices)
 * and POJOs (plain old JavaScript objects) with the same field
 * layout, so the decompiled bodies can be lifted without rewriting
 * the logic.
 *
 * This file is the canonical type contract; every per-class module
 * in `src/mod/*.ts` and every bridge adapter in `src/bridge/*.ts`
 * depends on these definitions.
 *
 * Source layout (from `entvars_t` in Half-Life SDK + the TS mod's
 * own class hierarchy):
 *
 *   entvars_t fields are at fixed offsets (HLSDK standard for the
 *   most part, with TS-specific additions for cash, slowmo, etc.).
 *   We expose them as named properties for ergonomics; the offsets
 *   are documented in the doc-comment of each field below.
 */

/** A pointer to an entity, modeled as an entity-pool index. */
export type EntityPtr = number;

/** 3-component float vector (position, angles, velocity). */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * entvars_t — entity variables (HLSDK standard layout).
 *
 * This is the C struct embedded at offset 0 of every CBaseEntity.
 * In TS we represent it as a POJO; the offset is the named-property
 * itself, not a memory offset.
 */
export interface Entvars {
  /** entity index (pev->entindex) */
  index: number;
  /** classname string */
  classname: string;
  /** global entity model name (.mdl path) */
  model: string;
  /** view model (first-person) */
  viewmodel: string;
  /** weapon model (third-person) */
  weaponmodel: string;
  /** world position */
  origin: Vector3;
  /** view angles (pitch, yaw, roll) */
  angles: Vector3;
  /** velocity (units/sec) */
  velocity: Vector3;
  /** base velocity (applied to velocity each frame; for conveyors, etc.) */
  basevelocity: Vector3;
  /** health (0 = dead) */
  health: number;
  /** armor (0 = none) */
  armor: number;
  /** current weapon (entity ptr) */
  currentweapon: EntityPtr;
  /** owner entity (for weapons, projectiles) */
  owner: EntityPtr;
  /** team ID (0 = unassigned, 1+ per team) */
  team: number;
  /** player class (CTSType) */
  playerclass: number;
  /** flags (FL_ONGROUND, FL_DUCKING, etc.) */
  flags: number;
  /** spawn flags (pev->spawnflags) */
  spawnflags: number;
  /** effects (EF_BRIGHTLIGHT, etc.) */
  effects: number;
  /** render mode (kRenderNormal, etc.) */
  rendermode: number;
  /** render amount (alpha) */
  renderamt: number;
  /** render color (RGB) */
  rendercolor: Vector3;
  /** render FX (kRenderFxGlowShell, etc.) */
  renderfx: number;
  /** last touched entity */
  groundentity: EntityPtr;
  /** time when entity was spawned (gpGlobals->time) */
  spawntime: number;
  /** time of last damage (for damage feedback) */
  dmg_inflictor: EntityPtr;
  /** amount of last damage */
  dmg_save: number;
  /** time of last damage */
  dmg_take: number;
  /** sound effect (last played) */
  noise: string;
  /** TS-specific: cash on this player */
  blenbleh: number; // placeholder
  /** TS-specific: player cash */
  cash: number;
  /** TS-specific: slowmo timer */
  slowmo_end: number;
  /** generic: next think time */
  nextthink: number;
  /** generic: arbitrary user data */
  iuser1: number;
  iuser2: number;
  iuser3: number;
  iuser4: number;
  fuser1: number;
  fuser2: number;
  fuser3: number;
  fuser4: number;
  vuser1: Vector3;
  vuser2: Vector3;
  vuser3: Vector3;
  vuser4: Vector3;
  euser1: EntityPtr;
  euser2: EntityPtr;
  euser3: EntityPtr;
  euser4: EntityPtr;
}

/**
 * CBaseEntity — base class for all entities in the world.
 *
 * In C++, the first member of every entity is `entvars_t* pev`.
 * We model `pev` as a real field (not a pointer) for ergonomics;
 * the offset is implicit (always at index 0 of the object).
 */
export interface CBaseEntity {
  /** entvars (offset 0) */
  pev: Entvars;
  /** class identifier (CTSGun, CTSFlag, ...) */
  classname: string;
  /** target name (for triggers) */
  targetname: string;
  /** target (for triggers) */
  target: string;
  /** message (for triggers) */
  message: string;
  /** delay (for triggers) */
  delay: number;
  /** killtarget (for triggers) */
  killtarget: string;
  /** netname (for HUD) */
  netname: string;
}

/** Per-method context: edict_t for engine bookkeeping. */
export interface Edict {
  /** entity index */
  index: number;
  /** engine-private data (PVSDATA in HLSDK) */
  pvPrivateData: CBaseEntity | null;
}

/** Save/load scratch (CSave/CRestore) */
export interface CSaveRestore {
  /** buffer offset */
  position: number;
  /** buffer */
  buffer: Uint8Array;
}

/** Engine globals (gpGlobals in HLSDK) */
export interface EngineGlobals {
  /** current game time (server tick * tickrate) */
  time: number;
  /** frame time (delta) */
  frametime: number;
  /** max clients */
  maxClients: number;
  /** map name */
  mapname: string;
  /** deathmatch flag */
  deathmatch: number;
}

/** Engine function table (dllfuncs_t in HLSDK — subset we use) */
export interface EngineFuncs {
  /** PRECACHE_MODEL */
  pfnPrecacheModel: (path: string) => number;
  /** PRECACHE_SOUND */
  pfnPrecacheSound: (path: string) => number;
  /** SET_MODEL */
  pfnSetModel: (entity: EntityPtr, model: string) => void;
  /** SET_SIZE */
  pfnSetSize: (entity: EntityPtr, mins: Vector3, maxs: Vector3) => void;
  /** SET_ORIGIN */
  pfnSetOrigin: (entity: EntityPtr, origin: Vector3) => void;
  /** EMIT_SOUND */
  pfnEmitSound: (entity: EntityPtr, channel: number, sample: string,
                  volume: number, attenuation: number, flags: number, pitch: number) => void;
  /** EMIT_AMBIENT_SOUND */
  pfnEmitAmbientSound: (entity: EntityPtr, origin: Vector3, sample: string,
                        volume: number, attenuation: number, flags: number, pitch: number) => void;
  /** TRACE_LINE */
  pfnTraceLine: (start: Vector3, end: Vector3, flags: number,
                 ignoreEnt: EntityPtr, out: TraceResult) => void;
  /** TRACE_TOSS */
  pfnTraceToss: (ignoreEnt: EntityPtr, pe: EntityPtr, out: TraceResult) => void;
  /** TRACE_MONSTER_HULL */
  pfnTraceMonsterHull: (ignoreEnt: EntityPtr, start: Vector3, end: Vector3,
                        flags: number, hull: number, out: TraceResult) => void;
  /** TRACE_HULL */
  pfnTraceHull: (start: Vector3, end: Vector3, flags: number,
                 hullNumber: number, ignoreEnt: EntityPtr, out: TraceResult) => void;
  /** GET_AIM_VECTOR */
  pfnGetAimVector: (shooter: EntityPtr, speed: number, out: Vector3) => void;
  /** SERVER_PRINT */
  pfnServerPrint: (msg: string) => void;
  /** CLIENT_PRINT */
  pfnClientPrint: (entity: EntityPtr, level: number, msg: string) => void;
  /** GET_GAME_DIR */
  pfnGetGameDir: () => string;
  /** GET_CLIENT_MAXS */
  pfnGetClientMaxs: () => Vector3;
  /** GET_CLIENT_MINS */
  pfnGetClientMins: () => Vector3;
  /** CMD_ARGC */
  pfnCmdArgc: () => number;
  /** CMD_ARGV */
  pfnCmdArgv: (i: number) => string;
  /** ... many more (we declare the most-used subset) */
}

/** Trace result (TraceResult in HLSDK) */
export interface TraceResult {
  /** hit position */
  vecEndPos: Vector3;
  /** fraction of trace completed (0-1) */
  flFraction: number;
  /** entity hit (0 = no hit) */
  pHit: EntityPtr;
  /** hit group (for damage) */
  iHitgroup: number;
  /** plane normal */
  vecPlaneNormal: Vector3;
  /** plane distance */
  flPlaneDist: number;
  /** surface flags */
  surface: {
    name: string;
    flags: number;
    impacts: number;
  };
}

/** All exported from this module (re-export uses interface declarations above). */
