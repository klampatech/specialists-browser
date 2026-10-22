
// Hypothesis: reload with nothing to reload loops and leaks heap.
// Measure heap directly rather than waiting for the OOM.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  p.on('pageerror',e=>{ logs.push('[pageerror] '+e.message); });
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8&debug=1`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(34000);
  await p.click('#canvas',{position:{x:640,y:400}});
  await p.waitForTimeout(1500);
  await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up();
  await p.waitForTimeout(2500);

  const heap = () => p.evaluate(()=>{
    const m = window.__xash; if(!m) return -1;
    try {
      const mem = m.HEAPU8 ? null : null;
      const mm = m.wasmMemory || (m.asm && m.asm.memory);
      if (mm && mm.buffer) return mm.buffer.byteLength/1048576;
    } catch(e){ return -2; }
    return -3;
  });
  console.log('heap after spawn (MB):', await heap());
  console.log('\n>>> pressing R x25 (instant `reload` -> bare name, likely unknown cmd)');
  for(let i=0;i<25;i++){ await p.keyboard.press('KeyR'); await p.waitForTimeout(220); }
  console.log('heap after 25x R:', await heap(), 'MB');
  console.log('pageerrors:', logs.filter(l=>l.includes('pageerror')).slice(-2).join(' | ')||'(none)');

  console.log('\n>>> now the GATED form: +reload / -reload pairs x25');
  for(let i=0;i<25;i++){
    await p.evaluate(()=>{ window.__xash.Cmd_ExecuteString('ts_gate 200'); window.__xash.Cmd_ExecuteString('+reload'); });
    await p.waitForTimeout(90);
    await p.evaluate(()=>window.__xash.Cmd_ExecuteString('-reload'));
    await p.waitForTimeout(130);
  }
  console.log('heap after 25x +reload:', await heap(), 'MB');
  console.log('pageerrors:', logs.filter(l=>l.includes('pageerror')).slice(-2).join(' | ')||'(none)');
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/reload-test.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
