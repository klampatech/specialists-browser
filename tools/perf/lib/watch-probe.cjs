'use strict';

/**
 * THE PROBE — ONE DEFINITION, TWO WATCHERS.
 *
 * WHAT THIS IS
 * ------------
 * The three functions that live in the page: the one that installs the
 * probe, the one that reads a sample out of it, and the one that asks a
 * throwaway canvas which GPU it is talking to.
 *
 * WHY THEY ARE HERE AND NOT IN `watch-client.cjs`
 * -----------------------------------------------
 * Because there are now TWO watchers — `watch-client.cjs` (Chromium, over
 * CDP) and `watch-client-bidi.cjs` (Firefox, over WebDriver BiDi) — and
 * they have to answer the same question about two different browsers.
 *
 * A p99 from one and a p99 from the other are only comparable if they are
 * the same statistic, computed by the same code, from the same
 * instrument. **A COPY of these functions in two files is a copy that will
 * drift**, and a drifting instrument is worse than no instrument at all:
 * it produces two numbers that look like the same thing and are not.
 *
 * So the probe is defined ONCE, here, and both watchers import it. The
 * bodies below were moved VERBATIM out of `watch-client.cjs` — not
 * retyped — so the Chromium watcher's numbers do not change when this
 * refactor landed.
 *
 * THE FUNCTIONS ARE SELF-CONTAINED ON PURPOSE
 * -------------------------------------------
 * `installProbeFn`, `readSampleFn` and `rendererInfoFn` reference nothing
 * outside themselves — no module scope, no closures. That is what lets
 * the BiDi watcher serialise them with `Function.prototype.toString()` and
 * evaluate the source text inside Firefox. A function that reached for
 * something in this file would work over CDP and break over BiDi, and the
 * break would be silent.
 */

/**
 * THE PROBE, INSTALLED ONCE IN THE PAGE.
 *
 * Everything is a RING: the page is left running for however long the
 * human keeps playing, and an unbounded array would grow until the tab
 * died. The cap is the `--frames` value.
 *
 * The engine's own frame cost is NOT read from the pacer here — it is
 * measured, as the duration of the rAF callback. The pacer's number is
 * printed alongside for comparison, because the two are instruments and
 * the reader is entitled to see both.
 */
const installProbeFn = (cap) => {
    // A RING OF NUMBERS, WITH AN ABSOLUTE ID ON EACH, so the harness
    // can ask for "what is new since I last looked" without the
    // harness and the page having to agree on an index.
    const makeRing = (n) => ({ cap: n, items: [], dropped: 0 });
    const push = (ring, item) => {
      ring.items.push(item);
      while (ring.items.length > ring.cap) {
        ring.items.shift();
        ring.dropped++;
      }
      return item;
    };

    const probe = {
      cap,
      startedAt: performance.now(),
      frames: 0,
      requests: 0,
      intervals: makeRing(cap),
      durations: makeRing(cap),
      lags: makeRing(cap),
      inputs: makeRing(cap),
      longtasks: [],
      longtaskSupported: false,
      longtaskError: '',
      lastStart: null,
      lastSampledIntervalId: 0,
      lastSampledLagId: 0,
      lastSampledDurationId: 0,
      lastSampledInputId: 0,
      nextId: 0,
    };
    window.__watchProbe = probe;

    // THE rAF WRAPPER.
    //
    // The callback is wrapped, not just the request, because the
    // CALLBACK is where the frame happens: its start is the frame's
    // start and its duration is the frame's cost. The engine asks for
    // its next frame from inside the frame it drew, so the request
    // count is the frame count — but the SPACING between callback
    // starts is the frame interval, which is the thing being measured.
    const native = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function (cb) {
      probe.requests++;
      return native(function (t) {
        const s = performance.now();
        const id = ++probe.nextId;
        if (probe.lastStart !== null) {
          push(probe.intervals, { id, gap: s - probe.lastStart, at: s });
        }
        probe.lastStart = s;
        probe.frames++;
        try {
          cb(t);
        } finally {
          // A THROWING callback must still record its duration, and
          // must not take the probe down with it.
          push(probe.durations, { id, d: performance.now() - s, at: s });
        }
      });
    };

    // THE EVENT-LOOP LAG SAMPLER.
    //
    // setTimeout(0) is asked for and the lateness is recorded: how
    // much later than it was asked for did it actually fire. This is
    // the number that says "the main thread was busy", and it is the
    // one the 2026-10-28 work found to be 235 ms on SwiftShader.
    const tick = () => {
      const asked = performance.now();
      setTimeout(() => {
        const now = performance.now();
        push(probe.lags, { id: ++probe.nextId, lag: now - asked, at: now });
        tick();
      }, 0);
    };
    tick();

    // THE LONG-TASK OBSERVER.
    //
    // 'longtask' is NOT supported everywhere (Firefox has no
    // PerformanceObserver longtask entries at all), and the failure
    // mode of observe() with an unknown type is to THROW. So it is
    // guarded, and the harness REPORTS that long tasks are
    // unsupported rather than pretending there were none.
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          probe.longtasks.push({ start: entry.startTime, duration: entry.duration });
          while (probe.longtasks.length > 1000) probe.longtasks.shift();
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
      probe.longtaskSupported = true;
      probe.longtaskObserver = observer;
    } catch (e) {
      probe.longtaskSupported = false;
      probe.longtaskError = String((e && e.message) || e);
    }

    // THE INPUT LATENCY RECORDER.
    //
    // The event's OWN timestamp against performance.now() at handler
    // time: the difference is how long the input waited in the
    // queue. Both are on the same clock — event.timeStamp is on the
    // performance timeline in every engine that matters — so the
    // difference is a real queueing delay and not a clock skew.
    const onInput = (e) => {
      const now = performance.now();
      const ts = Number(e.timeStamp);
      if (!Number.isFinite(ts) || ts <= 0 || ts > now) return;
      push(probe.inputs, { id: ++probe.nextId, lat: now - ts, at: now });
    };
    window.addEventListener('pointermove', onInput, { passive: true });
    window.addEventListener('mousedown', onInput, { passive: true });
    window.addEventListener('keydown', onInput, { passive: true });

    return { installed: true, cap, at: performance.now() };};

