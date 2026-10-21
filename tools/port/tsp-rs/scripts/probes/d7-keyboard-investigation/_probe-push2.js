
// THE decisive Route B test: push a real SDL key event and see whether
// the engine executes its binding. Mirrors sdl-key-inject.ts exactly.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[];
  p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  p.on('pageerror',e=>logs.push({t:'pageerror',x:e.message.slice(0,200)}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(30000);

  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('bind F9 "echo SDLKEY_WORKS"'));
  await p.waitForTimeout(700);

  const res = await p.evaluate(()=>{
    const M = window.__xash.em.Module;
    const raw = M.__rawExports;
    const mem = raw.memory;
    const push=(sc, down, winId)=>{
      const ptr = raw.malloc(32);
      const heap = new Uint8Array(mem.buffer);
      heap.fill(0, ptr, ptr+32);
      const dv = new DataView(mem.buffer, ptr, 32);
      dv.setUint32(0, down?0x300:0x301, true);  // SDL_KEYDOWN / SDL_KEYUP
      dv.setUint32(4, winId, true);             // windowID
      dv.setUint8(8, down?1:0);                  // state
      dv.setUint8(9, 0);                         // repeat
      dv.setInt32(12, sc, true);                 // keysym.scancode
      const r = raw.SDL_PushEvent(ptr);
      raw.free(ptr);
      return r;
    };
    const results = {};
    for (const wid of [0,1,2]) {
      results['windowID='+wid] = { down: push(66,true,wid), up: push(66,false,wid) };
    }
    return results;
  });
  console.log('=== SDL_PushEvent return values (1=accepted, 0=filtered) ===');
  console.log(JSON.stringify(res,null,2));
  await p.waitForTimeout(1500);

  const got = logs.filter(l=>/SDLKEY_WORKS/.test(l.x));
  console.log('\n=== did the ENGINE run the bind? ===');
  console.log(got.length ? got.map(l=>l.x).join('\n') : '(NO — pushed events are not reaching Key_Event)');

  // Any engine errors?
  const errs = logs.filter(l=>l.t==='error'||l.t==='pageerror');
  console.log('\n=== errors ===');
  console.log(errs.length? errs.map(l=>l.x.slice(0,180)).join('\n') : '(none)');

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
