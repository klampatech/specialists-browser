/**
 * D.5.4 + D.5.7 + D.5.9 + D.5.10 + audio + pickups — Phase 2 MVP.
 *
 * Player controller (D.5.4):
 *   - Click canvas → PointerLock
 *   - WASD + mouse-look + Space jump + Shift sprint + Ctrl crouch
 *   - HP, take damage, die, respawn (1.5s invuln)
 *
 * Weapon (D.5.7):
 *   - Left-click → fire pistol (raycast, damage bot, decrement ammo)
 *   - R → reload (with click sound)
 *
 * Bots (D.5.9 v3):
 *   - Patrol → Chase → ATTACK state machine
 *   - 35° FOV, range-gated, accuracy falls off with distance
 *   - Crouching player = 45% accuracy penalty
 *   - Wall collision (clamped to AABB)
 *   - 4s respawn after death
 *
 * Pickups (D.5.10 v3):
 *   - Health packs: +25 HP, 8s respawn
 *   - Ammo boxes: +6 rounds, 8s respawn
 *
 * Audio (D.5.11):
 *   - Procedural sounds via Web Audio API
 *   - Gunshot, hit marker, hurt, reload, pickup, death
 *
 * HUD (D.5.10 v3):
 *   - HP bar (top left) + damage flash
 *   - Ammo counter (bottom right)
 *   - Crosshair (center)
 *   - Hit marker (red ✕) on hit
 *   - Kill counter (top right) + kill notification log
 *   - YOU DIED banner
 *
 * Test level: 36×6×36 arena with cover boxes, NE/SW maze corners,
 * a tilted ramp, and a central pillar. Spawns player in SW corner.
 */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Ray } from "@babylonjs/core/Culling/ray";

import { createBabylonSceneDriver } from "../../src/bridge/engine";
import { initEngine, engineLog, setEngineLogging, wireEngineAudio, setEngineHandlers } from "../../src/mod/decomp";
import { tryDecompFire, tryDecompReload, tryDecompSpawn, tryDecompSlowMotion, tryDecompBlock, tryDecompCCombatAttack } from "../../src/mod/decomp-bridge";
import { EntityPool, getGlobalPool, setGlobalPool } from "../../src/mod/entity-pool";

import { PlayerController } from "./player";
import { buildTestLevel } from "./world";
import { StubBot, BotWorld } from "./bot";
import { Pistol, HudOverlay } from "./weapon";
import { GameAudio } from "./audio";
import { Pickup } from "./pickup";
import { loadGameSounds } from "./audio-loader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { parseMdl } from "../../src/mod/mdl-parser";
import { buildMdlMeshes, type BuiltMdl } from "./mdl-loader";

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
light.intensity = 1.4;
light.groundColor = new Color3(0.5, 0.5, 0.5);
light.diffuse = new Color3(0.95, 0.92, 0.85);

// Audio.
const audio = new GameAudio(audioCtx);

// D.5.7 v3 — Load real game sounds from the TS mod (symlinked via
// babylon/public/sounds → _runtime_assets/half-life/ts/sound). When
// the bank is ready, plug it into GameAudio so wireEngineAudio's
// onEmitSound can play the real WAVs. Until then, the procedural
// synth handles every sound.
loadGameSounds(audioCtx).then((result) => {
  audio.setSoundBank(result.bank);
  console.log(`[main] ${result.loaded}/${result.total} game sounds loaded (${result.failed} failed)`);
  if (status) {
    const prev = status.textContent;
    status.textContent = `[audio] ${result.loaded}/${result.total} sounds loaded — ${prev ?? ""}`;
    setTimeout(() => {
      if (status.textContent?.startsWith("[audio]")) {
        status.textContent = status.textContent.replace(/^\[audio\][^—]*— /, "");
      }
    }, 2500);
  }
}).catch((err) => {
  console.warn("[main] sound load failed:", err);
});

// Wire decomp engine simulator to real audio. The decompiled code
// calls g_engfuncs.pfnEmitSound() — wire those to GameAudio so you
// HEAR the decompiled weapon fire.
wireEngineAudio(audio);

