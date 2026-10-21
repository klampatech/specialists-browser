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
        executablePath: CHROME_PATH,
        args: ['--ignore-certificate-errors', '--no-sandbox'],
        headless: true,
    });
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    
    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text().slice(0, 600)}`));
    page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message.slice(0, 600)}`));
    
    await page.goto('https://100.95.111.112:5174/webXash/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Click Play
    await page.$$eval('button', (els) => {
        for (const el of els) {
            const t = el.textContent.trim().toLowerCase();
            if (t.includes('play')) { el.click(); return; }
        }
    });
    
    // Wait 25s for game menu
    await page.waitForTimeout(25000);
    
    // Take screenshot of menu
    await page.screenshot({ path: '/tmp/smoke-test/menu.png' });
    
    // Find "New game" or "Custom game" link
    const newGame = await page.evaluate(() => {
        const els = document.querySelectorAll('*');
        for (const el of els) {
            const t = (el.textContent || '').trim();
            if (t === 'New game' || t === 'Custom game') {
                const rect = el.getBoundingClientRect();
                return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: t };
            }
        }
        return null;
    });
    
    console.log('Found new-game link:', newGame);
    
    if (newGame) {
        // Click "New game"
        await page.mouse.click(newGame.x, newGame.y);
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/smoke-test/newgame.png' });
        
        // Look for a "Play" button (TS usually has difficulty selection)
        await page.waitForTimeout(1000);
        
        // Look for any subsequent clickable "start" or map
        const playBtn = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, a, [class*="button"]');
            for (const btn of buttons) {
                const t = (btn.textContent || '').trim().toLowerCase();
                if (t.includes('play') || t.includes('start') || t.includes('begin')) {
                    const rect = btn.getBoundingClientRect();
                    if (rect.width > 0) {
                        return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: btn.textContent.trim() };
                    }
                }
            }
            return null;
        });
        
        if (playBtn) {
            console.log('Found play button:', playBtn);
            await page.mouse.click(playBtn.x, playBtn.y);
        }
        
        // Wait 30s for game to start
        await page.waitForTimeout(30000);
        await page.screenshot({ path: '/tmp/smoke-test/ingame.png' });
    }
    
    console.log('\n=== Console logs ===');
    for (const log of logs.slice(-80)) console.log(log);
    
    console.log('\nCTSGameRules/InitHUD mentioned:',
        logs.some(l => l.includes('InitHUD') || l.includes('TS') || l.includes('Specialists')));
    
    // Check for buy, firemode, useitems commands (TS-specific)
    const tsCommands = logs.filter(l => l.match(/Unknown command.*(?:buy|firemode|useitems|alt2|drop)/));
    console.log('TS Unknown commands:', tsCommands.length);
    
    await browser.close();
})();
