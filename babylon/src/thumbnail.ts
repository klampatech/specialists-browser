/**
 * Thumbnail renderer: one PNG per TS player model.
 *
 * WHY
 * ---
 * The character picker (the ESC options overlay and the pre-join
 * modal) should show the player what they are picking. TS ships a
 * `.bmp` skin per model, but those are flat texture atlases — the
 * preview images in the original TS options menu do not always match
 * the model they are next to.
 *
 * So the thumbnails here are RENDERED FROM THE MODEL: the real .mdl is
 * parsed, the real geometry is built, and the real skin texture is
 * applied. What you see is the model, not a picture of something else.
 *
 * HOW
 * ---
 * A headless Chromium loads this page, which imports the repo's own
 * MDL parser and Babylon mesh builder, renders the model in a
 * T-pose against the site's terminal-green background, and the driver
 * script screenshots the canvas.
 *
 * The output is a 256x256 PNG per model, in `webxash/public/models/`.
 */

import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight, Color3, Color4, StandardMaterial, Texture, RawTexture } from '@babylonjs/core';
import { parseMdl } from '../../src/mod/mdl-parser';
import { buildMdlMeshes, type BuiltMdl } from './mdl-loader';

/** The models to render, and the file name each one gets. */
export const THUMBNAIL_MODELS: { id: string; file: string }[] = [
  { id: 'seal', file: 'seal' },
  { id: 'merc', file: 'merc' },
  { id: 'gordon', file: 'gordon' },
  { id: 'laurence', file: 'laurence' },
  { id: 'agent', file: 'agent' },
  { id: 'hitman', file: 'hitman' },
  { id: 'castor', file: 'castor' },
];

/**
 * Render one model into the canvas and resolve when the frame is drawn.
 *
 * The camera is a tight head-and-shoulders shot: a full-body T-pose at
 * 256 px is a 40-pixel-tall person, and the picker wants a face.
 */
