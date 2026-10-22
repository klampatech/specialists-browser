
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const dead = new Set();
  p.on('pageerror',e=>{ if(String(e.message).includes('OOM')) dead.add('DEAD'); });
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(32000);
  await p.click('#canvas',{position:{x:640,y:400}});
  await p.waitForTimeout(1000);
  // reload LAST; everything else is a "+binding name" test
  for (const cmd of ['jump','duck','forward','attack','speed','alt1','slot1','use','lastinv','RELOAD']) {
    if (dead.size) { console.log('  (page already dead, stopping)'); break; }
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x), cmd).catch(()=>{});
    await p.waitForTimeout(1100);
    console.log(`  bare ${cmd.padEnd(9)} -> ${dead.size ? '*** OOM ***' : 'ok'}`);
  }
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(2)});
