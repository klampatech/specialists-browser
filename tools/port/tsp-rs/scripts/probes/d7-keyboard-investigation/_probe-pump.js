
// KEY TEST: if the engine never pumps, then calling SDL_PumpEvents from
// JS should make our queued events disappear (SDL_PumpEvents internally
// runs the registered JS callbacks and drains the queue into SDL's own
// queue). And the decisive test: does calling SDL_PollEvent ourselves
// BEFORE the engine does, cause the engine to see the event?
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[];
  p.on('console',m=>logs.push({x:m.text()}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(20000);

  // Does the engine register a keydown handler at all? Emscripten stores
  // them in JSEvents. That object is inside the closure though... but
  // registerOrRemoveHandler registers on a real DOM target, so we can
  // observe by monkey-patching addEventListener BEFORE boot.
  const before = await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports;
    return {
      hasPumpEvents: typeof raw.SDL_PumpEvents,
      hasPollEvent: typeof raw.SDL_PollEvent,
      hasPeepEvents: typeof raw.SDL_PeepEvents,
      hasWaitEventTimeout: typeof raw.SDL_WaitEventTimeout,
    };
  });
  console.log('=== exported event fns ===', JSON.stringify(before,null,1));

  // Push F9 then IMMEDIATELY poll it ourselves, checking whether
  // SDL_PumpEvents is what makes it visible.
  const r = await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const push=(sc,down)=>{const ptr=raw.malloc(32);
      new Uint8Array(mem.buffer).fill(0,ptr,ptr+32);
      const d=new DataView(mem.buffer,ptr,32);
      d.setUint32(0,down?0x300:0x301,true); d.setUint32(4,1,true);
      d.setUint8(8,down?1:0); d.setInt32(12,sc,true);
      const rc=raw.SDL_PushEvent(ptr); raw.free(ptr); return rc;};
    const out={};
    push(66,true);
    out.hasEvents_beforePump = raw.SDL_HasEvents();
    out.pumpResult = raw.SDL_PumpEvents();
    out.hasEvents_afterPump = raw.SDL_HasEvents();
    return out;
  });
  console.log('\n=== push then pump ===', JSON.stringify(r,null,1));

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
