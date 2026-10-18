/**
 * D.5.10 — Pickup system.
 *
 * Pickups sit in the world. When the player walks over one, they
 * get a small benefit (HP, ammo) and the pickup disappears (respawns
 * after a delay).
 *
 * For v1: simple proximity check (XZ distance < 0.6).
 */

import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

export type PickupKind = "health" | "ammo";

export interface PickupOptions {
  id: number;
  kind: PickupKind;
  position: { x: number; y: number; z: number };
  amount: number;
  respawnDelay?: number; // seconds before respawn
}

export class Pickup {
  readonly id: number;
  readonly kind: PickupKind;
  readonly amount: number;
  private position: { x: number; y: number; z: number };
  private mesh: any;
  private alive = true;
  private respawnTimer = 0;
  private respawnDelay: number;
  private spinTimer = 0;
  private bobTimer = 0;

  constructor(scene: Scene, opts: PickupOptions) {
    this.id = opts.id;
    this.kind = opts.kind;
    this.amount = opts.amount;
    this.position = { ...opts.position };
    this.respawnDelay = opts.respawnDelay ?? 8;

    // Build a simple rotating pickup mesh
    if (this.kind === "health") {
      // Health: red cross
      this.mesh = MeshBuilder.CreateBox(`pickup_${this.id}_v`, { width: 0.4, height: 0.4, depth: 0.1 }, scene);
      const mat = new StandardMaterial(`pickup_${this.id}_mat_v`, scene);
      mat.diffuseColor = new Color3(0.9, 0.1, 0.1);
      mat.emissiveColor = new Color3(0.3, 0.0, 0.0);
      this.mesh.material = mat;
    } else {
      // Ammo: green box
      this.mesh = MeshBuilder.CreateBox(`pickup_${this.id}_a`, { width: 0.3, height: 0.2, depth: 0.6 }, scene);
      const mat = new StandardMaterial(`pickup_${this.id}_mat_a`, scene);
      mat.diffuseColor = new Color3(0.1, 0.9, 0.2);
      mat.emissiveColor = new Color3(0.0, 0.3, 0.0);
      this.mesh.material = mat;
    }
    this.mesh.position.set(this.position.x, this.position.y + 0.5, this.position.z);
  }

  /**
   * Update the pickup. Returns true if the player collected it this frame.
   */
  update(deltaMs: number, playerPos: { x: number; y: number; z: number }): boolean {
    const dt = Math.min(deltaMs / 1000, 0.1);

    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return false;
    }

    // Spin and bob for visual interest
    this.spinTimer += dt * 2;
    this.bobTimer += dt * 3;
    this.mesh.rotation.y = this.spinTimer;
    this.mesh.position.y = this.position.y + 0.5 + Math.sin(this.bobTimer) * 0.1;

    // Proximity check
    const dx = this.position.x - playerPos.x;
    const dz = this.position.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.7) {
      this.collect();
      return true;
    }
    return false;
  }

  private collect(): void {
    this.alive = false;
    this.respawnTimer = this.respawnDelay;
    this.mesh.isVisible = false;
  }

  private respawn(): void {
    this.alive = true;
    this.mesh.isVisible = true;
  }

  isAlive(): boolean {
    return this.alive;
  }

  dispose(): void {
    this.mesh.dispose();
  }
}
