
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
  await p.waitForTimeout(28000);

  const h0 = await fetch(`http://${HOST}:27017/health`).then(r=>r.json()).catch(e=>({error:e.message}));
  console.log('before:', h0.packetsToServer, h0.packetsToClient);

  // engage focus
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(600);
  const st = await p.evaluate(()=>({
    active:document.activeElement?.id||document.activeElement?.tagName,
    lock:document.pointerLockElement?.id||'free',
  }));
  console.log('after focus click:', JSON.stringify(st));

  // Keys the engine cares about. Note Playwright key names:
  // 'w' -> KeyW, ' ' -> Space, 'Enter' -> Enter
  const seq = ['w','a','s','d',' ','Enter','Escape'];
  for (const k of seq) {
    await p.keyboard.press(k===' '?'Space':k);
    await p.waitForTimeout(180);
  }
  await p.waitForTimeout(2500);

  const h1 = await fetch(`http://${HOST}:27017/health`).then(r=>r.json()).catch(e=>({error:e.message}));
  console.log('after :', h1.packetsToServer, h1.packetsToClient);
  console.log('DELTA up:', h1.packetsToServer-h0.packetsToServer, ' down:', h1.packetsToClient-h0.packetsToClient);

  // Which engine stdout lines mention keydest / bind / attack / key
  const xs = logs.filter(l=>l.x.startsWith('[xash-stdout]'));
  const rel = xs.filter(l=>/bind|attack|keydest|key_dest|forward|mouse|unbound|escape/i.test(l.x));
  console.log('=== engine stdout: key-related ===');
  console.log(rel.slice(-30).map(l=>l.x).join('\n') || '(none)');
  console.log('=== engine stdout: ALL last 25 ===');
  console.log(xs.slice(-25).map(l=>l.x).join('\n') || '(none)');

  console.log('=== [bridge-input] lines ===');
  console.log(logs.filter(l=>/bridge-input/.test(l.x)).map(l=>`[${l.at}ms] ${l.x}`).join('\n')||'(none)');

  await p.screenshot({path:'/tmp/tsds/after-keys.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
