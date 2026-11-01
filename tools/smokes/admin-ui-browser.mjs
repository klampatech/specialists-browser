/**
 * The admin console's phase 4, driven in a REAL browser.
 *
 * It starts the fake game servers, the console's own service and a
 * real Chromium, then:
 *
 *   - loads the page and screenshots the LOGIN screen;
 *   - logs in with the real password, against the real service;
 *   - asserts the shell renders and the fleet appears;
 *   - asserts the WRITE CONTROLS ARE LIVE and the command box is not;
 *   - does THE FIVE ACTIONS through the UI, and checks the drawer's
 *     entries in §6.3's format;
 *   - shows THE TWO TRAPS: a kick whose target left between the list
 *     and the click, and a round restart that prints NOTHING and is
 *     still a SUCCESS;
 *   - opens the bans panel and asserts the read-only lists are there;
 *   - screenshots the console;
 *   - renders the MOCK and screenshots that too, because the mock is
 *     the design contract and the proof is that the console looks like
 *     it.
 *
 * TWO INSTANCES, ON PURPOSE
 * -------------------------
 * A map change disconnects EVERYONE on the instance, so an instance
 * that has been kicked on has nobody left to drop. Two fake engines
 * give each part of the proof its own instance: ts-0 for the kick,
 * the broadcast, the restart and the time limit, and ts-1 for the map
 * change — with its player still on it, so the modal's count is real.
 *
 * THE TRAP IS DETERMINISTIC
 * -------------------------
 * A player who leaves on their own is made by the fake engine's
 * `__smoke_drop` hook, and the console's poll is PAUSED for the
 * moment (the console does not poll a hidden tab). So the row is on
 * screen, the player is gone from the server, and the click lands on
 * a target that is not there — every time, with no race.
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
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import dgram from 'node:dgram';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const SHOTS = join(ROOT, 'docs', 'screenshots');

const ENGINE_PORT = Number(process.env.ENGINE_PORT ?? 27088);
const ENGINE_PORT_2 = Number(process.env.ENGINE_PORT_2 ?? 27089);
const ADMIN_PORT = Number(process.env.ADMIN_PORT ?? 8097);
const PASSWORD = process.env.PASSWORD ?? 'the-browser-smoke-password';
const RCON_PASSWORD = 'smoke-rcon-password';

/**
 * THE VIEWPORT THE SCREENSHOTS ARE TAKEN AT.
 *
 * Both pages are rendered at the same size, and the size is tall
 * enough that the whole console fits in ONE viewport. That matters
 * because the mock's bars are `position: fixed`: on a full-page
 * screenshot a fixed bar is painted where it happens to sit, and on
 * a page that is taller than the window it lands in the middle of the
 * content. A window tall enough to hold the whole page puts the
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
      'PLAYWRIGHT_MODULE=$HOME/Development/peer/node_modules/playwright/index.mjs',
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
 * Ask the fake engine something, directly, over RCON.
 *
 * The fake engine is a real UDP socket, so the smoke can talk to it
 * the same way the console does. It is used for exactly one thing:
 * the fixture hook that makes a player leave on their own.
 *
 * @param {number} port
 * @param {string} command
 * @returns {Promise<string>} the engine's reply
 */
function rcon(port, command) {
  return new Promise((resolvePromise, reject) => {
    const socket = dgram.createSocket('udp4');
    const request = Buffer.from(
      `\xff\xff\xff\xffrcon ${RCON_PASSWORD} ${command}\n`,
      'binary',
    );
    let out = '';
    const timer = setTimeout(() => {
      socket.close();
      resolvePromise(out);
    }, 800);
    socket.on('message', (buf) => {
      let text = buf.toString('binary');
      if (text.startsWith('\xff\xff\xff\xff')) text = text.slice(4);
      if (text.startsWith('print\n')) text = text.slice(6);
      out += text;
    });
    socket.on('error', (err) => {
      clearTimeout(timer);
      socket.close();
      reject(err);
    });
    socket.send(request, port, '127.0.0.1', () => {
      /* sent */
    });
  });
}

