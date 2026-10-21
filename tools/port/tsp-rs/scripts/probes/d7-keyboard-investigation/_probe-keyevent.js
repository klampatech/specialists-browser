
// Is the engine's Key_Event callable from the raw export table?
// It is the post-SDL translation step: SDLash_KeyEvent -> Key_Event(keynum, down).
// If callable, we bypass the dead SDL queue completely and still get the
// real Key_Event -> HUD_Key_Event -> TS menu chain.
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

  const r = await p.evaluate(()=>{
    const raw=window.__xash.em.Module.__rawExports;
    const want=['Key_Event','SDL_PushEvent','SDL_PollEvent','SDL_SendKeyboardKey',
                'Key_AddKeyCommands','Cmd_ExecuteString','Con_Printf','Con_DPrintf',
                'IN_KeyEvent','Key_Bind_f','Key_IsDown'];
    const found={};
    for(const w of want) found[w]=typeof raw[w];
    // also case-insensitive scan of all exports for 'key' to catch variants
    const keyish=Object.keys(raw).filter(k=>/key/i.test(k) && k.length<40).slice(0,40);
    return {found, keyishCount:keyish.length, keyish};
  });
  console.log('=== exported key-related fns ===');
  console.log(JSON.stringify(r,null,2));

  // If Key_Event is a function, try it: F9 keynum = K_F9 = 0x100+? use ASCII-safe keynum.
  // Key_Event(keynum, down). Use 'F9' -> K_F1 = 0x100 offset; safer: use ASCII 0x70 ('p')? 
  // Test with a plain letter keynum first.
  if (r.found.Key_Event === 'function') {
    await p.evaluate(()=>window.__xash.Cmd_ExecuteString('bind p "echo KEPEVENT_WORKS"'));
    await p.waitForTimeout(600);
    const s=logs.length;
    const call = await p.evaluate(()=>{
      const raw=window.__xash.em.Module.__rawExports;
      try { raw.Key_Event('p'.charCodeAt(0), 1); return 'down ok'; }
      catch(e){ return 'threw: '+e.message; }
    });
    await p.waitForTimeout(1200);
    const hit=logs.slice(s).filter(l=>/KEPEVENT_WORKS/.test(l.x));
    console.log('\nKey_Event(p,down):', call, '=> echo:', hit.length?hit.map(h=>h.x).join('|'):'(none)');
  }
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
