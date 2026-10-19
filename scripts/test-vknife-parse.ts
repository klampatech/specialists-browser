
import { readFileSync } from "node:fs";
import { parseMdl } from "../src/mod/mdl-parser.ts";

const path = "/home/kyle/Development/specialists-browser/_runtime_assets/half-life/ts/models/v_knife.mdl";
const buffer = readFileSync(path);
const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
const mdl = parseMdl(ab);

console.log("bp[0] fields:", Object.keys(mdl.bodyparts[0]));
console.log("bp[0].models:", JSON.stringify(mdl.bodyparts[0].models, null, 2).substring(0, 500));
console.log("subModels[0] length:", mdl.subModels[0].length);
if (mdl.subModels[0].length > 0) {
  console.log("subModels[0][0] fields:", Object.keys(mdl.subModels[0][0]));
  console.log("subModels[0][0] mesh count:", mdl.subModels[0][0].meshes?.length);
}