/**
 * Wait for the page to settle: the fonts (if they ever arrive) and the
 * layout.
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
 * Wait for a drawer entry that says something.
 *
 * The drawer is where every action lands (§6.3), so this is how the
 * smoke knows an action has finished: its entry is in the log.
 *
 * @param {object} page
 * @param {string} needle a piece of the entry's text
 * @param {number} [timeout]
 * @returns {Promise<string>} the entry's text
 */
async function waitForEntry(page, needle, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last = '';
  while (Date.now() < deadline) {
    const entries = (await drawerEntries(page)).map((e) => e.replace(/\n/g, ' '));
    last = entries[entries.length - 1] ?? '';
    const hit = entries.find((e) => e.includes(needle));
    if (hit) return hit;
    await page.waitForTimeout(150);
  }
  throw new Error(`the drawer's entry "${needle}" never appeared. Last entry: ${last}`);
}

/**
 * Print a drawer entry the way the console renders it.
 *
 * @param {string} label what the smoke is looking at
 * @param {string} entry the entry, in the drawer's four parts
 */
function showEntry(label, entry) {
  const [head, ...rest] = entry.split('\n');
  console.log(`  ${label}:`);
  console.log(`    ${head}`);
  for (const line of rest) console.log(`      ${line}`);
}

/**
 * The drawer's entries, in the console's own order.
 *
 * An entry is FOUR PARTS (§6.3): the timestamp with the command, the
 * command echoed, the outcome and the confirmation. They are read
 * out of the entry's own lines, so what the smoke prints is the
 * format the console renders — and not one long string with the
 * spaces squeezed out of it.
 *
 * @param {object} page
 * @returns {Promise<string[]>}
 */
async function drawerEntries(page) {
  return page.$$eval('#log .entry', (nodes) =>
    nodes.map((n) =>
      [...n.children]
        .map((c) => c.textContent.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n'),
    ),
  );
}

/**
 * The smoke.
 */
const children = [];

/**
 * Stop everything the smoke started.
 *
 * A smoke that fails half way through MUST NOT LEAVE ITS SERVERS
 * RUNNING: the next run would find the ports taken, and a leftover
 * service on the port is a console that answers with somebody else's
 * state — which is exactly what the port check at the top of this
 * file exists to catch. So the cleanup happens on the way out of a
 * failure as well as on the way out of a success.
 */
function stopChildren() {
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // It is already gone.
    }
  }
  children.length = 0;
}

