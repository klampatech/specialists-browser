/**
 * What did a bufferData call ACTUALLY upload?
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The upload census reported "536,870,912 bytes" for every call — a
 * 512 MiB upload, 88,000 times a second — and that number was believed:
 * it became the headline defect of the performance work, a subagent was
 * sent to patch it, and a patch was written against a defect that does
 * not exist.
 *
 * The census measured the size of the CARRIER instead of the size of the
 * UPLOAD. The emscripten glue calls
 *
 *      GLctx.bufferData(target, HEAPU8, usage, data, size)
 *
 * passing the whole 512 MiB wasm heap as the carrier with a byte offset
 * and a byte length. The carrier's byteLength is 512 MiB; the upload is
 * `size` bytes. Nothing in the engine ever asked for 512 MiB.
 *
 * So this test holds the accounting to the truth:
 *
 *   1. The size overload reports the size.
 *   2. The srcData+range overload reports the RANGE, never the carrier.
 *   3. The srcData overload reports the carrier (that one really is the
 *      whole view).
 *   4. The same holds for bufferSubData.
 *   5. The source that goes into the page is the source that is tested.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { bufferDataBytes, bufferSubDataBytes, ACCOUNTING_SOURCE } = require('../../tools/perf/lib/gl-upload-accounting.cjs');

const HEAP = new Uint8Array(512 * 1024 * 1024);

test('the size overload reports the size', () => {
  const acc = bufferDataBytes([34962, 1024, 35048]);
  assert.equal(acc.bytes, 1024);
  assert.equal(acc.shape, 'size');
});

test('the srcData+range overload reports the RANGE, not the carrier', () => {
  // THE REGRESSION. The carrier is 512 MiB; the upload is 1 KiB.
  const acc = bufferDataBytes([34962, HEAP, 35048, 0, 1024]);
  assert.equal(acc.bytes, 1024);
  assert.equal(acc.shape, 'srcData+range');
  assert.equal(acc.srcBytes, HEAP.byteLength);
  assert.notEqual(acc.bytes, HEAP.byteLength);
});

test('a range that ends inside the carrier is still the range', () => {
  const acc = bufferDataBytes([34962, HEAP, 35048, 4096, 8790]);
  assert.equal(acc.bytes, 8790);
});

test('the srcData overload reports the carrier', () => {
  const small = new Uint8Array(2048);
  const acc = bufferDataBytes([34963, small, 35044]);
  assert.equal(acc.bytes, 2048);
  assert.equal(acc.shape, 'srcData');
});

test('bufferSubData counts the same way', () => {
  assert.equal(bufferSubDataBytes([34963, 0, HEAP, 0, 828]).bytes, 828);
  assert.equal(bufferSubDataBytes([34963, 0, HEAP, 0, 828]).shape, 'srcData+range');
  assert.equal(bufferSubDataBytes([34963, 0, new Uint8Array(1584)]).bytes, 1584);
  assert.equal(bufferSubDataBytes([34963, 0, 4096]).bytes, 4096);
});

test('the source that goes into the page is the source that is tested', () => {
  // The probe injects ACCOUNTING_SOURCE into the browser. If the two
  // ever drift, the page measures something the test never checked.
  const [pageBufferDataBytes, pageBufferSubDataBytes] = eval(ACCOUNTING_SOURCE);
  assert.equal(pageBufferDataBytes([34962, HEAP, 35048, 0, 1024]).bytes, 1024);
  assert.equal(pageBufferSubDataBytes([34963, 0, HEAP, 0, 828]).bytes, 828);
  assert.equal(pageBufferDataBytes([34962, 1024, 35048]).bytes, 1024);
});
