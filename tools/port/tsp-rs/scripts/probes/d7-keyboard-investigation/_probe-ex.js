
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
    const em = window.__xash?.em;
    const M = em?.Module;
    // Find where raw wasm exports live
    const candidates = {
      emKeys: em?Object.keys(em).slice(0,25):null,
      ModuleKeys: M?Object.keys(M).slice(0,40):null,
      hasAsm: typeof M?.asm,
      asmKeys: M?.asm?Object.keys(M.asm).filter(k=>/SDL_SendKeyboardKey|SDL_PushEvent|Cmd_ExecuteString/.test(k)):null,
      wasmExports: typeof em?.wasmExports,
      wasmExportKeys: em?.wasmExports?Object.keys(em.wasmExports).filter(k=>/SDL_SendKeyboardKey|SDL_PushEvent|Cmd_ExecuteString/.test(k)):null,
    };
    return candidates;
  });
  console.log(JSON.stringify(r,null,2).slice(0,2500));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