// Wire the decomp engine simulator's pfnTraceLine to actual Babylon
// raycasting. The decompiled CTSGun::Fire() should call this and
// the result tells it whether a bot was hit.
//
// D.5.6: the trace handler now resolves the hit entity from the
// global entity pool (via mesh identity) so downstream code
// (TraceAttack in decomp-bridge) can call its .damage() method.
setEngineHandlers({
  onTraceLine: (start: any, end: any, _flags: number, _ignoreEnt: any) => {
    // Cast a Babylon ray from start to end; return the closest hit
    const ray = new Ray(
      new Vector3(start.x, start.y, start.z),
      new Vector3(end.x - start.x, end.y - start.y, end.z - start.z).normalize(),
      Vector3.Distance(new Vector3(start.x, start.y, start.z), new Vector3(end.x, end.y, end.z)),
    );
    const pick = scene.pickWithRay(ray, (mesh) => {
      // Don't hit the floor or walls — only hit bot meshes
      return mesh.name.startsWith("bot_") && mesh.isVisible !== false;
    });
    if (pick && pick.hit && pick.pickedMesh) {
      const dist = Vector3.Distance(ray.origin, pick.pickedPoint || ray.origin);
      const total = Vector3.Distance(ray.origin, new Vector3(end.x, end.y, end.z));
      // D.5.6: resolve the hit entity from the global pool. The
      // pool maps each bot's mesh to its CBaseEntity POJO, so
      // TraceAttack can find the bot whose mesh was hit and call
      // .damage() on it.
      const hitEnt = resolveEntityByMesh(pick.pickedMesh);
      return {
        fraction: dist / total,
        endPos: { x: pick.pickedPoint.x, y: pick.pickedPoint.y, z: pick.pickedPoint.z },
        hit: hitEnt ? { mesh: pick.pickedMesh, entity: hitEnt, classname: hitEnt.classname, index: hitEnt.pev.index } : { mesh: pick.pickedMesh },
        planeNormal: { x: 0, y: 0, z: 1 },
        planeDist: 0,
        hitGroup: 0,
      };
    }
    return {
      fraction: 1.0,
      endPos: { x: end.x, y: end.y, z: end.z },
      hit: null,
      planeNormal: { x: 0, y: 0, z: 1 },
      planeDist: 0,
      hitGroup: 0,
    };
  },
});

/**
 * D.5.6: Find a registered entity by Babylon mesh identity. Walks
 * the global entity pool looking for an entity whose `mesh` (or
 * `mesh.body`) field matches. Used by the trace handler to
 * translate a Babylon hit into a CBaseEntity for the decompiled
 * code's TraceAttack path.
 */
function resolveEntityByMesh(mesh: any): any {
  const pool = getGlobalPool();
  for (const ent of pool.entities.values()) {
    const entAny = ent as any;
    if (entAny.mesh === mesh || entAny.mesh?.body === mesh) {
      return ent;
    }
  }
  return null;
}

// World.
const { spawn, bounds, obstacles } = buildTestLevel(scene);
console.log(`[level] bounds=${JSON.stringify(bounds)}, obstacles=${obstacles.length}`);

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
player.setBounds(bounds);

// ─── D.6 v0.1 — load the real player .mdl and build Babylon meshes ───
//
// Fetches the seal.mdl from the symlinked `public/models` (which
// points at `_runtime_assets/half-life/ts/models`). Parses it with
// the GoldSrc .mdl v10 parser, then builds Babylon meshes. The
// player instance is attached to the player controller — follows
// its position + yaw. KeyP toggles third-person view so you can
// actually see your own model.
let playerModel: BuiltMdl | null = null;
let playerModelInstance: TransformNode | null = null;
let playerFeetOffset = 0; // negative Y offset to shift the model up so feet are at y=0
let thirdPerson = false;

