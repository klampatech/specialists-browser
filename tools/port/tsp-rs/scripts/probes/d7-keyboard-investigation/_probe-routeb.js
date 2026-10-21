
// Verify Route B end-to-end BEFORE touching keyboard-bridge.ts:
// does SDL_PushEvent actually deliver a key the engine will act on?
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

  // 1. Is the patch live?
  const probe = await p.evaluate(()=>{
    const M = window.__xash?.em?.Module;
    const raw = M?.__rawExports;
    return {
      hasModule: !!M,
      hasRawExports: !!raw,
      rawExportCount: raw?Object.keys(raw).length:0,
      hasPushEvent: typeof raw?.SDL_PushEvent,
      hasMalloc: typeof raw?.malloc,
      hasHeap: !!M?.HEAPU8,
      heapLen: M?.HEAPU8?.length,
    };
  });
  console.log('=== patch probe ===');
  console.log(JSON.stringify(probe,null,2));
  if (!probe.hasRawExports) { await b.close(); return; }

  // 2. Bind F9 -> echo, then push a synthetic F9 scancode (66)
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('bind F9 "echo SDLKEY_WORKS"'));
  await p.waitForTimeout(700);

  const inject = await p.evaluate(()=>{
    const M = window.__xash.em.Module;
    const raw = M.__rawExports;
    const heap = M.HEAPU8;
    const ptr = raw.malloc(32);
    heap.fill(0, ptr, ptr+32);
    const dv = new DataView(heap.buffer, ptr, 32);
    dv.setUint32(0, 0x300, true);   // SDL_KEYDOWN
    dv.setUint32(4, 1, true);       // windowID
    dv.setUint8(8, 1);              // SDL_PRESSED
    dv.setUint8(9, 0);              // repeat
    dv.setInt32(12, 66, true);      // keysym.scancode = SDL_SCANCODE_F9
    const r = raw.SDL_PushEvent(ptr);
    // leave it allocated; also push the keyup so nothing sticks
    const r2 = (()=>{ const p2=raw.malloc(32); heap.fill(0,p2,p2+32);
      const d2=new DataView(heap.buffer,p2,32);
      d2.setUint32(0,0x301,true); d2.setUint32(4,1,true); d2.setUint8(8,0); d2.setInt32(12,66,true);
      return raw.SDL_PushEvent(p2); })();
    return {ptr, pushDownResult:r, pushUpResult:r2};
  });
  console.log('\n=== inject result ===', JSON.stringify(inject));
  await p.waitForTimeout(1500);

  const got = logs.filter(l=>/SDLKEY_WORKS/.test(l.x));
  console.log('\n=== did the engine run the bind? ===');
  console.log(got.length ? got.map(l=>l.x).join('\n') : '(NO — SDL_PushEvent did not reach Key_Event)');

  // 3. Try a movement key and see if anything changes on the wire
  const h0 = await fetch(`http://${HOST}:27017/health`).then(r=>r.json());
  await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, heap=M.HEAPU8;
    const push=(sc,down)=>{const ptr=raw.malloc(32);heap.fill(0,ptr,ptr+32);
      const d=new DataView(heap.buffer,ptr,32);
      d.setUint32(0,down?0x300:0x301,true);d.setUint32(4,1,true);
      d.setUint8(8,down?1:0);d.setInt32(12,sc,true);return raw.SDL_PushEvent(ptr);};
    push(26,true);   // W = SDL_SCANCODE_W
  });
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{
    const M=window.__xash.em.Module, raw=M.__rawExports, heap=M.HEAPU8;
    const ptr=raw.malloc(32);heap.fill(0,ptr,ptr+32);
    const d=new DataView(heap.buffer,ptr,32);
    d.setUint32(0,0x301,true);d.setUint32(4,1,true);d.setUint8(8,0);d.setInt32(12,26,true);
    raw.SDL_PushEvent(ptr);
  });
  await p.waitForTimeout(1000);
  const h1 = await fetch(`http://${HOST}:27017/health`).then(r=>r.json());
  console.log('wire delta up/down:', h1.packetsToServer-h0.packetsToServer, '/', h1.packetsToClient-h0.packetsToClient);

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
