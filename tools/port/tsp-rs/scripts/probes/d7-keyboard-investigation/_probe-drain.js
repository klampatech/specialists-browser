
// Risk 1 confirmation: are pushed events piling up UNCONSUMED because
// Platform_RunEvents (and thus SDL_PollEvent) is not running?
// Compare SDL_HasEvents() before/after pushing, and over time.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(22000);

  const snap = ()=>p.evaluate(()=>{
    const raw = window.__xash.em.Module.__rawExports;
    return {
      // SDL_HasEvents() takes an optional Uint32 mask; no-arg = all
      hasEvents: raw.SDL_HasEvents(),
      // pump + poll manually to see if the queue drains when WE do it
      eventState: raw.SDL_EventState ? raw.SDL_EventState(0x300, -1) : 'n/a',
    };
  });

  console.log('baseline:', JSON.stringify(await snap()));
  const pushed = await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    let ok=0;
    for(let i=0;i<5;i++){
      const ptr=raw.malloc(32); const h=new Uint8Array(mem.buffer);
      h.fill(0,ptr,ptr+32);
      const d=new DataView(mem.buffer,ptr,32);
      d.setUint32(0,0x300,true); d.setUint32(4,1,true); d.setUint8(8,1); d.setInt32(12,66,true);
      if(raw.SDL_PushEvent(ptr)===1) ok++; raw.free(ptr);
    }
    return ok;
  });
  console.log('pushed 5, accepted:', pushed);
  console.log('after push:', JSON.stringify(await snap()));

  // wait 3s: if Platform_RunEvents were running, the queue would drain
  await p.waitForTimeout(3000);
  console.log('after 3s (should be 0 if engine drains):', JSON.stringify(await snap()));

  // Now drain manually - proves the events ARE in the queue and valid
  const drained = await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const seen=[];
    for(let i=0;i<8;i++){
      const ptr=raw.malloc(64);
      const n=raw.SDL_PollEvent(ptr);
      if(n===0){ raw.free(ptr); break; }
      const d=new DataView(mem.buffer,ptr,32);
      seen.push({type:'0x'+d.getUint32(0,true).toString(16), scancode:d.getInt32(12,true)});
      raw.free(ptr);
    }
    return seen;
  });
  console.log('manually polled events:', JSON.stringify(drained));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
