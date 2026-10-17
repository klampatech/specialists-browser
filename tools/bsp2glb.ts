/**
 * D.5.2 — GoldSrc BSP → glTF 2.0 binary (.glb) converter.
 *
 * Parses a Quake 1 / Half-Life / The Specialists .bsp and writes
 * a .glb file with the worldspawn brushes as a single mesh
 * (no textures — vertex colors only).
 *
 * Many TS BSPs use a non-standard header (lumps in custom order,
 * entities at unexpected offsets, models lump empty). This parser
 * identifies lumps by **content signature**, not by index.
 *
 * Usage:
 *   node --experimental-strip-types tools/bsp2glb.ts \
 *     _runtime_assets/half-life/ts/maps/ts_heresy.bsp \
 *     babylon/public/ts_heresy.glb
 *
 * Limitations (v1):
 *   - No texture UVs
 *   - Single mesh per worldspawn
 *   - No patch / curve surfaces
 *   - No lightmaps
 *
 * What this DOES extract:
 *   - Worldspawn brushes (assumes ALL faces are worldspawn; some
 *     TS BSPs have an empty models lump so we can't split per-model)
 *   - Vertex positions
 *   - Edge-walked polygon rings per face
 *   - Fan-triangulation
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ───────────────────────────────────────────────────────────────
// Lump identification
// ───────────────────────────────────────────────────────────────

interface Lump {
  /** spec index (0..18) — may be misleading for non-standard BSPs */
  index: number;
  offset: number;
  length: number;
}

interface DetectedLumps {
  /** ENTITIES: text starting with "{" and containing "worldspawn" */
  entities: { offset: number; length: number } | null;
  /** PLANES: 20 bytes each, ~50-100K entries */
  planes: { offset: number; length: number; count: number } | null;
  /** VERTICES: 12 bytes each (3 floats), 100-300K entries */
  vertices: { offset: number; length: number; count: number } | null;
  /** EDGES: 4 bytes each (2 × uint16) */
  edges: { offset: number; length: number; count: number } | null;
  /** SURFEDGES: 4 bytes each (int32) */
  surfedges: { offset: number; length: number; count: number } | null;
  /** FACES: 20 bytes each */
  faces: { offset: number; length: number; count: number } | null;
  /** TEXINFO: 40 bytes each */
  texinfo: { offset: number; length: number; count: number } | null;
  /** MODELS: 64 bytes each; worldspawn is model 0 */
  models: { offset: number; length: number; count: number } | null;
}

function readAllLumps(buffer: Buffer): Lump[] {
  if (buffer.length < 124) throw new Error("BSP too small");
  const version = buffer.readUInt32LE(0);
  if (version !== 30) {
    throw new Error(`Not a GoldSrc BSP: version ${version} (expected 30)`);
  }
  const lumps: Lump[] = [];
  for (let i = 0; i < 19; i++) {
    const offset = buffer.readUInt32LE(8 + i * 8);
    const length = buffer.readUInt32LE(12 + i * 8);
    lumps.push({ index: i, offset, length });
  }
  return lumps;
}

function findEntitiesText(buffer: Buffer, lumps: Lump[]): { offset: number; length: number } | null {
  // First, try the spec location: lump 0
  const lump0 = lumps[0];
  if (lump0.offset > 0 && lump0.offset + lump0.length <= buffer.length) {
    const chunk = buffer.slice(lump0.offset, lump0.offset + Math.min(lump0.length, 200));
    if (chunk.includes(0x7b) && chunk.toString("utf-8").includes("classname")) {
      return { offset: lump0.offset, length: lump0.length };
    }
  }
  // Fall back: scan file for the entity text signature
  // Look for any substring that includes both `{` and `"classname" "worldspawn"`.
  // This is a reliable signature of the worldspawn entity.
  const needle = Buffer.from('"classname" "worldspawn"');
  let searchFrom = 0;
  while (searchFrom < buffer.length) {
    const idx = buffer.indexOf(needle, searchFrom);
    if (idx < 0) break;
    // Walk back to find the opening `{` of the worldspawn entity
    let start = idx;
    for (let i = idx - 1; i > Math.max(0, idx - 10000); i--) {
      if (buffer[i] === 0x7b && (buffer[i + 1] === 0x0a || buffer[i + 1] === 0x20)) {
        start = i;
        break;
      }
    }
    // Find end: the matching `}` followed by `\n`
    // Walk forward from idx looking for the first "\n}\n" or "\n}"
    let end = idx + needle.length;
    for (let i = end; i < Math.min(buffer.length, end + 2_000_000); i++) {
      if (buffer[i] === 0x0a && buffer[i + 1] === 0x7d && (buffer[i + 2] === 0x0a || i + 2 === buffer.length)) {
        end = i + 2;
        break;
      }
    }
    return { offset: start, length: end - start };
  }
  return null;
}

