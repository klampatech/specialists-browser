
// DEFINITIVE: push a key and check, over time, whether ANYONE drains it.
// Use SDL_PeepEvents (read-only, non-destructive) with explicit args so
// the 0-mask red herring can't bite us.
// Signature: SDL_PeepEvents(SDL_Event *events, int numevents,
//                           SDL_EventType minType, SDL_EventType maxType)
// Passing minType=0xFFFF maxType=0xFFFF matches everything.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(20000);

  const peekAll = ()=>p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const ptr=raw.malloc(64*16);
    // minType 0 .. maxType 0xFFFF = everything
    const n=raw.SDL_PeepEvents(ptr,16,0,0xFFFF);
    const types=[];
    for(let i=0;i<n;i++){
      types.push('0x'+new DataView(mem.buffer,ptr+i*64,4).getUint32(0,true).toString(16));
    }
    raw.free(ptr);
    return {n, types};
  });

  console.log('baseline:', JSON.stringify(await peekAll()));
  await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const ptr=raw.malloc(32); new Uint8Array(mem.buffer).fill(0,ptr,ptr+32);
    const d=new DataView(mem.buffer,ptr,32);
    d.setUint32(0,0x300,true); d.setUint32(4,1,true); d.setUint8(8,1); d.setInt32(12,66,true);
    raw.SDL_PushEvent(ptr);
  });
  for (const t of [0, 300, 1000, 3000]) {
    await p.waitForTimeout(t===0?0:t);
    console.log(`t+${t}ms:`, JSON.stringify(await peekAll()));
  }
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
