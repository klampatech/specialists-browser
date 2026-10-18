/**
 * D.5.9 v2 — Bot with real AI: patrol → chase → attack.
 *
 * The .so has 0 bot methods, so v2 has a richer state machine:
 *   - IDLE: stand still
 *   - PATROL: walk between two waypoints
 *   - CHASE: walk toward the player
 *   - ATTACK: stop, aim at player, fire weapon
 *   - DEAD: ragdoll on the ground (then respawn after delay)
 *
 * The bot has:
 *   - A humanoid mesh (cylinder + sphere head)
 *   - A CBaseEntity POJO
 *   - Its own pistol (Pistol class) so the bot can shoot
 *   - Wall collision (AABB clamp)
 *   - Damage tracking + respawn
 *
 * Phase 2 will replace this with Botman's BotLib or similar.
 */

import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

import type { CBaseEntity, Entvars } from "../../src/mod/types";
import { Pistol } from "./weapon";

type BotState = "IDLE" | "PATROL" | "CHASE" | "ATTACK" | "DEAD";

const HUMAN_HEIGHT = 1.8;
const HUMAN_WIDTH = 0.6;

export interface BotOptions {
  id: number;
  name: string;
  spawn: { x: number; y: number; z: number };
  patrolTo?: { x: number; y: number; z: number };
  /** Color for the body */
  color?: Color3;
}

export interface BotWorld {
  /** World bounds for wall collision (clamp to AABB). */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null;
  /** Player position for line-of-sight + targeting. */
  player: { x: number; y: number; z: number; alive: () => boolean };
  /** Called when this bot deals damage to the player. */
  onDealDamage: (bot: StubBot, amount: number) => void;
  /** Called when this bot dies. */
  onKilled: (bot: StubBot) => void;
}

export class StubBot {
  readonly entity: CBaseEntity;
  readonly scene: Scene;
  readonly id: number;
  readonly name: string;
  readonly color: Color3;
  private mesh: any; // AbstractMesh
  private state: BotState = "PATROL";
  private stateTimer = 0;
  private spawn: { x: number; y: number; z: number };
  private patrolTo: { x: number; y: number; z: number };
  private target?: { x: number; y: number; z: number };
  private speed = 2.0; // units/sec
  private runSpeed = 4.0;
  private health: number = 100;
  private maxHealth: number = 100;
  private yaw = 0;
  private bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;
  private world?: BotWorld;
  private weapon: Pistol;
  private fireCooldown = 0;
  private respawnTimer = 0;
  /** "see" angle — within 35° of forward. */
  private static readonly FOV_COS = Math.cos((35 * Math.PI) / 180);
  /** Attack range — how close to fire. */
  private static readonly ATTACK_RANGE = 18;
  /** Max engagement range — beyond this, bot goes back to PATROL. */
  private static readonly ENGAGE_RANGE = 30;
  /** Damage per shot. */
  private static readonly DAMAGE = 8;

  constructor(scene: Scene, opts: BotOptions) {
    this.scene = scene;
    this.id = opts.id;
    this.name = opts.name;
    this.color = opts.color ?? new Color3(0.9, 0.3, 0.3);
    this.spawn = { ...opts.spawn };
    this.patrolTo = opts.patrolTo ?? {
      x: opts.spawn.x + 4,
      y: opts.spawn.y,
      z: opts.spawn.z + 4,
    };
    this.health = this.maxHealth;

    // Build a humanoid-shaped mesh (cylinder + sphere head)
    this.mesh = MeshBuilder.CreateCylinder(`bot_${opts.id}_body`, {
      height: HUMAN_HEIGHT - 0.4,
      diameterTop: HUMAN_WIDTH,
      diameterBottom: HUMAN_WIDTH,
    }, scene);
    this.mesh.position.set(opts.spawn.x, opts.spawn.y + (HUMAN_HEIGHT - 0.4) / 2, opts.spawn.z);
    const mat = new StandardMaterial(`bot_${opts.id}_mat`, scene);
    mat.diffuseColor = this.color;
    this.mesh.material = mat;

    const head = MeshBuilder.CreateSphere(`bot_${opts.id}_head`, { diameter: 0.4 }, scene);
    head.position.set(0, (HUMAN_HEIGHT - 0.4) / 2 + 0.2, 0);
    head.parent = this.mesh;
    head.material = mat;

    // Build the entity POJO
    this.entity = makeBotEntity(opts, this.maxHealth);

    // Bot's own weapon (no bots array — bots don't fight each other in v2).
    // We give it a stub camera-less pistol so the same code path runs.
    this.weapon = new Pistol({
      camera: null as any, // unused — bot aims via mesh direction
      scene,
      damage: StubBot.DAMAGE,
      maxAmmo: 999, // unlimited
      range: StubBot.ENGAGE_RANGE,
      fireRate: 2, // 2 shots/sec
    });
  }

