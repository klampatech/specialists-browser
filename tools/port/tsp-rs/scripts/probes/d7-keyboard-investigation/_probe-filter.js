
// Is the event being dropped by SDLash_KeyEvent's textmode filter, or by
// Platform_RunEvents not running? Distinguish by pushing a NON-printable
// key (Escape, scancode 41) and a keypad key — those bypass the
// textmode printable filter. Also test with keysym.sym set to the
// SCANCODE_MASK|scancode form SDL uses internally.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
const SDLK_SCANCODE_MASK = 1<<30;
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[];
  p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(22000);

  // bind three keys with distinct echoes
  for (const k of ['F9','Escape','F12']) {
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(`bind ${x} "echo HIT_${x}"`), k);
  }
  await p.waitForTimeout(600);

  const res = await p.evaluate((MASK)=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const push=(sc,down,sym)=>{
      const ptr=raw.malloc(32);
      new Uint8Array(mem.buffer).fill(0,ptr,ptr+32);
      const d=new DataView(mem.buffer,ptr,32);
      d.setUint32(0,down?0x300:0x301,true);
      d.setUint32(4,1,true);
      d.setUint8(8,down?1:0);
      d.setUint8(9,0);
      d.setInt32(12,sc,true);          // keysym.scancode
      d.setInt32(16,sym,true);          // keysym.sym
      const r=raw.SDL_PushEvent(ptr); raw.free(ptr); return r;
    };
    const out={};
    // F9 = scancode 66; sym as SCANCODE_MASK|scancode
    out.F9_masked   = push(66,true,MASK|66);
    out.F9_sym0     = push(66,true,0);
    // Escape = scancode 41 -> K_ESCAPE (non-printable, bypasses filter)
    out.Escape      = push(41,true,0);
    // F12 = scancode 69
    out.F12         = push(69,true,0);
    return out;
  }, SDLK_SCANCODE_MASK);
  console.log('pushed:', JSON.stringify(res));
  await p.waitForTimeout(2000);
  const hits = logs.filter(l=>/HIT_/.test(l.x));
  console.log('\n=== bind echoes ===');
  console.log(hits.length? hits.map(l=>l.x).join('\n') : '(none)');

  // Now manually poll to see what is actually sitting in the queue
  const q = await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, mem=raw.memory;
    const seen=[]; let mine=0;
    for(let i=0;i<20;i++){
      const ptr=raw.malloc(64);
      if(raw.SDL_PollEvent(ptr)===0){raw.free(ptr);break;}
      const d=new DataView(mem.buffer,ptr,32);
      const t=d.getUint32(0,true);
      const sc=d.getInt32(12,true);
      if(t===0x300||t===0x301){ mine++; seen.push({t:t.toString(16),sc}); }
      raw.free(ptr);
    }
    return {keyEventsInQueue:mine, sample:seen.slice(0,8)};
  });
  console.log('\n=== queue contents ===', JSON.stringify(q));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
