/**
 * D.5 Babylon.js scene driver (SKELETON).
 *
 * This is the Babylon.js integration point for the decompiled TS
 * mod. The decompiled modules in `src/mod/` are pure logic — they
 * manipulate POJOs (entvars, CBaseEntity) and call into the engine
 * function table (gpGlobals, EngineFuncs). This file binds that
 * logic into a Babylon.js scene.
 *
 * For Phase 1 MVP (DM-only, basic bot):
 *  - createScene(canvas, audioCtx) → Babylon Scene + ArcRotateCamera/FreeCamera
 *  - loadMap(gltfUrl)             → physics world + collision map
 *  - createPlayer(spawnPos)       → UniversalCamera with PointerLock
 *  - createBot(spawnPos, ai)      → animated mesh + CharacterController
 *  - onTick(deltaMs)              → call into decompiled TS to step the world
 *  - dispose()                    → cleanup
 *
 * Reference: docs/option-d-scope-d5-ready.md § "D.5 architecture".
 *
 * For now this is a STUB that delegates to Babylon once it's added
 * to the package. The Babylon integration happens in a separate
 * package (webxash/) — see D.5.1.
 */

import type {
  CBaseEntity,
  EngineFuncs,
  EngineGlobals,
  EntityPtr,
  Entvars,
  TraceResult,
} from "../mod/types";

/**
 * Engine context passed to every decompiled method call.
 * In the original C++, these are PIC-relative GOT globals.
 */
export interface EngineContext {
  gpGlobals: EngineGlobals;
  Engine: EngineFuncs;
  /** entity pool: index → entity */
  entities: Map<EntityPtr, CBaseEntity>;
  /** current tick delta (ms) */
  deltaMs: number;
}

/** Create an empty engine context (for use as a sandbox). */
export function createEngineContext(): EngineContext {
  const entities = new Map<EntityPtr, CBaseEntity>();
  return {
    gpGlobals: {
      time: 0,
      frametime: 0,
      maxClients: 32,
      mapname: "ts_heresy",
      deathmatch: 1,
    },
    Engine: makeStubEngineFuncs(),
    entities,
    deltaMs: 0,
  };
}

/**
 * Stub EngineFuncs table — every method logs and returns a sensible
 * default. Replace with real Babylon.js / WASM-CheerpX bindings in D.5.6+.
 */
function makeStubEngineFuncs(): EngineFuncs {
  const noop = () => {};
  const zero: () => number = () => 0;
  const empty: () => string = () => "";
  return {
    pfnPrecacheModel: () => 0,
    pfnPrecacheSound: () => 0,
    pfnSetModel: noop,
    pfnSetSize: noop,
    pfnSetOrigin: noop,
    pfnEmitSound: noop,
    pfnEmitAmbientSound: noop,
    pfnTraceLine: () => noop,
    pfnTraceToss: () => noop,
    pfnTraceMonsterHull: () => noop,
    pfnTraceHull: () => noop,
    pfnGetAimVector: () => noop,
    pfnServerPrint: noop,
    pfnClientPrint: noop,
    pfnGetGameDir: empty,
    pfnGetClientMaxs: () => ({ x: 0, y: 0, z: 0 }),
    pfnGetClientMins: () => ({ x: 0, y: 0, z: 0 }),
    pfnCmdArgc: zero,
    pfnCmdArgv: empty,
  } as EngineFuncs;
}

/** Spawn an entity of a given class. */
export function createEntity(ctx: EngineContext, className: string): EntityPtr {
  const ptr = ctx.entities.size + 1;
  const ent: CBaseEntity = {
    pev: makeEmptyEntvars(ptr),
    classname: className,
    targetname: "",
    target: "",
    message: "",
    delay: 0,
    killtarget: "",
    netname: "",
  };
  ctx.entities.set(ptr, ent);
  return ptr;
}

export function removeEntity(ctx: EngineContext, ptr: EntityPtr): void {
  ctx.entities.delete(ptr);
}

export function getEntityByIndex(ctx: EngineContext, idx: EntityPtr): CBaseEntity | null {
  return ctx.entities.get(idx) ?? null;
}

