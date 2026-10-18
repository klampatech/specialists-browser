/**
 * D.5.4 + D.5.7 + D.5.9 + D.5.10 — Phase 1 MVP build.
 *
 * Player controller (D.5.4):
 *   - Click canvas → PointerLock
 *   - WASD + mouse-look + Space jump + Shift sprint
 *   - Esc to release pointer (browser native)
 *   - HP, take damage, die, respawn
 *
 * Weapon (D.5.7):
 *   - Left-click → fire pistol (raycast, damage bot, decrement ammo)
 *   - R → reload
 *
 * Bots (D.5.9):
 *   - Patrol → Chase → ATTACK state machine
 *   - Bots shoot at player when in range + in FOV
 *   - Bots have wall collision
 *   - Bots tip over when killed, respawn after 4s
 *
 * HUD (D.5.10):
 *   - HP bar (top left) + damage flash
 *   - Ammo counter (bottom right)
 *   - Crosshair (center)
 *   - Hit marker (red ✕) on hit
 *   - Kill counter (top right) + kill notification
 *   - YOU DIED banner on death
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
import { StubBot, BotWorld } from "./bot";
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
// Wall collision: room is 24×24 centered at origin
player.setBounds({ minX: -12, maxX: 12, minZ: -12, maxZ: 12 });

// Bots.
const bots: StubBot[] = [
  new StubBot(scene, { id: 100, name: "bot_red", spawn: { x: 4, y: 0, z: 4 }, color: new Color3(0.9, 0.3, 0.3) }),
  new StubBot(scene, { id: 101, name: "bot_green", spawn: { x: -4, y: 0, z: -4 }, color: new Color3(0.3, 0.9, 0.3) }),
  new StubBot(scene, { id: 102, name: "bot_blue", spawn: { x: 6, y: 0, z: -2 }, color: new Color3(0.3, 0.5, 0.9) }),
];

// Weapon (player) + HUD.
const pistol = new Pistol({ camera, scene, damage: 25, maxAmmo: 12, range: 50, fireRate: 3 });
const hud = new HudOverlay(document.body);
pistol.setOnHit((_bot, _pos) => hud.flashHit());

// Player damage/death/respawn callbacks
player.onDamage = (_amount, _hp) => {
  hud.flashDamage();
};
player.onDeath = () => {
  hud.showDeath();
  hud.addNotification("YOU DIED");
};
player.onRespawn = () => {
  hud.hideDeath();
  hud.addNotification("Respawned");
};
player.onKill = (name) => {
  hud.incrementKills(name);
};

// Bot world: wire each bot to the same world (player + bounds + callbacks).
const world: BotWorld = {
  bounds: { minX: -12, maxX: 12, minZ: -12, maxZ: 12 },
  player: {
    x: spawn.x, y: spawn.y, z: spawn.z,
    alive: () => player.isAlive(),
  },
  onDealDamage: (_bot, amount) => {
    player.damage(amount);
  },
  onKilled: (_bot) => {
    // Could trigger a "bot respawned" notification, but bots are silent for now.
  },
};
for (const bot of bots) {
  bot.attachWorld(world);
  bot.setPlayerPosition({
    x: player.entity.pev.origin.x,
    y: player.entity.pev.origin.y,
    z: player.entity.pev.origin.z,
  });
}

// Wire the decompiled TS engine.
const driver = createBabylonSceneDriver({ canvas, audioCtx });
driver.entities.set(player.entity.pev.index, player.entity);
for (const bot of bots) {
  driver.entities.set(bot.entity.pev.index, bot.entity);
}

// Input handlers.
const onMouseDown = (e: MouseEvent) => {
  if (!player.isLocked()) return;
  if (!player.isAlive()) return;
  if (e.button !== 0) return; // only left-click
  const result = pistol.fire(bots);
  if (result.hit) {
    player.awardKill(result.hit.name);
  }
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
  if (player.isAlive()) {
    for (const bot of bots) {
      bot.setPlayerPosition({
        x: player.entity.pev.origin.x,
        y: player.entity.pev.origin.y,
        z: player.entity.pev.origin.z,
      });
    }
  }
  for (const bot of bots) bot.update(dt);
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
    const aliveBots = bots.filter((b) => b.isAlive()).length;
    const statusPrefix = player.isAlive() ? "" : "[DEAD] ";
    status.textContent =
      `D.5 MVP — ${statusPrefix}${lockStatus}  pos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})  ` +
      `bots: ${aliveBots}/${bots.length}  kills: ${player.getKills()}  ${fps} fps`;
  }
});

window.addEventListener("resize", () => engine.resize());

console.log(
  "%c[D.5 MVP] Babylon scene + player + bots + pistol + HUD ready",
  "color: #0f0; font-weight: bold",
);
console.log("Click canvas → mouse-look, WASD, LMB to fire, R to reload, Esc to release.");
console.log("Bots shoot back! 1.5s invulnerability after respawn.");
