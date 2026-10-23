/**
 * Two real clients, one real server, one browser each.
 *
 * This is the test that "the multiplayer works" rests on. Every previous
 * check had ONE browser in the server, which proves the client can connect
 * — it does not prove two clients can coexist. The failure mode that only
 * shows up with two is the important one: both browsers get the same
 * server-side client slot, or the second connection is rejected, and the
 * symptom is "it works for one player" which looks like success.
 *
 * Each browser gets its own context, so each has its own IndexedDB and
 * its own 493 MB download. That is the honest test of a cold first-time
 * player, and it is slow — which is itself the finding.
 */
const dgram = require('node:dgram');
const { chromium } = require('/home/kyle/Development/slot-protocol/node_modules/playwright');

const URL = process.argv[2] || 'https://bulletballet.dev/';
const PLAYERS = parseInt(process.argv[3] || '2', 10);
const GAME_HOST = process.argv[4] || '40.160.225.81';
const GAME_PORT = parseInt(process.argv[5] || '27015', 10);

/**
 * Ask the game server how many humans it has.
 *
 * This is the AUTHORITATIVE check, and it is why it is here rather than
 * trusting the browser. A headless page can be torn down mid-run — the
 * harness closes it, a navigation happens, a context dies — and the
 * client-side assertions then report a failure that did not happen. The
 * server does not lie about who is connected to it.
 */
function askServer() {
  return new Promise((resolve) => {
    const sock = dgram.createSocket('udp4');
    const timer = setTimeout(() => {
      try { sock.close(); } catch (_) {}
      resolve(null);
    }, 5000);
    sock.on('message', (msg) => {
      clearTimeout(timer);
      try { sock.close(); } catch (_) {}
      let off = 6;
      for (let i = 0; i < 4; i++) off = msg.indexOf(0, off) + 1;
      off += 2;
      const players = msg[off];
      const maxPlayers = msg[off + 1];
      const bots = msg[off + 2];
      resolve({ players, maxPlayers, bots, humans: players - bots });
    });
    // Buffer.concat, not Buffer + string. `buffer + 'text'` concatenates
    // as a STRING, so the 0xff bytes get UTF-8 encoded into U+FFFD and
    // the query is garbage — which looks exactly like a server that is not
    // answering.
    const query = Buffer.concat([
      Buffer.from([0xff, 0xff, 0xff, 0xff]),
      Buffer.from('TSource Engine Query\0', 'latin1'),
    ]);
    sock.send(query, GAME_PORT, GAME_HOST);
  });
}

async function bootPlayer(browser, label) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const t0 = Date.now();
  const logs = [];
  page.on('console', (m) => logs.push(`[${label}:${m.type()}] ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => logs.push(`[${label}:pageerror] ${String(e).slice(0, 200)}`));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  // Click JOIN once the button exists.
  await page
    .waitForFunction(
      () => [...document.querySelectorAll('button')].some((b) => /join/i.test(b.textContent || '')),
      { timeout: 30_000 },
    )
    .catch(() => {});
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /join/i.test(x.textContent || ''));
    if (b) b.click();
  });

  // Wait for the engine to boot: several WASM modules loaded AND the
  // loading overlay gone.
  // Two independent signals, because either alone lies:
  //   - wasm module count proves the engine loaded
  //   - the loading overlay being gone proves the engine took over
  // A page that navigates or closes rejects waitForFunction, which is why
  // this previously reported "booted=false" for a player that HAD reached
  // the server. The authoritative check is the server's own player count.
  const wasmCount = await page
    .waitForFunction(
      () =>
        performance.getEntriesByType('resource').filter((r) => r.name.endsWith('.wasm')).length,
      { timeout: 240_000 },
    )
    .then((h) => h.jsonValue())
    .catch(() => 0);
  const overlayGone = await page
    .waitForFunction(
      () => !/fetching|mounting|starting/i.test(document.body.innerText || ''),
      { timeout: 120_000 },
    )
    .then(() => true)
    .catch(() => false);
  const booted = wasmCount >= 5 && overlayGone;

  // NOTE: `encodedBodySize` / `transferSize` are ZERO for cross-origin
  // resources unless the origin sends Timing-Allow-Origin. The asset host
  // does not, so timing-based byte counting silently reports 0 MiB for a
  // 493 MiB download. The honest number is the manifest's own total.
  const expected = await page.evaluate(async () => {
    try {
      const r = await fetch('https://assets.bulletballet.dev/hl/ts/manifest.json');
      const m = await r.json();
      const parts = m.parts || [];
      return parts.reduce((s, p) => s + (p.size || 0), 0);
    } catch {
      return 0;
    }
  });

  console.log(
    `  ${label}: booted=${booted} in ${((Date.now() - t0) / 1000).toFixed(1)}s, ` +
      `archive ${(expected / 1048576).toFixed(1)} MiB`,
  );
  return { ctx, page, logs, booted };
}

(async () => {
  const before = await askServer();
  console.log(`  server before: ${JSON.stringify(before)}`);

  const browser = await chromium.launch({
    args: ['--enable-features=SharedArrayBuffer', '--no-sandbox'],
  });
  const players = [];
  for (let i = 1; i <= PLAYERS; i++) {
    players.push(await bootPlayer(browser, `P${i}`));
    // Stagger: if two clients hit the server at the same instant, a
    // same-slot collision looks different from a serial collision.
    await new Promise((r) => setTimeout(r, 8000));
  }

  console.log('\n  waiting 25s for the server to settle the connections...');
  await new Promise((r) => setTimeout(r, 25_000));

  for (const p of players) {
    const body = (await p.page.evaluate(() => document.body.innerText || '')).slice(0, 260);
    console.log(`\n  ${'='.repeat(58)}\n  ${p.ctx === players[0].ctx ? 'P1' : 'P2'} screen:\n  ${body.replace(/\n/g, '\n  ')}`);
  }

  const errs = players.flatMap((p) => p.logs.filter((l) => /error|pageerror|failed/i.test(l)));
  console.log(`\n  console errors across all players: ${errs.length}`);
  errs.slice(0, 8).forEach((l) => console.log(`    ${l}`));

  const after = await askServer();
  console.log(`  server after:  ${JSON.stringify(after)}`);

  // The verdict comes from the server, not from the browser.
  const gained = after && before ? after.humans - before.humans : -1;
  console.log(
    `\n  VERDICT: ${gained === PLAYERS ? 'PASS' : 'FAIL'} — expected ${PLAYERS} more human(s), got ${gained}`,
  );
  console.log(
    `  (client-side boot flags are informational only: ${players
      .map((p, i) => `P${i + 1}=${p.booted}`)
      .join(', ')})`,
  );

  await browser.close();
  process.exit(gained === PLAYERS ? 0 : 1);
})().catch((e) => {
  console.error('TEST FAILED:', e);
  process.exit(1);
});