  /** Wire up world (bounds + player reference). Called from main.ts. */
  attachWorld(world: BotWorld): void {
    this.world = world;
    this.bounds = world.bounds;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  isAlive(): boolean {
    return this.state !== "DEAD";
  }

  /** Set the player's position so the bot can chase. */
  setPlayerPosition(pos: { x: number; y: number; z: number }): void {
    this.target = pos;
  }

  /** Damage the bot. */
  damage(amount: number): void {
    if (this.state === "DEAD") return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  /** Respawn at spawn point. */
  respawn(): void {
    this.health = this.maxHealth;
    this.state = "PATROL";
    this.stateTimer = 0;
    this.mesh.position.set(this.spawn.x, this.spawn.y + (HUMAN_HEIGHT - 0.4) / 2, this.spawn.z);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.isVisible = true;
  }

  /** Step the bot. */
  update(deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);

    if (this.state === "DEAD") {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
        if (this.world) this.world.onKilled(this); // notify re-spawn (actually death+respawn)
      }
      return;
    }

    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // State machine
    this.stateTimer += dt;

    // Distance to player
    let playerDist = Infinity;
    let canSeePlayer = false;
    if (this.target && this.world?.player.alive()) {
      const dx = this.target.x - this.mesh.position.x;
      const dz = this.target.z - this.mesh.position.z;
      const dy = (this.target.y + 0.9) - (this.mesh.position.y);
      playerDist = Math.sqrt(dx * dx + dz * dz);

      // Field of view check
      if (playerDist > 0.1) {
        const fwdX = Math.sin(this.yaw);
        const fwdZ = Math.cos(this.yaw);
        const toX = dx / playerDist;
        const toZ = dz / playerDist;
        const dot = fwdX * toX + fwdZ * toZ;
        if (dot > StubBot.FOV_COS) {
          canSeePlayer = true;
        }
      }
      // Bots are "aware" of player if within ENGAGE_RANGE
      // (but only attack if close enough + in FOV)
    }

    // State transitions
    if (this.state === "PATROL") {
      if (playerDist < StubBot.ENGAGE_RANGE) {
        this.state = "CHASE";
        this.stateTimer = 0;
      }
    } else if (this.state === "CHASE") {
      if (playerDist > StubBot.ENGAGE_RANGE * 1.5) {
        // Lost them — go back to patrol
        this.state = "PATROL";
        this.stateTimer = 0;
      } else if (playerDist < StubBot.ATTACK_RANGE && canSeePlayer) {
        this.state = "ATTACK";
        this.stateTimer = 0;
      }
    } else if (this.state === "ATTACK") {
      if (playerDist > StubBot.ATTACK_RANGE * 1.3) {
        this.state = "CHASE";
        this.stateTimer = 0;
      } else if (this.stateTimer > 3 && !canSeePlayer) {
        // Lost sight for 3s — go back to chase
        this.state = "CHASE";
        this.stateTimer = 0;
      }
    }

    // Behavior per state
    if (this.state === "PATROL") {
      this.behaviorPatrol(dt);
    } else if (this.state === "CHASE") {
      this.behaviorChase(dt, playerDist);
    } else if (this.state === "ATTACK") {
      this.behaviorAttack(dt, playerDist, canSeePlayer);
    }

    // Wall collision
    if (this.bounds) {
      const r = 0.4;
      if (this.mesh.position.x < this.bounds.minX + r) this.mesh.position.x = this.bounds.minX + r;
      if (this.mesh.position.x > this.bounds.maxX - r) this.mesh.position.x = this.bounds.maxX - r;
      if (this.mesh.position.z < this.bounds.minZ + r) this.mesh.position.z = this.bounds.minZ + r;
      if (this.mesh.position.z > this.bounds.maxZ - r) this.mesh.position.z = this.bounds.maxZ - r;
    }

    // Sync to entity POJO
    this.entity.pev.origin.x = this.mesh.position.x;
    this.entity.pev.origin.y = this.mesh.position.y - (HUMAN_HEIGHT - 0.4) / 2;
    this.entity.pev.origin.z = this.mesh.position.z;
    this.entity.pev.angles.y = this.yaw * (180 / Math.PI);
    this.entity.pev.health = this.health;
  }

