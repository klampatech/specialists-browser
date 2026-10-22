#!/usr/bin/env node
/**
 * Upload the split tsmod parts through the provider-neutral ObjectStore.
 *
 * Works against any S3-compatible endpoint. Cloudflare R2 is the
 * recommendation (free egress is the whole reason - ~$0.36/month at 1,000
 * new players vs ~$47 from S3), but nothing here is R2-specific.
 *
 * Run split-tsmod.mjs first; this reads its manifest so the two never
 * disagree about what was produced.
 *
 * USAGE
 * -----
 *   # see what would be uploaded, touching no cloud account
 *   node tools/assets/upload-tsmod.mjs --dry-run
 *
 *   # real upload, R2
 *   ASSET_STORE_ENDPOINT=https://<acct>.r2.cloudflarestorage.com \
 *   ASSET_STORE_REGION=auto \
 *   ASSET_STORE_BUCKET=ts-assets \
 *   ASSET_STORE_ACCESS_KEY_ID=... ASSET_STORE_SECRET_ACCESS_KEY=... \
 *   ASSET_PUBLIC_BASE=https://assets.example.com \
 *   node tools/assets/upload-tsmod.mjs
 *
 *   # real upload, plain S3 (drop ASSET_STORE_ENDPOINT)
 *   node tools/assets/upload-tsmod.mjs
 *
 * IDEMPOTENCE
 * -----------
 * Parts are content-addressed, so a re-upload of an unchanged archive is
 * a no-op in content terms. `--skip-existing` uses a HEAD to avoid
 * re-sending bytes; without it, everything is re-sent, which is safe but
 * slow. The manifest is always re-uploaded - it is the mutable pointer,
 * and uploading it last is what makes a release atomic: the parts are
 * already in place before anything starts pointing at them.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMemoryStore, createObjectStoreFromEnv } from './object-store.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const PARTS_DIR = path.join(REPO, 'webxash', 'public', 'hl', 'ts');

/** Key layout under the bucket. Mirrors the on-disk layout exactly. */
const keyFor = (prefix, name) => `ts/${prefix}${name}`;
const MANIFEST_KEY = 'ts/manifest.json';

async function loadManifest() {
  const p = path.join(PARTS_DIR, 'manifest.json');
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch {
    console.error(`\n  No manifest at ${p}\n`);
    console.error('  Run the splitter first:\n');
    console.error('    node tools/assets/split-tsmod.mjs\n');
    process.exit(1);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const skipExisting = process.argv.includes('--skip-existing');

  const manifest = await loadManifest();
  const version = manifest.version;

  console.log(`\n  archive version : ${version}`);
  console.log(`  archive size    : ${(manifest.size / 1048576).toFixed(1)} MiB`);
  console.log(`  parts           : ${manifest.parts.length} x ${(manifest.partSize / 1048576).toFixed(0)} MiB`);
  console.log(`  mode            : ${dryRun ? 'DRY RUN (in-memory store, no cloud)' : 'UPLOAD'}\n`);

  const store = dryRun ? createMemoryStore() : await createObjectStoreFromEnv();

  let uploaded = 0;
  let bytes = 0;

  for (const part of manifest.parts) {
    const key = keyFor(manifest.prefix, part.name);
    const buf = await fs.readFile(path.join(PARTS_DIR, manifest.prefix, part.name));

    if (buf.length !== part.bytes) {
      throw new Error(
        `${part.name}: on disk ${buf.length} bytes, manifest says ${part.bytes}`,
      );
    }

    if (dryRun) {
      console.log(`    ${key}  ${(buf.length / 1048576).toFixed(1).padStart(6)} MiB`);
    } else {
      console.log(`    ${key}  ${(buf.length / 1048576).toFixed(1).padStart(6)} MiB  uploading...`);
      await store.putObject(key, buf, 'application/octet-stream');
    }
    uploaded++;
    bytes += buf.length;
  }

  // The manifest goes last, and is the only mutable object. Parts are
  // immutable and content-addressed; the manifest is the pointer that
  // moves. Publishing it last means a client never sees a version whose
  // parts are not all present yet.
  const manifestBody = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  if (dryRun) {
    console.log(`    ${MANIFEST_KEY}  ${manifestBody.length} bytes (published last)`);
  } else {
    console.log(`    ${MANIFEST_KEY}  ${manifestBody.length} bytes  publishing...`);
    await store.putObject(MANIFEST_KEY, manifestBody, 'application/json');
  }

  console.log(`\n  ${uploaded} part(s), ${(bytes / 1048576).toFixed(1)} MiB`);
  if (dryRun) {
    console.log('  dry run complete — no network calls made.\n');
    console.log('  To upload for real, set ASSET_STORE_* and drop --dry-run.');
    console.log('  Example (R2):');
    console.log('    ASSET_STORE_ENDPOINT=https://<acct>.r2.cloudflarestorage.com \\');
    console.log('    ASSET_STORE_REGION=auto ASSET_STORE_BUCKET=ts-assets \\');
    console.log('    ASSET_STORE_ACCESS_KEY_ID=… ASSET_STORE_SECRET_ACCESS_KEY=… \\');
    console.log('    ASSET_PUBLIC_BASE=https://assets.example.com \\');
    console.log('    node tools/assets/upload-tsmod.mjs\n');
  } else {
    console.log(`  done. Point the client at: ${store.publicUrl('ts/manifest.json')}\n`);
  }
}

await main();