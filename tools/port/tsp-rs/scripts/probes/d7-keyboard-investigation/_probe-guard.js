
// Verify (1) keys still log, (2) the SDL_PushEvent path silently no-ops
// after the probe (no heap leak), (3) canInject() reports disabled.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8&debug=1`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(33000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(500);

  // Press a few keys, then check canInject state and bridge health.
  for (const k of ['KeyB','KeyR','Digit1','KeyY','KeyZ']) {
    await p.keyboard.press(k); await p.waitForTimeout(800);
  }
  await p.waitForTimeout(1500);
  console.log('=== [key] lines (after unmapped-key route fix) ===');
  logs.filter(l=>l.includes('[key]')).forEach(l=>console.log('  '+l.slice(0,140)));

  const health = await p.evaluate(async()=>{
    const m = await import('/@/services/sdl-key-inject.ts');
    return { canInject: m.canInject(), isReady: m.isReady() };
  }).catch(e=>({err:e.message+''}));
  console.log('\n=== inject status ===');
  console.log(JSON.stringify(health));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
