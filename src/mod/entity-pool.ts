/**
 * D.5.6 — Real entity pool.
 *
 * Replaces the per-call `new CTSGunStub()` pattern in
 * `decomp-bridge.ts` with a single, shared entity pool that holds
 * every entity in the world (player, bots, weapons, ammo, etc.).
 *
 * This mirrors the GoldSrc engine's `edict_t[]` array: 2048 slots,
 * with each entity having:
 *   - `pev` (entvars_t)         — the C struct at offset 0
 *   - `pvPrivateData`           — the C++ class instance (here, a POJO)
 *   - `classname`               — "player", "weapon_tsgun", "bot_red", ...
 *   - `targetname` / `target`   — for triggers
 *   - `netname`                 — for HUD
 *
 * The decompiled code's `this: CTSGun` / `this: CBaseEntity` now
 * points at a real entity from this pool, not a transient stub.
 * Other systems (engine simulator, audio, trace, etc.) look up
 * entities by `pev.index` via the same pool.
 *
 * Scope note: this is the v1 entity pool. It supports:
 *   - register / unregister of pre-built entities (player, bots)
 *   - create() of new entities with auto-assigned index
 *   - lookup by index, by classname
 *   - iteration for per-frame entity dispatch
 *
 * NOT in scope for D.5.6 (defer):
 *   - Save/load (CSave/CRestore)
 *   - The full class hierarchy (real CTSGun / CBasePlayer subclasses
 *     with decompiled methods). D.5.7 v2 will plug those in here.
 *   - Network replication
 *   - Spatial partitioning (only needed when entity count > ~100)
 */

import { CBaseEntity, Entvars, EntityPtr, Vector3 } from "./types";

/** GoldSrc's max edicts (also `gpGlobals->maxEntities`). */
export const MAX_EDICTS = 2048;

/** Indices 0 (worldspawn) and 1 (reserved for the local player). */
const RESERVED_LOW = 2;

/** Options for `EntityPool.create()`. */
export interface CreateEntityOptions {
  /** classname (e.g. "weapon_tsgun", "ammo_pistol"). Defaults to "entity". */
  classname?: string;
  /** Initial origin (defaults to (0,0,0)). */
  origin?: Vector3;
  /** Initial angles (defaults to (0,0,0)). */
  angles?: Vector3;
  /** Initial health (defaults to 0 — dead). */
  health?: number;
  /** Optional model name. */
  model?: string;
  /** Optional netname (for HUD). */
  netname?: string;
}

/**
 * Single source of truth for every entity in the world.
 *
 * The Babylon scene driver, the engine simulator's pfn* handlers,
 * and the decompiled code's `this` all reference entities via this
 * pool. The pool exposes a `Map<EntityPtr, CBaseEntity>` for O(1)
 * lookups and a `byClassname` index for classname-based queries.
 */
export class EntityPool {
  /** All entities, keyed by `pev.index`. Slot 0 is reserved (worldspawn). */
  readonly entities: Map<EntityPtr, CBaseEntity> = new Map();

  /** Classname index: "player" → [player1, player2, ...]. */
  private _byClassname: Map<string, CBaseEntity[]> = new Map();

  /** Next available slot. Starts at RESERVED_LOW and walks up. */
  private _nextIndex: EntityPtr = RESERVED_LOW;

  /** Optional name for debug logging. */
  readonly name: string;

  constructor(name: string = "world") {
    this.name = name;
    // Reserve slot 0 for the worldspawn (matches GoldSrc convention).
    this.entities.set(0, makeEmptyWorldspawn());
  }

  /**
   * Register a pre-built entity (player, bots, pickups built by
   * Babylon code, etc.). The entity's `pev.index` is used as the
   * pool key. If the index is already taken, the call is a no-op
   * and the existing entity is returned.
   */
  register(entity: CBaseEntity): CBaseEntity {
    if (!entity?.pev) {
      throw new Error("[EntityPool] register() called with entity without pev");
    }
    const idx = entity.pev.index;
    if (this.entities.has(idx)) {
      // already registered — return existing (idempotent)
      return this.entities.get(idx)!;
    }
    this.entities.set(idx, entity);
    this._indexByClassname(entity);
    // Advance _nextIndex past any external registrations (e.g. the
    // player uses index 1, bots use 100/101/102). We don't want
    // create() to overwrite those slots.
    if (idx >= this._nextIndex) {
      this._nextIndex = idx + 1;
    }
    return entity;
  }

