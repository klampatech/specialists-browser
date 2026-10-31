/**
 * The static files, and the gate that is still a gate.
 *
 * PHASE 3 SERVES THE UI FROM THE SAME SERVICE
 * --------------------------------------------
 * Three paths are not behind the session gate: the page, its
 * stylesheet and its script. The login screen needs all three, and
 * the page has to load before anybody can log in.
 *
 * AND THE API IS STILL GATED
 * --------------------------
 * That is the thing this test is really about. Serving files and
 * serving an API are different jobs, and the second one did not get
 * softer because the first one was added: a request to
 * `/admin/servers` with no session is still a 401, and so is a request
 * to either of the two new read endpoints. A static path and an API
 * path must never collide, and the only way to know they do not is to
 * ask for both.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAuthStore,
  createPasswordRecord,
} from '../../services/admin/lib/auth.mjs';
import { createAdminService } from '../../services/admin/service.mjs';

/** The password every test uses. */
const PASSWORD = 'the-admin-password';

/**
 * Start the service, with a fleet that answers.
 *
 * @param {(harness: object) => Promise<void>} fn
 * @returns {Promise<void>}
 */
async function startService(fn) {
  const service = createAdminService({
    port: 0,
    count: 1,
    makeAsk: () => async (command) => ({
      outcome: 'ok',
      text: `asked: ${command}`,
      lines: [`asked: ${command}`],
      packets: 1,
      empty: false,
      detail: '',
    }),
    auth: createAuthStore({ record: createPasswordRecord(PASSWORD) }),
  });
  await new Promise((resolve) => service.server.listen(0, '127.0.0.1', resolve));
  const port = service.server.address().port;
  const request = (path, init = {}) => fetch(`http://127.0.0.1:${port}${path}`, init);

  try {
    await fn({ port, request, service });
  } finally {
    await new Promise((resolve) => service.server.close(resolve));
  }
}

test('the page is served, and it is not cached', async () => {
  await startService(async ({ request }) => {
    const res = await request('/');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
    // A deploy has to show up: the HTML is never cached.
    assert.equal(res.headers.get('cache-control'), 'no-store');

    const body = await res.text();
    // The console's own page: it loads the stylesheet and the script,
    // and it has the mock's structure.
    assert.match(body, /<link rel="stylesheet" href="\/admin\.css">/);
    assert.match(body, /<script type="module" src="\/admin\.js">/);
    assert.match(body, /id="servers"/);
    assert.match(body, /id="log"/);
  });
});

test('the stylesheet and the script are served, with the right types', async () => {
  await startService(async ({ request }) => {
    const css = await request('/admin.css');
    assert.equal(css.status, 200);
    assert.equal(css.headers.get('content-type'), 'text/css; charset=utf-8');
    const cssText = await css.text();
    // The mock's palette, under the mock's own token names.
    assert.match(cssText, /--phosphor:#00FF41/);
    assert.match(cssText, /--void:#010A04/);

    const js = await request('/admin.js');
    assert.equal(js.status, 200);
    assert.equal(js.headers.get('content-type'), 'text/javascript; charset=utf-8');
    const jsText = await js.text();
    assert.match(jsText, /POLL_MS/);
  });
});

test('the static files are NOT behind the session gate', async () => {
  await startService(async ({ request }) => {
    // No cookie, no CSRF token, no login: the page still loads.
    for (const path of ['/', '/admin.css', '/admin.js']) {
      const res = await request(path);
      assert.equal(res.status, 200, `${path} must load before anybody logs in`);
    }
  });
});

test('the API is STILL behind the gate, now that files are served', async () => {
  await startService(async ({ request }) => {
    const paths = [
      '/admin/servers',
      '/admin/servers/ts-0/status',
      '/admin/servers/ts-0/players',
      '/admin/servers/ts-0/maps',
      '/admin/servers/ts-0/bans',
      '/admin/session',
    ];
    for (const path of paths) {
      const res = await request(path);
      assert.equal(res.status, 401, `${path} must still be refused`);
      const body = await res.json();
      assert.equal(body.error, 'unauthorized');
    }
  });
});

test('a static path and an API path never collide', async () => {
  await startService(async ({ request }) => {
    // The three static paths are files, and only files.
    for (const path of ['/', '/admin.css', '/admin.js']) {
      const res = await request(path);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /text\/(html|css|javascript)/);
    }
    // And nothing else under /admin is a file: an unknown path is a
    // 401 to an anonymous caller, never a 404 with a page on it.
    for (const path of ['/admin', '/admin/', '/admin/index.html', '/admin/style.css']) {
      const res = await request(path);
      assert.equal(res.status, 401, `${path} must not be a file`);
    }
  });
});

test('a static file is a GET', async () => {
  await startService(async ({ request }) => {
    const res = await request('/admin.css', { method: 'POST' });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'GET, HEAD');
  });
});
