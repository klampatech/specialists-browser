#!/usr/bin/env node
/**
 * Split tsmod.zip into 64MB parts plus a content-addressed manifest.
 *
 * WHY
 * ---
 * Every layer between this file and the browser's WASM filesystem has a
 * per-object size ceiling, and the 517MB archive exceeds all of them:
 *
 *   browser Cache Storage (cache.put)   100MB ok / 492MB UnknownError
 *   browser IndexedDB single value      133,169,152 B  (measured)
 *   Cloudflare CDN cache-file, F/P/B    512MB  -> archive is within 4% of it
 *
 * The Cloudflare one is silent: oversized objects are passed through to
 * the origin rather than rejected, so the edge quietly stops helping.
 *
 * See docs/ASSET-DELIVERY.md for the full measurements.
 *
 * WHY 64MB AND NOT 256MB
 * ----------------------
 * The architecture doc proposes "<=256 MB parts". That does not fit. A
 * 256MB chunk exceeds IndexedDB's 127MiB single-value limit, so a client
 * storing parts in IndexedDB would fail on the FIRST chunk - the same bug
 * one layer up. The binding constraint is the smallest ceiling (~100MB),
 * not the biggest. 64MB leaves roughly 2x headroom under all three.
 *
 * PROVIDER-AGNOSTIC
 * -----------------
 * This script only touches local files. Nothing here knows or cares where
 * the parts end up - see object-store.mjs for the upload side, which goes
 * through the S3 API so R2 / S3 / MinIO / B2 are interchangeable.
 *
 * USAGE
 * -----
 *   node tools/assets/split-tsmod.mjs
 *   node tools/assets/split-tsmod.mjs --zip <path> --out <dir> --size <bytes>
 *
 * Output layout (all generated, all gitignored):
 *
 *   public/hl/ts/manifest.json          tiny, points at a version
 *   public/hl/ts/<version>/part-000.bin immutable, content-addressed
 *   public/hl/ts/<version>/part-001.bin
 *   ...
 *
 * The version is the first 12 hex of the archive's SHA-256, so rebuilding
 * the archive produces a new directory and the parts can be served with
 * `Cache-Control: immutable` forever. The manifest itself stays at a
 * fixed URL and must NOT be immutable - it is the pointer that changes.
 */

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

const DEFAULTS = {
  zip: path.join(REPO, 'webxash', 'public', 'hl', 'tsmod.zip'),
  out: path.join(REPO, 'webxash', 'public', 'hl', 'ts'),
  size: 64 * 1024 * 1024,
};

/** sha256 of a whole file, streamed so a 517MB input stays off the heap. */
async function sha256File(file) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    const s = createReadStream(file);
    s.on('data', (c) => h.update(c));
    s.on('error', reject);
    s.on('end', () => resolve(h.digest('hex')));
  });
}

function parseArgs(argv) {
  const out = { ...DEFAULTS };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--zip') out.zip = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--size') out.size = Number(argv[++i]);
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!Number.isFinite(out.size) || out.size <= 0) {
    throw new Error(`--size must be a positive number of bytes, got ${out.size}`);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(
      'split-tsmod.mjs [--zip <file>] [--out <dir>] [--size <bytes>]\n' +
        `  default zip : ${DEFAULTS.zip}\n` +
        `  default out : ${DEFAULTS.out}\n` +
        `  default size: ${DEFAULTS.size} (64 MiB)`,
    );
    return 0;
  }

  let stat;
  try {
    stat = await fs.stat(args.zip);
  } catch {
    console.error(`\n  Source archive not found:\n    ${args.zip}\n`);
    console.error('  The zip is gitignored. Populate it before splitting:\n');
    console.error('    cp /path/to/tsmod.zip webxash/public/hl/tsmod.zip\n');
    return 1;
  }

  console.log(`  source : ${args.zip}  (${(stat.size / 1048576).toFixed(1)} MiB)`);

  const version = (await sha256File(args.zip)).slice(0, 12);
  const partDir = path.join(args.out, version);
  console.log(`  version: ${version}   (sha256 prefix of the archive)`);

  const partCount = Math.ceil(stat.size / args.size);
  console.log(
    `  layout : ${partCount} part(s) of ${(args.size / 1048576).toFixed(0)} MiB -> ${path.relative(REPO, partDir)}\n`,
  );

  await fs.mkdir(partDir, { recursive: true });

  // Streamed, so peak memory is one part rather than the whole archive.
  const handle = await fs.open(args.zip, 'r');
  const parts = [];
  try {
    for (let i = 0; i < partCount; i++) {
      const length = Math.min(args.size, stat.size - i * args.size);
      const buf = Buffer.allocUnsafe(length);
      await handle.read(buf, 0, length, i * args.size);

      const name = `part-${String(i).padStart(3, '0')}.bin`;
      await fs.writeFile(path.join(partDir, name), buf);

      const sha = createHash('sha256').update(buf).digest('hex');
      parts.push({ name, bytes: length, sha256: sha });
      console.log(
        `    ${name}  ${(length / 1048576).toFixed(1).padStart(6)} MiB  sha256 ${sha.slice(0, 12)}`,
      );
    }
  } finally {
    await handle.close();
  }

  const manifest = {
    schema: 1,
    // Content address. The client stores parts under this key, so a new
    // archive version invalidates every stored part without any manual
    // cache busting.
    version,
    size: stat.size,
    partSize: args.size,
    // Where the versioned parts live, relative to this manifest.
    prefix: `${version}/`,
    parts,
  };

  await fs.writeFile(
    path.join(args.out, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );

  const total = parts.reduce((a, p) => a + p.bytes, 0);
  console.log(`\n  manifest: ${path.relative(REPO, path.join(args.out, 'manifest.json'))}`);
  console.log(`  ${parts.length} parts, ${(total / 1048576).toFixed(1)} MiB total`);
  if (total !== stat.size) {
    console.error('  WARNING: part bytes do not sum to the archive size');
    return 1;
  }
  console.log('  OK\n');
  return 0;
}

process.exit(await main());