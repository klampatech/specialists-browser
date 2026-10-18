/**
 * D.5.4 — Player controller (Babylon.js + PointerLock).
 *
 * First-person controller with:
 *   - Click on canvas → request PointerLock
 *   - Mouse movement → look (yaw + pitch)
 *   - WASD → move horizontally (forward/back/strafe)
 *   - Space → jump
 *   - Shift → sprint
 *   - Esc → release PointerLock (browser native)
 *
 * The controller wraps a Babylon `UniversalCamera` and writes its
 * position/rotation into a `CBaseEntity`-shaped POJO so the
 * decompiled TS can read it.
 */

import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import type { CBaseEntity, Entvars } from "../../src/mod/types";

export interface PlayerControllerOptions {
  /** Babylon camera to drive (already added to scene). */
  camera: UniversalCamera;
  /** Spawn position (player feet). */
  spawn: { x: number; y: number; z: number };
  /** Move speed in units/sec. */
  moveSpeed?: number;
  /** Sprint multiplier when Shift is held. */
  sprintMultiplier?: number;
  /** Mouse sensitivity (radians per pixel). */
  lookSensitivity?: number;
  /** Optional eye height (camera is offset this much above entity origin). */
  eyeHeight?: number;
  /** Gravity in units/sec². */
  gravity?: number;
  /** Jump velocity in units/sec. */
  jumpVelocity?: number;
  /** Whether the controller starts with pointer locked. */
  startLocked?: boolean;
}

const DEFAULT_OPTS: Required<Omit<PlayerControllerOptions, "camera" | "spawn">> = {
  moveSpeed: 5.0,
  sprintMultiplier: 1.8,
  lookSensitivity: 0.0025,
  eyeHeight: 1.7,
  gravity: 20,
  jumpVelocity: 8,
  startLocked: false,
};

/** Keys being held. */
const KEY_MAP: Record<string, "forward" | "back" | "left" | "right" | "sprint" | "jump"> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
  Space: "jump",
};

/**
 * Player controller with PointerLock + WASD + mouse-look.
 *
 * Returns a controller object with `.update(dtMs)` and the underlying
 * `CBaseEntity` POJO that decompiled TS modules can read.
 */
export class PlayerController {
  readonly camera: UniversalCamera;
  readonly entity: CBaseEntity;
  readonly opts: Required<Omit<PlayerControllerOptions, "camera" | "spawn">>;
  readonly spawn: { x: number; y: number; z: number };
  readonly eyeHeight: number;

  private keys = new Set<string>();
  private locked = false;
  private yaw = 0; // rotation around Y (radians)
  private pitch = 0; // rotation around X (radians)
  private velY = 0; // vertical velocity (for gravity/jump)
  private listeners: Array<() => void> = [];
  /** World bounds (XZ) for wall collision. null = no bounds. */
  private bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;

