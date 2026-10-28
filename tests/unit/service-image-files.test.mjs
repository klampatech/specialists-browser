/**
 * Every module a service imports has to be IN ITS IMAGE.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The service images are built from a Dockerfile that copies files
 * explicitly. On 2026-10-28 the registry's Dockerfile had one COPY line
 * per module in `lib/`, and a new module — `lib/console-ask.mjs` — was
 * added to the registry WITHOUT a matching COPY line.
 *
 * The image built fine. The unit suite passed. The frontend built. The
 * deploy streamed the image to production and the registry container
 * crash-looped:
 *
 *   Error [ERR_MODULE_NOT_FOUND]: Cannot find module
 *   '/app/services/registry/lib/console-ask.mjs' imported from
 *   /app/services/registry/service.mjs
 *
 * Nothing in CI could see it, because the missing file is only missing
 * INSIDE the image. The deploy caught it (and the public API was down
 * until the file was pushed into the running container by hand).
 *
 * So this test reads the Dockerfile the way the build does — one COPY
 * line at a time — and checks the image against the two lists that
 * matter: the modules the service imports, and the modules that exist.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const SERVICES = [
  {
    name: 'registry',
    dir: 'services/registry',
    dockerfile: 'services/registry/Dockerfile.registry',
    dockerignore: 'services/registry/Dockerfile.registry.dockerignore',
  },
  {
    name: 'orchestrator',
    dir: 'services/orchestrator',
    dockerfile: 'services/orchestrator/Dockerfile.orchestrator',
    dockerignore: 'services/orchestrator/Dockerfile.orchestrator.dockerignore',
  },
];

/**
 * The source paths a Dockerfile copies.
 *
 * A path ending in `/` is a directory: every file under it is copied. A
 * path without one is a single file.
 */
function copySources(dockerfileText) {
  const sources = [];
  for (const line of dockerfileText.split('\n')) {
    const m = line.match(/^\s*COPY\s+(?:--\S+\s+)*(\S+)(?:\s+(\S+))?\s*$/);
    if (m) sources.push(m[1]);
  }
  return sources;
}

/** The paths a .dockerignore re-includes. */
function allowedPaths(dockerignoreText) {
  return new Set(
    [...dockerignoreText.matchAll(/^!(\S+)$/gm)].map((m) => m[1])
  );
}

/** Is `file` (repo-relative) covered by any of the COPY sources? */
function isCovered(file, sources) {
  for (const src of sources) {
    if (src.endsWith('/')) {
      if (file.startsWith(src)) return true;
    } else if (src === file) {
      return true;
    }
  }
  return false;
}

/** The relative module paths service.mjs imports. */
function importsOf(serviceFileText) {
  const out = [];
  const re = /from\s+'(\.[^']+)'/g;
  let m;
  while ((m = re.exec(serviceFileText))) out.push(m[1]);
  return out;
}

for (const svc of SERVICES) {
  test(`${svc.name}: every module in lib/ is copied into the image`, () => {
    const dockerfile = readFileSync(join(repoRoot, svc.dockerfile), 'utf8');
    const sources = copySources(dockerfile);
    assert.ok(sources.length > 0, 'the Dockerfile should have COPY lines');

    const libDir = join(repoRoot, svc.dir, 'lib');
    const modules = readdirSync(libDir).filter((f) => f.endsWith('.mjs'));
    assert.ok(modules.length > 0, 'there should be modules to check');

    const missing = modules.filter(
      (m) => !isCovered(`${svc.dir}/lib/${m}`, sources)
    );
    assert.deepEqual(
      missing,
      [],
      `${missing.join(', ')} exist in ${svc.dir}/lib/ but are not copied into the image. ` +
        'Either add a COPY line for them, or copy the whole directory.'
    );
  });

  test(`${svc.name}: every module service.mjs imports is copied into the image`, () => {
    const dockerfile = readFileSync(join(repoRoot, svc.dockerfile), 'utf8');
    const sources = copySources(dockerfile);

    const serviceText = readFileSync(join(repoRoot, svc.dir, 'service.mjs'), 'utf8');
    const imports = importsOf(serviceText);
    assert.ok(imports.length > 0, 'the service should import something');

    const missing = imports.filter((spec) => {
      const abs = resolve(repoRoot, svc.dir, spec);
      const rel = relative(repoRoot, abs);
      return !isCovered(rel, sources);
    });
    assert.deepEqual(
      missing,
      [],
      `service.mjs imports ${missing.join(', ')} but the image does not copy them. ` +
        'The container would fail to start with ERR_MODULE_NOT_FOUND.'
    );
  });
}

test('the images copy their module directories, not files one at a time', () => {
  // The per-file COPY is the trap: adding a module means remembering to
  // add a line to the Dockerfile, and forgetting it is invisible until
  // the container will not start in production.
  for (const svc of SERVICES) {
    const dockerfile = readFileSync(join(repoRoot, svc.dockerfile), 'utf8');
    const sources = copySources(dockerfile);
    assert.ok(
      sources.includes(`${svc.dir}/lib/`),
      `${svc.dockerfile} should copy ${svc.dir}/lib/ as a directory`
    );
  }
});

for (const svc of SERVICES) {
  test(`${svc.name}: every module is ALLOWED by the dockerignore`, () => {
    // The build context is ALLOWLISTED — `.dockerignore` starts with
    // `**` and then re-includes what the image needs. So a module that
    // is COPYed but not re-included is NOT IN THE IMAGE, and the build
    // fails with a checksum error.
    //
    // That is not hypothetical: the leaderboard's own modules shipped
    // without their allowlist lines (commit 514934a), and it happened
    // AGAIN with the log-state module.
    const dockerignore = readFileSync(join(repoRoot, svc.dockerignore), 'utf8');
    const allowed = allowedPaths(dockerignore);

    const libDir = join(repoRoot, svc.dir, 'lib');
    const modules = readdirSync(libDir).filter((f) => f.endsWith('.mjs'));

    const missing = modules.filter((m) => {
      const rel = `${svc.dir}/lib/${m}`;
      // Allowed either exactly, or by a re-included directory.
      if (allowed.has(rel)) return false;
      for (const a of allowed) {
        if (a.endsWith('/') && rel.startsWith(a)) return false;
      }
      return true;
    });
    assert.deepEqual(
      missing,
      [],
      `these modules are not re-included by ${svc.dockerignore}, so they are ` +
        'not in the build context and the image build will fail: ' +
        missing.join(', ')
    );
  });
}
