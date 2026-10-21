
// Capture ALL boot output; look for the SDL keyboard init failure and
// whether the engine registered any keydown handler at all.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[];
  p.on('console',m=>logs.push(m.type()+': '+m.text().slice(0,300)));
  p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(25000);

  // Count engine stdout lines mentioning SDL / keyboard / alloc / mem
  const sdl = logs.filter(l=>/SDL|Keyboard|keymap|scancode|_Mem_Alloc|pool == NULL|alloc/i.test(l));
  console.log('=== SDL/keyboard/alloc mentions ('+sdl.length+') ===');
  console.log(sdl.slice(0,40).join('\n')||'(none)');

  // Did the engine register keydown on window/document/canvas?
  const regs = await p.evaluate(()=>{
    // Can't introspect addEventListener retroactively. But we CAN test:
    // dispatch a raw keydown on window and see if the engine's own
    // handler produces output.
    return {
      hasKeyEventExport: typeof window.__xash?.em?.Module,
      exportsSample: Object.keys(window.__xash?.em?.Module||{}).filter(k=>/[Kk]ey|SDL|emscripten_set_(key|mouse)/.test(k)).slice(0,25),
    };
  });
  console.log('\n=== module exports related to input ===');
  console.log(JSON.stringify(regs,null,2));

  // Fire a window keydown and look for engine reaction
  const before=logs.length;
  await p.evaluate(()=>{
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'w',code:'KeyW',keyCode:87,which:87,bubbles:true}));
    window.dispatchEvent(new KeyboardEvent('keyup',{key:'w',code:'KeyW',keyCode:87,which:87,bubbles:true}));
  });
  await p.waitForTimeout(1500);
  console.log('\n=== new logs after raw window keydown ===');
  console.log(logs.slice(before).join('\n')||'(none)');

  console.log('\n=== ALL xash-stdout (first 40) ===');
  console.log(logs.filter(l=>l.includes('xash-stdout')).slice(0,40).map(s=>s.slice(0,180)).join('\n'));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