function identifyLumps(buffer: Buffer, lumps: Lump[]): DetectedLumps {
  const detected: DetectedLumps = {
    entities: findEntitiesText(buffer, lumps),
    planes: null,
    vertices: null,
    edges: null,
    surfedges: null,
    faces: null,
    texinfo: null,
    models: null,
  };

  for (const lump of lumps) {
    if (lump.length === 0 || lump.offset === 0 || lump.offset >= buffer.length) continue;
    if (lump.length > buffer.length) continue;
    if (lump.length < 12) continue;
    if (lump.length % 12 !== 0 && lump.length % 20 !== 0 && lump.length % 4 !== 0) continue;

    // Skip if this is the entities text (already handled)
    if (detected.entities && lump.offset === detected.entities.offset) continue;

    // Skip if the chunk looks like text
    const sample = buffer.slice(lump.offset, lump.offset + Math.min(40, lump.length));
    const printable = sample.filter((b) => (b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13).length;
    if (printable > 30) continue; // text lump (miptex or wad)

    // Try to identify by size alignment
    if (lump.length % 12 === 0 && !detected.vertices && lump.length > 100000) {
      // 12-byte vec3: 100K+ → likely vertices
      detected.vertices = { offset: lump.offset, length: lump.length, count: lump.length / 12 };
    } else if (lump.length % 20 === 0 && !detected.planes && lump.length > 100000) {
      // 20-byte planes: 100K+ → likely planes
      detected.planes = { offset: lump.offset, length: lump.length, count: lump.length / 20 };
    } else if (lump.length % 12 === 0 && !detected.planes && lump.length > 100000) {
      // 12-byte "planes" (just normals, no dist/type) — fallback
      detected.planes = { offset: lump.offset, length: lump.length, count: lump.length / 12 };
    } else if (lump.length % 4 === 0 && !detected.edges && lump.length > 100000) {
      // 4-byte: could be edges (uint16×2), surfedges (int32), clipnodes, leaves
      // Pick the largest remaining 4-byte lump for edges
      detected.edges = { offset: lump.offset, length: lump.length, count: lump.length / 4 };
    } else if (lump.length % 4 === 0 && !detected.surfedges && lump.length > 100000) {
      detected.surfedges = { offset: lump.offset, length: lump.length, count: lump.length / 4 };
    } else if (lump.length % 20 === 0 && !detected.faces && lump.length > 100000) {
      detected.faces = { offset: lump.offset, length: lump.length, count: lump.length / 20 };
    } else if (lump.length % 40 === 0 && !detected.texinfo && lump.length > 100000) {
      detected.texinfo = { offset: lump.offset, length: lump.length, count: lump.length / 40 };
    } else if (lump.length % 64 === 0 && !detected.models && lump.length >= 64) {
      detected.models = { offset: lump.offset, length: lump.length, count: lump.length / 64 };
    }
  }
  return detected;
}

// ───────────────────────────────────────────────────────────────
// Read data
// ───────────────────────────────────────────────────────────────

interface Vec3 { x: number; y: number; z: number; }

interface Plane { normal: Vec3; dist: number; type: number; }
interface Vertex { position: Vec3; }
interface Edge { v: [number, number]; }

interface Face {
  planenum: number;
  side: number;
  firstedge: number;
  numedges: number;
  texinfo: number;
  styles: number[];
  lightmap_offset: number;
}

function readPlanes(buffer: Buffer, off: number, length: number): Plane[] {
  // Some BSPs store planes as 20 bytes (normal+dist+type),
  // others as 12 bytes (just normal). Detect automatically.
  const is12byte = length % 12 === 0 && length % 20 !== 0;
  const stride = is12byte ? 12 : 20;
  const count = length / stride;
  const planes: Plane[] = [];
  for (let i = 0; i < count; i++) {
    const p = off + i * stride;
    const normal = { x: buffer.readFloatLE(p), y: buffer.readFloatLE(p + 4), z: buffer.readFloatLE(p + 8) };
    if (is12byte) {
      planes.push({ normal, dist: 0, type: 0 });
    } else {
      planes.push({
        normal,
        dist: buffer.readFloatLE(p + 12),
        type: buffer.readUInt32LE(p + 16),
      });
    }
  }
  return planes;
}

function readVertices(buffer: Buffer, off: number, length: number): Vertex[] {
  const count = length / 12;
  const vertices: Vertex[] = [];
  for (let i = 0; i < count; i++) {
    const p = off + i * 12;
    vertices.push({
      position: { x: buffer.readFloatLE(p), y: buffer.readFloatLE(p + 4), z: buffer.readFloatLE(p + 8) },
    });
  }
  return vertices;
}

function readEdges(buffer: Buffer, off: number, length: number): Edge[] {
  const count = length / 4;
  const edges: Edge[] = [];
  for (let i = 0; i < count; i++) {
    const p = off + i * 4;
    edges.push({ v: [buffer.readUInt16LE(p), buffer.readUInt16LE(p + 2)] });
  }
  return edges;
}

function readSurfEdges(buffer: Buffer, off: number, length: number): Int32Array {
  const count = length / 4;
  const arr = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    arr[i] = buffer.readInt32LE(off + i * 4);
  }
  return arr;
}

