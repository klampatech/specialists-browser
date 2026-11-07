/**
 * The glue patch that stops the engine's per-frame `gl.getError()`
 * round-trip.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * This patch is the difference between the engine fitting inside a
 * 120 Hz frame period and not fitting inside it — measured on Kyle's
 * MacBook Pro, 2026-11-07:
 *
 *     frame cost, as shipped   9.62 ms   (a 120 Hz frame is 8.33 ms)
 *     frame cost, patched      8.13 ms
 *
 * A patch that silently does nothing is the worst possible outcome:
 * the game would be slow forever and nothing would say why. So this
 * test asserts the four things that matter:
 *
 *   1. It patches the real code.
 *   2. It is idempotent — re-running does not double-patch.
 *   3. It FAILS LOUDLY when the anchor is gone, rather than shipping
 *      an unpatched glue that looks patched.
 *   4. The `?gldebug=1` escape hatch survives, because a fix that
 *      removes the ability to debug the thing it fixed is a trap.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'webxash', 'scripts', 'patch-xash-gl-geterror.cjs');
const CHECK = join(ROOT, 'webxash', 'scripts', 'check-xash-glue.cjs');

/**
 * A fixture shaped like the real minified glue, with just enough
 * around the target that the anchor has to be found rather than
 * assumed.
 */
const ORIGINAL = `
var GL = { lastError: 0, recordError: function (e) { GL.lastError = e; } };
var GLctx = { getError: function () { return 0; } };
var _emscripten_glGetBufferParameteriv = (target, value, data) => { };
var _emscripten_glGetError = () => { var error = GLctx.getError() || GL.lastError; GL.lastError = 0; return error; };
var _emscripten_glGetFloatv = (name_, p) => { };
`;

function fixture(contents = ORIGINAL) {
  const dir = mkdtempSync(join(tmpdir(), 'xash-glue-'));
  const file = join(dir, 'xash.js');
  writeFileSync(file, contents, 'utf8');
  return { dir, file };
}

function run(file) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, file], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return {
      code: e.status ?? 1,
      stdout: e.stdout ? e.stdout.toString() : '',
      stderr: e.stderr ? e.stderr.toString() : '',
    };
  }
}

test('the patch replaces the per-frame getError with a rate-limited check', () => {
  const { dir, file } = fixture();
  try {
    const r = run(file);
    assert.equal(r.code, 0, r.stderr);

    const src = readFileSync(file, 'utf8');

    // The original is gone.
    assert.ok(
      !src.includes('var error = GLctx.getError() || GL.lastError;'),
      'the original _emscripten_glGetError is still in the file'
    );

    // The patch is in.
    assert.ok(src.includes('_xashGlErrorRateLimited'), 'the marker is missing');

    // The glue's OWN error bookkeeping survives — this is what catches
    // bad arguments passed to the glue, and it is free.
    assert.ok(src.includes('var error = GL.lastError;'), 'GL.lastError is no longer read');
    assert.ok(src.includes('GL.lastError = 0;'), 'GL.lastError is no longer cleared');

    // The real check is still there, just rate-limited.
    assert.ok(src.includes('var real = GLctx.getError();'), 'the real check was removed');
    assert.ok(src.includes('> 250'), 'the rate limit is missing');

    // The escape hatch survives.
    assert.ok(src.includes("location.search.indexOf('gldebug=1')"), 'the debug switch is missing');

    assert.match(r.stdout, /patched/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the patch is idempotent', () => {
  const { dir, file } = fixture();
  try {
    const first = run(file);
    assert.equal(first.code, 0, first.stderr);
    const afterFirst = readFileSync(file, 'utf8');

    const second = run(file);
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /already applied/);

    const afterSecond = readFileSync(file, 'utf8');
    assert.equal(afterSecond, afterFirst, 'a second run changed the file');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the patch fails loudly when the anchor is gone', () => {
  // A glue whose getError has been re-minified differently. The patch
  // MUST NOT claim success — a silent no-op here means the game ships
  // slow and nothing says why.
  const { dir, file } = fixture(
    ORIGINAL.replace(
      'var error = GLctx.getError() || GL.lastError;',
      'var error = GL.lastError;'
    )
  );
  try {
    const r = run(file);
    assert.equal(r.code, 1, 'the patch did not fail on a missing anchor');
    assert.match(r.stderr, /could not find the original _emscripten_glGetError/);
    assert.ok(
      !readFileSync(file, 'utf8').includes('_xashGlErrorRateLimited'),
      'the file was modified despite the failure'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the patch fails loudly when the anchor is ambiguous', () => {
  const { dir, file } = fixture(ORIGINAL + ORIGINAL);
  try {
    const r = run(file);
    assert.equal(r.code, 1, 'the patch did not fail on an ambiguous anchor');
    assert.match(r.stderr, /appears 2 times/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the patch skips a missing glue without failing the install', () => {
  // The dependency may not be installed yet (postinstall ordering, or
  // a production install with --omit=dev). That is not an error.
  const dir = mkdtempSync(join(tmpdir(), 'xash-glue-'));
  try {
    const r = run(join(dir, 'does-not-exist.js'));
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /not present; skipping/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the build gate fails a bundle whose glue is not patched', () => {
  // The gate is the last line of defence. Vite serves its
  // dependency-optimisation cache rather than the file on disk, so a
  // patch that applied cleanly can still be absent from the build —
  // and the game would be slow forever with nothing in the logs.
  const dir = mkdtempSync(join(tmpdir(), 'xash-dist-'));
  try {
    const assets = join(dir, 'assets');
    mkdirSync(assets, { recursive: true });

    // An unpatched glue: the engine's glGetError, but no ?gldebug=1.
    writeFileSync(
      join(assets, 'xash3d-abc123.js'),
      'var _emscripten_glGetError = () => { var error = GLctx.getError() || GL.lastError; return error; };',
      'utf8'
    );

    let code = 0;
    let stderr = '';
    try {
      execFileSync(process.execPath, [CHECK, dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      code = e.status ?? 1;
      stderr = e.stderr ? e.stderr.toString() : '';
    }
    assert.equal(code, 1, 'the gate passed a bundle with an unpatched glue');
    assert.match(stderr, /the built engine glue is NOT patched/);

    // And it PASSES once the glue is patched.
    writeFileSync(
      join(assets, 'xash3d-abc123.js'),
      'var _emscripten_glGetError = () => { var debug = location.search.indexOf("gldebug=1"); return error; };',
      'utf8'
    );
    const stdout = execFileSync(process.execPath, [CHECK, dir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.match(stdout, /the engine glue is patched/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
