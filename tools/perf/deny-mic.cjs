'use strict';
/*
 * DENY THE MICROPHONE, AT RUNTIME.
 *
 * `permissions.default.microphone` only applies to an origin with no
 * stored decision, and bulletballet.dev has one (from the first prompt),
 * so the prompt kept coming back.
 *
 * `browser.setPermission` sets the decision for the session, and it
 * resolves the prompt that is already open — which a pref cannot do.
 */
const path = require('path');
const REPO = path.join(__dirname, '..', '..');
const { BidiClient } = require(path.join(REPO, 'tools', 'perf', 'lib', 'bidi-client.cjs'));

(async () => {
  const c = await BidiClient.connect(process.argv[2] || 'ws://127.0.0.1:9224/session');
  await c.send('session.new', { capabilities: { alwaysMatch: {} } }).catch(() => {});
  const tree = await c.send('browsingContext.getTree', { maxDepth: 3 });
  const ctx = tree.contexts[0].context;
  console.log('tab:', tree.contexts[0].url);

  const res = await c.send('browser.setPermission', {
    context: ctx,
    permission: { name: 'microphone' },
    state: 'denied',
  });
  console.log('setPermission:', JSON.stringify(res).slice(0, 300));

  await c.send('session.end', {}).catch(() => {});
  await c.closeGracefully(2000);
})().catch((e) => {
  console.error('FAILED:', e && e.stack ? e.stack : e);
  process.exit(1);
});
