/**
 * The admin console's phase 3, driven in a REAL browser.
 *
 * It starts the fake game server, the console's own service and a
 * real Chromium, then:
 *
 *   - loads the page and screenshots the LOGIN screen;
 *   - logs in with the real password, against the real service;
 *   - asserts the shell renders and the fleet appears;
 *   - opens the bans panel and asserts the read-only lists are there;
 *   - screenshots the console;
 *   - renders the MOCK and screenshots that too, because the mock is
 *     the design contract and the proof is that the console looks like
 *     it.
 *
 * PLAYWRIGHT
 * ----------
 * The repo has no npm dependency and this adds none: the browser
 * driver is resolved at RUN time, from `PLAYWRIGHT_MODULE`, then from
 * a bare `playwright` import, then from a sibling checkout. If none
 * of them is there, this says so and exits non-zero — it does not
 * quietly pass.
 *
 *   node tools/smokes/admin-ui-browser.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const SHOTS = join(ROOT, 'docs', 'screenshots');

const ENGINE_PORT = Number(process.env.ENGINE_PORT ?? 27088);
const ADMIN_PORT = Number(process.env.ADMIN_PORT ?? 8097);
const PASSWORD = process.env.PASSWORD ?? 'the-browser-smoke-password';

/**
 * THE VIEWPORT THE SCREENSHOTS ARE TAKEN AT.
 *
 * Both pages are rendered at the same size, and the size is tall
 * enough that the whole console fits in ONE viewport. That matters
 * because the mock's bars are `position: fixed`: on a full-page
 * screenshot a fixed bar is painted where it happens to sit, and on
 * a page that is taller than the window it lands in the middle of
 * the content. A window tall enough to hold the whole page puts the
 * bars back where they belong — the top bar at the top, the bottom
 * bar at the bottom — and makes the two screenshots comparable.
 */
const VIEWPORT = { width: 1440, height: 1900 };

/**
 * Find Playwright.
 *
 * @returns {Promise<object>}
 */
async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  candidates.push('playwright');
  // Sibling checkouts: the driver is a big install and the repo does
  // not depend on it, so it is looked for where it already is.
  try {
    const dev = join(homedir(), 'Development');
    for (const name of readdirSync(dev)) {
      candidates.push(join(dev, name, 'node_modules', 'playwright', 'index.mjs'));
    }
  } catch {
    // No Development directory: the candidates above are all there is.
  }

  for (const candidate of candidates) {
    try {
      const mod = await import(candidate);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch {
      // Try the next one.
    }
  }
  throw new Error(
    'Playwright was not found. Set PLAYWRIGHT_MODULE to the package ' +
      "(or install it somewhere and point at it), e.g. " +
      "PLAYWRIGHT_MODULE=$HOME/Development/peer/node_modules/playwright/index.mjs",
  );
}

/**
 * Run a command and wait for it.
 *
 * @param {string} file
 * @param {string[]} args
 * @param {object} [opts]
 * @param {string} [opts.input] written to stdin
 * @returns {Promise<string>} the output
 */
function run(file, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(file, args, { cwd: ROOT });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      out += d;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${file} ${args.join(' ')} exited ${code}:\n${out}`));
        return;
      }
      resolvePromise(out);
    });
    if (opts.input !== undefined) {
      child.stdin.write(opts.input);
      child.stdin.end();
    }
  });
}

/**
 * Wait for the page to settle: the fonts (if they ever arrive) and
 * the layout.
 *
 * The console's fonts come from Google, and a machine with no route
 * to it must not hang the smoke — so the wait is bounded, and the
 * fallback stack takes over.
 *
 * @param {object} page
 * @returns {Promise<void>}
 */
async function settle(page) {
  await Promise.race([
    page.evaluate(() => document.fonts?.ready ?? Promise.resolve()),
    new Promise((r) => setTimeout(r, 5000)),
  ]);
  await page.waitForTimeout(250);
}

/**
 * Wait for the console's service to answer.
 *
 * @param {number} port
 * @param {() => {died: number|null, log: string}} state
 * @returns {Promise<void>}
 */
async function waitForService(port, state) {
  for (let i = 0; i < 100; i += 1) {
    const { died, log } = state();
    if (died !== null) {
      throw new Error(
        `the admin service exited with ${died} instead of listening on ${port}:\n${log}`,
      );
    }
    try {
      const res = await fetch(`http://127.0.0.1:${port}/admin/session`);
      if (res.status === 401) return;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('the admin service never came up');
}

