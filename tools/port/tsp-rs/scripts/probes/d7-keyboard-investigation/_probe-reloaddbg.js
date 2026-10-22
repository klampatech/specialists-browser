
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  let oom=false; p.on('pageerror',e=>{ if(String(e.message).includes('OOM')) oom=true; });
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8&debug=1`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(32000);
  await p.click('#canvas',{position:{x:640,y:400}});
  await p.waitForTimeout(1000);
  const s=logs.length;
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('reload')).catch(()=>{});
  await p.waitForTimeout(2500);
  console.log('OOM:', oom);
  console.log('dbg lines:');
  logs.slice(s).filter(l=>l.includes('misc::reload')).forEach(l=>console.log('  '+l.replace('[xash-stdout] ','')));
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(2)});