  dispose(): void {
    this.mesh.dispose();
  }

  // ─── Behavior helpers ──────────────────────────────────────

  private behaviorPatrol(dt: number): void {
    // Ping-pong between spawn and patrolTo
    const target = this.stateTimer < 2.5 ? this.patrolTo : this.spawn;
    this.moveToward(target, this.speed, dt);
  }

  private behaviorChase(dt: number, dist: number): void {
    if (!this.target) return;
    // Run toward player, but stop at attack range
    if (dist > StubBot.ATTACK_RANGE * 0.9) {
      this.moveToward(this.target, this.runSpeed, dt);
    } else {
      this.faceToward(this.target, dt);
    }
  }

  private behaviorAttack(dt: number, dist: number, canSee: boolean): void {
    if (!this.target) return;
    // Face the player
    this.faceToward(this.target, dt);
    // Fire if cooldown is ready and player is in range + visible
    if (this.fireCooldown <= 0 && dist < StubBot.ATTACK_RANGE && canSee) {
      this.fire();
    }
  }

  private moveToward(target: { x: number; y: number; z: number }, speed: number, dt: number): void {
    const dx = target.x - this.mesh.position.x;
    const dz = target.z - this.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.5) {
      const nx = dx / dist;
      const nz = dz / dist;
      this.mesh.position.x += nx * speed * dt;
      this.mesh.position.z += nz * speed * dt;
      this.yaw = Math.atan2(nx, nz);
      this.mesh.rotation.y = this.yaw;
    }
  }

  private faceToward(target: { x: number; y: number; z: number }, _dt: number): void {
    const dx = target.x - this.mesh.position.x;
    const dz = target.z - this.mesh.position.z;
    if (Math.abs(dx) < 0.001 && Math.abs(dz) < 0.001) return;
    this.yaw = Math.atan2(dx, dz);
    this.mesh.rotation.y = this.yaw;
  }

  private fire(): void {
    this.fireCooldown = 0.5; // 2 shots/sec
    // The bot's shot — we don't have a full weapon (no camera), but we
    // can apply damage based on the player being in front of us and
    // within range, with some accuracy falloff.
    if (!this.target || !this.world) return;
    const dx = this.target.x - this.mesh.position.x;
    const dz = this.target.z - this.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // "Accuracy" — closer is more accurate
    const accuracy = Math.max(0.3, 1.0 - dist / StubBot.ENGAGE_RANGE);
    if (Math.random() < accuracy) {
      this.world.onDealDamage(this, StubBot.DAMAGE);
    }
  }

  private die(): void {
    this.state = "DEAD";
    this.respawnTimer = 4.0; // 4 seconds to respawn
    this.mesh.rotation.x = Math.PI / 2; // tip over
    this.mesh.position.y = 0.3;
  }
}

function makeBotEntity(opts: BotOptions, maxHealth: number): CBaseEntity {
  const v0 = { x: 0, y: 0, z: 0 };
  const pev: Entvars = {
    index: opts.id,
    classname: opts.name,
    model: "models/player.mdl",
    viewmodel: "",
    weaponmodel: "",
    origin: { x: opts.spawn.x, y: opts.spawn.y, z: opts.spawn.z },
    angles: { ...v0 },
    velocity: { ...v0 },
    basevelocity: { ...v0 },
    health: maxHealth,
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
  return {
    pev,
    classname: opts.name,
    targetname: "",
    target: "",
    message: "",
    delay: 0,
    killtarget: "",
    netname: opts.name,
  };
}
