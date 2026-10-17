/**
 * D.5.4 — Test level for the player controller.
 *
 * A simple enclosed room (24×6×24 units) with a few boxes for
 * visual reference. Real map loading (ts_heresy.glb from D.5.2)
 * replaces this in production.
 */

import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

import { GridMaterial } from "@babylonjs/materials/grid/gridMaterial";

const ROOM_W = 24;
const ROOM_H = 6;
const ROOM_D = 24;

export function buildTestLevel(scene: Scene): { spawn: Vector3 } {
  // Floor with grid material so the player can see motion.
  const floor = MeshBuilder.CreateGround("floor", { width: ROOM_W, height: ROOM_D }, scene);
  floor.position.y = 0;
  const gridMat = new GridMaterial("grid", scene);
  gridMat.gridRatio = 1;
  gridMat.mainColor = new Color3(0.4, 0.4, 0.4);
  gridMat.lineColor = new Color3(0.0, 1.0, 0.0);
  floor.material = gridMat;

  // Walls.
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

  // Ceiling.
  const ceiling = MeshBuilder.CreateGround("ceiling", { width: ROOM_W, height: ROOM_D }, scene);
  ceiling.position.set(0, ROOM_H, 0);
  ceiling.rotation.x = Math.PI; // flip up
  const ceilingMat = new StandardMaterial("ceiling_mat", scene);
  ceilingMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
  ceiling.material = ceilingMat;

  // A few reference boxes to navigate around.
  const refMat = new StandardMaterial("ref", scene);
  refMat.diffuseColor = new Color3(0.9, 0.6, 0.1);

  const positions: [number, number, number][] = [
    [0, 0.5, 0],
    [4, 0.5, 4],
    [-4, 0.5, -4],
    [6, 1, -2],
    [-6, 0.5, 6],
    [0, 1, 8],
  ];
  for (let i = 0; i < positions.length; i++) {
    const [x, y, z] = positions[i];
    const box = MeshBuilder.CreateBox(`ref_${i}`, { width: 1, height: y * 2, depth: 1 }, scene);
    box.position.set(x, y, z);
    box.material = refMat;
  }

  // Spawn in the middle of the room, looking at +Z.
  const spawn = new Vector3(0, 0, -8);
  return { spawn };
}
