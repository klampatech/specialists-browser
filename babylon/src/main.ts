/**
 * D.5.1 Stage 1 — Babylon.js dev server boots + empty canvas.
 *
 * This is the minimal "ready to begin building in Babylon" milestone:
 * a Babylon.js Scene renders, the engine renders an empty world,
 * and the engine.onTick bridge is wired to the decompiled TS modules.
 *
 * The dev server boots (`pnpm dev` / `bun run dev`) at port 5174.
 *
 * Stage 2 (D.5.2-5.4): load ts_heresy.glb, add player controller,
 * hook decompiled TS WaitThink/Think loops into onBeforeRenderObservable.
 *
 * Stage 3 (D.5.5+): wire all per-class modules with type contracts.
 */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";

import { createBabylonSceneDriver } from "../../src/bridge/engine";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const status = document.getElementById("status") as HTMLDivElement;

if (!canvas) throw new Error("No #renderCanvas element");

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
  disableWebGL2Support: false,
});

const scene = new Scene(engine);
scene.clearColor = new Color4(0.1, 0.1, 0.15, 1.0);

const camera = new UniversalCamera(
  "camera",
  new Vector3(0, 5, -10),
  scene,
);
camera.setTarget(Vector3.Zero());
camera.attachControl(canvas, true);

const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
light.intensity = 0.7;
light.groundColor = new Color3(0.5, 0.5, 0.5);

// Wire the decompiled TS modules into the Babylon loop
const driver = createBabylonSceneDriver({ canvas, audioCtx });

scene.onBeforeRenderObservable.add(() => {
  driver.onTick(engine.getDeltaTime());
});

// Render loop
let frameCount = 0;
engine.runRenderLoop(() => {
  scene.render();
  frameCount++;
  if (frameCount % 60 === 0 && status) {
    status.textContent = `D.5.1 STAGE 1: empty Babylon canvas (${frameCount} frames @ ${engine.getFps().toFixed(0)} fps)`;
  }
});

window.addEventListener("resize", () => engine.resize());

// Console marker
console.log("[D.5.1] Babylon scene booted. Driver wired.");