/**
 * ONE SAMPLE, READ OUT OF THE PAGE.
 *
 * A MISSING PROBE IS AN EMPTY MEASUREMENT, NOT A CRASH: the page can
 * navigate out from under the probe at any moment (the client's
 * reconnect path reloads the page), and that destroys the execution
 * context. The harness has to survive it and say so.
 *
 * The try/catch is INSIDE this function, so the BiDi watcher gets the
 * same "no measurement, and here is why" answer that the CDP watcher's
 * `.catch()` produced.
 */
const readSampleFn = () => {
  try {
      const p = window.__watchProbe;
      if (!p) return { ok: false, reason: 'no probe (the page navigated, or the probe was never installed)' };

      const takeNew = (ring, sinceId) => {
        const out = [];
        for (const item of ring.items) if (item.id > sinceId) out.push(item);
        return out;
      };

      const intervals = takeNew(p.intervals, p.lastSampledIntervalId);
      const durations = takeNew(p.durations, p.lastSampledDurationId);
      const lags = takeNew(p.lags, p.lastSampledLagId);
      const inputs = takeNew(p.inputs, p.lastSampledInputId);
      if (intervals.length) p.lastSampledIntervalId = intervals[intervals.length - 1].id;
      if (durations.length) p.lastSampledDurationId = durations[durations.length - 1].id;
      if (lags.length) p.lastSampledLagId = lags[lags.length - 1].id;
      if (inputs.length) p.lastSampledInputId = inputs[inputs.length - 1].id;

      // THE PACER'S OWN STATE, IF THE PAGE HAS IT.
      let pacing = null;
      try {
        if (typeof window.__xashPacing === 'function') {
          const raw = window.__xashPacing() || {};
          pacing = {
            engineWorkMs: Number(raw.engineWorkMs || 0),
            engineFps: Number(raw.engineFps || 0),
            browserHz: Number(raw.browserHz || raw.displayHz || 0),
            panelHz: Number(raw.panelHz || 0),
            everyNth: Number(raw.everyNth || 1),
            capFps: Number(raw.capFps || 0),
            lateFraction: Number(raw.lateFraction || 0),
            settled: raw.settled === true,
            provisional: raw.provisional === true,
            reason: String(raw.reason || ''),
          };
        }
      } catch (e) {
        pacing = null;
      }

      // THE CANVAS. Its SIZE is read off the element; its CONTEXT is
      // never touched — see the trap in the header.
      const canvas = document.getElementById('canvas');
      const rect = canvas ? canvas.getBoundingClientRect() : null;

      return {
        ok: true,
        now: performance.now(),
        frames: p.frames,
        requests: p.requests,
        intervals,
        durations,
        lags,
        inputs,
        longtasks: p.longtasks.slice(),
        longtaskSupported: p.longtaskSupported,
        longtaskError: p.longtaskError,
        // HOW MANY INTERVAL RECORDS THE RING OVERWROTE BEFORE THE
        // HARNESS READ THEM. Non-zero means the percentiles are over
        // a sample that is missing its oldest records.
        droppedIntervals: p.intervals.dropped,
        pacing,
        canvas: {
          backingW: canvas ? canvas.width : 0,
          backingH: canvas ? canvas.height : 0,
          cssW: rect ? Math.round(rect.width) : 0,
          cssH: rect ? Math.round(rect.height) : 0,
          dpr: window.devicePixelRatio,
          innerW: window.innerWidth,
          innerH: window.innerHeight,
          // WHETHER THE PAGE IS FULLSCREEN — AND WHICH QUESTION THAT
          // IS.
          //
          // `document.fullscreenElement` is only set when the PAGE asked
          // for fullscreen through the DOM API. It is NULL for the
          // browser's own fullscreen (F11, or `--start-fullscreen`),
          // which is how almost every player plays. A harness that
          // reports that as "not fullscreen" labels a fullscreen run as
          // windowed, and the A/B compares two identical states and
          // reports "no difference" — worse than no answer.
          //
          // So both questions are asked and both are kept:
          //   `fullscreen`      — the DOM's answer, as before
          //   `fillsTheScreen`  — the canvas's size against the screen's
          //
          // And the `fs` column prints Y when EITHER says yes.
          fullscreen: !!document.fullscreenElement,
          fillsTheScreen: (() => {
            try {
              if (!rect || !window.screen) return false;
              const sw = window.screen.width;
              const sh = window.screen.height;
              if (!sw || !sh) return false;
              return rect.width >= sw * 0.95 && rect.height >= sh * 0.95;
            } catch (e) {
              return false;
            }
          })(),
          // WHETHER THE PAGE IS VISIBLE AT ALL.
          //
          // A HIDDEN TAB REPORTS NO LONG TASKS, EVER — the browser
          // does not run the long-task machinery for a page nobody is
          // looking at. So a run against a background tab would report
          // "0 long tasks" as a fact about the harness rather than
          // about the machine, and the reader has to be told which it
          // is.
          visible: document.visibilityState === 'visible',
        },
      };
  } catch (e) {
    return { ok: false, reason: 'the page went away: ' + String(e).slice(0, 160) };
  }
};

