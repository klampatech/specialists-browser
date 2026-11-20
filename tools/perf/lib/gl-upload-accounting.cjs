/**
 * WHAT DID A bufferData CALL ACTUALLY UPLOAD?
 *
 * The upload census used to report "536,870,912 bytes" for every call,
 * and that number became a headline: 88,000 calls a second, each asking
 * for 512 MiB. It was wrong, and it was wrong HERE, in this file's
 * predecessor: the census read the byteLength of the SOURCE VIEW.
 *
 * WebGL2 has two overloads, and they say different things:
 *
 *   bufferData(target, size, usage)                      -> `size` is the
 *                                                          byte count
 *   bufferData(target, srcData, usage, srcOffset, length) -> `length` is
 *                                                          the byte count
 *                                                          and `srcData` is
 *                                                          only a CARRIER
 *
 * The emscripten glue uses the SECOND one, and passes the WHOLE wasm heap
 * as the carrier:
 *
 *      GLctx.bufferData(target, HEAPU8, usage, data, size)
 *
 * so the heap's byteLength (512 MiB) is the size of the CARRIER, not of
 * the upload. Measuring the carrier is how a 1 KiB upload was counted as
 * 512 MiB, and how a defect that does not exist was nearly patched.
 *
 * These two functions are the accounting, and they are PURE so a test can
 * hold them to it. The probe injects ACCOUNTING_SOURCE into the page, so
 * the page and the test measure the same thing.
 */

/**
 * The bytes a bufferData call uploaded.
 * @param {any[]} args the call's arguments, in order
 * @returns {{bytes: number, shape: string, srcBytes: number}}
 */
function bufferDataBytes(args) {
  const [target, a, b, c, d] = args;
  if (typeof a === 'number') {
    // bufferData(target, size, usage)
    return { bytes: a, shape: 'size', srcBytes: 0 };
  }
  const srcBytes = (a && typeof a.byteLength === 'number') ? a.byteLength : 0;
  if (d !== undefined) {
    // bufferData(target, srcData, usage, srcOffset, length)
    const bytes = typeof d === 'number' ? d : ((d && d.byteLength) || 0);
    return { bytes, shape: 'srcData+range', srcBytes };
  }
  // bufferData(target, srcData, usage)
  return { bytes: srcBytes, shape: 'srcData', srcBytes };
}

/**
 * The bytes a bufferSubData call uploaded.
 * @param {any[]} args the call's arguments, in order
 * @returns {{bytes: number, shape: string, srcBytes: number}}
 */
function bufferSubDataBytes(args) {
  const [target, offset, a, c, d] = args;
  if (typeof a === 'number') {
    // bufferSubData(target, dstByteOffset, size, usage)
    return { bytes: a, shape: 'size', srcBytes: 0 };
  }
  const srcBytes = (a && typeof a.byteLength === 'number') ? a.byteLength : 0;
  if (d !== undefined) {
    // bufferSubData(target, dstByteOffset, srcData, srcOffset, length)
    const bytes = typeof d === 'number' ? d : ((d && d.byteLength) || 0);
    return { bytes, shape: 'srcData+range', srcBytes };
  }
  // bufferSubData(target, dstByteOffset, srcData)
  return { bytes: srcBytes, shape: 'srcData', srcBytes };
}

// The same functions, as source, for the page.
const ACCOUNTING_SOURCE = `[${bufferDataBytes.toString()},${bufferSubDataBytes.toString()}]`;

module.exports = { bufferDataBytes, bufferSubDataBytes, ACCOUNTING_SOURCE };