fetch("/models/player/seal/seal.mdl")
  .then((r) => r.arrayBuffer())
  .then((buf) => {
    const mdl = parseMdl(buf);
    // Scale factor for the .mdl → Babylon world. Cross-checked
    // against gordon/jesus/hitman/Bodysaver .mdl files: all
    // player models have Y bounds ~14-17 in their native units.
    // 1 unit = 4 inches in this mod (the TS mod scales vertices
    // by 4 for some reason — perhaps a legacy from Quake import
    // or a modder's convention). scale 0.1 → 1.6m humanoid.
    const built = buildMdlMeshes(scene, mdl, { scale: 0.1 });
    // Hide the original meshes — clone() makes instances that share
    // geometry. The original set stays in the scene but invisible
    // (no parent, so nothing renders).
    for (const bp of built.bodyParts) {
      for (const m of bp.meshes) {
        m.isVisible = false;
      }
    }
    playerModel = built;

    // Build the player instance — clone the body meshes so the
    // player has its own world transform (and rotation) but shares
    // geometry/material/textures.
    const inst = new TransformNode("player_model", scene);
    // Compute the model's lowest Y across all sub-models so we can
    // shift the whole instance UP by that amount, putting the
    // model's FEET at y=0 in world space. (The .mdl's "origin" is
    // the pelvis bone, which sits above the feet in this model —
    // without this offset, ~½ of the body ends up buried below
    // the floor.)
    //
    // The bounds are in mesh-local units (pre-scale, post Y↔Z
    // swap). At the time we compute feetOffset the mesh has
    // `scaling = 0.1` applied, so bb.minimum.y is the LOCAL min
    // (in pre-scale units like -9.4). We multiply by 0.1 to
    // convert to world meters.
    let feetOffset = 0;
    for (const bp of built.bodyParts) {
      for (const m of bp.meshes) {
        const bb = m.getBoundingInfo().boundingBox;
        if (bb.minimum.y < feetOffset) feetOffset = bb.minimum.y;
      }
    }
    // Re-apply the scale we set on each mesh in the loader.
    feetOffset *= 0.1;
    playerFeetOffset = feetOffset; // store for the per-frame update
    console.log(`[mdl] feetOffset = ${feetOffset.toFixed(3)}m (lowest vertex in world space; model is shifted up by this much so feet are at y=0)`);
    for (const bp of built.bodyParts) {
      const bpNode = new TransformNode(`player_${bp.name}`, scene);
      bpNode.parent = inst;
      for (const srcMesh of bp.meshes) {
        const m = srcMesh.clone(`player_${srcMesh.name}`, bpNode);
        m.isVisible = true;
        m.isPickable = true;
      }
    }
    // In GoldSrc, the player's forward axis is +Y (Y-up/right-handed
    // → +Y forward). After the loader's Y↔Z swap, the player's
    // forward in Babylon is -Z (into the screen). The mesh was
    // authored facing +Y in GoldSrc, which the swap converts to
    // +Z in Babylon — i.e. facing OUT of the screen. Rotate 180°
    // around Y so the model faces the same direction as the
    // camera. Then translate UP by -feetOffset (which is
    // negative) so the feet sit on the ground at y=0 instead of
    // the pelvis being at y=0.
    inst.rotation.y = Math.PI;
    inst.position.copyFrom(spawn);
    inst.position.y -= feetOffset; // shift up so feet are at y=0
    playerModelInstance = inst;
    console.log("[mdl] player model loaded: seal.mdl, bodyParts=", built.bodyParts.length, "meshes=", built.bodyParts.flatMap(bp => bp.meshes.length));
  })
  .catch((err) => {
    console.warn("[mdl] failed to load player model:", err);
  });

// Bots.
const bots: StubBot[] = [
  new StubBot(scene, { id: 100, name: "bot_red",   spawn: { x: 8,  y: 0, z: 8 },  color: new Color3(0.9, 0.3, 0.3) }),
  new StubBot(scene, { id: 101, name: "bot_green", spawn: { x: -8, y: 0, z: -8 }, color: new Color3(0.3, 0.9, 0.3) }),
  new StubBot(scene, { id: 102, name: "bot_blue",  spawn: { x: 12, y: 0, z: -4 }, color: new Color3(0.3, 0.5, 0.9) }),
];

// Pickups.
const pickups: Pickup[] = [
  new Pickup(scene, { id: 200, kind: "health", position: { x:  6, y: 0, z:  0 }, amount: 25 }),
  new Pickup(scene, { id: 201, kind: "health", position: { x: -6, y: 0, z:  0 }, amount: 25 }),
  new Pickup(scene, { id: 202, kind: "ammo",   position: { x:  0, y: 0, z: 10 }, amount: 6  }),
  new Pickup(scene, { id: 203, kind: "ammo",   position: { x:  0, y: 0, z: -8 }, amount: 6  }),
];

