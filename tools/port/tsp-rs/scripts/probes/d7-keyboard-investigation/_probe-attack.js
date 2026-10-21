
// Does `+attack` / `impulse` actually make the player join? Try the
// spectator-to-team paths and report engine stdout for each.
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
  console.log('connected');

  const cmds = [
    'echo TSBRIDGE_PROBE_START',
    '+attack',
    '-attack',
    'impulse 5',        // join team / select
    'impulse 100',
    'echo TSBRIDGE_PROBE_END',
  ];
  for (const cmd of cmds) {
    const before = logs.length;
    await p.evaluate(c=>window.__xash.Cmd_ExecuteString(c), cmd);
    await p.waitForTimeout(900);
    const newLines = logs.slice(before).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x);
    if (newLines.length) console.log(`--- ${cmd} ---`), console.log(newLines.join('\n'));
    else console.log(`--- ${cmd} --- (no stdout)`);
  }

  // Now the real test: hold attack for 2s
  console.log('\n=== holding +attack 3s ===');
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('+attack'));
  await p.waitForTimeout(3000);
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('-attack'));
  await p.waitForTimeout(2000);
  const late = logs.slice(-40).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x);
  console.log(late.join('\n')||'(no stdout)');

  await p.screenshot({path:'/tmp/tsds/after-attack.png'});
  const h = await fetch(`http://${HOST}:27017/health`).then(r=>r.json());
  console.log('\nHEALTH:',JSON.stringify(h));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