/**
 * Is something already listening on this port?
 *
 * A leftover service from an earlier run would answer the smoke's
 * requests, and the smoke would then be measuring somebody else's
 * console — with a constant map timer, and none of this phase's
 * behaviour in it. So the port is checked BEFORE anything starts.
 *
 * @param {number} port
 * @returns {Promise<boolean>}
 */
async function portInUse(port) {
  const { createConnection } = await import('node:net');
  return new Promise((resolvePromise) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const done = (inUse) => {
      socket.destroy();
      resolvePromise(inUse);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    setTimeout(() => done(false), 1000).unref?.();
  });
}

/**
 * The smoke.
 */
async function main() {
  const chromium = await loadPlaywright();
  mkdirSync(SHOTS, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), 'admin-ui-'));
  const children = [];

  // 1. The password, provisioned the way the host provisions it.
  const hash = await run('node', ['services/admin/adminctl.mjs', 'hash'], {
    input: `${PASSWORD}\n`,
  });
  await run(
    'node',
    ['services/admin/adminctl.mjs', 'set-password', '--path', join(work, 'auth.json')],
    { input: hash },
  );

  // 2. The fake game server, and the console's service.
  for (const [label, port] of [
    ['the fake game server', ENGINE_PORT],
    ['the admin service', ADMIN_PORT],
  ]) {
    if (await portInUse(port)) {
      throw new Error(
        `port ${port} is already in use — ${label} cannot start, and the ` +
          'smoke would be measuring a leftover process instead. Stop it first.',
      );
    }
  }
  children.push(
    spawn('node', ['tools/smokes/fake-engine.mjs', String(ENGINE_PORT)], {
      cwd: ROOT,
      stdio: 'ignore',
    }),
  );
  await new Promise((r) => setTimeout(r, 500));
  //    The service's output is CAPTURED, not ignored: if it cannot
  //    bind the port — because something else already has it — the
  //    smoke says so and stops. It must never go on to drive
  //    somebody else's service, which is what a silent bind failure
  //    looks like.
  let serviceLog = '';
  const service = spawn(
    'node',
    ['services/admin/service.mjs'],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ADMIN_HOST: '127.0.0.1',
        ADMIN_PORT: String(ADMIN_PORT),
        ADMIN_AUTH_FILE: join(work, 'auth.json'),
        ADMIN_AUDIT_PATH: join(work, 'actions.log'),
        TS_HOST: '127.0.0.1',
        TS_PORT_BASE: String(ENGINE_PORT),
        TS_INSTANCE_COUNT: '1',
        RCON_PASSWORD: 'smoke-rcon-password',
      },
    },
  );
  service.stdout.on('data', (d) => {
    serviceLog += d;
  });
  service.stderr.on('data', (d) => {
    serviceLog += d;
  });
  let serviceDied = null;
  service.on('exit', (code) => {
    serviceDied = code;
  });
  children.push(service);
  await waitForService(ADMIN_PORT, () => ({
    died: serviceDied,
    log: serviceLog,
  }));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  const badResponses = [];
  page.on('pageerror', (err) => errors.push(`uncaught: ${String(err)}`));
  page.on('response', (res) => {
    if (res.status() >= 400) badResponses.push({ url: res.url(), status: res.status() });
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // A 4xx that the page HANDLES is still logged by the browser as
    // "Failed to load resource". Those are not swallowed: they are
    // asserted below, from the response listener, so that the exact
    // set of them is checked and not just their count.
    if (text.startsWith('Failed to load resource')) return;
    errors.push(text);
  });

  // 3. The login screen.
  await page.goto(`http://127.0.0.1:${ADMIN_PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginForm');
  await settle(page);
  if (!(await page.isVisible('#login'))) throw new Error('the login screen did not render');
  await page.screenshot({ path: join(SHOTS, 'admin-console-login.png'), fullPage: true });
  console.log('  the login screen renders');

  // 4. The wrong password: the state line says so, and says how many
  //    attempts are left.
  await page.fill('#pw', 'not-the-password');
  await page.click('#loginBtn');
  await page.waitForFunction(
    () => (document.getElementById('loginState')?.textContent ?? '').includes('wrong password'),
    null,
    { timeout: 5000 },
  );
  console.log('  a wrong password is refused, with the attempts remaining');

  // 5. The real password.
  await page.fill('#pw', PASSWORD);
  await page.click('#loginBtn');
  await page.waitForSelector('#servers .srv', { timeout: 10000 });
  await page.waitForFunction(
    () => document.querySelectorAll('#plBody .prow').length > 0,
    null,
    { timeout: 10000 },
  );
  const fleet = await page.$$eval('#servers .srv', (nodes) =>
    nodes.map((n) => ({
      name: n.querySelector('b')?.textContent ?? '',
      sub: n.querySelector('.sub')?.textContent ?? '',
      chips: [...n.querySelectorAll('.chip')].map((c) => c.textContent.trim()),
      count: n.querySelector('.cnt')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    })),
  );
  console.log(
    '  the fleet:',
    fleet
      .map(
        (f) =>
          `${f.name} (${f.sub.replace(/\s+/g, ' ').trim()}) [${f.chips.join(' ')}] ${f.count}`,
      )
      .join(' | '),
  );

  // 5b. The shell's own lines: who is signed in, the map list, and the
  //     drawer's entries.
  const who = (await page.textContent('#whoami'))?.replace(/\s+/g, ' ').trim();
  if (!/signed in as admin/i.test(who ?? '')) {
    throw new Error(`the shell must say who is signed in: ${who}`);
  }
  // The map list is on the slow beat, but the first read is forced, so
  // it is there as soon as the shell has settled.
  await page.waitForSelector('#maps .map', { timeout: 10000 });
  const mapList = await page.$$eval('#maps .map', (nodes) =>
    nodes.map((n) => n.textContent.trim()),
  );
  if (!mapList.length) throw new Error('the map list is empty');
  if (mapList[0] !== 'ts_casa') {
    throw new Error(`the current map must be first in the map list: ${mapList.join(', ')}`);
  }
  const entries = await page.$$eval('#log .entry', (nodes) => nodes.length);
  if (!entries) throw new Error('the output drawer is empty');
  console.log(`  signed in as admin; ${mapList.length} maps (${mapList.join(', ')}); ${entries} drawer entries`);

  // 6. The write controls are disabled, and the ban list is not.
  const disabled = await page.evaluate(() => ({
    cmd: document.getElementById('cmd').disabled,
    apply: document.getElementById('apply').disabled,
    say: document.getElementById('say').disabled,
    sayBtn: document.getElementById('sayBtn').disabled,
    restart: document.getElementById('restart').disabled,
    banlist: document.getElementById('banlist').disabled,
  }));
  for (const [key, value] of Object.entries(disabled)) {
    if (key === 'banlist') {
      if (value) throw new Error('the ban list button must work — it is a view');
      continue;
    }
    if (!value) throw new Error(`${key} must be disabled in phase 3`);
  }
  console.log('  the write controls are disabled; the ban list is not');

  // 7. The bans panel opens, and it is read-only.
  await page.click('#banlist');
  await page.waitForSelector('#banPanel:not([hidden])');
  await page.waitForFunction(
    () => (document.getElementById('idBans')?.textContent ?? '').length > 0,
    null,
    { timeout: 5000 },
  );
  const banText = await page.textContent('#banPanel');
  if (!/id-ban list is the console/i.test(banText)) {
    throw new Error(`the bans panel must say why the id list is empty:\n${banText}`);
  }
  console.log('  the bans panel opens, and it says why the list is empty');

  // 7b. The drawer is a HISTORY, not a heartbeat log. The poll runs
  //     every five seconds; nothing about a poll that changes nothing
  //     may become an entry.
  const entriesBefore = await page.$$eval('#log .entry', (nodes) => nodes.length);
  const timerBefore = (await page.textContent('#mapTimer'))?.trim();
  await page.waitForTimeout(12_000);
  const entriesAfter = await page.$$eval('#log .entry', (nodes) => nodes.length);
  const timerAfter = (await page.textContent('#mapTimer'))?.trim();
  if (entriesAfter > entriesBefore + 2) {
    throw new Error(
      `the drawer grew with the poll: ${entriesBefore} -> ${entriesAfter} entries in twelve seconds`,
    );
  }
  // The positive control: the map timer really did move, so the test
  // above is not vacuous. The countdown is not a change, and the
  // drawer stayed quiet anyway.
  if (timerBefore === timerAfter) {
    throw new Error(
      `the map timer did not move in twelve seconds (${timerBefore}) — the smoke proves nothing`,
    );
  }
  console.log(
    `  twelve seconds of polling: the map timer moved (${timerBefore} -> ${timerAfter}) and the drawer added ${entriesAfter - entriesBefore} entries`,
  );

  // 8. The screenshot of the console.
  //    The page is scrolled back to the top first: the fixed bars are
  //    painted where they sit, and a screenshot taken half way down
  //    the page is not a picture of the console.
  await page.evaluate(() => window.scrollTo(0, 0));
  //    And the pointer is parked off in the corner, so the shot does
 //    not catch a button in its hover state.
  await page.mouse.move(2, 2);
  await settle(page);
  await page.screenshot({ path: join(SHOTS, 'admin-console-phase3.png'), fullPage: true });
  console.log(`  wrote ${join(SHOTS, 'admin-console-phase3.png')}`);

  // 9. The mock, rendered and screenshotted: the design contract.
  const mock = await browser.newPage({ viewport: VIEWPORT });
  await mock.goto(pathToFileURL(join(ROOT, 'docs', 'admin-console-mock.html')).href, {
    waitUntil: 'domcontentloaded',
  });
  await mock.waitForSelector('#servers .srv');
  await settle(mock);
  await mock.screenshot({ path: join(SHOTS, 'admin-console-mock.png'), fullPage: true });
  console.log(`  wrote ${join(SHOTS, 'admin-console-mock.png')}`);

  await browser.close();

  // The exact set of failing responses. Two, and both are ones the
  // smoke causes on purpose: the boot probe asking whether there is
  // a session (there is not, so it is a 401) and the wrong password
  // (also a 401). Anything else is a failure.
  const unexpected = badResponses.filter((r) => {
    const path = new URL(r.url).pathname;
    if (r.status !== 401) return true;
    return path !== '/admin/session' && path !== '/admin/login';
  });
  if (unexpected.length) {
    console.error('  the page made failing requests that were not expected:');
    for (const r of unexpected) console.error(`    ${r.status} ${r.url}`);
    throw new Error('the console made unexpected failing requests');
  }
  const sawSession401 = badResponses.some(
    (r) => r.status === 401 && new URL(r.url).pathname === '/admin/session',
  );
  const sawLogin401 = badResponses.some(
    (r) => r.status === 401 && new URL(r.url).pathname === '/admin/login',
  );
  if (!sawSession401 || !sawLogin401) {
    throw new Error(
      `the smoke expected the session probe and the wrong password to be refused; got ${JSON.stringify(badResponses)}`,
    );
  }
  console.log('  the only failing requests are the two the smoke causes on purpose');

  if (errors.length) {
    console.error('  the page reported errors:');
    for (const e of errors) console.error(`    ${e}`);
    throw new Error('the console reported errors in the browser');
  }

  for (const child of children) child.kill();
  console.log('\n  the admin console works in a browser.');
}

main().catch((err) => {
  console.error(`admin-ui-browser: ${err.message}`);
  process.exit(1);
});
