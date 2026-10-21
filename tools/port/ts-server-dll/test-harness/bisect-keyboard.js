// D.7.28b bisect: which of my changes kills the keyboard?
// A) baseline launch args, live-state DISABLED
// B) baseline launch args, live-state ENABLED
// C) +TS cvar args, live-state DISABLED
// Injected by bootstrap: auto-detect playwright-core + newest chromium.
// The original hardcoded chromium-1243, which goes stale on any machine
// with a different playwright cache.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function resolvePlaywright() {
  const roots = [
    '/home/kyle/Development/jirito/node_modules/playwright-core',
    ...(fs.existsSync('/home/kyle/Development')
      ? fs.readdirSync('/home/kyle/Development').map(d => `/home/kyle/Development/${d}/node_modules/playwright-core`)
      : []),
    '/home/kyle/node_modules/playwright-core',
  ].filter(p => fs.existsSync(p));
  if (!roots.length) throw new Error('playwright-core not found; run bootstrap-tools.sh');
  return require(roots[0]);
}

function resolveChromium() {
  const base = '/home/kyle/.cache/ms-playwright';
  if (!fs.existsSync(base)) return undefined; // let playwright use its own default
  const builds = fs.readdirSync(base)
    .filter(d => d.startsWith('chromium-') && !d.includes('headless'))
    .sort((a, b) => parseInt(b.split('-')[1]) - parseInt(a.split('-')[1]));
  for (const b of builds) {
    const p = path.join(base, b, 'chrome-linux64', 'chrome');
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const chromium = resolvePlaywright().chromium;
const CHROME_PATH = resolveChromium();


async function run(label, { launchArgs, disableLiveState }) {
  const browser = await chromium.launch({
    headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: CHROME_PATH
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const out = [];
  const dialogs = [];
  page.on('console', m => { if (m.text().includes('[xash')) out.push(m.text()); });
  page.on('dialog', async d => { dialogs.push(d.message().replace(/\n/g, ' ').slice(0, 80)); await d.dismiss(); });

  // Seed launchOptions + optional live-state kill switch
  await page.addInitScript(([args, kill]) => {
    localStorage.setItem('xash-store', JSON.stringify({
      id: 'xash', launchOptions: args,
      tsConfig: { roundtime: 180, slowmatch: 1, lastmanstanding: 0,
        teammodels: '', hudOverlay: true, killfeedOverlay: true },
      fullScreen: false, enableConsole: false, enableCheats: false,
      _killLiveState: kill,
    }));
  }, [launchArgs, disableLiveState]);

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 10000 });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  await new Promise(r => setTimeout(r, 8000));

  const strip = await page.$eval('[data-livestate]', el => el.innerText).catch(() => '(none)');

  // Keyboard test: does the engine echo anything on a bound key?
  const before = out.length;
  for (const k of ['KeyE', 'KeyF', 'Digit3', 'Escape']) {
    await page.keyboard.press(k);
    await new Promise(r => setTimeout(r, 400));
  }
  const reacted = out.slice(before);

  console.log(`\n===== ${label} =====`);
  console.log(`  dialogs:        ${dialogs.length ? dialogs.join(' | ') : 'none'}`);
  console.log(`  engine on keys: ${reacted.length} lines`);
  reacted.slice(0, 5).forEach(l => console.log(`     ${l.slice(0, 110)}`));
  console.log(`  strip populated: ${strip.includes('ts_apartments') ? 'YES' : 'NO'}`);
  console.log(`  strip: ${JSON.stringify(strip.replace(/\n/g, '|').slice(0, 90))}`);

  await browser.close();
  return { dialogs: dialogs.length, reacted: reacted.length };
}

(async () => {
  await run('A: baseline args, live-state OFF', { launchArgs: 'bot_quota 2 -game ts +map ts_apartments', disableLiveState: true });
  await run('B: baseline args, live-state ON',  { launchArgs: 'bot_quota 2 -game ts +map ts_apartments', disableLiveState: false });
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });