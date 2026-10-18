/**
 * D.6: GoldSrc .mdl v10 parser (Half-Life model format).
 *
 * Parses the binary .mdl format used by GoldSrc (Half-Life / The
 * Specialists) into a structured Model object. The struct shapes
 * come from the actual HL SDK studio.h, cross-referenced against
 * the working TS implementations at:
 *   - https://github.com/danakt/web-hlmv (src/const/structs.ts)
 *   - https://github.com/skyrim/hlviewer.js (docs/MDL_Format.md)
 *
 * v1 scope: T-pose only (frame 0, no animation playback). Enough
 * to render the player humanoid model in Babylon for v0.1 of the
 * "real player model" milestone. Animation system is a follow-up.
 */

import { ByteReader } from "./byte-reader";

// ─── Constants ──────────────────────────────────────────────────────────

/** MDL version supported (GoldSrc). Source 2 / Source 1 use different versions. */
const MDL_VERSION = 10;

/** Bone controllers per bone (matches HL SDK). */
const MAX_PER_BONE_CONTROLLERS = 6;

// ─── Header struct (208 bytes) ─────────────────────────────────────────

export interface MdlHeader {
  id: string;
  version: number;
  name: string;
  length: number;
  eyePosition: [number, number, number];
  min: [number, number, number];
  max: [number, number, number];
  bbmin: [number, number, number];
  bbmax: [number, number, number];
  flags: number;
  // Section counts + offsets
  numBones: number;
  boneIndex: number;
  numBoneControllers: number;
  boneControllerIndex: number;
  numHitboxes: number;
  hitboxIndex: number;
  numSeq: number;
  seqIndex: number;
  numSeqGroups: number;
  seqGroupIndex: number;
  numTextures: number;
  textureIndex: number;
  textureDataIndex: number;
  numSkinRef: number;
  numSkinFamilies: number;
  skinIndex: number;
  numBodyParts: number;
  bodyPartIndex: number;
  numAttachments: number;
  attachmentIndex: number;
  // Obsolete sound fields (kept for offset parity)
  soundTable: number;
  soundIndex: number;
  soundGroups: number;
  soundGroupIndex: number;
  numTransitions: number;
  transitionIndex: number;
}

// ─── Bone struct (112 bytes) ────────────────────────────────────────────

export interface MdlBone {
  name: string;
  parent: number;
  flags: number;
  boneController: number[];
  value: number[];
  scale: number[];
}

// ─── Hitbox struct (32 bytes) ───────────────────────────────────────────

export interface MdlHitbox {
  bone: number;
  group: number;
  bbmin: [number, number, number];
  bbmax: [number, number, number];
}

// ─── Texture (80 bytes header) + indexed pixels + 256x3 palette ─────────

export interface MdlTexture {
  name: string;
  flags: number;
  width: number;
  height: number;
  /** Byte offset to the indexed pixel data (immediately followed by 256x3 palette). */
  index: number;
  /** Decoded RGBA pixel data, or null if texture lives outside this .mdl. */
  pixels: Uint8ClampedArray | null;
}

// ─── SubModel (96 bytes) — one sub-model per bodypart (with skin variants) ──

export interface MdlSubModel {
  name: string;
  type: number;
  boundingRadius: number;
  numMesh: number;
  meshIndex: number;
  /** Number of unique vertices in this sub-model. */
  numVerts: number;
  /** Byte offset to per-vertex bone index array (length = numVerts). */
  vertInfoIndex: number;
  /** Byte offset to per-vertex vec3 array (length = numVerts * 3 floats). */
  vertIndex: number;
  numNorms: number;
  normInfoIndex: number;
  normIndex: number;
  numGroups: number;
  groupIndex: number;
}

// ─── BodyPart (76 bytes) — groups sub-models (e.g. body / head / weapons) ──

export interface MdlBodyPart {
  name: string;
  numModels: number;
  base: number;
  /** Byte offset to the first sub-model in this body part. */
  modelIndex: number;
}