function readFaces(buffer: Buffer, off: number, length: number): Face[] {
  const count = length / 20;
  const faces: Face[] = [];
  for (let i = 0; i < count; i++) {
    const p = off + i * 20;
    faces.push({
      planenum: buffer.readUInt16LE(p),
      side: buffer.readUInt16LE(p + 2),
      firstedge: buffer.readUInt32LE(p + 4),
      numedges: buffer.readUInt32LE(p + 8),
      texinfo: buffer.readUInt16LE(p + 12),
      styles: [buffer.readUInt8(p + 14), buffer.readUInt8(p + 15), buffer.readUInt8(p + 16), buffer.readUInt8(p + 17)],
      lightmap_offset: buffer.readUInt32LE(p + 18),
    });
  }
  return faces;
}

// ───────────────────────────────────────────────────────────────
// Build mesh
// ───────────────────────────────────────────────────────────────

interface Mesh {
  positions: Float32Array;
  indices: Uint32Array;
  colors: Float32Array;
}

function buildWorldspawnMesh(
  vertices: Vertex[],
  edges: Edge[],
  surfEdges: Int32Array,
  faces: Face[],
  planes: Plane[],
  faceCount: number,
): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  let totalTris = 0;
  let kept = 0;
  let skipped = 0;

  for (let i = 0; i < faceCount; i++) {
    const face = faces[i];

    // Walk the surface edge list to get a polygon ring
    const ring: number[] = [];
    for (let j = 0; j < face.numedges; j++) {
      const surfEdgeIdx = face.firstedge + j;
      if (surfEdgeIdx < 0 || surfEdgeIdx >= surfEdges.length) continue;
      const surfEdge = surfEdges[surfEdgeIdx];
      if (Math.abs(surfEdge) >= edges.length) continue;
      const e = edges[Math.abs(surfEdge)];
      if (surfEdge < 0) {
        // Reverse vertex order
        ring.push(e.v[1]);
      } else {
        ring.push(e.v[0]);
      }
    }
    if (ring.length < 3) {
      skipped++;
      continue;
    }

    // Per-face color from plane normal (so we can see room structure)
    const plane = face.planenum < planes.length ? planes[face.planenum] : null;
    const nx = plane ? Math.abs(plane.normal.x) : 0.5;
    const ny = plane ? Math.abs(plane.normal.y) : 0.5;
    const nz = plane ? Math.abs(plane.normal.z) : 0.5;
    const r = 0.45 + nx * 0.4;
    const g = 0.45 + ny * 0.4;
    const b = 0.45 + nz * 0.4;

    const baseIdx = positions.length / 3;
    for (const vi of ring) {
      if (vi < 0 || vi >= vertices.length) continue;
      const v = vertices[vi].position;
      positions.push(v.x, v.y, v.z);
      colors.push(r, g, b, 1.0);
    }
    if (positions.length / 3 - baseIdx !== ring.length) {
      // Some vertex was OOB — skip this face
      positions.length -= ring.length * 3;
      colors.length -= ring.length * 4;
      skipped++;
      continue;
    }

    // Fan-triangulate
    for (let k = 1; k < ring.length - 1; k++) {
      indices.push(baseIdx, baseIdx + k, baseIdx + k + 1);
    }
    totalTris += ring.length - 2;
    kept++;
  }

  console.error(
    `[bsp2glb] kept=${kept} skipped=${skipped} triangles=${totalTris} vertices=${positions.length / 3}`,
  );

  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
    colors: new Float32Array(colors),
  };
}

