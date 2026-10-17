/**
 * D.5.4 — Babylon scene with first-person player controller.
 *
 * Stage 1 milestone verified earlier: empty canvas + dev server boots.
 * Stage 2 (D.5.4): player controller with WASD + PointerLock + mouse-look.
 *
 * Controls:
 *   - Click canvas → request PointerLock
 *   - Mouse       → look (yaw + pitch)
 *   - WASD        → move
 *   - Shift       → sprint
 *   - Space       → jump
 *   - Esc         → release pointer (browser native)
 *
 * What this exercises:
 *   - `src/bridge/engine.ts` (engine context + entity pool)
 *   - `src/mod/types.ts` (Entvars POJO)
 *   - `babylon/src/player.ts` (controller)
 *   - `babylon/src/world.ts` (test level)
 *
 * Next (D.5.2 BSP, D.5.5 types, D.5.6+ bridge): replace the test
 * level with ts_heresy.glb and the player spawn at a real entity
 * point.
 */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";

import { createBabylonSceneDriver } from "../../src/bridge/engine";

import { PlayerController } from "./player";
import { buildTestLevel } from "./world";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const status = document.getElementById("status") as HTMLDivElement;

if (!canvas) throw new Error("No #renderCanvas element");

// Babylon engine + scene.
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
  disableWebGL2Support: false,
});

const scene = new Scene(engine);
scene.clearColor = new Color4(0.05, 0.05, 0.08, 1.0);
scene.ambientColor = new Color3(0.4, 0.4, 0.4);

// Light.
const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
light.intensity = 0.9;
light.groundColor = new Color3(0.3, 0.3, 0.3);
light.diffuse = new Color3(0.95, 0.92, 0.85);

// World.
const { spawn } = buildTestLevel(scene);

// Camera (will be driven by PlayerController).
const camera = new UniversalCamera("player", spawn.clone(), scene);
camera.setTarget(new Vector3(spawn.x, spawn.y + 1.6, spawn.z + 1));
camera.minZ = 0.1;
camera.maxZ = 200;

// Player controller.
const player = new PlayerController({
  camera,
  spawn: { x: spawn.x, y: spawn.y, z: spawn.z },
  moveSpeed: 5.0,
  sprintMultiplier: 1.8,
  lookSensitivity: 0.0025,
  eyeHeight: 1.7,
  gravity: 20,
  jumpVelocity: 8,
});

// Wire the decompiled TS engine into the Babylon loop.
const driver = createBabylonSceneDriver({ canvas, audioCtx });

scene.onBeforeRenderObservable.add(() => {
  const dt = engine.getDeltaTime();
  player.update(dt);
  driver.onTick(dt);
});

// Register the player entity with the engine so the decompiled TS
// can find it (Phase 2 will wire this into the entity pool).
driver.entities.set(player.entity.pev.index, player.entity);

// Status overlay.
let frameCount = 0;
let lastLocked = false;

engine.runRenderLoop(() => {
  scene.render();
  frameCount++;
  if (status && (frameCount % 30 === 0 || player.isLocked() !== lastLocked)) {
    lastLocked = player.isLocked();
    const pos = camera.position;
    const x = pos.x.toFixed(1);
    const y = pos.y.toFixed(1);
    const z = pos.z.toFixed(1);
    const lockStatus = lastLocked ? "LOCKED" : "click to lock";
    const fps = engine.getFps().toFixed(0);
    status.textContent =
      `D.5.4 — WASD + PointerLock [${lockStatus}]  ` +
      `pos: (${x}, ${y}, ${z})  ` +
      `${fps} fps`;
  }
});

window.addEventListener("resize", () => engine.resize());

// Help console message.
console.log(
  "%c[D.5.4] Babylon scene + player controller ready",
  "color: #0f0; font-weight: bold",
);
console.log("Click the canvas to capture pointer, then WASD/mouse to look around.");
console.log("Player entity (CBaseEntity):", player.entity);