// ─── Mesh (20 bytes) — a triangle group within a sub-model, references one skin ──

export interface MdlMesh {
  numTris: number;
  triIndex: number;
  /** Index into the textures array (skin family remap happens at load time). */
  skinRef: number;
  numNorms: number;
  normIndex: number;
}

// ─── Decoded triangle (one vertex of the visible mesh) ─────────────────

export interface MdlTriangleVertex {
  /** Index into the sub-model's vertex array. */
  vertIndex: number;
  /** U coordinate in *texture pixels* (caller divides by texture.width). */
  u: number;
  /** V coordinate in *texture pixels* (caller flips + divides by texture.height). */
  v: number;
}

// ─── Decoded mesh — flat list of triangle vertices (strip / fan unrolled) ──

export interface MdlDecodedMesh {
  /** Number of triangles (each is 3 consecutive vertices). */
  numTriangles: number;
  /** Triangle vertices (length = numTriangles * 3). */
  vertices: MdlTriangleVertex[];
  /** Which texture this mesh uses (index into model.textures). */
  skinRef: number;
}

// ─── Decoded sub-model (vertices + decoded meshes) ─────────────────────

export interface MdlDecodedSubModel {
  name: string;
  /** Flat float array of vertex positions (length = numVerts * 3). */
  vertices: Float32Array;
  /** Per-vertex bone index (length = numVerts). */
  boneIndices: Uint8Array;
  meshes: MdlDecodedMesh[];
}

// ─── Top-level model object returned by parseMdl() ─────────────────────

export interface MdlModel {
  header: MdlHeader;
  bones: MdlBone[];
  hitboxes: MdlHitbox[];
  textures: MdlTexture[];
  bodyparts: MdlBodyPart[];
  /** Decoded sub-models: bodyparts[bpIdx].subModels[modelIdx]. */
  subModels: MdlDecodedSubModel[][];
}

// ─── Parse functions ────────────────────────────────────────────────────

export function parseHeader(r: ByteReader): MdlHeader {
  const id = r.readChars(4);
  const version = r.readInt();
  if (id !== "IDST" || version !== MDL_VERSION) {
    throw new Error(
      `Not a GoldSrc .mdl (id=${id}, version=${version}, want IDST/${MDL_VERSION})`
    );
  }
  const name = r.readCString(64);
  const length = r.readInt();
  const eyePosition = r.readVec3();
  const min = r.readVec3();
  const max = r.readVec3();
  const bbmin = r.readVec3();
  const bbmax = r.readVec3();
  const flags = r.readInt();
  const numBones = r.readInt();
  const boneIndex = r.readInt();
  const numBoneControllers = r.readInt();
  const boneControllerIndex = r.readInt();
  const numHitboxes = r.readInt();
  const hitboxIndex = r.readInt();
  const numSeq = r.readInt();
  const seqIndex = r.readInt();
  const numSeqGroups = r.readInt();
  const seqGroupIndex = r.readInt();
  const numTextures = r.readInt();
  const textureIndex = r.readInt();
  const textureDataIndex = r.readInt();
  const numSkinRef = r.readInt();
  const numSkinFamilies = r.readInt();
  const skinIndex = r.readInt();
  const numBodyParts = r.readInt();
  const bodyPartIndex = r.readInt();
  const numAttachments = r.readInt();
  const attachmentIndex = r.readInt();
  const soundTable = r.readInt();
  const soundIndex = r.readInt();
  const soundGroups = r.readInt();
  const soundGroupIndex = r.readInt();
  const numTransitions = r.readInt();
  const transitionIndex = r.readInt();
  return {
    id,
    version,
    name,
    length,
    eyePosition,
    min,
    max,
    bbmin,
    bbmax,
    flags,
    numBones,
    boneIndex,
    numBoneControllers,
    boneControllerIndex,
    numHitboxes,
    hitboxIndex,
    numSeq,
    seqIndex,
    numSeqGroups,
    seqGroupIndex,
    numTextures,
    textureIndex,
    textureDataIndex,
    numSkinRef,
    numSkinFamilies,
    skinIndex,
    numBodyParts,
    bodyPartIndex,
    numAttachments,
    attachmentIndex,
    soundTable,
    soundIndex,
    soundGroups,
    soundGroupIndex,
    numTransitions,
    transitionIndex,
  };
}