// Weapon (player) + HUD.
const pistol = new Pistol({ camera, scene, damage: 25, maxAmmo: 12, range: 50, fireRate: 3 });
const hud = new HudOverlay(document.body);
pistol.setOnHit((_bot, _pos) => {
  hud.flashHit();
  audio.hit();
  audio.enemyHurt();
});

// Player damage/death/respawn callbacks
player.onDamage = (_amount, _hp) => {
  hud.flashDamage();
  audio.hurt();
};
player.onDeath = () => {
  hud.showDeath();
  hud.addNotification("YOU DIED");
  audio.death();
};
player.onRespawn = () => {
  hud.hideDeath();
  hud.addNotification("Respawned");
};
player.onKill = (name) => {
  hud.incrementKills(name);
  audio.enemyHurt();
};

// Bot world: wire each bot to the same world (player + bounds + callbacks).
const world: BotWorld = {
  bounds,
  player: {
    x: spawn.x, y: spawn.y, z: spawn.z,
    alive: () => player.isAlive(),
  },
  onDealDamage: (_bot, amount) => {
    player.damage(amount);
  },
  onKilled: (_bot) => {},
};
for (const bot of bots) {
  bot.attachWorld(world);
  bot.setPlayerPosition({
    x: player.entity.pev.origin.x,
    y: player.entity.pev.origin.y,
    z: player.entity.pev.origin.z,
  });
}

// Register bots so the decompiled code can damage them when a raycast
// from pfnTraceLine hits a bot mesh. (decomp-bridge's TraceAttack
// walks the global entity pool to find the bot whose mesh was hit.)
//
// D.5.6: replaced the old __botRegistry global with a single
// shared EntityPool. The pool also holds the player's weapon entity
// (created lazily by getOrCreatePlayerWeapon() in decomp-bridge.ts).
const entityPool = new EntityPool("main");
setGlobalPool(entityPool);
entityPool.register(player.entity);
for (const bot of bots) entityPool.register(bot.entity);

// Wire the decompiled TS engine.
const driver = createBabylonSceneDriver({ canvas, audioCtx });
// D.5.6: the Babylon scene driver's entity pool IS the same as our
// global entity pool — same Map<EntityPtr, CBaseEntity>.
for (const [idx, ent] of entityPool.entities) {
  driver.entities.set(idx, ent);
}

