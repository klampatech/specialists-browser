
// Ground truth via SDL_PollEvent (which we PROVED returns correct
// types/scancodes earlier). Watch the queue decay over time without us
// polling — i.e. read it ONCE at the end.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(20000);

  // push 3 distinct keydowns with unique scancodes
  const pushed = await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const rcs=[];
    for(const sc of [66,41,69]){
      const ptr=raw.malloc(32); new Uint8Array(mem.buffer).fill(0,ptr,ptr+32);
      const d=new DataView(mem.buffer,ptr,32);
      d.setUint32(0,0x300,true); d.setUint32(4,1,true); d.setUint8(8,1); d.setInt32(12,sc,true);
      rcs.push(raw.SDL_PushEvent(ptr)); raw.free(ptr);
    }
    return rcs;
  });
  console.log('pushed 3 unique keys, SDL_PushEvent returned:', JSON.stringify(pushed));

  // WAIT without polling. If the engine drains, our 3 are gone after 2s.
  await p.waitForTimeout(2000);

  const final = await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const seen=[];
    for(let i=0;i<30;i++){
      const ptr=raw.malloc(64);
      if(raw.SDL_PollEvent(ptr)===0){raw.free(ptr);break;}
      const d=new DataView(mem.buffer,ptr,32);
      seen.push({t:'0x'+d.getUint32(0,true).toString(16), sc:d.getInt32(12,true)});
      raw.free(ptr);
    }
    return seen;
  });
  console.log('after 2s, queue contains:', JSON.stringify(final));
  const ourKeys = final.filter(e=>e.t==='0x300' && [66,41,69].includes(e.sc));
  console.log('\n=> our 3 pushed keys still queued?', ourKeys.length===3 ? 'YES (engine is NOT draining)' : 'NO (engine drained them)');
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