export function parseBones(r: ByteReader, count: number): MdlBone[] {
  const bones: MdlBone[] = [];
  for (let i = 0; i < count; i++) {
    const name = r.readCString(32);
    const parent = r.readInt();
    const flags = r.readInt();
    const boneController: number[] = [];
    for (let j = 0; j < MAX_PER_BONE_CONTROLLERS; j++) boneController.push(r.readInt());
    const value: number[] = [];
    for (let j = 0; j < MAX_PER_BONE_CONTROLLERS; j++) value.push(r.readFloat());
    const scale: number[] = [];
    for (let j = 0; j < MAX_PER_BONE_CONTROLLERS; j++) scale.push(r.readFloat());
    bones.push({ name, parent, flags, boneController, value, scale });
  }
  return bones;
}

export function parseHitboxes(r: ByteReader, count: number): MdlHitbox[] {
  const hitboxes: MdlHitbox[] = [];
  for (let i = 0; i < count; i++) {
    const bone = r.readInt();
    const group = r.readInt();
    const bbmin = r.readVec3();
    const bbmax = r.readVec3();
    hitboxes.push({ bone, group, bbmin, bbmax });
  }
  return hitboxes;
}

/**
 * Parse texture headers. Pixel data is loaded lazily by
 * decodeTexturePixels() once the caller decides which textures
 * are actually referenced by visible meshes.
 */
export function parseTextures(r: ByteReader, count: number): Omit<MdlTexture, "pixels">[] {
  const textures: Omit<MdlTexture, "pixels">[] = [];
  for (let i = 0; i < count; i++) {
    const name = r.readCString(64);
    const flags = r.readInt();
    const width = r.readInt();
    const height = r.readInt();
    const index = r.readInt();
    textures.push({ name, flags, width, height, index });
  }
  return textures;
}

/**
 * Decode a single texture's pixel data from the file buffer.
 *
 * Format: `width * height` bytes of palette indices, immediately
 * followed by a 256-color RGB palette (768 bytes). If the texture
 * has STUDIO_NF_MASKED (0x40) set, the palette index 255's color
 * is treated as transparent (alpha = 0).
 */
export function decodeTexturePixels(
  buffer: ArrayBuffer,
  tex: Omit<MdlTexture, "pixels">,
  alphaIndex: number = 255
): Uint8ClampedArray {
  const area = tex.width * tex.height;
  const indices = new Uint8Array(buffer, tex.index, area);
  const palette = new Uint8Array(buffer, tex.index + area, 256 * 3);
  const alphaR = palette[alphaIndex * 3];
  const alphaG = palette[alphaIndex * 3 + 1];
  const alphaB = palette[alphaIndex * 3 + 2];
  const out = new Uint8ClampedArray(area * 4);
  const masked = (tex.flags & 0x40) !== 0;
  for (let i = 0; i < area; i++) {
    const idx = indices[i];
    const pOff = idx * 3;
    const oOff = i * 4;
    if (
      masked &&
      palette[pOff] === alphaR &&
      palette[pOff + 1] === alphaG &&
      palette[pOff + 2] === alphaB
    ) {
      out[oOff] = 0;
      out[oOff + 1] = 0;
      out[oOff + 2] = 0;
      out[oOff + 3] = 0;
    } else {
      out[oOff] = palette[pOff];
      out[oOff + 1] = palette[pOff + 1];
      out[oOff + 2] = palette[pOff + 2];
      out[oOff + 3] = 255;
    }
  }
  return out;
}

export function parseBodyParts(r: ByteReader, count: number): MdlBodyPart[] {
  const bodyparts: MdlBodyPart[] = [];
  for (let i = 0; i < count; i++) {
    const name = r.readCString(64);
    const numModels = r.readInt();
    const base = r.readInt();
    const modelIndex = r.readInt();
    bodyparts.push({ name, numModels, base, modelIndex });
  }
  return bodyparts;
}

export function parseSubModels(r: ByteReader, parts: MdlBodyPart[]): MdlSubModel[][] {
  return parts.map((part) => {
    const subs: MdlSubModel[] = [];
    r.seek(part.modelIndex);
    for (let i = 0; i < part.numModels; i++) {
      const name = r.readCString(64);
      const type = r.readInt();
      const boundingRadius = r.readFloat();
      const numMesh = r.readInt();
      const meshIndex = r.readInt();
      const numVerts = r.readInt();
      const vertInfoIndex = r.readInt();
      const vertIndex = r.readInt();
      const numNorms = r.readInt();
      const normInfoIndex = r.readInt();
      const normIndex = r.readInt();
      const numGroups = r.readInt();
      const groupIndex = r.readInt();
      subs.push({
        name,
        type,
        boundingRadius,
        numMesh,
        meshIndex,
        numVerts,
        vertInfoIndex,
        vertIndex,
        numNorms,
        normInfoIndex,
        normIndex,
        numGroups,
        groupIndex,
      });
    }
    return subs;
  });
}

export function parseMeshes(r: ByteReader, subModels: MdlSubModel[][]): MdlMesh[][][] {
  return subModels.map((subs) =>
    subs.map((sub) => {
      const meshes: MdlMesh[] = [];
      r.seek(sub.meshIndex);
      for (let i = 0; i < sub.numMesh; i++) {
        const numTris = r.readInt();
        const triIndex = r.readInt();
        const skinRef = r.readInt();
        const numNorms = r.readInt();
        const normIndex = r.readInt();
        meshes.push({ numTris, triIndex, skinRef, numNorms, normIndex });
      }
      return meshes;
    })
  );
}

/**
 * Read a per-vertex vec3 position array from the model buffer.
 * Returns a Float32Array view directly into the buffer (no copy).
 */
export function readVertexPositions(
  buffer: ArrayBuffer,
  subModels: MdlSubModel[][]
): Float32Array[][] {
  return subModels.map((subs) =>
    subs.map((sub) => new Float32Array(buffer, sub.vertIndex, sub.numVerts * 3))
  );
}

/**
 * Read a per-vertex bone index array (1 byte per vertex).
 */
export function readBoneIndices(
  buffer: ArrayBuffer,
  subModels: MdlSubModel[][]
): Uint8Array[][] {
  return subModels.map((subs) =>
    subs.map((sub) => new Uint8Array(buffer, sub.vertInfoIndex, sub.numVerts))
  );
}

/**
 * Decode triangle data into a flat list of triangle vertices.
 *
 * The .mdl format uses GoldSrc's "triangle series" encoding:
 * each mesh contains series of strips or fans, each introduced by
 * a signed int16 — positive = strip, negative = fan. The magnitude
 * is the number of vertices in the series. Each vertex is 4
 * int16s: (vertIndex, lightNormalIndex, u, v). A series of N
 * vertices becomes (N - 2) triangles.
 *
 * For Babylon, we just want a flat list of indexed triangle
 * vertices. We unroll strips/fans into independent triangles.
 */
export function decodeMeshes(
  buffer: ArrayBuffer,
  meshes: MdlMesh[][][],
  fileLength: number
): MdlDecodedMesh[][][] {
  return meshes.map((parts) =>
    parts.map((partMeshes) =>
      partMeshes.map((mesh) => decodeMesh(buffer, mesh, fileLength))
    )
  );
}