// Input handlers.
const onMouseDown = (e: MouseEvent) => {
  if (!player.isLocked()) return;
  if (!player.isAlive()) return;
  if (e.button !== 0) return; // only left-click
  // Track which bots are alive before the shot — only award a kill
  // if a bot transitions alive → dead from this hit.
  const wasAlive = new Set(bots.filter((b) => b.isAlive()));
  const result = pistol.fire(bots);
  audio.gunshot();
  if (result.hit && wasAlive.has(result.hit) && !result.hit.isAlive()) {
    player.awardKill(result.hit.name);
  }

  // ALSO call the decompiled CTSGun::PrimaryAttack() — this routes
  // through the engine simulator which logs every engine call.
  // Position the decomp gun at the camera so the raycast aims
  // where the player is looking.
  const decompResult = tryDecompFire({
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  }, {
    x: 0, // pitch
    y: camera.rotation.y * (180 / Math.PI), // yaw
    z: 0,
  }, 0, 1); // category=0 (unknown), fireMode=1
  if (!decompResult.ok) {
    console.warn("[decomp] PrimaryAttack error:", decompResult.error);
  }
};
let audioMuted = false;
let slowMoFactor = 1.0;
let slowMoEndTime = 0;
let slowMoActive = false;

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === "KeyR") {
    pistol.reload();
    audio.reload();
    // Also call the decompiled Reload()
    const r = tryDecompReload();
    if (!r.ok) console.warn("[decomp] Reload error:", r.error);
  }
  // M to toggle audio mute
  if (e.code === "KeyM") {
    audioMuted = !audioMuted;
    audio.setMuted(audioMuted);
  }
  // P to toggle third-person view (lets you actually see the
  // player model you just loaded — in FPS view it's mostly
  // off-screen below the camera).
  if (e.code === "KeyP") {
    thirdPerson = !thirdPerson;
    if (thirdPerson) {
      // Move camera back and up so it looks at the player from
      // behind. Babylon UniversalCamera supports `position` +
      // setTarget — we re-anchor on every frame below.
      hud.addNotification("3RD-PERSON");
    } else {
      hud.addNotification("1ST-PERSON");
    }
  }
  // T to test decomp Spawn (logs engine simulator calls)
  if (e.code === "KeyT") {
    const r = tryDecompSpawn();
    if (!r.ok) console.warn("[decomp] Spawn error:", r.error);
  }
  // Y to trigger decomp slow-mo
  if (e.code === "KeyY") {
    // Call the decompiled GlobalSlowMotion2 (the TS mod's slow-mo logic)
    const r = tryDecompSlowMotion(0.25, true);
    if (!r.ok) console.warn("[decomp] SlowMotion error:", r.error);
    // Apply the slow factor to the Babylon render loop by scaling dt
    slowMoFactor = 0.25;
    slowMoEndTime = performance.now() + 1500; // 1.5s of slow-mo
    slowMoActive = true;
    hud.addNotification("SLOW-MO");
  }
  // L to toggle engine log
  if (e.code === "KeyL") {
    setEngineLogging(true);
    engineLog("logging toggled ON");
  }
  // B to trigger decomp CCombatBlock (defensive block). Not on the
  // PrimaryAttack hot path, so exposed as a dedicated key for testing.
  if (e.code === "KeyB") {
    const r = tryDecompBlock();
    if (r.ok) {
      console.log("[decomp] CCombatBlock OK");
    } else {
      console.warn("[decomp] CCombatBlock error:", r.error);
    }
  }
  // V to trigger decomp CCombatAttack (bare-hands punch). Same — not
  // on the PrimaryAttack hot path in v1 (player always has a weapon),
  // so exposed as a dedicated key for testing.
  if (e.code === "KeyV") {
    const r = tryDecompCCombatAttack();
    if (r.ok) {
      console.log("[decomp] CCombatAttack OK");
    } else {
      console.warn("[decomp] CCombatAttack error:", r.error);
    }
  }
};
canvas.addEventListener("mousedown", onMouseDown);
window.addEventListener("keydown", onKeyDown);

// First click anywhere also resumes audio context
const resumeAudio = () => {
  audio.resume();
  document.removeEventListener("click", resumeAudio);
};
document.addEventListener("click", resumeAudio, { once: true });

