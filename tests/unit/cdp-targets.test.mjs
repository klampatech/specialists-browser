/**
 * The CDP target helpers: the browser has to have a page before
 * Playwright will connect to it.
 *
 * WHY THIS EXISTS
 * ---------------
 * `chromium.connectOverCDP()` fails with:
 *
 *     Protocol error (Browser.setDownloadBehavior):
 *     Browser context management is not supported.
 *
 * when the browser has **no pages open at all** — which is exactly
 * what happens after a harness cleans up, or when a person closes the
 * last tab. The message is about a protocol and never mentions pages,
 * so the obvious reading ("the browser is broken") is wrong; the
 * actual cause is that there is nothing to attach to.
 *
 * It cost real time on 2026-11-07. These tests pin the behaviour: the
 * blank tab is opened when it is needed, and NOT opened when it is
 * not.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const cdp = require(join(ROOT, 'tools', 'perf', 'lib', 'cdp-targets.cjs'));

const { ensureAtLeastOnePage, listTargets } = cdp;

const CDP_URL = 'http://localhost:9223';

/** Stub the global fetch, recording what was asked for. */
function stubFetch(responses) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET' });
    for (const r of responses) {
      if (r.match(String(url), opts)) {
        return {
          ok: r.ok !== false,
          status: r.status ?? 200,
          json: async () => r.body,
        };
      }
    }
    return { ok: false, status: 404, json: async () => null };
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

test('the existing pages are listed', async () => {
  const stub = stubFetch([
    {
      match: (u) => u.endsWith('/json/list'),
      body: [
        { id: '1', type: 'page', url: 'about:blank' },
        { id: '2', type: 'page', url: 'https://ci.bulletballet.dev/' },
      ],
    },
  ]);
  try {
    const targets = await listTargets(CDP_URL);
    assert.equal(targets.length, 2);
    assert.equal(targets[1].url, 'https://ci.bulletballet.dev/');
  } finally {
    stub.restore();
  }
});

test('a browser with pages is left alone', async () => {
  const stub = stubFetch([
    {
      match: (u) => u.endsWith('/json/list'),
      body: [{ id: '1', type: 'page', url: 'about:blank' }],
    },
  ]);
  try {
    const result = await ensureAtLeastOnePage(CDP_URL);
    assert.equal(result.pages, 1);
    assert.equal(result.opened, false);
    // Nothing was opened, because nothing needed opening.
    assert.equal(stub.calls.filter((c) => c.url.includes('/json/new')).length, 0);
  } finally {
    stub.restore();
  }
});

test('a browser with NO pages gets a blank one', async () => {
  const stub = stubFetch([
    { match: (u) => u.endsWith('/json/list'), body: [] },
    {
      match: (u) => u.includes('/json/new'),
      body: { id: 'new', type: 'page', url: 'about:blank' },
    },
  ]);
  try {
    const result = await ensureAtLeastOnePage(CDP_URL);
    assert.equal(result.opened, true);
    assert.equal(result.pages, 1);
    const opened = stub.calls.filter((c) => c.url.includes('/json/new'));
    assert.equal(opened.length, 1);
    // Chrome wants PUT; GET is the fallback for older builds.
    assert.equal(opened[0].method, 'PUT');
  } finally {
    stub.restore();
  }
});

test('GET is used when the browser answers PUT with an error', async () => {
  const stub = stubFetch([
    { match: (u) => u.endsWith('/json/list'), body: [] },
    {
      match: (u, opts) => u.includes('/json/new') && opts.method === 'PUT',
      ok: false,
      status: 405,
      body: {},
    },
    {
      match: (u, opts) => u.includes('/json/new') && opts.method === 'GET',
      body: { id: 'new', type: 'page', url: 'about:blank' },
    },
  ]);
  try {
    const result = await ensureAtLeastOnePage(CDP_URL);
    assert.equal(result.opened, true);
    const opened = stub.calls.filter((c) => c.url.includes('/json/new'));
    assert.deepEqual(
      opened.map((c) => c.method),
      ['PUT', 'GET']
    );
  } finally {
    stub.restore();
  }
});

test('a browser that cannot be reached says so plainly', async () => {
  const stub = stubFetch([
    { match: (u) => u.endsWith('/json/list'), ok: false, status: 404, body: {} },
  ]);
  try {
    await assert.rejects(
      () => listTargets(CDP_URL),
      (err) => {
        assert.match(err.message, /could not reach the browser's CDP endpoint/);
        assert.match(err.message, /remote-debugging-port/);
        return true;
      }
    );
  } finally {
    stub.restore();
  }
});
