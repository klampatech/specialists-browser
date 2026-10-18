/**
 * Smoke test: parse seal.mdl with the new parser and print a summary.
 * Run with: npx tsx scripts/test-mdl-parse.ts
 *   (or node --experimental-strip-types)
 */
import { readFileSync } from "node:fs";
import { parseMdl } from "../src/mod/mdl-parser.ts";

const path =
  "/home/kyle/Development/specialists-browser/_runtime_assets/half-life/ts/models/player/seal/seal.mdl";
const buffer = readFileSync(path);
const ab = buffer.buffer.slice(
  buffer.byteOffset,
  buffer.byteOffset + buffer.byteLength
) as ArrayBuffer;

const mdl = parseMdl(ab);

console.log(`Header: id=${mdl.header.id} version=${mdl.header.version} name=${mdl.header.name}`);
console.log(`  eyePosition=${JSON.stringify(mdl.header.eyePosition)}`);
console.log(`  length=${mdl.header.length} bytes`);
console.log(`  numBones=${mdl.header.numBones} boneIndex=${mdl.header.boneIndex}`);
console.log(`  numHitboxes=${mdl.header.numHitboxes}`);
console.log(`  numTextures=${mdl.header.numTextures} (decoded: ${mdl.textures.filter(t => t.pixels).length})`);
console.log(`  numBodyParts=${mdl.header.numBodyParts}`);

console.log(`\nBones (${mdl.bones.length}):`);
for (let i = 0; i < Math.min(5, mdl.bones.length); i++) {
  console.log(`  bone[${i}]: ${mdl.bones[i].name} parent=${mdl.bones[i].parent}`);
}
console.log(`  ... (${mdl.bones.length - 5} more)`);

console.log(`\nTextures (${mdl.textures.length}):`);
for (const t of mdl.textures) {
  console.log(`  ${t.name}  ${t.width}x${t.height}  flags=0x${t.flags.toString(16)}  pixels=${t.pixels ? `${t.pixels.length / 4}px` : "(skipped)"}`);
}

console.log(`\nBody parts (${mdl.bodyparts.length}):`);
for (const bp of mdl.bodyparts) {
  console.log(`  ${bp.name}  numModels=${bp.numModels}  modelIndex=${bp.modelIndex}`);
}

console.log(`\nDecoded sub-models:`);
for (let bp = 0; bp < mdl.subModels.length; bp++) {
  for (let sp = 0; sp < mdl.subModels[bp].length; sp++) {
    const sub = mdl.subModels[bp][sp];
    const totalTris = sub.meshes.reduce((sum, m) => sum + m.numTriangles, 0);
    console.log(
      `  [${bp}][${sp}] ${sub.name}  verts=${sub.vertices.length / 3}  meshes=${sub.meshes.length}  triangles=${totalTris}`
    );
    for (const m of sub.meshes) {
      const tex = mdl.textures[m.skinRef];
      console.log(
        `    mesh  triangles=${m.numTriangles}  skinRef=${m.skinRef}  texture=${tex?.name ?? "(none)"}`
      );
    }
  }
}