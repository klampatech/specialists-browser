'use strict';
/*
 * ASK FIREFOX WHICH PREFS ARE ACTUALLY IN FORCE.
 *
 * `about:config` runs in a PRIVILEGED context, so `Services.prefs` is
 * reachable there — which is the only way to find out what the browser
 * believes, rather than what a file says.
 */
const { BidiClient } = require('/home/kyle/Development/specialists-browser/tools/perf/lib/bidi-client.cjs');

const NAMES = [
  'webgl.enable-renderer-query',
  'privacy.fingerprintingProtection',
  'privacy.fingerprintingProtection.pbmode',
  'privacy.resistFingerprinting',
  'dom.max_script_run_time',
  'dom.max_script_run_time.require_critical_input',
  'permissions.default.microphone',
];

(async () => {
  const c = await BidiClient.connect(process.argv[2] || 'ws://127.0.0.1:19225/session');
  await c.send('session.new', { capabilities: { alwaysMatch: {} } }).catch(() => {});
  const tree = await c.send('browsingContext.getTree', { maxDepth: 3 });
  const ctx = tree.contexts[0].context;

  await c.send('browsingContext.navigate', { context: ctx, url: 'about:config', wait: 'complete' });
  await new Promise((r) => setTimeout(r, 2500));

  const expr = `JSON.stringify((() => {
    const out = {};
    for (const n of ${JSON.stringify(NAMES)}) {
      try {
        out[n] = String(Services.prefs.getPref(n)) + '  (' + Services.prefs.getPrefType(n) + ')';
      } catch (e) {
        out[n] = 'NO SUCH PREF';
      }
    }
    return out;
  })())`;

  const res = await c.send('script.evaluate', {
    expression: expr,
    target: { context: ctx },
    awaitPromise: true,
    resultOwnership: 'none',
  });
  const raw = res && res.result && typeof res.result.value === 'string' ? res.result.value : null;
  if (!raw) {
    console.log('no value:', JSON.stringify(res).slice(0, 300));
  } else {
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) console.log('  ' + k.padEnd(50), v);
  }
  await c.send('session.end', {}).catch(() => {});
  await c.closeGracefully(2000);
})().catch((e) => {
  console.error('FAILED:', e && e.stack ? e.stack : e);
  process.exit(1);
});
