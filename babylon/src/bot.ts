/**
 * D.5.9 — Stub bot.
 *
 * The .so has 0 bot methods, so v1 has a simple state machine:
 *   - IDLE: stand still
 *   - PATROL: walk between two waypoints
 *   - CHASE: walk toward the player
 *   - DEAD: ragdoll on the ground
 *
 * Phase 2 will replace this with Botman's BotLib or similar.
 *
 * The bot has:
 *   - A mesh (box, scaled to ~human size)
 *   - A CBaseEntity POJO
 *   - An ai think loop driven by `update(dt)`
 */

import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

import type { CBaseEntity, Entvars } from "../../src/mod/types";

type BotState = "IDLE" | "PATROL" | "CHASE" | "DEAD";

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

export class StubBot {
  readonly entity: CBaseEntity;
  readonly scene: Scene;
  private mesh: any; // AbstractMesh
  private state: BotState = "PATROL";
  private stateTimer = 0;
  private spawn: { x: number; y: number; z: number };
  private patrolTo: { x: number; y: number; z: number };
  private target?: { x: number; y: number; z: number };
  private speed = 1.5; // units/sec
  private health: number;
  private yaw = 0;

  constructor(scene: Scene, opts: BotOptions) {
    this.scene = scene;
    this.spawn = { ...opts.spawn };
    this.patrolTo = opts.patrolTo ?? {
      x: opts.spawn.x + 4,
      y: opts.spawn.y,
      z: opts.spawn.z + 4,
    };
    this.health = 100;

    // Build a humanoid-shaped mesh (cylinder + sphere head)
    this.mesh = MeshBuilder.CreateCylinder(`bot_${opts.id}_body`, {
      height: HUMAN_HEIGHT - 0.4,
      diameterTop: HUMAN_WIDTH,
      diameterBottom: HUMAN_WIDTH,
    }, scene);
    this.mesh.position.set(opts.spawn.x, opts.spawn.y + (HUMAN_HEIGHT - 0.4) / 2, opts.spawn.z);
    const mat = new StandardMaterial(`bot_${opts.id}_mat`, scene);
    mat.diffuseColor = opts.color ?? new Color3(0.9, 0.3, 0.3);
    this.mesh.material = mat;

    const head = MeshBuilder.CreateSphere(`bot_${opts.id}_head`, { diameter: 0.4 }, scene);
    head.position.set(0, (HUMAN_HEIGHT - 0.4) / 2 + 0.2, 0);
    head.parent = this.mesh;
    head.material = mat;

    // Build the entity POJO
    this.entity = makeBotEntity(opts);
  }

  getHealth(): number {
    return this.health;
  }

  /** Set the player's position so the bot can chase. */
  setPlayerPosition(pos: { x: number; y: number; z: number }): void {
    this.target = pos;
  }

  /** Damage the bot. */
  damage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.state = "DEAD";
      this.mesh.rotation.x = Math.PI / 2; // tip over
      this.mesh.position.y = 0.3;
    }
  }

  /** Step the bot. */
  update(deltaMs: number): void {
    if (this.state === "DEAD") return;
    const dt = Math.min(deltaMs / 1000, 0.1);

    // State machine
    this.stateTimer += dt;
    if (this.stateTimer > 5) {
      this.stateTimer = 0;
      this.state = this.target ? "CHASE" : "PATROL";
    }

    let target: { x: number; y: number; z: number };
    if (this.state === "CHASE" && this.target) {
      target = this.target;
    } else {
      // PATROL: ping-pong between spawn and patrolTo
      if (this.stateTimer < 2.5) {
        target = this.patrolTo;
      } else {
        target = this.spawn;
      }
    }

    // Move toward target
    const dx = target.x - this.mesh.position.x;
    const dz = target.z - this.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.5) {
      const nx = dx / dist;
      const nz = dz / dist;
      this.mesh.position.x += nx * this.speed * dt;
      this.mesh.position.z += nz * this.speed * dt;
      this.yaw = Math.atan2(nx, nz);
      this.mesh.rotation.y = this.yaw;
    }

    // Sync to entity POJO
    this.entity.pev.origin.x = this.mesh.position.x;
    this.entity.pev.origin.y = this.mesh.position.y;
    this.entity.pev.origin.z = this.mesh.position.z;
    this.entity.pev.angles.y = this.yaw * (180 / Math.PI);
    this.entity.pev.health = this.health;
  }

  dispose(): void {
    this.mesh.dispose();
  }
}

function makeBotEntity(opts: BotOptions): CBaseEntity {
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
