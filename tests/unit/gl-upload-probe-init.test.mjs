/**
 * THE UPLOAD CENSUS, RUN FOR REAL — with a fake WebGL context.
 *
 * The census is the instrument the performance work is measured with, and
 * it had two faults that only a test would catch:
 *
 *   1. It counted the CARRIER (the whole 512 MiB wasm heap the emscripten
 *      glue passes as srcData) instead of the UPLOAD, so every call read
 *      as a 512 MiB upload. The defect it invented was nearly patched.
 *
 *   2. It read `stats.stacks` before it was ever initialised, so every
 *      call over 1 MiB raised a TypeError INSIDE the engine's upload.
 *      The engine's real uploads never reached WebGL while the census
 *      ran, and the stack it was supposed to capture was never captured.
 *
 * So this runs the EXACT script the browser runs — the same file the
 * probe injects — against a fake WebGL2 context, and holds it to:
 *
 *   1. The upload is counted as the UPLOAD, not the carrier.
 *   2. The real call still reaches the real WebGL method.
 *   3. Nothing throws.
 *   4. The call site is captured, per distinct size.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { INIT } = require('../../tools/perf/lib/gl-upload-init.cjs');

const HEAP = new Uint8Array(512 * 1024 * 1024);

// A fake WebGL2 context: the patched prototype is what the engine calls.
function makeWorld() {
  const calls = [];
  class FakeWebGL2RenderingContext {
    bufferData(...args) { calls.push(['bufferData', args]); }
    bufferSubData(...args) { calls.push(['bufferSubData', args]); }
    createBuffer() { calls.push(['createBuffer', []]); return {}; }
    deleteBuffer(...args) { calls.push(['deleteBuffer', args]); }
  }
  class FakeWebGLRenderingContext {}
  const window = {
    WebGL2RenderingContext: FakeWebGL2RenderingContext,
    WebGLRenderingContext: FakeWebGLRenderingContext,
  };
  const context = vm.createContext({
    window,
    requestAnimationFrame: () => 0,      // no loop in a test
    Uint8Array,
    Array,
    Object,
    Error,
    performance,
  });
  vm.runInContext(INIT, context);
  return { window, FakeWebGL2RenderingContext, calls };
}

test('the census counts the upload, not the carrier', () => {
  const { window, FakeWebGL2RenderingContext } = makeWorld();
  const gl = new FakeWebGL2RenderingContext();
  gl.bufferData(34962, HEAP, 35048, 0, 1024);     // the emscripten shape
  gl.bufferData(34963, new Uint8Array(2048), 35044);

  const s = window.__glProbe;
  assert.equal(s.calls, 2);
  assert.equal(s.bytes, 1024 + 2048);
  assert.notEqual(s.bytes, HEAP.byteLength);
});

test('the engine\'s real upload still reaches WebGL', () => {
  const { window, FakeWebGL2RenderingContext, calls } = makeWorld();
  const gl = new FakeWebGL2RenderingContext();
  gl.bufferData(34962, HEAP, 35048, 0, 1024);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'bufferData');
  assert.equal(window.__glProbe.calls, 1);
});

test('nothing throws, whatever the size', () => {
  const { window, FakeWebGL2RenderingContext } = makeWorld();
  const gl = new FakeWebGL2RenderingContext();
  // The old census threw HERE, on every call over 1 MiB.
  assert.doesNotThrow(() => gl.bufferData(34962, HEAP, 35048, 0, 8 * 1024 * 1024));
  assert.equal(window.__glProbe.calls, 1);
});

test('the call site is captured, once per distinct size', () => {
  const { window, FakeWebGL2RenderingContext } = makeWorld();
  const gl = new FakeWebGL2RenderingContext();
  gl.bufferData(34962, HEAP, 35048, 0, 1024);
  gl.bufferData(34962, HEAP, 35048, 0, 2048);
  gl.bufferData(34962, HEAP, 35048, 0, 1024);   // the same size again

  const s = window.__glProbe;
  assert.equal(s.stacks.length, 2);
  assert.ok(s.stacks[0].stack.includes('bufferData'));
  assert.equal(s.sizes['34962:1024'], 2);
  assert.equal(s.sizes['34962:2048'], 1);
});

test('bufferSubData is counted the same way', () => {
  const { window, FakeWebGL2RenderingContext } = makeWorld();
  const gl = new FakeWebGL2RenderingContext();
  gl.bufferSubData(34963, 0, HEAP, 0, 828);
  const s = window.__glProbe;
  assert.equal(s.subCalls, 1);
  assert.equal(s.subBytes, 828);
});