export function forEachEntity(
  ctx: EngineContext,
  callback: (e: CBaseEntity, ptr: EntityPtr) => void,
): void {
  for (const [ptr, ent] of ctx.entities) callback(ent, ptr);
}

function makeEmptyEntvars(index: number): Entvars {
  const v0 = { x: 0, y: 0, z: 0 };
  return {
    index,
    classname: "",
    model: "",
    viewmodel: "",
    weaponmodel: "",
    origin: { ...v0 },
    angles: { ...v0 },
    velocity: { ...v0 },
    basevelocity: { ...v0 },
    health: 100,
    armor: 0,
    currentweapon: 0,
    owner: 0,
    team: 0,
    playerclass: 0,
    flags: 0,
    spawnflags: 0,
    effects: 0,
    rendermode: 0,
    renderamt: 255,
    rendercolor: { x: 255, y: 255, z: 255 },
    renderfx: 0,
    groundentity: 0,
    spawntime: 0,
    dmg_inflictor: 0,
    dmg_save: 0,
    dmg_take: 0,
    noise: "",
    blenbleh: 0,
    cash: 0,
    slowmo_end: 0,
    nextthink: 0,
    iuser1: 0, iuser2: 0, iuser3: 0, iuser4: 0,
    fuser1: 0, fuser2: 0, fuser3: 0, fuser4: 0,
    vuser1: { ...v0 }, vuser2: { ...v0 }, vuser3: { ...v0 }, vuser4: { ...v0 },
    euser1: 0, euser2: 0, euser3: 0, euser4: 0,
  };
}

/**
 * Tick the world — called once per frame from the Babylon renderer.
 *
 * Walks every entity and calls its decompiled `Think`/`WaitThink`
 * if it's time. Damage, sound events, etc. are processed inline.
 *
 * For Phase 1 MVP we just step time and let the Stunt/Animation
 * methods drive entity state.
 *
 * TODO D.5.6+: wire Babylon scene-mesh sync (entities → meshes).
 */
export function onTick(ctx: EngineContext): void {
  ctx.gpGlobals.time += ctx.deltaMs / 1000;
  // TODO: per-entity Think dispatch
}

/**
 * Babylon scene driver — to be implemented.
 *
 * Phase 1 skeleton:
 *  1. Create Babylon Engine + Scene
 *  2. Set up UniversalCamera with PointerLock
 *  3. Load ts_heresy.glb (after D.5.2 BSP conversion)
 *  4. Place a single bot entity at the spawn point
 *  5. Hook onBeforeRenderObservable → engine.onTick
 *
 * Located in a separate package (webxash/) when we set up the
 * Babylon runtime — see D.5.1.
 */
export interface BabylonSceneDriver {
  readonly canvas: HTMLCanvasElement;
  readonly scene: unknown; // Babylon Scene, lazy-imported
  /** Entity pool exposed for Phase 2 wiring. */
  readonly entities: Map<EntityPtr, CBaseEntity>;
  loadMap(gltfUrl: string): Promise<void>;
  createPlayer(spawnPos: { x: number; y: number; z: number }): unknown;
  createBot(spawnPos: { x: number; y: number; z: number }, ai: unknown): unknown;
  onTick(deltaMs: number): void;
  dispose(): void;
}

export interface BabylonDriverOptions {
  canvas: HTMLCanvasElement;
  audioCtx: AudioContext | null;
  mapUrl?: string;
}

export function createBabylonSceneDriver(opts: BabylonDriverOptions): BabylonSceneDriver {
  // STUB for v1. Real impl in D.5.1 (Babylon project setup).
  const ctx = createEngineContext();
  void opts;
  return {
    canvas: opts.canvas,
    scene: null,
    entities: ctx.entities,
    async loadMap(_url: string) { /* TODO D.5.2 BSP→glTF */ },
    createPlayer(_pos) { return null; },
    createBot(_pos, _ai) { return null; },
    onTick(deltaMs) { ctx.deltaMs = deltaMs; onTick(ctx); },
    dispose() { /* TODO */ },
  };
}
