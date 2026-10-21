
// Definitive: is the engine receiving raw key events, and is the bind
// table populated? Use bindlist + a synthetic window keydown, and check
// whether the alert repeats.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[];
  p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  p.on('pageerror',e=>logs.push({t:'pageerror',x:e.message}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(30000);

  // Count alerts
  const alerts = logs.filter(l=>/xash-alert/.test(l.x));
  console.log('xash-alert count:', alerts.length);
  console.log('alerts:', alerts.map(a=>a.x.slice(0,120)).join(' || ')||'(none)');

  // bindlist
  const s=logs.length;
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('bindlist'));
  await p.waitForTimeout(1500);
  const bl = logs.slice(s).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x);
  console.log('\n=== bindlist ===');
  console.log(bl.join('\n')||'(no output — bind command missing or empty table)');

  // cmdlist to see what commands exist
  const s2=logs.length;
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('cmdlist +'));
  await p.waitForTimeout(1500);
  const cl = logs.slice(s2).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x);
  console.log('\n=== cmdlist + ===');
  console.log(cl.join('\n')||'(none)');

  // keydest
  const s3=logs.length;
  for (const c of ['echo KEYDEST_IS','+attack','-attack','echo KEYDEST_END']) {
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x), c);
    await p.waitForTimeout(600);
  }
  const k = logs.slice(s3).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x);
  console.log('\n=== after +attack ===');
  console.log(k.join('\n')||'(none)');

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
