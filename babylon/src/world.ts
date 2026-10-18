/**
 * D.5.4 — Test level: a small arena with cover, ramps, and a maze section.
 *
 * Designed for play-testing the player controller + bots + weapons.
 * Layout:
 *   - 36×6×36 open arena
 *   - 6 cover boxes scattered
 *   - 7 partial walls forming mazes in NE and SW corners
 *   - 1 ramp for elevation
 *   - 1 central pillar
 *
 * Real map loading (ts_heresy.glb from D.5.2) replaces this in production,
 * but the BSP→glTF tool is currently broken on these non-standard BSPs.
 */

import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

import { GridMaterial } from "@babylonjs/materials/grid/gridMaterial";

const ROOM_W = 36;
const ROOM_H = 6;
const ROOM_D = 36;

export interface LevelLayout {
  spawn: Vector3;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Internal walls (for bot pathfinding — not used yet) */
  obstacles: Array<{ x: number; z: number; w: number; d: number; h: number }>;
}

export function buildTestLevel(scene: Scene): LevelLayout {
  // ── Floor with grid material ──
  const floor = MeshBuilder.CreateGround("floor", { width: ROOM_W, height: ROOM_D }, scene);
  floor.position.y = 0;
  const gridMat = new GridMaterial("grid", scene);
  gridMat.gridRatio = 1;
  gridMat.mainColor = new Color3(0.4, 0.4, 0.4);
  gridMat.lineColor = new Color3(0.0, 1.0, 0.0);
  floor.material = gridMat;

  // ── Walls (outer) ──
  const wallMat = new StandardMaterial("wall", scene);
  wallMat.diffuseColor = new Color3(0.6, 0.4, 0.3);

  const wallN = MeshBuilder.CreateBox("wall_n", { width: ROOM_W, height: ROOM_H, depth: 0.2 }, scene);
  wallN.position.set(0, ROOM_H / 2, ROOM_D / 2);
  wallN.material = wallMat;

  const wallS = MeshBuilder.CreateBox("wall_s", { width: ROOM_W, height: ROOM_H, depth: 0.2 }, scene);
  wallS.position.set(0, ROOM_H / 2, -ROOM_D / 2);
  wallS.material = wallMat;

  const wallE = MeshBuilder.CreateBox("wall_e", { width: 0.2, height: ROOM_H, depth: ROOM_D }, scene);
  wallE.position.set(ROOM_W / 2, ROOM_H / 2, 0);
  wallE.material = wallMat;

  const wallW = MeshBuilder.CreateBox("wall_w", { width: 0.2, height: ROOM_H, depth: ROOM_D }, scene);
  wallW.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
  wallW.material = wallMat;

  // ── Ceiling ──
  const ceiling = MeshBuilder.CreateGround("ceiling", { width: ROOM_W, height: ROOM_D }, scene);
  ceiling.position.set(0, ROOM_H, 0);
  ceiling.rotation.x = Math.PI;
  const ceilingMat = new StandardMaterial("ceiling_mat", scene);
  ceilingMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
  ceiling.material = ceilingMat;

  // ── Cover boxes (6 boxes) ──
  const coverMat = new StandardMaterial("cover", scene);
  coverMat.diffuseColor = new Color3(0.9, 0.6, 0.1);

  const coverPositions: [number, number, number, number, number][] = [
    [0, 0.5, 0, 1, 1],          // center, low box
    [6, 1, 6, 1, 2],             // NE
    [-6, 0.5, 6, 2, 1],          // NW wide
    [8, 0.5, -4, 1, 1],          // E
    [-4, 0.5, -8, 1, 1],         // SW
    [4, 1, -10, 2, 2],           // SE tall
  ];
  for (let i = 0; i < coverPositions.length; i++) {
    const [x, y, z, w, h] = coverPositions[i];
    const box = MeshBuilder.CreateBox(`cover_${i}`, { width: w, height: h * 2, depth: w }, scene);
    box.position.set(x, h, z);
    box.material = coverMat;
  }

  // ── Internal walls (maze) ──
  const mazeMat = new StandardMaterial("maze", scene);
  mazeMat.diffuseColor = new Color3(0.5, 0.5, 0.55);

  // A few partial walls forming a maze in the NE corner
  const mazeWalls: [number, number, number, number, number, number][] = [
    // x, y, z, w, h, d
    [10, 1, 8, 4, 2, 0.4],   // N maze wall
    [12, 1, 12, 0.4, 2, 8],  // E maze wall
    [10, 1, 4, 0.4, 2, 8],   // W maze wall (forms corridor)
    [14, 1, 14, 4, 2, 0.4],  // corner bit
    // SW corner maze
    [-12, 1, -10, 4, 2, 0.4],
    [-10, 1, -12, 0.4, 2, 4],
    [-14, 1, -14, 4, 2, 0.4],
  ];
  const obstacles: Array<{ x: number; z: number; w: number; d: number; h: number }> = [];
  for (let i = 0; i < mazeWalls.length; i++) {
    const [x, y, z, w, h, d] = mazeWalls[i];
    const wall = MeshBuilder.CreateBox(`maze_${i}`, { width: w, height: h * 2, depth: d }, scene);
    wall.position.set(x, h, z);
    wall.material = mazeMat;
    obstacles.push({ x, z, w, d, h: h * 2 });
  }

  // ── Central pillar ──
  const pillar = MeshBuilder.CreateCylinder("pillar", { diameter: 1.5, height: 4 }, scene);
  pillar.position.set(0, 2, 4);
  const pillarMat = new StandardMaterial("pillar_mat", scene);
  pillarMat.diffuseColor = new Color3(0.3, 0.3, 0.4);
  pillar.material = pillarMat;
  obstacles.push({ x: 0, z: 4, w: 1.5, d: 1.5, h: 4 });

  // ── Ramp (a wedge) ──
  const ramp = MeshBuilder.CreateBox("ramp", { width: 4, height: 0.5, depth: 4 }, scene);
  ramp.position.set(-8, 0.25, 0);
  ramp.rotation.z = Math.PI / 6; // tilt
  const rampMat = new StandardMaterial("ramp_mat", scene);
  rampMat.diffuseColor = new Color3(0.4, 0.4, 0.5);
  ramp.material = rampMat;
  obstacles.push({ x: -8, z: 0, w: 4, d: 4, h: 0.5 });

  // ── Spawn in SW area, facing the arena ──
  const spawn = new Vector3(-12, 0, -12);

  return {
    spawn,
    bounds: {
      minX: -ROOM_W / 2 + 0.5,
      maxX: ROOM_W / 2 - 0.5,
      minZ: -ROOM_D / 2 + 0.5,
      maxZ: ROOM_D / 2 - 0.5,
    },
    obstacles,
  };
}