export async function renderModel(modelId: string, canvas: HTMLCanvasElement): Promise<void> {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.016, 0.043, 0.016, 1);

  const res = await fetch(`/models/player/${modelId}/${modelId}.mdl`);
  if (!res.ok) throw new Error(`fetch ${modelId}: ${res.status}`);
  const mdl = parseMdl(await res.arrayBuffer());

  let built: BuiltMdl;

  // THE TEXTURE.
  //
  // The .mdl carries the model's own artwork: a palette-indexed image
  // the parser decodes (`decodeTexturePixels`), with the 256-colour
  // palette in the file. The separate .bmp next to it is the SAME
  // artwork in a different container.
  //
  // So the .mdl's own texture is the right one — it is the palette
  // that gives the model its colours, and swapping in the .bmp drops
  // them and renders the model nearly black.
  built = buildMdlMeshes(scene, mdl, { scale: 0.1 });

  const withTexture = built.bodyParts.some((bp) =>
    bp.meshes.some((m) => (m.material as StandardMaterial | null)?.diffuseTexture != null),
  );

  for (const bp of built.bodyParts) {
    for (const mesh of bp.meshes) {
      const mat = mesh.material as StandardMaterial | null;
      if (!mat) continue;
      mat.specularColor.set(0, 0, 0);
      // The models are textured with a masked palette, so the material
      // has to honour the texture's alpha or the model renders as a
      // solid rectangle.
      mat.useAlphaFromDiffuseTexture = true;
      mat.transparencyMode = 2; // ALPHATEST
      // A little emissive so the unlit side is not pure black.
      mat.emissiveColor = new Color3(0.16, 0.2, 0.16);
    }
  }

  if (!withTexture) {
    // No embedded artwork: fall back to the .bmp skin.
    try {
      const skinRes = await fetch(`/models/player/${modelId}/${modelId}.bmp`);
      if (skinRes.ok) {
        const bitmap = await createImageBitmap(await skinRes.blob());
        const off = document.createElement('canvas');
        off.width = bitmap.width;
        off.height = bitmap.height;
        const ctx = off.getContext('2d')!;
        ctx.drawImage(bitmap, 0, 0);
        const data = ctx.getImageData(0, 0, off.width, off.height);
        const raw = RawTexture.CreateRGBATexture(
          data.data,
          off.width,
          off.height,
          scene,
          true,
          false,
          Texture.TRILINEAR_SAMPLINGMODE,
        );
        raw.name = `skin_${modelId}`;
        raw.hasAlpha = true;
        for (const bp of built.bodyParts) {
          for (const mesh of bp.meshes) {
            const mat = mesh.material as StandardMaterial | null;
            if (mat) {
              mat.diffuseTexture = raw;
              mat.emissiveTexture = raw;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[thumb] skin fallback for ${modelId} failed`, e);
    }
  }

  // FRAMING, FROM THE MODEL'S ACTUAL BOUNDS.
  //
  // The .mdl's origin is the PELVIS, so the feet sit below y=0 and the
  // head above it. A hard-coded camera position frames empty space for
  // most models, so the bounds are measured and the camera is aimed at
  // the middle of the figure.
  //
  // The bounds are in mesh-local units (pre-scale). The mesh carries
  // `scaling = 0.1`, so the world size is the local size times 0.1.
  const SCALE = 0.1;
  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const bp of built.bodyParts) {
    for (const mesh of bp.meshes) {
      const bb = mesh.getBoundingInfo().boundingBox;
      if (bb.minimum.y < minY) minY = bb.minimum.y;
      if (bb.maximum.y > maxY) maxY = bb.maximum.y;
      if (bb.minimum.x < minX) minX = bb.minimum.x;
      if (bb.maximum.x > maxX) maxX = bb.maximum.x;
      if (bb.minimum.z < minZ) minZ = bb.minimum.z;
      if (bb.maximum.z > maxZ) maxZ = bb.maximum.z;
    }
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    throw new Error(`no meshes built for ${modelId}`);
  }

  // WHICH SIDE THE CAMERA IS ON.
  //
  // GoldSrc's forward is +Y, which the loader's Y/Z swap turns into
  // +Z: the model faces +Z. So the camera goes on the +Z side
  // (alpha = PI/2) and the figure looks straight down the lens.
  //
  // Rotating the MODEL instead (the 180-degree turn main.ts applies)
  // would also work, but it mirrors the model's X extent, so the
  // centre computed from the bounds would no longer BE the centre.
  // Putting the camera on the model's front keeps the numbers honest.
  const centreY = ((minY + maxY) / 2) * SCALE;
  const centreX = ((minX + maxX) / 2) * SCALE;
  const extentY = (maxY - minY) * SCALE;
  const extentX = (maxX - minX) * SCALE;
  const extentZ = (maxZ - minZ) * SCALE;

  // THE RADIUS HAS TO FIT THE FIGURE.
  //
  // The camera's vertical field of view is FOV radians, so the visible
  // height at distance r is 2*r*tan(FOV/2). The radius is therefore
  // derived from the figure's size rather than guessed — a guess put
  // the camera INSIDE the model, which is what the first attempt did.
  const FOV = 0.45;
  const extent = Math.max(extentY, extentX);
  const radius = (extent / 2) / Math.tan(FOV / 2) + extentZ * 0.5;

  const camera = new ArcRotateCamera(
    'cam',
    Math.PI / 2,
    Math.PI / 2,
    radius,
    new Vector3(centreX, centreY, 0),
    scene,
  );
  camera.setTarget(new Vector3(centreX, centreY, 0));
  camera.lowerRadiusLimit = 0.05;
  camera.upperRadiusLimit = 1000;
  camera.minZ = 0.01;
  camera.fov = FOV;

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 1.15;
  hemi.groundColor.set(0.02, 0.06, 0.02);

  const key = new DirectionalLight('key', new Vector3(-0.6, -0.9, 0.7), scene);
  key.intensity = 1.6;
  key.diffuse.set(0.88, 1.0, 0.88);

  const rim = new DirectionalLight('rim', new Vector3(0.8, -0.2, -0.9), scene);
  rim.intensity = 0.6;
  rim.diffuse.set(0.25, 1.0, 0.35);

  await scene.whenReadyAsync();
  engine.runRenderLoop(() => scene.render());
  // A few frames so the textures are uploaded and the first render is
  // not a blank canvas.
  await new Promise((r) => setTimeout(r, 400));
  scene.render();
  await new Promise((r) => setTimeout(r, 150));
  return;
}

// The driver page calls this.
declare global {
  interface Window {
    __renderThumb?: (modelId: string) => Promise<string>;
    __renderAngle?: (modelId: string, angleIndex: number) => Promise<string>;
    __modelInfo?: (modelId: string) => Promise<unknown>;
  }
}

window.__modelInfo = async (modelId: string) => {
  const res = await fetch(`/models/player/${modelId}/${modelId}.mdl`);
  const mdl = parseMdl(await res.arrayBuffer());
  const engine = new Engine(document.createElement('canvas'), true);
  const scene = new Scene(engine);
  const built = buildMdlMeshes(scene, mdl, { scale: 0.1 });
  const parts = built.bodyParts.map((bp) => {
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, n = 0;
    for (const mesh of bp.meshes) {
      n++;
      const bb = mesh.getBoundingInfo().boundingBox;
      if (bb.minimum.y < minY) minY = bb.minimum.y;
      if (bb.maximum.y > maxY) maxY = bb.maximum.y;
      if (bb.minimum.x < minX) minX = bb.minimum.x;
      if (bb.maximum.x > maxX) maxX = bb.maximum.x;
    }
    return { name: bp.name, meshes: n, minY, maxY, minX, maxX };
  });
  return { header: { name: mdl.header.name, min: mdl.header.min, max: mdl.header.max }, parts };
};

/**
 * Render the same model from four angles into a 2x2 contact sheet.
 *
 * The .mdl's body parts carry their own bone transforms, so a
 * guess about which way the figure faces is worth more than it looks.
 * This renders the options so they can be compared.
 */
window.__renderAngle = async (modelId: string, angleIndex: number) => {
  const canvas = document.getElementById('thumb') as HTMLCanvasElement;
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.016, 0.043, 0.016, 1);
  const res = await fetch(`/models/player/${modelId}/${modelId}.mdl`);
  const mdl = parseMdl(await res.arrayBuffer());
  const built = buildMdlMeshes(scene, mdl, { scale: 0.1 });
  for (const bp of built.bodyParts) {
    for (const mesh of bp.meshes) {
      const mat = mesh.material as StandardMaterial | null;
      if (!mat) continue;
      mat.specularColor.set(0, 0, 0);
      mat.useAlphaFromDiffuseTexture = true;
      mat.transparencyMode = 2;
      mat.emissiveColor = new Color3(0.16, 0.2, 0.16);
    }
  }
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (const bp of built.bodyParts) {
    for (const mesh of bp.meshes) {
      const bb = mesh.getBoundingInfo().boundingBox;
      if (bb.minimum.y < minY) minY = bb.minimum.y;
      if (bb.maximum.y > maxY) maxY = bb.maximum.y;
      if (bb.minimum.x < minX) minX = bb.minimum.x;
      if (bb.maximum.x > maxX) maxX = bb.maximum.x;
    }
  }
  const SCALE = 0.1;
  const centreY = ((minY + maxY) / 2) * SCALE;
  const centreX = ((minX + maxX) / 2) * SCALE;
  const extent = Math.max(maxY - minY, maxX - minX) * SCALE;
  const radius = extent * 1.1;

  const angles: [number, number, number][] = [
    [Math.PI / 2, Math.PI / 2, 0],
    [-Math.PI / 2, Math.PI / 2, 0],
    [Math.PI / 2, Math.PI / 2, Math.PI],
    [-Math.PI / 2, Math.PI / 2, Math.PI],
  ];
  const [a, b, rot] = angles[angleIndex % angles.length];
  built.root.rotation.y = rot;
  const cam = new ArcRotateCamera('c', a, b, radius, new Vector3(centreX, centreY, 0), scene);
  cam.setTarget(new Vector3(centreX, centreY, 0));
  cam.minZ = 0.01;
  cam.fov = 0.5;
  scene.activeCamera = cam;
  engine.runRenderLoop(() => scene.render());
  await new Promise((r) => setTimeout(r, 400));
  scene.render();
  return 'ok';
};

window.__renderThumb = async (modelId: string) => {
  const canvas = document.getElementById('thumb') as HTMLCanvasElement;
  await renderModel(modelId, canvas);
  return 'ok';
};
