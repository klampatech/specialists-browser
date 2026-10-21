
// Is XashLoader.exec -> Module.ccall('Cmd_ExecuteString') actually working,
// and is the keyboard/mouse bridge suspended?
const { chromium } = require('playwright');
const HOST='100.95.111.112';

(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; const start=Date.now();
  p.on('console',m=>logs.push({at:Date.now()-start,t:m.type(),x:m.text()}));

  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForSelector('#canvas',{timeout:30000});
  // click Play in the launcher first
  try {
    await p.click('button:has-text("Play")', {timeout:5000});
    console.log('clicked Play');
  } catch(e){ console.log('no Play button:', e.message.slice(0,60)); }
  await p.waitForTimeout(30000);

  const r = await p.evaluate(()=>{
    const w=window;
    // The store is a Pinia store; find via the canvas's Vue app
    const inst = w.__xashLiveInstance || null;
    return {
      hasLive: !!inst,
      liveKeys: inst ? Object.keys(inst).slice(0,20) : null,
      hasEm: !!inst?.em,
      emKeys: inst?.em ? Object.keys(inst.em).slice(0,30) : null,
      ccall: typeof inst?.em?.Module?.ccall,
    };
  });
  console.log('liveInstance:', JSON.stringify(r,null,2));

  // Try to reach XashLoader via the module graph
  const r2 = await p.evaluate(()=>{
    // Vite dev: modules aren't on window. But __xashBridgeAddress is.
    return {
      bridgeAddr: w0 => 0,
      globals: Object.keys(window).filter(k=>k.startsWith('__xash')||k.startsWith('__hs')),
    };
  }).catch(e=>({err:e.message}));
  console.log('globals:', JSON.stringify(r2));

  // Try the actual thing: dispatch a mousedown on canvas and watch for exec
  const before = logs.length;
  await p.evaluate(()=>{
    const c=document.getElementById('canvas');
    c.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true,cancelable:true}));
  });
  await p.waitForTimeout(300);
  await p.evaluate(()=>{
    const c=document.getElementById('canvas');
    c.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true,cancelable:true}));
  });
  await p.waitForTimeout(1500);

  console.log('=== new logs after synthetic mousedown ===');
  console.log(logs.slice(before).map(l=>`[${l.at}ms] ${l.t} ${l.x.slice(0,160)}`).join('\n'));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
