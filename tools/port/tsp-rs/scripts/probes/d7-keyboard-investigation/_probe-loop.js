
// Is the engine's frame loop running at all? host_framerate tells us.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[];
  p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(20000);

  // Sample net_time / host_framerate twice, 2s apart. If the frame loop
  // is dead these will be identical/stale.
  const samples=[];
  for (let i=0;i<3;i++){
    const s=logs.length;
    await p.evaluate(()=>window.__xash.Cmd_ExecuteString('net_time'));
    await p.waitForTimeout(1500);
    samples.push(logs.slice(s).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x).join(' | ')||'(silent)');
  }
  console.log('net_time samples:');
  samples.forEach((s,i)=>console.log(`  [${i}] ${s}`));

  // Is host.status HOST_ERR_FATAL? There is a cvar-free way: Sys_Error
  // set error_on_exit. Check if the engine ever calls Platform_RunEvents
  // by pushing an event and seeing if a MOUSE event still gets handled
  // (mouse works => that loop runs; if mouse also stalls, loop is dead).
  const h0=await fetch(`http://${HOST}:27017/health`).then(r=>r.json()).catch(()=>({}));
  console.log('\nbridge packets at sample start:', h0.packetsToServer, h0.packetsToClient);
  await p.waitForTimeout(3000);
  const h1=await fetch(`http://${HOST}:27017/health`).then(r=>r.json()).catch(()=>({}));
  console.log('bridge packets 3s later  :', h1.packetsToServer, h1.packetsToClient);
  console.log('=> engine frame loop running?', (h1.packetsToClient-h0.packetsToClient)>0);

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