  /**
   * Create a new entity with an auto-assigned index. Returns the
   * new entity (already registered).
   */
  create(opts: CreateEntityOptions = {}): CBaseEntity {
    const idx = this._allocIndex();
    const v0: Vector3 = { x: 0, y: 0, z: 0 };
    const pev: Entvars = {
      index: idx,
      classname: opts.classname ?? "entity",
      model: opts.model ?? "",
      viewmodel: "",
      weaponmodel: "",
      origin: opts.origin ? { ...opts.origin } : { ...v0 },
      angles: opts.angles ? { ...opts.angles } : { ...v0 },
      velocity: { ...v0 },
      basevelocity: { ...v0 },
      health: opts.health ?? 0,
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
    const ent: CBaseEntity = {
      pev,
      classname: opts.classname ?? "entity",
      targetname: "",
      target: "",
      message: "",
      delay: 0,
      killtarget: "",
      netname: opts.netname ?? "",
    };
    this.entities.set(idx, ent);
    this._indexByClassname(ent);
    return ent;
  }

  /** Remove an entity by index. Idempotent. */
  remove(idx: EntityPtr): boolean {
    const ent = this.entities.get(idx);
    if (!ent) return false;
    this._unindexByClassname(ent);
    this.entities.delete(idx);
    return true;
  }

  /** Look up by index. Returns null if not found. */
  get(idx: EntityPtr): CBaseEntity | null {
    return this.entities.get(idx) ?? null;
  }

  /** Look up by classname. Returns the first match, or null. */
  findByClassname(classname: string): CBaseEntity | null {
    const list = this._byClassname.get(classname);
    return list && list.length > 0 ? list[0] : null;
  }

  /** All entities of a given classname. */
  findAllByClassname(classname: string): CBaseEntity[] {
    return this._byClassname.get(classname) ?? [];
  }

  /** Iterate every entity (including the worldspawn at index 0). */
  forEach(callback: (ent: CBaseEntity, idx: EntityPtr) => void): void {
    for (const [idx, ent] of this.entities) callback(ent, idx);
  }

  /** Number of registered entities. */
  get size(): number {
    return this.entities.size;
  }

  /** Debug summary. */
  describe(): string {
    const counts = new Map<string, number>();
    for (const ent of this.entities.values()) {
      const cn = ent?.classname ?? "?";
      counts.set(cn, (counts.get(cn) ?? 0) + 1);
    }
    const parts: string[] = [];
    for (const [cn, n] of counts) parts.push(`${cn}=${n}`);
    return `EntityPool(${this.name}, ${this.size} ents: ${parts.join(", ")})`;
  }

  // ─────────────────────────────────────────────────────────────
  // Internals
  // ─────────────────────────────────────────────────────────────

  private _allocIndex(): EntityPtr {
    // Find the next free slot >= _nextIndex, scanning up to MAX_EDICTS.
    while (this._nextIndex < MAX_EDICTS) {
      const candidate = this._nextIndex++;
      if (!this.entities.has(candidate)) {
        return candidate;
      }
    }
    throw new Error(`[EntityPool] out of slots (max ${MAX_EDICTS})`);
  }

  private _indexByClassname(ent: CBaseEntity): void {
    const cn = ent.classname;
    if (!cn) return;
    let list = this._byClassname.get(cn);
    if (!list) {
      list = [];
      this._byClassname.set(cn, list);
    }
    list.push(ent);
  }

  private _unindexByClassname(ent: CBaseEntity): void {
    const cn = ent.classname;
    if (!cn) return;
    const list = this._byClassname.get(cn);
    if (!list) return;
    const i = list.indexOf(ent);
    if (i >= 0) list.splice(i, 1);
    if (list.length === 0) this._byClassname.delete(cn);
  }
}

/** Build the slot-0 worldspawn entity. Matches GoldSrc convention. */
function makeEmptyWorldspawn(): CBaseEntity {
  const v0: Vector3 = { x: 0, y: 0, z: 0 };
  return {
    pev: {
      index: 0,
      classname: "worldspawn",
      model: "",
      viewmodel: "",
      weaponmodel: "",
      origin: { ...v0 },
      angles: { ...v0 },
      velocity: { ...v0 },
      basevelocity: { ...v0 },
      health: 0,
      armor: 0,
      currentweapon: 0,
      owner: 0,
      team: 0,
      playerclass: 0,
      flags: 0,
      spawnflags: 0,
      effects: 0,
      rendermode: 0,
      renderamt: 0,
      rendercolor: { ...v0 },
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
    },
    classname: "worldspawn",
    targetname: "",
    target: "",
    message: "",
    delay: 0,
    killtarget: "",
    netname: "",
  };
}

/**
 * The single, global entity pool for the game.
 *
 * main.ts registers the player + bots into it; decomp-bridge
 * looks up weapon / ammo entities from it; the engine simulator's
 * pfnTraceLine / pfnEmitSound handlers resolve entities from it.
 *
 * We expose it both as a module-level singleton (for code that
 * doesn't want to thread the pool through every function) and
 * via `setGlobalPool()` (so test code can swap it out).
 */
let _globalPool: EntityPool | null = null;

export function getGlobalPool(): EntityPool {
  if (!_globalPool) {
    _globalPool = new EntityPool("global");
  }
  return _globalPool;
}

export function setGlobalPool(pool: EntityPool | null): void {
  _globalPool = pool;
}