// ───────────────────────────────────────────────────────────────
// glTF 2.0 binary writer
// ───────────────────────────────────────────────────────────────

function writeGlb(mesh: Mesh, outPath: string): void {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = mesh.positions[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }

  const posBytes = mesh.positions.byteLength;
  const colBytes = mesh.colors.byteLength;
  const idxBytes = mesh.indices.byteLength;

  const POSITION_OFFSET = 0;
  const COLOR_OFFSET = POSITION_OFFSET + posBytes;
  const INDEX_OFFSET = COLOR_OFFSET + colBytes;
  const TOTAL_BYTES = INDEX_OFFSET + idxBytes;
  const padding = (4 - (TOTAL_BYTES % 4)) % 4;
  const paddedBytes = TOTAL_BYTES + padding;
  const binary = new ArrayBuffer(paddedBytes);
  const view = new Uint8Array(binary);
  view.set(new Uint8Array(mesh.positions.buffer, mesh.positions.byteOffset, posBytes), POSITION_OFFSET);
  view.set(new Uint8Array(mesh.colors.buffer, mesh.colors.byteOffset, colBytes), COLOR_OFFSET);
  view.set(new Uint8Array(mesh.indices.buffer, mesh.indices.byteOffset, idxBytes), INDEX_OFFSET);

  const gltf = {
    asset: { version: "2.0", generator: "bsp2glb.ts v2.0 (signature-detection)" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "worldspawn" }],
    meshes: [
      {
        name: "worldspawn",
        primitives: [
          {
            attributes: { POSITION: 0, COLOR_0: 1 },
            indices: 2,
            mode: 4,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: "worldspawn_material",
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0.0,
          roughnessFactor: 0.85,
        },
      },
    ],
    buffers: [{ byteLength: paddedBytes }],
    bufferViews: [
      { buffer: 0, byteOffset: POSITION_OFFSET, byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: COLOR_OFFSET, byteLength: colBytes, target: 34962 },
      { buffer: 0, byteOffset: INDEX_OFFSET, byteLength: idxBytes, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: mesh.positions.length / 3, type: "VEC3", min, max },
      { bufferView: 1, componentType: 5126, count: mesh.colors.length / 4, type: "VEC4" },
      { bufferView: 2, componentType: 5125, count: mesh.indices.length, type: "SCALAR" },
    ],
  };

  const jsonText = JSON.stringify(gltf);
  const jsonBytes = new TextEncoder().encode(jsonText);
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonPaddedLen = jsonBytes.length + jsonPad;

  const glbHeader = new ArrayBuffer(12);
  new Uint8Array(glbHeader).set([0x67, 0x6c, 0x54, 0x46]); // glTF
  new DataView(glbHeader).setUint32(4, 2, true);
  const totalGlbLen = 12 + 8 + jsonPaddedLen + 8 + paddedBytes;
  new DataView(glbHeader).setUint32(8, totalGlbLen, true);

  const jsonChunkHeader = new ArrayBuffer(8);
  new DataView(jsonChunkHeader).setUint32(0, jsonPaddedLen, true);
  new DataView(jsonChunkHeader).setUint32(4, 0x4e4f534a, true);

  const binChunkHeader = new ArrayBuffer(8);
  new DataView(binChunkHeader).setUint32(0, paddedBytes, true);
  new DataView(binChunkHeader).setUint32(4, 0x004e4942, true);

  const out = Buffer.concat([
    Buffer.from(glbHeader),
    Buffer.from(jsonChunkHeader),
    Buffer.from(jsonBytes),
    new Uint8Array(jsonPad),
    Buffer.from(binChunkHeader),
    Buffer.from(binary),
  ]);

  writeFileSync(outPath, out);
  console.error(
    `[bsp2glb] wrote ${outPath} (${out.length}B, ${mesh.positions.length / 3} verts, ${mesh.indices.length / 3} tris)`,
  );
}

