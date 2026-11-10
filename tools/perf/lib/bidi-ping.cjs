'use strict';

/**
 * IS THE FIREFOX REMOTE AGENT ANSWERING?
 *
 * WHY THIS IS A SCRIPT AND NOT A `curl`
 * ------------------------------------
 * The agent's endpoint is a WEBSOCKET endpoint: answering it means
 * answering with `101 Switching Protocols` and then keeping the
 * connection open. A `curl` that gets the 101 sits there waiting for
 * frames until its own timeout kills it, and a script that treats a
 * timeout as "not ready" reports the browser as down forever.
 *
 * (And `--max-time` + `-w '%{http_code}'` can read the 101 out of a
 * timed-out curl, but a readiness check that depends on a curl
 * quirk is a readiness check that will be broken by the next curl.)
 *
 * So the check asks the thing the watcher will actually ask: open the
 * socket, speak BiDi, and confirm the agent says it is ready.
 *
 *   node bidi-ping.cjs ws://127.0.0.1:9224/session
 *
 * Exit code 0 = ready, 1 = not.
 */
const { BidiClient } = require('./bidi-client.cjs');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('usage: bidi-ping.cjs <ws-url>');
    process.exit(1);
  }
  try {
    const client = await BidiClient.connect(url, 5000);
    // THE PING ASKS "IS THE AGENT ALIVE?", NOT "IS IT FREE?".
    //
    // `session.status` answers the second question — it returns
    // `ready:false, "Session already started"` whenever a session is
    // active, INCLUDING the one this very run may have just created.
    // Treating that as "not ready" would make the ping report a
    // perfectly healthy agent as dead.
    //
    // So: any ANSWER means the agent is alive. What the watcher does
    // with the session is the watcher's business, and it reports the
    // stuck-session case far better than a boolean can.
    const status = await client.send('session.status').catch(() => null);
    // CLOSE GRACEFULLY. This probe never creates a session (it only
    // asks for the status), so it cannot leak one — but a socket that
    // dies with the process is exactly the thing that leaked a session
    // once already, and the habit is cheaper than the bug.
    await client.closeGracefully(2000);
    if (!status) {
      console.error('the remote agent did not answer session.status');
      process.exit(1);
    }
    if (status.ready === false) {
      console.error('the agent is alive but a session is already active: ' + (status.message || 'no reason given'));
    }
    process.exit(0);
  } catch (e) {
    console.error('the remote agent did not answer: ' + String(e && e.message ? e.message : e).split('\n')[0]);
    process.exit(1);
  }
})();
