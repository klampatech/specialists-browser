/**
 * Capture the README's screenshots against production.
 *
 * Not a test — a capture script. The game renders into a WASM canvas, so
 * the README's hero image has to come from a real browser session
 * against the real site.
 */
const { chromium } = require('/home/kyle/Development/slot-protocol/node_modules/playwright');
const path = require('node:path');

const URL = process.argv[2] || 'https://bulletballet.dev/';
// `__dirname` is tools/deploy, so the repo root is two levels up — not one.
const OUT = process.argv[3] || path.join(__dirname, '..', '..', 'docs', 'screenshots');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // ---- the landing page / server browser ----
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(OUT, 'landing.png') });
  console.log('  landing.png');

  // ---- in game ----
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /join/i.test(x.textContent || ''));
    if (b) b.click();
  });
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(4000);
    const ready = await page
      .evaluate(() => {
        const wasm = performance
          .getEntriesByType('resource')
          .filter((r) => r.name.endsWith('.wasm')).length;
        const text = document.body.innerText || '';
        return wasm >= 5 && !/fetching|mounting|starting/i.test(text);
      })
      .catch(() => false);
    if (ready) break;
  }
  await page.waitForTimeout(8000);

  // Left-click spawns the player: the client starts as a spectator
  // ("Free Chase-Camera") until the first click. A chase-camera view of
  // a bot is a worse hero image than the player's own view, so keep
  // clicking until the HUD says otherwise.
  //
  // The chase camera is the spectator view. To leave it the client has to
  // SPAWN, and TS's gate means a movement command only works after a
  // real keypress has opened it — so the keypress is not optional, it is
  // the thing that arms the gate.
  //
  // The HUD is painted into the WASM canvas, not the DOM, so
  // `document.body.innerText` cannot tell us whether we spawned. The
  // only reliable check is the pixels, so take a screenshot each round
  // and compare.
  // Give the client time to finish connecting. A click before the client
  // is fully in the game does not spawn — the server has not accepted
  // the player yet, so there is nothing to spawn.
  await page.waitForTimeout(20000);

  // The spectator view, captured BEFORE spawning. It frames more of the
  // map and shows the character models, which makes it a better picture
  // of the game than a first-person view of whichever wall the player
  // happened to spawn against.
  await page.screenshot({ path: path.join(OUT, 'spectator.png') });
  console.log('  spectator.png');

  const canvas = await page.$('#canvas');
  const { createHash } = require('node:crypto');
  const shot = async () => {
    const buf = await page.screenshot();
    return createHash('md5').update(buf).digest('hex');
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    // Arm the gate with a movement key, then click to spawn.
    for (const key of ['w', 'ArrowUp']) {
      await page.keyboard.press(key).catch(() => {});
      await page.waitForTimeout(250);
    }
    if (canvas) {
      const box = await canvas.boundingBox();
      if (box) {
        // A real press with a real duration, not a synthetic click. The
        // engine's fire button is a +button: it needs the down edge AND
        // the up edge, and a zero-duration click can lose one.
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.waitForTimeout(150);
        await page.mouse.down();
        await page.waitForTimeout(220);
        await page.mouse.up();
      }
    }
    await page.waitForTimeout(4000);
    const before = await shot();
    await page.waitForTimeout(1200);
    const after = await shot();
    console.log(`  round ${attempt + 1}: frameChanged=${before !== after}`);
    // A live first-person view keeps moving; a static chase-cam does
    // not. This is a proxy for "the player is alive", not a proof.
    if (before !== after) {
      console.log('  view is live');
      break;
    }
  }
  await page.waitForTimeout(4000);

  // Walk. A player who has just spawned is usually facing a wall, and a
  // screenshot of a wall is a poor hero image. `+forward` is a held
  // button, so it needs a real down/up pair with time in between.
  for (const key of ['w', 'w', 'ArrowUp']) {
    await page.keyboard.down(key).catch(() => {});
    await page.waitForTimeout(1400);
    await page.keyboard.up(key).catch(() => {});
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1200);

  // Take the spectator shot as well: it shows more of the map and the
  // character models, and it is a different moment.
  await page.screenshot({ path: path.join(OUT, 'first-person.png') });
  console.log('  first-person.png');

  const state = await page.evaluate(() => ({
    chase: /Chase-Camera/i.test(document.body.innerText || ''),
    lost: !!document.querySelector('.lost'),
  }));
  console.log(`  state: chaseCamera=${state.chase} connectionLost=${state.lost}`);

  await browser.close();
})().catch((e) => {
  console.error('CAPTURE FAILED:', e);
  process.exit(1);
});
