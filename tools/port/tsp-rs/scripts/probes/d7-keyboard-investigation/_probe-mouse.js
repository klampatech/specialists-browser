
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(20000);

  const r = await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const push=(type, setup)=>{
      const ptr=raw.malloc(56);
      new Uint8Array(mem.buffer).fill(0,ptr,ptr+56);
      const d=new DataView(mem.buffer,ptr,56);
      d.setUint32(0,type,true);
      setup(d,ptr);
      const rc=raw.SDL_PushEvent(ptr); raw.free(ptr); return rc;
    };
    // SDL_MOUSEMOTION = 0x400
    push(0x400,(d)=>{d.setUint32(4,1,true); d.setInt32(8,0,true); d.setInt32(12,5,true);});  // motion
    // SDL_MOUSEWHEEL = 0x403
    push(0x403,(d)=>{d.setUint32(4,1,true); d.setInt32(8,0,true); d.setInt32(12,1,true);});  // wheel up
    // SDL_WINDOWEVENT = 0x200 (the ones already in the queue)
    return 'pushed';
  });
  await p.waitForTimeout(2000);
  const q = await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const seen={};
    for(let i=0;i<30;i++){
      const ptr=raw.malloc(64);
      if(raw.SDL_PollEvent(ptr)===0){raw.free(ptr);break;}
      const t=new DataView(mem.buffer,ptr,4).getUint32(0,true);
      seen['0x'+t.toString(16)]=(seen['0x'+t.toString(16)]||0)+1;
      raw.free(ptr);
    }
    return seen;
  });
  console.log('event types still queued after 2s:', JSON.stringify(q));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
