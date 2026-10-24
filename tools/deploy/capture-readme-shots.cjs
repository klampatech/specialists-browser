/**
 * Capture the README's screenshots against production.
 *
 * Not a test — a capture script. The game renders into a WASM canvas, so
 * the README's hero image has to come from a real browser session
 * against the real site.
 */
const { loadPlaywright } = require('./lib/browser.cjs');
const { chromium } = loadPlaywright();
const path = require('node:path');

const URL = process.argv[2] || 'https://bulletballet.dev/';
// `__dirname` is tools/deploy, so the repo root is two levels up — not one.
const OUT = process.argv[3] || path.join(__dirname, '..', '..', 'docs', 'screenshots');

/**
 * How many humans the registry says are on the server right now.
 *
 * `null` when the registry cannot be reached — which is NOT zero. Zero
 * would be a baseline we then compare against, and a client joining
 * later would look like an increase even though it was not ours.
 */
async function countHumans() {
  try {
    const res = await fetch('https://bulletballet.dev/api/servers');
    const body = await res.json();
    // The registry returns { servers: [...] }, NOT a bare array. Treating
    // it as one throws, the catch swallows it, and the caller reads
    // "null" — which looks like "the registry is down" when in fact it
    // answered perfectly well. That is how this check silently never
    // passed the first time it ran.
    const list = Array.isArray(body) ? body : body.servers || [];
    return list.reduce((n, s) => n + (s.humans ?? 0), 0);
  } catch {
    return null;
  }
}

/**
 * Wait until the registry reports MORE humans than before this browser
 * joined.
 *
 * The page's own readiness signals do not cover this. The engine's
 * startup output is drawn into the same canvas the game draws into, so
 * a canvas that "has content" can be a console log rather than a game.
 * The server's player count is a fact about the game.
 *
 * The comparison is against a BASELINE, not against zero: the server
 * usually has a real player on it, and "at least one human" would be
 * true before our client ever arrived.
 */
async function waitForHumanOnServer(page, timeoutMs, baseline) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const humans = await countHumans();
    if (humans !== null && (baseline === null ? humans >= 1 : humans > baseline)) {
      console.log(`  the server reports ${humans} human(s) (was ${baseline}) — in game`);
      return true;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

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

  // ---- the human count BEFORE this browser joins ----
  //
  // The readiness check below compares against this, so it has to be
  // taken before the join. The server usually has a real player on it,
  // and "at least one human" would be true before our client arrived.
  const humansBefore = await countHumans();
  console.log(`  humans on the server before we join: ${humansBefore}`);

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

  // THE READINESS CHECK THAT MATTERS.
  //
  // The wasm-count check above says the modules are loaded. It does NOT
  // say the client is in the game, and the difference is a garbage
  // screenshot: on 2026-10-24 a run caught the engine mid-boot, still
  // printing its startup log ("Using SDL audio driver", a hundred
  // "unknown command" warnings, "Connecting to ..."), and the
  // "spectator" shot became a wall of white-on-black console text. The
  // README's hero image was a console dump.
  //
  // The server knows when a human is actually on it. Poll the registry
  // and wait for one to appear. That is a fact about the game, not an
  // inference from the page.
  //
  // And if the client never shows up, keep the existing screenshots. A
  // capture script must never replace a good picture with a bad one.
  const inGame = await waitForHumanOnServer(page, 90_000, humansBefore);
  if (!inGame) {
    console.log('  the client never reached the server — keeping the existing screenshots');
    await browser.close();
    return;
  }

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
    // not. This is a proxy for "the player is alive", not a proof --
    // and it is NOT even a reliable proxy: the TS client's main menu
    // has an ANIMATED highlight, so a client that has dropped to the
    // menu also reports "frameChanged". On 2026-10-24 that is exactly
    // what happened: every round reported a live view while the frame
    // was the menu, because the spawn click had taken the client out
    // of the game.
    //
    // This proxy is NOT a proof of anything. It cannot tell a moving
    // game frame from the main menu's animated highlight, and it cannot
    // tell a moving game frame from the spawn fade. The reliable signal
    // is the server's human count, checked BEFORE the spawn click.
    if (before !== after) {
      console.log('  view is live');
      break;
    }
  }
  // Let the spawn TRANSITION finish. TS fades the client in over several
  // seconds, and the frame during that fade is a dark screen with a
  // spinner -- it is first person, but it is not a picture of the game.
  //
  // The old loop broke out at the first sign of ANY animation, and the
  // fade is an animation, so it broke DURING the fade. A fixed settle
  // is more predictable than asking the frame whether it is moving.
  await page.waitForTimeout(12000);

  // Walk. A player who has just spawned is usually facing a wall, and a
  // screenshot of a wall is a poor hero image. `+forward` is a held
  // button, so it needs a real down/up pair with time in between.
  for (const key of ['w', 'w', 'ArrowUp']) {
    await page.keyboard.down(key).catch(() => {});
    await page.waitForTimeout(1400);
    await page.keyboard.up(key).catch(() => {});
    await page.waitForTimeout(500);
  }
  // A freshly spawned player is holding Kung-Fu (fists). A weapon slot
  // gives the frame a real viewmodel in it -- which is the thing worth
  // showing, because the first-person weapon is what was rendering
  // BLACK until it was fixed.
  for (const key of ['2', '3']) {
    await page.keyboard.press(key).catch(() => {});
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1500);

  // NEUTRAL FILENAME. Do NOT call this first-person.png.
  //
  // What it holds depends on whether the spawn attempt above actually
  // worked, and the script CANNOT tell:
  //
  //   - If the spawn click landed on the spectator config menu's Cancel,
  //     the client quits to the TS main menu and this frame is the MENU.
  //   - If the spawn worked, this frame is a first-person view.
  //
  // The obvious test is the HUD's "Free Chase-Camera" line, but the HUD
  // is painted into the WASM canvas and NOT into the DOM, so
  // `document.body.innerText` can never contain it. A check that always
  // returns false is worse than no check: it prints a confident line
  // that says the wrong thing.
  //
  // So the script does not guess. It writes a neutral name and a human
  // decides what the frame actually is.
  //
  // As of 2026-10-24, with the readiness check in place (wait for a
  // human on the server BEFORE clicking to spawn), the spawn WORKS and
  // this frame is a first-person view. Before that check existed the
  // click landed before the client was in the game, the client dropped
  // to the TS main menu, and this file was the MENU.
  await page.screenshot({ path: path.join(OUT, 'after-spawn.png') });
  console.log('  after-spawn.png');

  // Only one thing here is knowable from the DOM: whether the connection
  // dropped. The rest of the client's state is on the canvas.
  const lost = await page.evaluate(() => !!document.querySelector('.lost'));
  console.log(`  state: connectionLost=${lost}`);

  await browser.close();
})().catch((e) => {
  console.error('CAPTURE FAILED:', e);
  process.exit(1);
});
