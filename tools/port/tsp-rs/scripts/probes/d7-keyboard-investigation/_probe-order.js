
// Precise boot ordering: does the Sys_Error alert fire BEFORE or AFTER
// SDL_Init completes? Mouse works => SDL_PollEvent works => SDL_Init
// finished. If the alert precedes it, Sys_Error swallowed mid-init may
// be skipping SDL_KeyboardInit (where Emscripten registers keydown).
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const seq=[];
  const t0=Date.now();
  p.on('console',m=>seq.push({ms:Date.now()-t0,ty:m.type(),x:m.text()}));
  p.on('pageerror',e=>seq.push({ms:Date.now()-t0,ty:'pageerror',x:e.message.slice(0,150)}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(26000);

  console.log('=== BOOT ORDER (alert vs SDL vs input init) ===');
  for (const l of seq) {
    if (/xash-alert|SDL|audio|Keyboard|Video|GL_VERSION|MODE:|Console initialized|touch|init/i.test(l.x)) {
      console.log(`[${String(l.ms).padStart(6)}ms] ${l.ty.padEnd(9)} ${l.x.replace(/\n/g,' ').slice(0,150)}`);
    }
  }
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