/**
 * THE GPU THE CLIENT IS ACTUALLY RUNNING ON.
 *
 * ON A THROWAWAY CANVAS. Never on the game's own canvas: calling
 * getContext() there can create a context where there is none, and
 * steal one where there is.
 */
const rendererInfoFn = () => {
  try {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) return { name: 'no webgl context', vendor: 'unknown' };
        const d = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          name: d ? String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)) : 'unknown',
          vendor: d ? String(gl.getParameter(d.UNMASKED_VENDOR_WEBGL)) : 'unknown',
        };
      } catch (e) {
        return { name: 'renderer unavailable: ' + String(e).slice(0, 120), vendor: 'unknown' };
      }
  } catch (e) {
    return { name: 'renderer unavailable: ' + String(e).slice(0, 120), vendor: 'unknown' };
  }
};

/**
 * THE SAME PROBE, AS A STRING OF JAVASCRIPT.
 *
 * WebDriver BiDi's `script.evaluate` takes an EXPRESSION and has no way
 * to pass arguments to it — there is no equivalent of Playwright's
 * `evaluate(fn, arg)`. So the function is serialised with
 * `toString()`, the arguments are JSON-encoded into the call, and the
 * WHOLE THING IS WRAPPED IN `JSON.stringify`.
 *
 * **WHY THE RESULT IS A STRING AND NOT AN OBJECT.** A BiDi RemoteValue
 * for an object is a serialised value with its own depth and size rules,
 * and the nested shape of a sample (rings of objects inside an object)
 * would have to be unwrapped by hand. A string primitive is
 * unambiguous: one `{type: "string", value: "..."}`, and the harness
 * parses it with `JSON.parse`. Same data, no ambiguity.
 */
function toJsonExpression(fn, ...args) {
  const encoded = args.map((a) => JSON.stringify(a)).join(',');
  return `JSON.stringify((${fn.toString()})(${encoded}))`;
}

module.exports = { installProbeFn, readSampleFn, rendererInfoFn, toJsonExpression };
