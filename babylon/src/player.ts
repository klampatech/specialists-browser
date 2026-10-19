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
const KEY_MAP: Record<string, "forward" | "back" | "left" | "right" | "sprint" | "jump" | "crouch"> = {
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
  ControlLeft: "crouch",
  ControlRight: "crouch",
  KeyC: "crouch", // alt
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
  /** Current eye height (mutated by crouch logic). */
  eyeHeight: number;
  /** Standing eye height (target when not crouched). */
  readonly eyeHeightStanding: number;
  /** Crouch eye height. */
  readonly eyeHeightCrouch: number;

  private keys = new Set<string>();
  private locked = false;
  private yaw = 0; // rotation around Y (radians)
  private pitch = 0; // rotation around X (radians)
  private velY = 0; // vertical velocity (for gravity/jump)
  /**
   * Logical player position — kept in sync with camera.position
   * in FPS mode, but tracked separately in external-camera mode
   * (so outer code can position the camera without it feeding
   * back into the controller and drifting away from the spawn).
   */
  private logicalPos = { x: 0, y: 0, z: 0 };
  private listeners: Array<() => void> = [];
  /** World bounds (XZ) for wall collision. null = no bounds. */
  private bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;
  /** Player is alive (HP > 0). Controls input / camera. */
  private alive = true;
  /**
   * When true, the camera is positioned externally (e.g. by a
   * third-person follow camera). The controller still updates
   * its internal pose state from input, but skips the
   * camera.position writes that drive the FPS view. Prevents
   * positive-feedback loops when an outer system and the
   * controller both write camera.position based on each other.
   */
  private externalCamera = false;
  /** Respawn timer (seconds remaining). */
  private respawnTimer = 0;
  /** Invulnerability after respawn (seconds). */
  private invulnTimer = 0;
  /** Kill counter. */
  private kills = 0;
  /** Current eye height (interpolates between standing and crouch). */
  private currentEyeHeight: number;
  /** Standing eye height. */
  private standingEyeHeight: number;
  /** Crouch eye height. */
  private crouchEyeHeight: number;
  /** Crouch transition speed (units/sec). */
  private crouchSpeed = 6;
  /** Crouched flag. */
  private crouched = false;
  /** Move speed multiplier when crouched. */
  private crouchSpeedMultiplier = 0.55;
  /** Callback when player takes damage (for HUD flash). */
  onDamage: ((amount: number, hp: number) => void) | null = null;
  /** Callback when player dies. */
  onDeath: (() => void) | null = null;
  /** Callback when player kills something. */
  onKill: ((name: string) => void) | null = null;
  /** Callback when player respawns. */
  onRespawn: (() => void) | null = null;

  constructor(opts: PlayerControllerOptions) {
    this.opts = { ...DEFAULT_OPTS, ...opts };
    this.camera = opts.camera;
    this.spawn = opts.spawn;
    this.eyeHeightStanding = this.opts.eyeHeight;
    this.eyeHeightCrouch = this.opts.eyeHeight * 0.45; // ~0.77 if standing is 1.7
    this.eyeHeight = this.eyeHeightStanding;

    // Position camera at spawn + eye height. Initialize logicalPos
    // to the same value so the FPS-mode writeback (at the end of
    // update()) doesn't immediately overwrite an uninitialized
    // logical position.
    this.logicalPos = { x: opts.spawn.x, y: opts.spawn.y + this.eyeHeight, z: opts.spawn.z };
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

  /**
   * Current camera yaw (radians). 0 = +Z, π/2 = +X.
   * This is the player's *intent* (driven by mouse-look) and
   * is stable across frames — unlike camera.rotation.y, which
   * Babylon mutates whenever setTarget is called.
   */
  getYaw(): number {
    return this.yaw;
  }

  /** Set AABB world bounds (player can't leave this box on XZ). */
  setBounds(b: { minX: number; maxX: number; minZ: number; maxZ: number } | null): void {
    this.bounds = b;
  }

  /**
   * Toggle external-camera mode. When true, the controller
   * stops writing camera.position; outer code is expected to
   * drive the camera. Input handling (WASD, look, jump) still
   * runs — it just updates this.yaw / this.pitch / horizontal
   * position state.
   */
  setExternalCamera(on: boolean): void {
    this.externalCamera = on;
  }

  /** Is the player alive? */
  isAlive(): boolean {
    return this.alive;
  }

  /** Get kill count. */
  getKills(): number {
    return this.kills;
  }

  /** Award a kill (called by main.ts when player kills a bot). */
  awardKill(name: string): void {
    this.kills++;
    this.onKill?.(name);
  }

  /** Damage the player. Returns true if fatal. */
  damage(amount: number): boolean {
    if (!this.alive) return false;
    if (this.invulnTimer > 0) return false;
    this.entity.pev.health = Math.max(0, this.entity.pev.health - amount);
    this.onDamage?.(amount, this.entity.pev.health);
    if (this.entity.pev.health <= 0) {
      this.alive = false;
      this.respawnTimer = 3.0; // 3s to respawn
      this.onDeath?.();
      return true;
    }
    return false;
  }

  /** Respawn at spawn. Called by main.ts after respawnTimer expires. */
  respawn(): void {
    this.alive = true;
    this.entity.pev.health = 100;
    this.invulnTimer = 1.5; // 1.5s of invuln
    this.velY = 0;
    this.logicalPos = { x: this.spawn.x, y: this.spawn.y + this.eyeHeight, z: this.spawn.z };
    this.camera.position.set(this.spawn.x, this.spawn.y + this.eyeHeight, this.spawn.z);
    this.yaw = 0;
    this.pitch = 0;
    this.camera.rotation.set(0, 0, 0);
    this.onRespawn?.();
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

    // Respawn countdown
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return; // skip input / movement while dead
    }

    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    // Crouch transition (smooth interpolate)
    this.crouched = this.keys.has("crouch");
    const targetEye = this.crouched ? this.eyeHeightCrouch : this.eyeHeightStanding;
    if (Math.abs(this.eyeHeight - targetEye) > 0.001) {
      const dir = Math.sign(targetEye - this.eyeHeight);
      this.eyeHeight += dir * this.crouchSpeed * dt;
      if ((dir > 0 && this.eyeHeight > targetEye) ||
          (dir < 0 && this.eyeHeight < targetEye)) {
        this.eyeHeight = targetEye;
      }
    }

    // Look (only when locked AND alive)
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
    const sprinting = this.keys.has("sprint") && !this.crouched; // can't sprint while crouched
    const speed = this.opts.moveSpeed
      * (sprinting ? this.opts.sprintMultiplier : 1)
      * (this.crouched ? this.crouchSpeedMultiplier : 1);

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

    // Apply horizontal movement to the logical position (NOT
    // the camera — in externalCamera mode the camera is driven
    // from outside, and we don't want a feedback loop).
    const pos = this.logicalPos;
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

    // Gravity / jump (on the logical position, not the camera).
    const onGround = pos.y <= this.spawn.y + this.eyeHeight + 0.001;
    if (onGround) {
      this.velY = 0;
      // Can't jump while crouched (would clip through ceiling)
      if (this.keys.has("jump") && !this.crouched) {
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

    // FPS mode: push logical pos back to the camera. External
    // mode: leave the camera alone (outer code positions it).
    if (!this.externalCamera) {
      this.camera.position.x = pos.x;
      this.camera.position.y = pos.y;
      this.camera.position.z = pos.z;
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
    // D.5.7 v2 — Numeric-keyed alias to pev. The decompiled CCombatBlock
    // does `(player as any)[0]` (decompiler notes "first field of
    // player; plausibly pev" — matches C++ memory layout where pev is
    // the first member at offset 0). Without this, line 34 and 75 of
    // CTSGun__CCombatBlock.ts throw "Cannot read properties of
    // undefined (reading 'field_0x250')".
    ...({ [0]: pev } as any),
    // ───────────────────────────────────────────────────────────
    // D.5.7 v2 — decompiler-named fields read by CCombatBlock
    // (and the broader CTSGun decompiled methods). Initialized to
    // 0 so guard checks pass; values get written by the decomp
    // body during play. Cast through `any` because the CBaseEntity
    // interface doesn't model these (they're TS-extension offsets).
    // ───────────────────────────────────────────────────────────
    ...({
      field_0x12c: 0,    // m_flNextAttack (cooldown guard)
      field_0x250: 0,    // state bitmask guard (peeked via player[0])
      field_0x774: 100,  // stamina/charge — exceeds block threshold cvar (default 0)
      field_0x7a8: 0,    // blockDuration write target (branch A)
      field_0x7ac: 0,    // blockDuration write target (branch C, byte=0x03)
      field_0x7b0: 0,    // blockDuration write target (branch C, byte=0x0a)
      field_0x28c: 0,    // animation thisPtr (Animate arg 1)
      field_0x208: 0,    // engine dispatch arg 2 (used via player[0].field_0x208)
    } as any),
  };
}
