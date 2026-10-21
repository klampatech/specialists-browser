
// Two questions:
//  A) What is Module.SDL2?
//  B) Does mouse look come from the ENGINE, or from OUR keyboard-bridge?
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(20000);

  const a = await p.evaluate(()=>{
    const M = window.__xash?.em?.Module;
    const s = M?.SDL2;
    return {
      sdl2Type: typeof s,
      sdl2Ctor: s?.constructor?.name,
      sdl2Keys: s ? Object.keys(s).slice(0,25) : null,
      sdl2Proto: s ? Object.getOwnPropertyNames(Object.getPrototypeOf(s)||{}).slice(0,20) : null,
    };
  });
  console.log('=== A) Module.SDL2 ===');
  console.log(JSON.stringify(a,null,2));

  // B) Is our mouse bridge responsible for look? Remove its listeners
  //    and see if crosshair still tracks. We track DOM listener counts.
  const bRes = await p.evaluate(()=>{
    // our bridge installs document/window listeners; count mousemove ones
    // by monkey-patching addEventListener BEFORE a fresh load is not possible
    // here, so instead check for bridge markers on window
    return {
      hasKeyboardBridgeGlobal: typeof window.__keyboardBridge,
      hasAttachMouseBridge: typeof window.__xashAttachMouse,
    };
  });
  console.log('\n=== B) bridge globals ===', JSON.stringify(bRes));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
