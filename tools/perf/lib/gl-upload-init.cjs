/**
 * THE PAGE-SIDE PATCH -- the script the upload census injects into the
 * browser before the engine's own scripts run.
 *
 * It lives here, not in the probe, so a TEST can run it: the census is
 * the instrument the performance work is measured with, and an
 * instrument that has never been executed is exactly how a 512 MiB
 * upload that never happened became the biggest defect in the project.
 *
 * The engine creates its WebGL context early, so a patch installed
 * afterwards misses every call it made before. So this is an init
 * script, and it patches the PROTOTYPE, not the context -- the context
 * does not exist yet when the patch lands.
 */
const { ACCOUNTING_SOURCE } = require('./gl-upload-accounting.cjs');

const INIT = `
(() => {
  const [bufferDataBytes, bufferSubDataBytes] = ${ACCOUNTING_SOURCE};
  const stats = {
    frames: 0,
    calls: 0,
    bytes: 0,
    subCalls: 0,
    subBytes: 0,
    deleteCalls: 0,
    createCalls: 0,
    shapes: [],      // one signature per frame
    frameCalls: 0,
    frameBytes: 0,
    sizes: {},       // "target:bytes" -> how many calls had it
    stacks: [],      // one stack per DISTINCT size, so the call site is known
    stackBySize: {}, // "target:bytes" -> the stack that size came from
  };
  window.__glProbe = stats;

  // THE SHAPES ARE ONLY USED TO SPOT A REPEATED UPLOAD, AND THEY GET BIG
  // FAST: a dense fight makes 1.7 million bufferData calls in 20 seconds,
  // and the old census wrote all of them into the JSON (45 MB).
  const SHAPE_FRAMES = 300;

  const patch = (Ctor, label) => {
    if (!Ctor || !Ctor.prototype) return;
    const proto = Ctor.prototype;
    if (proto.__glProbePatched) return;
    proto.__glProbePatched = true;

    const origData = proto.bufferData;
    proto.bufferData = function () {
      const acc = bufferDataBytes(Array.prototype.slice.call(arguments));
      const bytes = acc.bytes;
      const target = arguments[0];
      stats.calls++;
      stats.bytes += bytes;
      stats.frameCalls++;
      stats.frameBytes += bytes;
      if (stats.frames < SHAPE_FRAMES) {
        stats.shapes[stats.frames] = stats.shapes[stats.frames] || [];
        stats.shapes[stats.frames].push(target + ':' + bytes + ':' + acc.shape);
      }
      const key = target + ':' + bytes;
      stats.sizes[key] = (stats.sizes[key] || 0) + 1;
      // THE STACK, ONCE PER DISTINCT SIZE. The caller is what names the
      // bug: the glue's own temp-buffer path shows getTempVertexBuffer,
      // the emscripten wrapper shows _emscripten_glBufferData, and those
      // are two different fixes.
      //
      // IT ALSO MUST NOT THROW. The census used to read stats.stacks
      // before it was ever initialised, so every call over 1 MiB raised
      // a TypeError INSIDE the engine's upload -- the engine's real
      // uploads never reached WebGL while the census ran, and the stack
      // it was supposed to capture was never captured.
      if (stats.stacks.length < 24 && !stats.stackBySize[key]) {
        let stack = '(no stack)';
        try {
          stack = new Error().stack || '(no stack)';
        } catch (e) {
          stack = '(no stack)';
        }
        stats.stackBySize[key] = stack;
        stats.stacks.push({ key, stack });
      }
      return origData.apply(this, arguments);
    };

    const origSub = proto.bufferSubData;
    if (origSub) {
      proto.bufferSubData = function () {
        const acc = bufferSubDataBytes(Array.prototype.slice.call(arguments));
        const bytes = acc.bytes;
        const target = arguments[0];
        stats.subCalls++;
        stats.subBytes += bytes;
        stats.frameCalls++;
        stats.frameBytes += bytes;
        if (stats.frames < SHAPE_FRAMES) {
          stats.shapes[stats.frames] = stats.shapes[stats.frames] || [];
          stats.shapes[stats.frames].push('sub:' + target + ':' + bytes + ':' + acc.shape);
        }
        const key = 'sub:' + target + ':' + bytes;
        stats.sizes[key] = (stats.sizes[key] || 0) + 1;
        if (stats.stacks.length < 24 && !stats.stackBySize[key]) {
          let stack = '(no stack)';
          try {
            stack = new Error().stack || '(no stack)';
          } catch (e) {
            stack = '(no stack)';
          }
          stats.stackBySize[key] = stack;
          stats.stacks.push({ key, stack });
        }
        return origSub.apply(this, arguments);
      };
    }

    const origCreate = proto.createBuffer;
    if (origCreate) {
      proto.createBuffer = function () {
        stats.createCalls++;
        return origCreate.apply(this, arguments);
      };
    }

    const origDelete = proto.deleteBuffer;
    if (origDelete) {
      proto.deleteBuffer = function () {
        stats.deleteCalls++;
        return origDelete.apply(this, arguments);
      };
    }
  };

  patch(window.WebGL2RenderingContext, 'webgl2');
  patch(window.WebGLRenderingContext, 'webgl1');

  // THE FRAME ROLL-OVER. The engine's frames are vsync-driven and so is
  // this, so the two counters line up -- and the pacer's own frame
  // count is the check on that.
  const tick = () => {
    stats.frames++;
    stats.frameCalls = 0;
    stats.frameBytes = 0;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
`;
module.exports = { INIT };
