/**
 * D.5.4 + D.5.7 + D.5.9 + D.5.10 — Phase 1 MVP build.
 *
 * Player controller (D.5.4):
 *   - Click canvas → PointerLock
 *   - WASD + mouse-look + Space jump + Shift sprint
 *   - Esc to release pointer (browser native)
 *
 * Weapon (D.5.7):
 *   - Left-click → fire pistol (raycast, damage bot, decrement ammo)
 *   - R → reload
 *
 * Stub bot (D.5.9):
 *   - Patrol state machine: walk between spawn + waypoint
 *   - Chases player when in range
 *   - Dies after enough damage
 *
 * HUD (D.5.10):
 *   - HP bar (top left)
 *   - Ammo counter (bottom right)
 *   - Crosshair (center)
 *   - Hit marker (red ✕) on hit
 *
 * What this exercises (foundation for everything else):
 *   - `src/bridge/engine.ts` (entity pool)
 *   - `src/mod/types.ts` (Entvars, CBaseEntity POJOs)
 *   - The Babylon.js engine, scene, camera, meshes
 *   - Input + game loop pattern
 *
 * Next (D.5.2 BSP→glTF): replace test level with real TS map.
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
import { StubBot } from "./bot";
import { Pistol, HudOverlay } from "./weapon";

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

// World (test level — replaced by ts_heresy.glb in D.5.2).
const { spawn } = buildTestLevel(scene);

// Camera.
const camera = new UniversalCamera("player", spawn.clone(), scene);
camera.setTarget(new Vector3(spawn.x, spawn.y + 1.6, spawn.z + 1));
camera.minZ = 0.1;
camera.maxZ = 200;

// Player controller.
const player = new PlayerController({
  camera,
  spawn: { x: spawn.x, y: spawn.y, z: spawn.z },
});

// Bots (3 bots patrolling).
const bots: StubBot[] = [
  new StubBot(scene, { id: 100, name: "bot1", spawn: { x: 4, y: 0, z: 4 }, color: new Color3(0.9, 0.3, 0.3) }),
  new StubBot(scene, { id: 101, name: "bot2", spawn: { x: -4, y: 0, z: -4 }, color: new Color3(0.3, 0.9, 0.3) }),
  new StubBot(scene, { id: 102, name: "bot3", spawn: { x: 6, y: 0, z: -2 }, color: new Color3(0.3, 0.5, 0.9) }),
];
for (const bot of bots) {
  bot.setPlayerPosition({
    x: player.entity.pev.origin.x,
    y: player.entity.pev.origin.y,
    z: player.entity.pev.origin.z,
  });
}

// Weapon.
const pistol = new Pistol({ camera, scene, damage: 25, maxAmmo: 12, range: 50, fireRate: 3 });
const hud = new HudOverlay(document.body);
pistol.setOnHit((_bot, _pos) => hud.flashHit());

// Wire the decompiled TS engine.
const driver = createBabylonSceneDriver({ canvas, audioCtx });
driver.entities.set(player.entity.pev.index, player.entity);
for (const bot of bots) {
  driver.entities.set(bot.entity.pev.index, bot.entity);
}

// Input handlers.
const onMouseDown = (e: MouseEvent) => {
  if (!player.isLocked()) return;
  if (e.button !== 0) return; // only left-click
  pistol.fire(bots);
};
const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === "KeyR") pistol.reload();
};
canvas.addEventListener("mousedown", onMouseDown);
window.addEventListener("keydown", onKeyDown);

// Main loop.
scene.onBeforeRenderObservable.add(() => {
  const dt = engine.getDeltaTime();
  player.update(dt);
  for (const bot of bots) {
    bot.setPlayerPosition({
      x: player.entity.pev.origin.x,
      y: player.entity.pev.origin.y,
      z: player.entity.pev.origin.z,
    });
    bot.update(dt);
  }
  pistol.update(dt);
  driver.onTick(dt);
  hud.update(
    player.entity.pev.health,
    100,
    pistol.getAmmo(),
    pistol.getMaxAmmo(),
    dt,
  );
});

let frameCount = 0;
engine.runRenderLoop(() => {
  scene.render();
  frameCount++;
  if (status && frameCount % 30 === 0) {
    const pos = camera.position;
    const lockStatus = player.isLocked() ? "LOCKED" : "click to lock";
    const fps = engine.getFps().toFixed(0);
    const aliveBots = bots.filter((b) => b.getHealth() > 0).length;
    status.textContent =
      `D.5 MVP — ${lockStatus}  pos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})  ` +
      `bots: ${aliveBots}/${bots.length}  ${fps} fps`;
  }
});

window.addEventListener("resize", () => engine.resize());

console.log(
  "%c[D.5 MVP] Babylon scene + player + bots + pistol + HUD ready",
  "color: #0f0; font-weight: bold",
);
console.log("Click canvas → mouse-look, WASD, LMB to fire, R to reload, Esc to release.");
