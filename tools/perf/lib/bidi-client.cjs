'use strict';

/**
 * A MINIMAL WebDriver BiDi CLIENT.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * Firefox removed CDP support in version 129. What is left is the
 * REMOTE AGENT, which speaks **WebDriver BiDi** — a JSON-over-WebSocket
 * protocol — and that is the only way to attach to a Firefox that a
 * person is playing in.
 *
 * `watch-client.cjs` talks CDP to Chromium, and Playwright's
 * `connectOverCDP` does NOT speak to Firefox. So the Firefox watcher
 * needs a client of its own, and this is it: a few hundred lines of
 * WebSocket plumbing instead of a browser-automation dependency that
 * cannot do the job.
 *
 * THE PROTOCOL, IN ONE PARAGRAPH
 * ------------------------------
 * Open the WebSocket, send `{"id": N, "method": "...", "params": {...}}`,
 * get back `{"id": N, "type": "success", "result": {...}}` or
 * `{"id": N, "type": "error", "error": "javascript error", "message":
 * "..."}`. Events arrive with no `id` and are ignored here.
 *
 * THE FIVE COMMANDS THIS WATCHER USES
 * -----------------------------------
 *   session.status        — is the browser ready?
 *   session.new           — start a session (Firefox's agent creates one
 *                           on connect, so this can legitimately fail
 *                           with "session already exists" — that is NOT
 *                           a failure, and it is handled as such)
 *   browsingContext.getTree — the open tabs
 *   script.evaluate      — run the probe in a tab
 *   session.end          — close cleanly
 */

/** A BiDi command that came back as an error. */
class BidiError extends Error {
  constructor(message, type) {
    super(message);
    this.name = 'BidiError';
    this.type = type;
  }
}

class BidiClient {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Set();
    this.sessionId = null;
    this.closed = false;

    ws.addEventListener('message', (ev) => this._onMessage(ev));
    ws.addEventListener('close', () => {
      this.closed = true;
      // EVERY pending command has to fail. A watcher that waits forever
      // on a promise whose socket died reports nothing at all, which is
      // the worst possible outcome: a silent harness looks like a
      // harness with nothing to say.
      for (const { reject } of this.pending.values()) {
        reject(new BidiError('the BiDi connection closed', 'connection closed'));
      }
      this.pending.clear();
    });
  }

  /**
   * OPEN THE WEBSOCKET.
   *
   * Node 22 has a global `WebSocket` (undici), so this needs no
   * dependency at all — which matters, because a harness that has to be
   * installed on somebody else's gaming PC is a harness that will not
   * be.
   */
  static connect(url, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        reject(new Error(`could not open a WebSocket to ${url}: ${String(e).slice(0, 160)}`));
        return;
      }
      const timer = setTimeout(() => {
        try {
          ws.close();
        } catch (e) {
          /* the socket never opened; nothing to close */
        }
        reject(new Error(`timed out connecting to the BiDi endpoint at ${url}`));
      }, timeoutMs);
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve(new BidiClient(ws));
      });
      ws.addEventListener('error', () => {
        clearTimeout(timer);
        reject(
          new Error(
            `could not open the BiDi WebSocket at ${url}. The browser must be started with ` +
              '--remote-debugging-port, and the port must be reachable.',
          ),
        );
      });
    });
  }

  _onMessage(ev) {
    let msg;
    try {
      msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
    } catch (e) {
      return;
    }
    if (msg.id !== undefined && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.type === 'error') {
        reject(new BidiError(msg.message || msg.error || 'the BiDi command failed', msg.error));
      } else {
        resolve(msg.result);
      }
      return;
    }
    for (const h of this.handlers) {
      try {
        h(msg);
      } catch (e) {
        /* an event handler must never take the client down */
      }
    }
  }

  /** SEND A COMMAND AND WAIT FOR ITS ANSWER. */
  send(method, params = {}, timeoutMs = 30000) {
    if (this.closed) {
      return Promise.reject(new BidiError('the BiDi connection is closed', 'connection closed'));
    }
    const id = ++this.nextId;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new BidiError(`the BiDi command "${method}" timed out`, 'timeout'));
        }
      }, timeoutMs);
      if (timer.unref) timer.unref();
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      try {
        this.ws.send(payload);
      } catch (e) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new BidiError('could not send to the BiDi socket: ' + String(e).slice(0, 160), 'send failed'));
      }
    });
  }

  /** SUBSCRIBE TO EVENTS. Returns an unsubscribe function. */
  on(fn) {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }

  /**
   * CLOSE THE SOCKET, AND WAIT FOR IT TO ACTUALLY CLOSE.
   *
   * WHY THE WAIT IS NOT OPTIONAL
   * ---------------------------
   * Firefox's remote agent allows ONE active BiDi session at a time,
   * and it releases a session when its WebSocket closes. So a harness
   * that calls `close()` and then `process.exit()` — which is what
   * `close()` alone amounts to, because the process dies before the
   * close frame is flushed — leaves the agent holding a session whose
   * socket is gone.
   *
   * **AND THAT LEAK IS PERMANENT.** The stuck session cannot be ended
   * from a new connection (`session.end` answers "invalid session id",
   * because the new connection has no session of its own) and
   * `session.new` answers "Maximum number of active sessions". The
   * agent stays that way until the BROWSER IS RESTARTED.
   *
   * That was measured, not guessed: a session leaked by one run made
   * every later run fail with an error that names the cause but not the
   * cure. So this waits for the close event, and the watcher ends its
   * session with `session.end` BEFORE calling this.
   */
  closeGracefully(timeoutMs = 3000) {
    return new Promise((resolve) => {
      if (this.closed) {
        resolve();
        return;
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      this.ws.addEventListener('close', finish);
      try {
        this.ws.close();
      } catch (e) {
        finish();
        return;
      }
      setTimeout(finish, timeoutMs);
    });
  }

  close() {
    this.closed = true;
    try {
      this.ws.close();
    } catch (e) {
      /* already gone */
    }
  }
}

module.exports = { BidiClient, BidiError };