// Main loop.
scene.onBeforeRenderObservable.add(() => {
  const rawDt = engine.getDeltaTime();
  // Apply slow-mo factor to dt
  let dt = rawDt;
  if (slowMoActive) {
    if (performance.now() > slowMoEndTime) {
      slowMoFactor = 1.0;
      slowMoActive = false;
    } else {
      dt = rawDt * slowMoFactor;
    }
  }
  player.update(dt);
  if (player.isAlive()) {
    for (const bot of bots) {
      bot.setPlayerPosition({
        x: player.entity.pev.origin.x,
        y: player.entity.pev.origin.y,
        z: player.entity.pev.origin.z,
      });
      bot.setPlayerAimHeight(player.eyeHeight);
    }
  }
  for (const bot of bots) bot.update(dt);

  // Update pickups + check pickup collection
  const playerPos = {
    x: player.entity.pev.origin.x,
    y: player.entity.pev.origin.y,
    z: player.entity.pev.origin.z,
  };
  for (const pickup of pickups) {
    const collected = pickup.update(dt, playerPos);
    if (collected) {
      if (pickup.kind === "health") {
        const before = player.entity.pev.health;
        player.entity.pev.health = Math.min(100, player.entity.pev.health + pickup.amount);
        const healed = player.entity.pev.health - before;
        if (healed > 0) {
          hud.addNotification(`+${healed} HP`);
          audio.pickup();
        }
      } else if (pickup.kind === "ammo") {
        const before = pistol.getAmmo();
        pistol.giveAmmo(pickup.amount);
        const gained = pistol.getAmmo() - before;
        if (gained > 0) {
          hud.addNotification(`+${gained} ammo`);
          audio.pickup();
        }
      }
    }
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

// Third-person camera update — must run BEFORE scene.render() in
// every frame so the render uses the new camera position (not
// last frame's). Putting it in an onBeforeRenderObservable also
// guarantees it runs after the player controller update (which is
// also in onBeforeRender) but before the actual scene render.
scene.onBeforeRenderObservable.add(() => {
  if (thirdPerson && playerModelInstance) {
    player.setExternalCamera(true);
    const px = player.entity.pev.origin.x;
    const pz = player.entity.pev.origin.z;
    const yaw = player.getYaw();
    // 3m back, 1m up — frames the 1.6m-tall model from chest
    // height with full body in view.
    const back = 3.0;
    const up = 1.0;
    camera.position.x = px + Math.sin(yaw) * back;
    camera.position.y = player.entity.pev.origin.y + up;
    camera.position.z = pz + Math.cos(yaw) * back;
    camera.setTarget(new Vector3(px, player.entity.pev.origin.y + 0.9, pz));
  } else {
    player.setExternalCamera(false);
  }
});

let frameCount = 0;
engine.runRenderLoop(() => {
  scene.render();
  frameCount++;

  // D.6 v0.1: keep the player model anchored to the player controller.
  if (playerModelInstance) {
    playerModelInstance.position.x = player.entity.pev.origin.x;
    // Y is shifted up by -playerFeetOffset (which is negative) so
    // the model's feet sit on the ground at y=0 instead of the
    // pelvis (which is what entity.pev.origin maps to in the .mdl).
    playerModelInstance.position.y = player.entity.pev.origin.y - playerFeetOffset;
    playerModelInstance.position.z = player.entity.pev.origin.z;
    // Yaw follows the camera (player faces the same direction they're
    // looking). Add the 180° base rotation that gets the .mdl's
    // authored forward axis to match the camera.
    playerModelInstance.rotation.y = Math.PI + camera.rotation.y;
  }

  // Third-person view: pull camera back and up, looking at the
  // player model. Re-applied every frame because the player is
  // moving (and the camera was originally a FPS controller).
  // (third-person camera is now in onBeforeRenderObservable above,
  // before the render — that way the render uses the new camera
  // position immediately, no 1-frame delay)
  if (false) {
    // [moved to onBeforeRender above]
  }

  // TEMP DEBUG: log camera frustum details
  if (frameCount === 30) {
    console.log(`[debug] camera pos=(${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}) rot=(${camera.rotation.x.toFixed(2)},${camera.rotation.y.toFixed(2)},${camera.rotation.z.toFixed(2)}) fov=${camera.fov} minZ=${camera.minZ} maxZ=${camera.maxZ}`);
    console.log(`[debug] active camera: ${scene.activeCamera?.name}`);
    // List ALL meshes in scene
    const all = scene.meshes.map(m => `${m.name}(${m.isVisible ? 'V' : 'h'})`).join(', ');
    console.log(`[debug] ${scene.meshes.length} meshes total: ${all.substring(0, 800)}`);
  }

  if (status && frameCount % 30 === 0) {
    const pos = camera.position;
    const lockStatus = player.isLocked() ? "LOCKED" : "click to lock";
    const fps = engine.getFps().toFixed(0);
    const aliveBots = bots.filter((b) => b.isAlive()).length;
    const statusPrefix = player.isAlive() ? "" : "[DEAD] ";
    const mdlStatus = playerModel ? "[mdl] " : "";
    status.textContent =
      `${mdlStatus}D.5 MVP — ${statusPrefix}${lockStatus}  pos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})  ` +
      `bots: ${aliveBots}/${bots.length}  kills: ${player.getKills()}  ${fps} fps`;
  }
});

window.addEventListener("resize", () => engine.resize());

console.log(
  "%c[D.5 MVP v3] Babylon scene + player + bots + pistol + HUD + audio + pickups ready",
  "color: #0f0; font-weight: bold",
);
console.log("Click canvas → mouse-look, WASD, LMB to fire, R to reload, Esc to release.");
console.log("Ctrl/C = crouch, M = mute audio");
console.log("Bots shoot back, 1.5s invulnerability after respawn.");
console.log("Pickups: red = health, green = ammo (8s respawn).");
