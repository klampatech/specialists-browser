
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  let oom=false; p.on('pageerror',e=>{ if(String(e.message).includes('OOM')) oom=true; });
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(34000);
  await p.click('#canvas',{position:{x:640,y:400}});
  await p.waitForTimeout(1200);
  const q=(c)=>p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),c);
  // one fresh page per command would be ideal but slow; run each ONCE and
  // check OOM, reloading between so one death doesn't poison the rest.
  for (const cmd of ['reload','jump','duck','forward','attack','speed','alt1','use','slot1','lastinv','impulse']) {
    oom=false;
    await q(cmd);
    await p.waitForTimeout(1500);
    console.log(`  ${cmd.padEnd(9)} -> ${oom ? '*** OOM ***' : 'ok'}`);
    if (oom) break;
  }
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