  constructor(opts: PlayerControllerOptions) {
    this.opts = { ...DEFAULT_OPTS, ...opts };
    this.camera = opts.camera;
    this.spawn = opts.spawn;
    this.eyeHeight = this.opts.eyeHeight;

    // Position camera at spawn + eye height.
    this.camera.position.set(opts.spawn.x, opts.spawn.y + this.eyeHeight, opts.spawn.z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    // Babylon's default WASD input conflicts with our custom handler;
    // disable it so we don't get double inputs.
    this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");

    // Build a CBaseEntity POJO for the decompiled TS to read.
    this.entity = makePlayerEntity(this);

    this.attachListeners();
  }

  /** Returns the player entity (CBaseEntity POJO) for the decompiled TS. */
  getEntvars(): Entvars {
    return this.entity.pev;
  }

  /** Whether pointer is currently locked. */
  isLocked(): boolean {
    return this.locked;
  }

  /** Set AABB world bounds (player can't leave this box on XZ). */
  setBounds(b: { minX: number; maxX: number; minZ: number; maxZ: number } | null): void {
    this.bounds = b;
  }

  /** Manually request pointer lock. */
  requestPointerLock(): void {
    const canvas = this.camera.getEngine().getRenderingCanvas();
    if (!canvas) return;
    canvas.requestPointerLock?.();
  }

  /**
   * Step the controller.
   * @param deltaMs milliseconds since last frame
   */
  update(deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1); // clamp to 100ms (avoid tunneling)

    // Look (only when locked)
    if (this.locked) {
      // Yaw rotates around Y, pitch around X.
      // Babylon's UniversalCamera uses left-handed coords where
      // positive rotation.x tilts the camera DOWN. Our `pitch`
      // convention is "positive = look up", so we negate.
      this.camera.rotation.set(-this.pitch, this.yaw, 0);
    }

    // Movement
    let forward = 0;
    let right = 0;
    if (this.keys.has("forward")) forward += 1;
    if (this.keys.has("back")) forward -= 1;
    if (this.keys.has("right")) right += 1;
    if (this.keys.has("left")) right -= 1;
    const sprinting = this.keys.has("sprint");
    const speed = this.opts.moveSpeed * (sprinting ? this.opts.sprintMultiplier : 1);

    // Compute movement direction in world space.
    // Forward = camera yaw (rotation.y), strafe = perpendicular.
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    // Babylon uses left-handed by default but Vector3 is right-handed math;
    // we use a standard FPS coordinate frame:
    //   forward (W) = (sinY, 0, cosY)
    //   right (D)   = (cosY, 0, -sinY)
    const moveX = (sinY * forward + cosY * right) * speed * dt;
    const moveZ = (cosY * forward - sinY * right) * speed * dt;

    // Apply horizontal movement.
    const pos = this.camera.position;
    pos.x += moveX;
    pos.z += moveZ;

    // Clamp to world bounds (wall collision).
    if (this.bounds) {
      const r = 0.4; // player radius
      if (pos.x < this.bounds.minX + r) pos.x = this.bounds.minX + r;
      if (pos.x > this.bounds.maxX - r) pos.x = this.bounds.maxX - r;
      if (pos.z < this.bounds.minZ + r) pos.z = this.bounds.minZ + r;
      if (pos.z > this.bounds.maxZ - r) pos.z = this.bounds.maxZ - r;
    }

    // Gravity / jump.
    const onGround = pos.y <= this.spawn.y + this.eyeHeight + 0.001;
    if (onGround) {
      this.velY = 0;
      if (this.keys.has("jump")) {
        this.velY = this.opts.jumpVelocity;
      }
    } else {
      this.velY -= this.opts.gravity * dt;
    }
    pos.y += this.velY * dt;
    if (pos.y < this.spawn.y + this.eyeHeight) {
      pos.y = this.spawn.y + this.eyeHeight;
      this.velY = 0;
    }

    // Sync the entity POJO so decompiled TS can read pos/origin/angles.
    this.entity.pev.origin.x = pos.x;
    this.entity.pev.origin.y = pos.y - this.eyeHeight;
    this.entity.pev.origin.z = pos.z;
    this.entity.pev.angles.x = -this.pitch * (180 / Math.PI);
    this.entity.pev.angles.y = this.yaw * (180 / Math.PI);
    this.entity.pev.angles.z = 0;
    this.entity.pev.velocity.x = moveX / dt;
    this.entity.pev.velocity.y = this.velY;
    this.entity.pev.velocity.z = moveZ / dt;
  }

  /** Remove all listeners. */
  dispose(): void {
    for (const off of this.listeners) off();
    this.listeners = [];
    this.keys.clear();
  }

  private attachListeners(): void {
    const canvas = this.camera.getEngine().getRenderingCanvas();
    if (!canvas) return;

    // PointerLock change
    const onLockChange = () => {
      this.locked = document.pointerLockElement === canvas;
    };
    document.addEventListener("pointerlockchange", onLockChange);
    this.listeners.push(() => document.removeEventListener("pointerlockchange", onLockChange));

    // Click to lock
    const onClick = () => {
      if (!this.locked) canvas.requestPointerLock?.();
    };
    canvas.addEventListener("click", onClick);
    this.listeners.push(() => canvas.removeEventListener("click", onClick));

    // Mouse move (only when locked)
    const onMouseMove = (e: MouseEvent) => {
      if (!this.locked) return;
      this.yaw += e.movementX * this.opts.lookSensitivity;
      this.pitch -= e.movementY * this.opts.lookSensitivity;
      // Clamp pitch to ±89° so you don't flip.
      const maxPitch = (89 * Math.PI) / 180;
      if (this.pitch > maxPitch) this.pitch = maxPitch;
      if (this.pitch < -maxPitch) this.pitch = -maxPitch;
    };
    document.addEventListener("mousemove", onMouseMove);
    this.listeners.push(() => document.removeEventListener("mousemove", onMouseMove));

    // Keys
    const onKeyDown = (e: KeyboardEvent) => {
      const k = KEY_MAP[e.code];
      if (k) this.keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = KEY_MAP[e.code];
      if (k) this.keys.delete(k);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    this.listeners.push(() => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    });
  }
}

function makePlayerEntity(_controller: PlayerController): CBaseEntity {
  const v0 = { x: 0, y: 0, z: 0 };
  const pev: Entvars = {
    index: 1,
    classname: "player",
    model: "models/player.mdl",
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
  return {
    pev,
    classname: "player",
    targetname: "",
    target: "",
    message: "",
    delay: 0,
    killtarget: "",
    netname: "",
  };
}
