
// HEAPU8 isn't on Module. Find the right way to write into wasm memory.
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
    const M = window.__xash?.em?.Module;
    const raw = M?.__rawExports;
    // The glue keeps HEAPU8 in a closure; the memory object is exported
    // as `memory`. That gives us a live view we can re-derive.
    const memory = raw?.memory;
    const out = {
      rawMemory: typeof memory,
      memoryIsWebAssemblyMemory: memory instanceof WebAssembly.Memory,
      memBytes: memory?.buffer?.byteLength,
      ModuleHEAPU8: typeof M?.HEAPU8,
      ModuleHEAP32: typeof M?.HEAP32,
      // Is there a helper that hands us a view?
      has_getWasmTableEntry: typeof raw?.getWasmTableEntry,
      // _malloc should let us allocate; sanity-check it works
      mallocTest: (()=>{ try { const p=raw.malloc(16); return {ptr:p, ok:p>0}; } catch(e){ return 'threw: '+e.message; } })(),
    };
    return out;
  });
  console.log(JSON.stringify(r,null,2));
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(2)});
