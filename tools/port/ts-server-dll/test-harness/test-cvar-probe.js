// Probe what engine console commands actually print, so we know the
// real output format to pattern-match against. D.7.28.
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


(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: CHROME_PATH
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const lines = [];
  page.on('console', m => {
    const t = m.text();
    if (t.includes('[xash-')) lines.push(t);
  });

  await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#canvas', { timeout: 10000 });
  await page.click('button.start-button, .start-button, button');
  await page.waitForSelector('.ts-hud', { state: 'visible', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  const bootCount = lines.length;
  console.log(`Engine up. ${bootCount} boot lines. Now probing...`);

  // Issue a batch of console commands and capture their output.
  const probes = [
    'mp_roundtime',
    'roundtime',
    'slowmatch',
    'host_framerate',
    'fps_max',
    'mp_teamlist',
    'cvar roundtime',
    'echo __MARKER_test__',
    'cvarlist',
    'cmdlist',
    'sv_cheats',
    'name',
  ];
  for (const p of probes) {
    await page.evaluate((cmd) => {
      window.__xash.Cmd_ExecuteString(cmd);
    }, p);
    await new Promise(r => setTimeout(r, 400));
  }
  await new Promise(r => setTimeout(r, 1500));

  console.log('\n=== Output AFTER probes (excluding boot) ===');
  const after = lines.slice(bootCount);
  // Dedupe preserving order
  const seen = new Set();
  for (const l of after) {
    const n = l.replace(/\[\d\d:\d\d:\d\d\]\s*/, '');
    if (seen.has(n)) continue;
    seen.add(n);
    console.log(' ', n.slice(0, 160));
  }
  console.log(`\n(${after.length} lines total after probes)`);

  require('fs').writeFileSync('/tmp/smoke-test/probe-output.txt', after.join('\n'));
  await browser.close();
})().catch(err => { console.error('FAILED:', err.message); process.exit(1); });