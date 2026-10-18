/**
 * D.6: Babylon mesh builder for parsed GoldSrc .mdl models.
 *
 * Takes the output of parseMdl() and produces Babylon TransformNodes
 * with Mesh children, one per body part. Each sub-model's meshes
 * are combined into a single Babylon Mesh per texture (multiple
 * meshes sharing a texture become a MultiMaterial sub-mesh).
 *
 * v1: T-pose only (no animation). Vertices are baked in their
 * frame-0 positions from the .mdl's vertex data. Animation
 * playback is a follow-up.
 *
 * Coordinate system: GoldSrc uses Z-up/right-handed (X-right,
 * Y-forward, Z-up). Babylon is Y-up/left-handed. We swap Y and
 * Z (and flip Z sign for handedness) at build time.
 */

import { Color3, Mesh, RawTexture, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";
import type { MdlDecodedSubModel, MdlModel, MdlTriangleVertex } from "../../src/mod/mdl-parser";

/** A built body part: root TransformNode + per-sub-model meshes. */
export interface BuiltBodyPart {
  name: string;
  root: TransformNode;
  meshes: Mesh[];
}

/** Result of buildMdlMeshes(). */
export interface BuiltMdl {
  /** Root TransformNode (parent of all body parts). */
  root: TransformNode;
  bodyParts: BuiltBodyPart[];
  /** All textures decoded as Babylon Texture objects (RGBA8, no premultiplied alpha). */
  textures: Texture[];
}

/** Helper: convert a GoldSrc vertex (X-right, Y-forward, Z-up) to Babylon (X-right, Y-up, Z-forward). */
function gsrcToBabylon(gx: number, gy: number, gz: number): Vector3 {
  // GoldSrc -> Babylon: Y<->Z, with sign flip on the new Z (so forward stays forward).
  return new Vector3(gx, gz, -gy);
}

interface SubMeshBuilder {
  skinRef: number;
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

function buildSubMeshes(sub: MdlDecodedSubModel, submodelIndex: number): SubMeshBuilder[] {
  // For each unique skinRef in this sub-model's meshes, collect
  // all triangle vertices into one big list. (One Babylon sub-mesh
  // per texture, sharing a material.)
  const builders = new Map<number, SubMeshBuilder>();

  for (const mesh of sub.meshes) {
    let builder = builders.get(mesh.skinRef);
    if (!builder) {
      builder = { skinRef: mesh.skinRef, positions: [], normals: [], uvs: [], indices: [] };
      builders.set(mesh.skinRef, builder);
    }
    const baseIndex = builder.positions.length / 3;
    for (const tri of mesh.vertices) {
      builder.indices.push(baseIndex + (builder.positions.length / 3 - baseIndex));
    }
    // Simpler: push each triangle vertex sequentially
    builder.indices.length = 0;
    for (let i = 0; i < mesh.vertices.length; i++) {
      builder.indices.push(baseIndex + i);
    }

    for (const v of mesh.vertices as MdlTriangleVertex[]) {
      const vx = sub.vertices[v.vertIndex * 3 + 0];
      const vy = sub.vertices[v.vertIndex * 3 + 1];
      const vz = sub.vertices[v.vertIndex * 3 + 2];
      const pos = gsrcToBabylon(vx, vy, vz);
      builder.positions.push(pos.x, pos.y, pos.z);
      // Use the bone's "up" vector as a placeholder normal — the
      // .mdl has a per-vertex normal index that maps to a table,
      // but for v1 a uniform up-vector is enough to get the
      // model lit. Refining normals is a follow-up.
      builder.normals.push(0, 1, 0);
      // UV: divide by texture dims later (texture not bound yet
      // at this stage, so store raw u/v and let the mesh-builder
      // step divide by the matched texture's dimensions).
      builder.uvs.push(v.u, v.v);
    }
  }

  return Array.from(builders.values());
}

/**
 * Build Babylon meshes from a parsed MdlModel.
 *
 * One Babylon TransformNode per body part, with one Mesh per
 * (sub-model, texture) combination.
 */
export function buildMdlMeshes(
  scene: import("@babylonjs/core").Scene,
  mdl: MdlModel,
  options: {
    /** Per-body-part scale (default 0.01 — GoldSrc units are inches, Babylon default is meters). */
    scale?: number;
  } = {}
): BuiltMdl {
  const scale = options.scale ?? 0.01;

  const root = new TransformNode(`mdl_${mdl.header.name}`, scene);
  const builtTextures: Texture[] = [];
  const textureByIndex = new Map<number, Texture>();

  // Build all texture objects (RawTexture — RGBA8 from a flat pixel buffer)
  for (let i = 0; i < mdl.textures.length; i++) {
    const t = mdl.textures[i];
    if (!t.pixels) continue;
    const tex = RawTexture.CreateRGBATexture(
      t.pixels,
      t.width,
      t.height,
      scene,
      true, // generate mipmaps
      false,
      Texture.TRILINEAR_SAMPLINGMODE
    );
    tex.name = `mdl_tex_${t.name}`;
    tex.hasAlpha = (t.flags & 0x40) !== 0;
    builtTextures.push(tex);
    textureByIndex.set(i, tex);
  }

  const bodyParts: BuiltBodyPart[] = [];

  for (let bp = 0; bp < mdl.bodyparts.length; bp++) {
    const bpNode = new TransformNode(`bp_${mdl.bodyparts[bp].name}`, scene);
    bpNode.parent = root;
    const bpMeshes: Mesh[] = [];

    for (let sp = 0; sp < mdl.subModels[bp].length; sp++) {
      const sub = mdl.subModels[bp][sp];
      const builders = buildSubMeshes(sub, sp);

      // One Babylon Mesh per texture in this sub-model
      for (const builder of builders) {
        const positions = new Float32Array(builder.positions);
        const normals = new Float32Array(builder.normals);
        const indices = new Uint32Array(builder.indices);

        // For UVs, we need the texture dimensions to convert
        // from pixel coords to [0,1] range.
        const tex = textureByIndex.get(builder.skinRef);
        const mdlTex = tex ? mdl.textures[builder.skinRef] : null;
        const uvs = new Float32Array(builder.uvs.length);
        for (let i = 0; i < builder.uvs.length; i += 2) {
          const u = builder.uvs[i];
          const v = builder.uvs[i + 1];
          if (mdlTex) {
            uvs[i] = u / mdlTex.width;
            uvs[i + 1] = 1.0 - v / mdlTex.height;
          } else {
            uvs[i] = u;
            uvs[i + 1] = v;
          }
        }

        const mesh = new Mesh(`mdl_${mdl.bodyparts[bp].name}_${sub.name}_skin${builder.skinRef}`, scene);
        mesh.setVerticesData("position", positions);
        mesh.setVerticesData("normal", normals);
        mesh.setVerticesData("uv", uvs);
        mesh.setIndices(indices);
        mesh.parent = bpNode;
        mesh.scaling.set(scale, scale, scale);

        const mat = new StandardMaterial(`mat_${mesh.name}`, scene);
        if (tex) {
          mat.diffuseTexture = tex;
          mat.specularColor = Color3.Black(); // pixel-art look
          if ((mdlTex?.flags ?? 0) & 0x40) {
            mat.useAlphaFromDiffuseTexture = true;
            mat.transparencyMode = 2; // ALPHATEST
          }
        }
        mesh.material = mat;
        bpMeshes.push(mesh);
      }
    }
    bodyParts.push({ name: mdl.bodyparts[bp].name, root: bpNode, meshes: bpMeshes });
  }

  return { root, bodyParts, textures: builtTextures };
}