function decodeMesh(
  buffer: ArrayBuffer,
  mesh: MdlMesh,
  fileLength: number
): MdlDecodedMesh {
  // Bound the triangle read so a corrupt mesh can't read off the
  // end of the buffer.
  const maxBytes = Math.max(0, fileLength - mesh.triIndex);
  const maxInts = Math.floor(maxBytes / 2);
  const triData = new Int16Array(buffer, mesh.triIndex, maxInts);

  const vertices: MdlTriangleVertex[] = [];
  let p = 0;

  while (p < triData.length && triData[p] !== 0) {
    const seriesType = triData[p] < 0 ? "fan" : "strip";
    const n = Math.abs(triData[p]);
    p++;
    if (n < 3 || p + n * 4 > triData.length) break;

    // Read the n vertices for this series
    const seriesVerts: MdlTriangleVertex[] = [];
    for (let i = 0; i < n; i++) {
      const vertIndex = triData[p + i * 4];
      const u = triData[p + i * 4 + 2];
      const v = triData[p + i * 4 + 3];
      seriesVerts.push({ vertIndex, u, v });
    }
    p += n * 4;

    // Unroll into independent triangles
    for (let i = 0; i < n - 2; i++) {
      if (seriesType === "strip") {
        // Strip: swap winding on odd triangles
        const a = seriesVerts[0];
        const b = seriesVerts[i + (i % 2 === 0 ? 1 : 2)];
        const c = seriesVerts[i + (i % 2 === 0 ? 2 : 1)];
        vertices.push(a, b, c);
      } else {
        // Fan: first vertex + each consecutive pair
        vertices.push(seriesVerts[0], seriesVerts[i + 1], seriesVerts[i + 2]);
      }
    }
  }

  return {
    numTriangles: vertices.length / 3,
    vertices,
    skinRef: mesh.skinRef,
  };
}

// ─── Top-level entry point ──────────────────────────────────────────────

export function parseMdl(buffer: ArrayBuffer): MdlModel {
  const r = new ByteReader(new DataView(buffer));
  const header = parseHeader(r);
  const bones = parseBones(new ByteReader(new DataView(buffer), header.boneIndex), header.numBones);
  const hitboxes = parseHitboxes(
    new ByteReader(new DataView(buffer), header.hitboxIndex),
    header.numHitboxes
  );
  const textureHeaders = parseTextures(
    new ByteReader(new DataView(buffer), header.textureIndex),
    header.numTextures
  );
  const bodyparts = parseBodyParts(
    new ByteReader(new DataView(buffer), header.bodyPartIndex),
    header.numBodyParts
  );
  const subModels = parseSubModels(new ByteReader(new DataView(buffer)), bodyparts);
  const meshes = parseMeshes(new ByteReader(new DataView(buffer)), subModels);
  const vertices = readVertexPositions(buffer, subModels);
  const boneIndices = readBoneIndices(buffer, subModels);

  // Decode textures that are actually referenced by visible meshes
  // (skip the ones we don't need — saves memory + CPU).
  const referencedSkins = new Set<number>();
  for (const part of meshes) {
    for (const sub of part) {
      for (const m of sub) {
        referencedSkins.add(m.skinRef);
      }
    }
  }

  const textures: MdlTexture[] = textureHeaders.map((hh) => ({
    ...hh,
    pixels: referencedSkins.has(textureHeaders.indexOf(hh))
      ? decodeTexturePixels(buffer, hh)
      : null,
  }));

  // Decode triangle data once — produces the final mesh list per
  // sub-model (with triangle strips/fans unrolled into independent
  // triangles, ready for Babylon's MeshBuilder).
  const decodedMeshLists = decodeMeshes(buffer, meshes, header.length);

  // Stitch together the decoded sub-models
  const decodedSubs: MdlDecodedSubModel[][] = subModels.map((partSubs, bpIdx) =>
    partSubs.map((sub, subIdx) => ({
      name: sub.name,
      vertices: vertices[bpIdx][subIdx],
      boneIndices: boneIndices[bpIdx][subIdx],
      meshes: decodedMeshLists[bpIdx][subIdx],
    }))
  );

  return { header, bones, hitboxes, textures, bodyparts, subModels: decodedSubs };
}