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
 * D.6.7 — Use real levels via the bsp2glb tool (see tools/bsp2glb.ts).
 * `loadGLBLevel()` loads a converted .glb and replaces the placeholder
 * arena. Falls back to buildTestLevel() if no .glb is available.
 */

import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
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

/**
 * D.6.7 — Load a real level from a converted BSP→glTF .glb file.
 *
 * babylon/public/*.glb is gitignored-friendly: drop the converted
 * file into public/ and call loadGLBLevel(scene, "ts_mathar.glb").
 * Falls back to the test arena on any error so the game still boots.
 *
 * Returns the same LevelLayout shape as buildTestLevel() — same
 * spawn/bounds/obstacles contract — so main.ts can use either
 * without changes.
 *
 * The .glb file format is binary glTF 2.0 (see tools/bsp2glb.ts).
 * Worldspawn brushes are extracted as a single mesh per map (the
 * bsp2glb tool lumps them together since the TS BSPs have an empty
 * models lump). No UVs. No lightmaps. Vertex colors only.
 */
export async function loadGLBLevel(
  scene: Scene,
  glbPath: string,
  opts: {
    /** World-scaling factor — GoldSrc BSP units are 1 unit = 1 inch
     *  (roughly); we scale to meters so 1 unit = 0.0254 m. The default
     *  scale (0.01) makes a typical TS room feel human-scaled. */
    scale?: number;
    /** Spawn point — defaults to a known-good position in ts_mathar. */
    spawn?: Vector3;
  } = {},
): Promise<LevelLayout> {
  const scale = opts.scale ?? 0.0254;
  const spawnPt = opts.spawn ?? new Vector3(0, 0, 0);

  // Fetch and parse the .glb ourselves. Babylon's loader chokes on
  // this file (it was generated by a no-UV tool and Babylon's parser
  // is strict about vertex color formats / pbr material conventions).
  // We extract the worldspawn mesh's positions, indices, and vertex
  // colors directly from the bufferViews.
  const resp = await fetch(glbPath);
  if (!resp.ok) throw new Error(`GLB fetch failed: ${resp.status}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  // Pad the JSON chunk NULs with spaces (some converters use 0x00
  // instead of 0x20 — GLB spec violation but common).
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const jsonChunkLen = dv.getUint32(12, true);
  for (let i = 0; i < jsonChunkLen; i++) {
    if (buf[20 + i] === 0x00) buf[20 + i] = 0x20;
  }
  const jsonStr = new TextDecoder().decode(buf.slice(20, 20 + jsonChunkLen));
  const json = JSON.parse(jsonStr);

  // Find the BIN chunk: it starts after the JSON chunk + 8 bytes header.
  const binChunkStart = 20 + jsonChunkLen;
  const binChunkLen = dv.getUint32(binChunkStart, true);
  const binType = dv.getUint32(binChunkStart + 4, true);
  // Type code for "BIN\0" is 0x004E4942 (LE) → 'BIN\0' as ASCII.
  if (binType !== 0x004e4942) {
    throw new Error(`Expected BIN\\0 chunk, got type=0x${binType.toString(16)}`);
  }
  const binOffset = binChunkStart + 8;

  // Resolve a bufferView → Uint8Array slice into the BIN chunk.
  const bufferViewBytes = (bv: any): Uint8Array => {
    const start = binOffset + bv.byteOffset;
    return buf.slice(start, start + bv.byteLength);
  };

  // Resolve accessor → typed array view.
  const accessorData = (acc: any): { data: any; count: number } => {
    const bv = json.bufferViews[acc.bufferView];
    const bytes = bufferViewBytes(bv);
    const ctor = acc.componentType === 5126 ? Float32Array :
      acc.componentType === 5125 ? Uint32Array :
      acc.componentType === 5123 ? Uint16Array :
      acc.componentType === 5121 ? Uint8Array : null;
    if (!ctor) throw new Error(`unsupported componentType ${acc.componentType}`);
    // Copy into a fresh ArrayBuffer to satisfy the typed-array ctor
    // (Uint8Array.buffer is `ArrayBufferLike`, not `ArrayBuffer`).
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    return { data: new ctor(copy, 0, bytes.byteLength / ctor.BYTES_PER_ELEMENT), count: acc.count };
  };

  // The bsp2glb tool ships invalid vertex data for some BSPs (NaN /
  // Inf and 10^38 placeholder values). Filter those out before
  // computing bounds so the player controller doesn't try to fit
  // inside a 10^38-meter world. Sanity threshold: vertices with
  // any axis > 10^5 units are dropped from the bounds calc (a
  // typical TS room is <5000 units across).
  const realBounds = (positions: number[]) => {
    let lo = [Infinity, Infinity, Infinity];
    let hi = [-Infinity, -Infinity, -Infinity];
    let bad = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      // Skip NaN/Inf and any axis > 10^5 (clearly corrupted).
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) { bad++; continue; }
      if (Math.abs(x) > 1e5 || Math.abs(y) > 1e5 || Math.abs(z) > 1e5) { bad++; continue; }
      if (x < lo[0]) lo[0] = x;
      if (y < lo[1]) lo[1] = y;
      if (z < lo[2]) lo[2] = z;
      if (x > hi[0]) hi[0] = x;
      if (y > hi[1]) hi[1] = y;
      if (z > hi[2]) hi[2] = z;
    }
    return { lo, hi, bad };
  };

  // Build the worldspawn meshes. Iterate each primitive.
  let combinedLo = [Infinity, Infinity, Infinity];
  let combinedHi = [-Infinity, -Infinity, -Infinity];
  let totalBad = 0;
  const built: Mesh[] = [];
  for (const mesh of json.meshes) {
    for (const prim of mesh.primitives) {
      const posAcc = json.accessors[prim.attributes.POSITION];
      const pos = accessorData(posAcc);
      const idxAcc = json.accessors[prim.indices];
      const idx = accessorData(idxAcc);
      // Build Babylon mesh
      const positions: number[] = [];
      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.data[i * 3], pos.data[i * 3 + 1], pos.data[i * 3 + 2]);
      }
      const indices: number[] = Array.from(idx.data);
      // Material with vertex colors enabled (no textures — bsp2glb
      // ships no UVs, so we rely on the COLOR_0 per-vertex color).
      const mat = new StandardMaterial(`worldspawn_mat_${built.length}`, scene);
      mat.disableLighting = false;
      const babMesh = new Mesh(mesh.name || `worldspawn_${built.length}`, scene);
      babMesh.material = mat;
      const vd = new VertexData();
      vd.positions = positions;
      vd.indices = indices;
      // Vertex colors if COLOR_0 accessor is present.
      if (prim.attributes.COLOR_0 !== undefined) {
        const colAcc = json.accessors[prim.attributes.COLOR_0];
        const col = accessorData(colAcc);
        const colors: number[] = [];
        for (let i = 0; i < col.count; i++) {
          colors.push(col.data[i * 4], col.data[i * 4 + 1], col.data[i * 4 + 2], col.data[i * 4 + 3]);
        }
        vd.colors = colors;
      }
      vd.applyToMesh(babMesh, true);
      // Compute real bounds BEFORE scaling.
      const b = realBounds(positions);
      totalBad += b.bad;
      // Apply scale by multiplying bounds.
      for (let i = 0; i < 3; i++) {
        if (b.lo[i] < combinedLo[i]) combinedLo[i] = b.lo[i] * scale;
        if (b.hi[i] > combinedHi[i]) combinedHi[i] = b.hi[i] * scale;
      }
      babMesh.scaling.set(scale, scale, scale);
      babMesh.name = `worldspawn_${mesh.name || "mesh"}_${built.length}`;
      babMesh.isPickable = true;
      built.push(babMesh);
    }
  }

  console.log(
    `[level] loaded ${glbPath} scale=${scale} realBounds=(${combinedLo.map((v) => v.toFixed(2)).join(",")})→(${combinedHi.map((v) => v.toFixed(2)).join(",")}) meshes=${built.length} badVerts=${totalBad}`,
  );

  // If bounds are still infinite (e.g. all vertices were corrupt),
  // fall back to a 30x30m default so the player has somewhere to stand.
  if (!Number.isFinite(combinedLo[0]) || !Number.isFinite(combinedHi[0])) {
    console.warn(`[level] no valid bounds, falling back to default 30x30`);
    combinedLo = [-15, -15, -15];
    combinedHi = [15, 15, 15];
  }

  // The BSP has no entity-info yet, so spawn is hardcoded. Real spawn
  // points will come from a future entity-lump parser pass.
  return {
    spawn: spawnPt,
    bounds: {
      minX: combinedLo[0],
      maxX: combinedHi[0],
      minZ: combinedLo[2],
      maxZ: combinedHi[2],
    },
    obstacles: [],
  };
}
