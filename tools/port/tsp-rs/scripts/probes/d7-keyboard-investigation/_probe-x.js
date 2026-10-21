
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; const start=Date.now();
  p.on('console',m=>logs.push({at:Date.now()-start,t:m.type(),x:m.text()}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(30000);

  // dump window.__xash
  const r = await p.evaluate(()=>{
    const w=window;
    const x = w.__xash;
    return {
      typeOf__xash: typeof x,
      isObject: x && typeof x==='object',
      constructor: x ? x.constructor?.name : null,
      keys: x ? Object.keys(x) : null,
      isCmd_ExecuteString: x && typeof x.Cmd_ExecuteString,
      proto: x ? Object.getOwnPropertyNames(Object.getPrototypeOf(x)||{}).slice(0,30) : null,
    };
  });
  console.log('__xash:',JSON.stringify(r,null,2));

  // Try directly calling __xash.Cmd_ExecuteString if it exists
  const before = logs.length;
  const rr = await p.evaluate(()=>{
    if (!window.__xash || typeof window.__xash.Cmd_ExecuteString !== 'function') {
      return 'no Cmd_ExecuteString on __xash';
    }
    try {
      window.__xash.Cmd_ExecuteString('host_framerate');
      window.__xash.Cmd_ExecuteString('+attack');
      return 'called ok';
    } catch(e){ return 'threw: ' + e.message; }
  });
  await p.waitForTimeout(1500);
  console.log('exec result:', rr);
  console.log('=== new logs ===');
  console.log(logs.slice(before).map(l=>`[${l.at}ms] ${l.t} ${l.x.slice(0,160)}`).join('\n'));

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
