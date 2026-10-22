
// ?debug=1 produced no [key] logs at all. Is the keyboard bridge even
// installed? And are keydown events reaching the window?
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

  // Install our own probe BEFORE pressing, to see if window sees keydown.
  await p.evaluate(()=>{
    window.__probe=[];
    window.addEventListener('keydown',e=>window.__probe.push('down '+e.code),true);
    window.addEventListener('keyup',e=>window.__probe.push('up '+e.code),true);
  });
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(500);
  const s=logs.length;
  await p.keyboard.press('Digit1'); await p.waitForTimeout(900);
  await p.keyboard.press('KeyB');     await p.waitForTimeout(900);
  await p.keyboard.press('KeyW');     await p.waitForTimeout(900);

  console.log('=== DOM probe (did window see the keys?) ===');
  console.log(JSON.stringify(await p.evaluate(()=>window.__probe),null,1));
  console.log('\n=== console output from our [key] logs ===');
  const k=logs.slice(s).filter(l=>l.includes('[key]'));
  console.log(k.length? k.map(l=>'  '+l.slice(0,140)).join('\n') : '  (NO [key] logs — bridge not installed or not reached)');
  console.log('\n=== any console output at all ===');
  logs.slice(s).slice(0,10).forEach(l=>console.log('  '+l.slice(0,120)));
  console.log('\n=== is the module loaded? ===');
  console.log(JSON.stringify(await p.evaluate(()=>{
    // debug-log reads the URL on each call; check the flag parses
    const f=new URLSearchParams(window.location.search).get('debug');
    return {debugFlag:f, activeEl:document.activeElement?.tagName};
  })));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
