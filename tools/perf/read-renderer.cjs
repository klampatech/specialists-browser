'use strict';
/*
 * READ THE WEBGL RENDERER, THE WAY THE CLIENT SEES IT.
 *
 * Firefox MASKS the WebGL renderer string ("Radeon R9 200 Series, or
 * similar") because the renderer query is a fingerprinting vector, so
 * the client's own Export log in Firefox names a GPU that is not there.
 * The perf profile turns the query back on with
 * `webgl.enable-renderer-query`, and this reads the string the probe
 * would report.
 */
const path = require('path');
const REPO = path.join(__dirname, '..', '..');
const { BidiClient } = require(path.join(REPO, 'tools', 'perf', 'lib', 'bidi-client.cjs'));
const { rendererInfoFn, toJsonExpression } = require(path.join(REPO, 'tools', 'perf', 'lib', 'watch-probe.cjs'));

(async () => {
  const c = await BidiClient.connect(process.argv[2] || 'ws://127.0.0.1:9224/session');
  await c.send('session.new', { capabilities: { alwaysMatch: {} } }).catch(() => {});
  const tree = await c.send('browsingContext.getTree', { maxDepth: 3 });
  const ctx = tree.contexts[0].context;
  const res = await c.send('script.evaluate', {
    expression: toJsonExpression(rendererInfoFn),
    target: { context: ctx },
    awaitPromise: true,
    resultOwnership: 'none',
  });
  const raw = res && res.result && typeof res.result.value === 'string' ? res.result.value : null;
  console.log(raw ? JSON.stringify(JSON.parse(raw), null, 2) : JSON.stringify(res).slice(0, 400));
  await c.send('session.end', {}).catch(() => {});
  await c.closeGracefully(2000);
})().catch((e) => {
  console.error('FAILED:', e && e.stack ? e.stack : e);
  process.exit(1);
});
