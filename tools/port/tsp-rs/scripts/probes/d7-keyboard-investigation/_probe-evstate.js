
// HYPOTHESIS: SDL_EventState(SDL_KEYDOWN) is SDL_IGNORE, so SDL_PushEvent
// silently drops our events despite returning 1. SDL_EventState(type, -1)
// queries; passing a state enables/disables.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
const KEYDOWN=0x300, KEYUP=0x301;
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(20000);

  const r = await p.evaluate(({KEYDOWN,KEYUP})=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const push=(sc,down,type)=>{const ptr=raw.malloc(32);
      new Uint8Array(mem.buffer).fill(0,ptr,ptr+32);
      const d=new DataView(mem.buffer,ptr,32);
      d.setUint32(0,type,true); d.setUint32(4,1,true);
      d.setUint8(8,down?1:0); d.setInt32(12,sc,true);
      const rc=raw.SDL_PushEvent(ptr); raw.free(ptr); return rc;};

    const q = (t)=>raw.SDL_EventState(t,-1);   // -1 = query, don't change
    const en= (t)=>raw.SDL_EventState(t,1);     // 1 = SDL_ENABLE
    const dis=(t)=>raw.SDL_EventState(t,0);     // 0 = SDL_IGNORE

    const out={};
    out.state_keydown_before = q(KEYDOWN);
    out.state_keyup_before   = q(KEYUP);
    out.state_mousemotion    = q(0x400);
    out.state_windowevent    = q(0x200);

    // 0 = SDL_IGNORE, 1 = SDL_ENABLE, 2 = SDL_QUERY (returns previous)
    push(66,true,KEYDOWN);
    out.hasEvents_after_push_ignored = raw.SDL_HasEvents();

    // Explicitly ENABLE, then push again
    en(KEYDOWN); en(KEYUP);
    out.state_keydown_after_enable = q(KEYDOWN);
    push(66,true,KEYDOWN);
    out.hasEvents_after_enable = raw.SDL_HasEvents();

    // Peek to confirm what is actually in the queue
    const ptr=raw.malloc(64);
    out.peekType = raw.SDL_PeepEvents(ptr,1,0x300,0x300);
    out.peekedTypeHex = out.peekType>0 ? '0x'+new DataView(mem.buffer,ptr,4).getUint32(0,true).toString(16) : null;
    out.peekedScancode = out.peekType>0 ? new DataView(mem.buffer,ptr,32).getInt32(12,true) : null;
    raw.free(ptr);
    return out;
  }, {KEYDOWN,KEYUP});
  console.log(JSON.stringify(r,null,2));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
