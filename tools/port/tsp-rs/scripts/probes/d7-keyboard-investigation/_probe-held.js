
// Playwright's press() is too fast for a HELD command: keydown+keyup in
// the same tick, so the engine may never render the +state. Hold it.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8&debug=1`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(34000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(1500);
  // spawn first so there IS a body to show a scoreboard for
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('ts_dev_scriptinput 1'));
  await p.waitForTimeout(800);
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('ts_respawn'));
  await p.waitForTimeout(3000);
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/held-before.png'});
  // HOLD tab
  await p.keyboard.down('Tab');
  await p.waitForTimeout(1500);
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/held-tab.png'});
  await p.keyboard.up('Tab');
  await p.waitForTimeout(800);
  // HOLD backquote
  await p.keyboard.down('Backquote');
  await p.waitForTimeout(1500);
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/held-backquote.png'});
  await p.keyboard.up('Backquote');
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