async function main() {
  const chromium = await loadPlaywright();
  mkdirSync(SHOTS, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), 'admin-ui-'));

  // 1. The password, provisioned the way the host provisions it.
  const hash = await run('node', ['services/admin/adminctl.mjs', 'hash'], {
    input: `${PASSWORD}\n`,
  });
  await run(
    'node',
    ['services/admin/adminctl.mjs', 'set-password', '--path', join(work, 'auth.json')],
    { input: hash },
  );

  // 2. The fake game servers, and the console's service.
  for (const [label, port] of [
    ['the fake game server', ENGINE_PORT],
    ['the second fake game server', ENGINE_PORT_2],
    ['the admin service', ADMIN_PORT],
  ]) {
    if (await portInUse(port)) {
      throw new Error(
        `port ${port} is already in use — ${label} cannot start, and the ` +
          'smoke would be measuring a leftover process instead. Stop it first.',
      );
    }
  }
  for (const port of [ENGINE_PORT, ENGINE_PORT_2]) {
    children.push(
      spawn('node', ['tools/smokes/fake-engine.mjs', String(port)], {
        cwd: ROOT,
        stdio: 'ignore',
      }),
    );
  }
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
        TS_INSTANCE_COUNT: '2',
        RCON_PASSWORD: RCON_PASSWORD,
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
  //    The map list is a BUTTON per map. The placeholder the console
  //    shows while the list is still on its way is a `div`, so the
  //    wait is for the buttons: a smoke that accepted the
  //    placeholder would call an empty map list a fleet of maps.
  await page.waitForSelector('#maps button.map', { timeout: 10000 });
  const mapList = await page.$$eval('#maps button.map', (nodes) =>
    nodes.map((n) => n.textContent.trim()),
  );
  if (!mapList.length) throw new Error('the map list is empty');
  if (mapList[0] !== 'ts_casa') {
    throw new Error(`the current map must be first in the map list: ${mapList.join(', ')}`);
  }
  const entries = await page.$$eval('#log .entry', (nodes) => nodes.length);
  if (!entries) throw new Error('the output drawer is empty');
  console.log(`  signed in as admin; ${mapList.length} maps (${mapList.join(', ')}); ${entries} drawer entries`);

  // 6. THE WRITE CONTROLS ARE LIVE — and the command box is NOT.
  const controls = await page.evaluate(() => ({
    cmd: document.getElementById('cmd').disabled,
    apply: document.getElementById('apply').disabled,
    say: document.getElementById('say').disabled,
    sayBtn: document.getElementById('sayBtn').disabled,
    restart: document.getElementById('restart').disabled,
    tlBtn: document.getElementById('tlBtn').disabled,
    banlist: document.getElementById('banlist').disabled,
  }));
  if (!controls.cmd) throw new Error('the command box must stay disabled — it is not in this phase');
  for (const key of ['say', 'sayBtn', 'restart', 'tlBtn']) {
    if (controls[key]) throw new Error(`${key} must be live in phase 4`);
  }
  if (controls.banlist) throw new Error('the ban list button must work — it is a view');
  if (!controls.apply) {
    throw new Error('the map button must be disabled until a map is picked');
  }
  console.log('  the write controls are live; the command box and the un-picked map button are not');

  // 6b. The broadcast's quoting note is on the field, before the
  //     message is sent.
  const hint = (await page.textContent('#sayHint'))?.replace(/\s+/g, ' ').trim() ?? '';
  if (!/quotes/i.test(hint)) {
    throw new Error(`the broadcast field must warn about the quoting: ${hint}`);
  }
  console.log(`  the broadcast field says: "${hint}"`);

  // 6c. THE KICK IS NOT A RED BUTTON, and it opens NO MODAL.
  const kickButton = await page.$('#plBody .act[data-a="kick"]');
  if (!kickButton) throw new Error('the player row has no KICK button');
  const kickStyle = await page.evaluate(() => {
    const btn = document.querySelector('#plBody .act[data-a="kick"]');
    const style = getComputedStyle(btn);
    return { className: btn.className, color: style.color, background: style.backgroundColor };
  });
  if (/\bb\b/.test(kickStyle.className.replace(/\bk\b/g, ''))) {
    throw new Error(`the kick button must not be the red one: ${kickStyle.className}`);
  }
  if (kickStyle.color === 'rgb(255, 59, 78)' || kickStyle.background === 'rgb(255, 59, 78)') {
    throw new Error(`the kick button must not be red: ${JSON.stringify(kickStyle)}`);
  }
  if ((await page.$$('#log .entry dialog')).length) throw new Error('the drawer has no dialog');
  console.log(`  the kick button is ${kickStyle.className} and not red`);

  // 7. THE BROADCAST. The message goes out as it is — the engine
  //    re-quotes it, and the console says so rather than mangling it.
  await page.fill('#say', 'Hello from the admin console');
  await page.click('#sayBtn');
  const broadcastEntry = await waitForEntry(page, 'say Hello from the admin console');
  if (!/✓ done/.test(broadcastEntry)) {
    throw new Error(`the broadcast's drawer entry must be a success: ${broadcastEntry}`);
  }
  showEntry('the broadcast', broadcastEntry);

  // 8. THE TIME LIMIT. Minutes, live, with no restart.
  await page.fill('#tlVal', '30');
  await page.click('#tlBtn');
  const limitEntry = await waitForEntry(page, 'mp_timelimit 30');
  if (!/✓ done/.test(limitEntry)) {
    throw new Error(`the time limit's drawer entry must be a success: ${limitEntry}`);
  }
  showEntry('the time limit', limitEntry);

  // 9. THE ROUND RESTART — and THE TRAP: it prints NOTHING, and that
  //    is a success.
  await page.click('#restart');
  const restartEntry = await waitForEntry(page, 'restartround');
  if (!/✓ done — no output/.test(restartEntry)) {
    throw new Error(
      `a round restart that prints nothing is a SUCCESS, and the drawer must say so: ${restartEntry}`,
    );
  }
  if (!/the command ran and printed nothing/.test(restartEntry)) {
    throw new Error(
      `the restart's confirmation says what the console measured: ${restartEntry}`,
    );
  }
  showEntry('the round restart (which prints nothing)', restartEntry);

  // 10. THE KICK. One click, an optional reason, and NO MODAL.
  await page.fill('#kickReason', 'rcon smoke kick');
  const beforeKick = (await page.$$('#mapDlg')).length;
  //    The row is picked by its USERID, because that is what the
  //    engine resolves and what the row's button carries.
  await page.click('#plBody .act[data-a="kick"][data-uid="165"]');
  const kickEntry = await waitForEntry(page, 'kick #165');
  if (!/✓ done/.test(kickEntry)) {
    throw new Error(`the kick's drawer entry must be a success: ${kickEntry}`);
  }
  if (!/no longer connected/.test(kickEntry)) {
    throw new Error(`the kick's confirmation is the re-read: ${kickEntry}`);
  }
  if ((await page.$$('#mapDlg')).length !== beforeKick) {
    throw new Error('a kick must not open a modal');
  }
  const openDialogs = await page.evaluate(() =>
    [...document.querySelectorAll('dialog')].filter((d) => d.open).map((d) => d.id),
  );
  if (openDialogs.length) throw new Error(`a kick opened a modal: ${openDialogs.join(', ')}`);
  showEntry('the kick', kickEntry);

  // 11. THE TRAP: a kick whose target left between the list refresh
  //     and the click.
  //     The list is WAITED FOR first: the console re-reads the
  //     players after a kick, and until that read lands the row of
  //     the player who is already gone is still on the screen. The
  //     trap is only the trap if the row that gets clicked is the
  //     one for a player who has just left.
  await page.waitForFunction(
    () => document.querySelectorAll('#plBody .prow').length === 1,
    null,
    { timeout: 10000 },
  );
  const trapRow = await page.textContent('#plBody .prow');
  if (!/Bot/.test(trapRow ?? '')) {
    throw new Error(`the trap needs the bot's row, not: ${trapRow}`);
  }
  //     The console's poll is PAUSED (a hidden tab does not poll), so
  //     the row is still on screen, and the fake engine's fixture
  //     hook takes the player off the server underneath it.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
  });
  await rcon(ENGINE_PORT, '__smoke_drop 1');
  await page.click('#plBody .act[data-a="kick"][data-uid="1"]');
  const trapEntry = await waitForEntry(page, 'Client is not on the server');
  if (/✓ done/.test(trapEntry)) {
    throw new Error(`a refused kick must NOT report done: ${trapEntry}`);
  }
  if (!/✗/.test(trapEntry)) {
    throw new Error(`a refused kick must be shown as the engine's own text: ${trapEntry}`);
  }
  showEntry('THE TRAP — the kick whose target left', trapEntry);
  await page.evaluate(() => {
    delete document.visibilityState;
  });

  // 12. THE MAP CHANGE — the only modal, and it says what it costs
  //     BEFORE the click.
  await page.click('#servers .srv[data-id="ts-1"]');
  //     The console is WAITED FOR: the map modal names how many
  //     players are about to be dropped, and that number is the
  //     SELECTED instance's. A smoke that opened the modal before
  //     the console had read ts-1 would be reading the count off
  //     the instance it had just left.
  await waitForEntry(page, '/admin/servers/ts-1/status', 10000);
  await page.waitForSelector('#maps .map[data-map="ts_hideout"]', { timeout: 10000 });
  await page.click('#maps .map[data-map="ts_hideout"]');
  if (await page.isDisabled('#apply')) {
    throw new Error('the map button must be live once a map is picked');
  }
  await page.click('#apply');
  await page.waitForSelector('#mapDlg[open]', { timeout: 5000 });
  const modalText = (await page.textContent('#mapBody'))?.replace(/\s+/g, ' ').trim() ?? '';
  if (!/\b1 player\b/.test(modalText)) {
    throw new Error(`the modal must name how many players will be dropped: ${modalText}`);
  }
  if (!/server\.cfg/.test(modalText)) {
    throw new Error(`the modal must say that server.cfg will be re-executed: ${modalText}`);
  }
  const confirmStyle = await page.evaluate(() => {
    const btn = document.getElementById('mapYes');
    return { className: btn.className, background: getComputedStyle(btn).backgroundColor };
  });
  if (!/danger/.test(confirmStyle.className) || confirmStyle.background !== 'rgb(255, 59, 78)') {
    throw new Error(`the confirm button must be RED: ${JSON.stringify(confirmStyle)}`);
  }
  console.log(`  the map-change modal says: "${modalText}"`);
  console.log(`  and the confirm button is RED (${confirmStyle.className})`);
  await page.click('#mapYes');
  const mapEntry = await waitForEntry(page, 'changelevel ts_hideout');
  if (!/✓ done/.test(mapEntry)) {
    throw new Error(`the map change's drawer entry must be a success: ${mapEntry}`);
  }
  showEntry('the map change', mapEntry);

  // 13. THE DRAWER, in §6.3's four parts.
  const all = await drawerEntries(page);
  //    An entry is the drawer's own format: the timestamp, then the
  //    command, then the outcome. The filter looks past the
  //    timestamp, because the timestamp is there in every entry.
  const actionEntries = all.filter((e) =>
    /^\[[\d:]+\]\s*(kick|broadcast|restart round|time limit|map)\b/.test(e),
  );
  console.log('\n  the output drawer, in §6.3\'s format:');
  for (const entry of actionEntries) {
    const [head, ...rest] = entry.split('\n');
    console.log(`    ${head}`);
    for (const line of rest) console.log(`      ${line}`);
  }
  for (const needle of [
    'kick #165',
    'say Hello from the admin console',
    'mp_timelimit 30',
    'restartround',
    'changelevel ts_hideout',
  ]) {
    if (!actionEntries.some((e) => e.includes(needle))) {
      throw new Error(`the drawer has no entry for ${needle}`);
    }
  }

  // 14. THE AUDIT LINES.
  const audit = readFileSync(join(work, 'actions.log'), 'utf8').trim().split('\n');
  console.log('\n  the audit lines:');
  for (const line of audit) console.log(`    ${line}`);
  for (const want of ['kick', 'map', 'broadcast', 'restart-round', 'timelimit']) {
    if (!audit.some((l) => l.split(' ')[1] === want)) {
      throw new Error(`no audit line for ${want}`);
    }
  }
  if (audit.some((l) => /rcon-password|csrf|session/i.test(l))) {
    throw new Error('a secret is in the audit log');
  }

  // 15. The bans panel opens, and it is read-only.
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
  const banButtons = await page.$$eval('#plBody .act', (nodes) =>
    nodes.map((n) => n.dataset.a),
  );
  if (banButtons.some((a) => a === 'ban' || a === 'mute')) {
    throw new Error(`there is no ban and no mute in this release: ${banButtons.join(', ')}`);
  }
  console.log('  the bans panel opens, and it says why the list is empty');
  console.log('  and the player rows carry ONE action: KICK');

  // 15b. The drawer is a HISTORY, not a heartbeat log. The poll runs
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

  // 16. The screenshot of the console.
  //    The page is scrolled back to the top first: the fixed bars are
  //    painted where they sit, and a screenshot taken half way down
  //    the page is not a picture of the console.
  await page.evaluate(() => window.scrollTo(0, 0));
  //    And the drawer is scrolled to the ACTION entries. The drawer
  //    is a history and the poll keeps writing to it, so the actions
  //    are above the fold by now — and the actions are what this
  //    phase shipped. It is the console's own history; nothing is
  //    doctored, the log is only scrolled.
  await page.evaluate(() => {
    const log = document.getElementById('log');
    if (!log) return;
    const restart = [...log.querySelectorAll('.entry')].find((e) =>
      /restartround/.test(e.textContent ?? ''),
    );
    if (!restart) return;
    log.scrollTop +=
      restart.getBoundingClientRect().top - log.getBoundingClientRect().top;
  });
  //    And the pointer is parked off in the corner, so the shot does
  //    not catch a button in its hover state.
  await page.mouse.move(2, 2);
  await settle(page);
  await page.screenshot({ path: join(SHOTS, 'admin-console-phase4.png'), fullPage: true });
  console.log(`  wrote ${join(SHOTS, 'admin-console-phase4.png')}`);

  // 17. The mock, rendered and screenshotted: the design contract.
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

  stopChildren();
  console.log('\n  the admin console works in a browser.');
}

main().catch((err) => {
  stopChildren();
  console.error(`admin-ui-browser: ${err.message}`);
  process.exit(1);
});
