
// SDL_SendKeyboardKey(scancode, state, keycode) sends a key DIRECTLY,
// bypassing the SDL event queue entirely. In SDL2 this is what the
// platform backend calls, and it invokes the keyboard event handler
// directly. If the engine wired SDL's internal handlers, this may work
// even though the queue is dead.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(20000);

  // bind a letter and try SDL_SendKeyboardKey with its scancode (P=25)
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('bind p "echo SENDKEY_WORKS"'));
  await p.waitForTimeout(700);

  const r = await p.evaluate(()=>{
    const raw=window.__xash.em.Module.__rawExports;
    const out={};
    // SDL_SendKeyboardKey(SDL_Scancode scancode, Uint8 state, SDL_Keycode keycode)
    try { out.sig_probe = raw.SDL_SendKeyboardKey.length; } catch(e){ out.sig_probe='n/a'; }
    try { raw.SDL_SendKeyboardKey(25, 1, 0); out.call_25 = 'no-throw'; }
    catch(e){ out.call_25 = 'threw: '+e.message; }
    // also try SDL_SendKeyboardKeyAndKeycode (scancode, keycode, state, update)
    try { raw.SDL_SendKeyboardKeyAndKeycode(25, 0, 1, 1); out.call_variant = 'no-throw'; }
    catch(e){ out.call_variant = 'threw: '+e.message; }
    return out;
  });
  console.log('=== SDL_SendKeyboardKey call ===', JSON.stringify(r));
  await p.waitForTimeout(1500);
  const hit=logs.filter(l=>/SENDKEY_WORKS/.test(l.x));
  console.log('bind echo after send:', hit.length?hit.map(h=>h.x).join('|'):'(none)');
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
