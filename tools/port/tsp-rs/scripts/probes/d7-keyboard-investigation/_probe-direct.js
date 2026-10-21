
// Check whether Emscripten's `Module.dynlibs` exposes HUD_Key_Event
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[];
  p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(28000);

  const r = await p.evaluate(()=>{
    const em = window.__xash?.em;
    const Module = em?.Module;
    if (!Module) return {err: 'no Module'};
    const dl = Module.dynlibs || {};
    const keys = Object.keys(dl).slice(0,15);
    const probe = {};
    for (const k of keys) {
      const lib = dl[k];
      const funcs = lib && Object.keys(lib).filter(x=>/HUD_|IN_/.test(x)).slice(0,8);
      if (funcs && funcs.length) probe[k] = funcs;
    }
    return {
      dynlibKeys: keys,
      ccallAvailable: typeof Module.ccall,
      ccallProbe: typeof Module.cwrap,
      pid: Module.PID,
      preloadedWasm: Object.keys(Module.preloadedWasm || {}).slice(0,10),
      exports: typeof window.__xash?.em?.Module?.asmLibraryArg,
      hasProc: typeof Module.getProcAddress,
      probe,
    };
  });
  console.log(JSON.stringify(r,null,2));

  // Try to invoke HUD_Key_Event directly via cwrap/call into asm JS
  const probe = await p.evaluate(()=>{
    const Module = window.__xash?.em?.Module;
    if (!Module) return 'no Module';
    try {
      // See if we can call HUD_Key_Event(1, 32/*K_SPACE*/, "+space")
      // C signature: int HUD_Key_Event(int down, int key, const char* binding)
      Module.ccall('HUD_Key_Event', 'number', ['number','number','string'], [1, 32, '+space']);
      return 'ccall ok';
    } catch(e) {
      return 'ccall threw: ' + e.message + ' at ' + (e.stack?.slice(0,120)||'');
    }
  });
  console.log('HUD_Key_Event probe:',probe);

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
