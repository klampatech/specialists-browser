
// Narrow it: is it the bare `reload` name, the gate, or repetition?
// Heap probe failed (-3), so instrument differently: count engine
// allocations via a marker command and watch for the OOM at what N.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  let oom=false; p.on('pageerror',e=>{ if(String(e.message).includes('OOM')) oom=true; });
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(34000);
  await p.click('#canvas',{position:{x:640,y:400}});
  await p.waitForTimeout(1200);
  const q=(c)=>p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),c);

  // Baseline: does a harmless unknown command also OOM? That would prove
  // it is the COMMAND PATH leaking, not reload specifically.
  const trial = async (label, fn, n) => {
    oom=false;
    for(let i=0;i<n;i++){ await fn(i); await p.waitForTimeout(120);
      if(oom){ console.log(`${label}: OOM at iteration ${i+1}`); return; } }
    console.log(`${label}: survived ${n}`);
  };
  await trial('A. unknown cmd "zzqqxx" x40', ()=>q('zzqqxx'), 40);
  await trial('B. bare "reload" x40',         ()=>q('reload'), 40);
  await trial('C. echo x40',                 ()=>q('echo hi'), 40);
  await trial('D. ts_gate 200 x40',          ()=>q('ts_gate 200'), 40);
  await trial('E. +reload/-reload x40',      async()=>{ await q('ts_gate 200'); await q('+reload'); await q('-reload'); }, 40);
  await trial('F. bare "slot1" x40',         ()=>q('slot1'), 40);
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