// ───────────────────────────────────────────────────────────────
// CLI
// ───────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: bsp2glb.ts <input.bsp> <output.glb>");
    process.exit(1);
  }
  const [inputPath, outputPath] = args;
  console.error(`[bsp2glb] reading ${inputPath}...`);
  const buffer = readFileSync(resolve(inputPath));
  console.error(`[bsp2glb] ${buffer.length} bytes`);

  const lumps = readAllLumps(buffer);
  const detected = identifyLumps(buffer, lumps);

  console.error(`[bsp2glb] detected lumps:`);
  console.error(`  entities: ${detected.entities ? `${detected.entities.length}B at ${detected.entities.offset}` : "NOT FOUND"}`);
  console.error(`  planes:   ${detected.planes ? `${detected.planes.count} entries` : "NOT FOUND"}`);
  console.error(`  vertices: ${detected.vertices ? `${detected.vertices.count} entries` : "NOT FOUND"}`);
  console.error(`  edges:    ${detected.edges ? `${detected.edges.count} entries` : "NOT FOUND"}`);
  console.error(`  surfedges:${detected.surfedges ? ` ${detected.surfedges.count} entries` : " NOT FOUND"}`);
  console.error(`  faces:    ${detected.faces ? `${detected.faces.count} entries` : "NOT FOUND"}`);
  console.error(`  texinfo:  ${detected.texinfo ? `${detected.texinfo.count} entries` : "NOT FOUND"}`);
  console.error(`  models:   ${detected.models ? `${detected.models.count} entries` : "NOT FOUND"}`);

  if (!detected.vertices || !detected.edges || !detected.surfedges || !detected.faces || !detected.planes) {
    console.error("[bsp2glb] FATAL: missing required lumps");
    process.exit(1);
  }

  const planes = readPlanes(buffer, detected.planes.offset, detected.planes.length);
  const vertices = readVertices(buffer, detected.vertices.offset, detected.vertices.length);
  const edges = readEdges(buffer, detected.edges.offset, detected.edges.length);
  const surfEdges = readSurfEdges(buffer, detected.surfedges.offset, detected.surfedges.length);
  const faces = readFaces(buffer, detected.faces.offset, detected.faces.length);

  // Determine worldspawn face range. If models exist, use model 0.
  // Otherwise, use ALL faces (assumes BSP is worldspawn-only).
  let faceStart = 0;
  let faceEnd = faces.length;
  if (detected.models && detected.models.count > 0) {
    // Heuristic: model 0 firstface should be 0 and numfaces should
    // be a reasonable fraction of total faces. If not, ignore models.
    const m0first = buffer.readUInt32LE(detected.models.offset + 44);
    const m0num = buffer.readUInt32LE(detected.models.offset + 48);
    if (m0first === 0 && m0num > 0 && m0num <= faces.length) {
      faceStart = m0first;
      faceEnd = m0first + m0num;
      console.error(`[bsp2glb] model 0: faces [${faceStart}, ${faceEnd})`);
    } else {
      console.error(
        `[bsp2glb] model 0 firstface=${m0first} numfaces=${m0num} invalid; using all ${faces.length} faces`,
      );
    }
  } else {
    console.error(`[bsp2glb] no models lump; using all ${faces.length} faces`);
  }

  const mesh = buildWorldspawnMesh(vertices, edges, surfEdges, faces, planes, faceEnd - faceStart);
  writeGlb(mesh, resolve(outputPath));
}

main();
