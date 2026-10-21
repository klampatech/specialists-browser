
// Can we push a synthetic SDL_KEYDOWN into the engine via SDL_PushEvent?
// If yes, the engine's own SDLash_KeyEvent -> Key_Event -> HUD_Key_Event
// chain runs and the TS menus become reachable.
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

  const r = await p.evaluate(()=>{
    const M = window.__xash?.em?.Module;
    if(!M) return {err:'no Module'};
    const has = (n)=>{ try { return typeof M.ccall==='function' && M.ccall(n,'number',[],[])!==undefined; } catch(e){ return 'throws:'+e.message.slice(0,60); } };
    return {
      pushEvent: (()=>{ try { return 'callable='+typeof M.ccall; } catch(e){ return 'x'; } })(),
      peek: (()=>{ try { return M.ccall('SDL_HasEvents','number',['number'],[0])!==undefined?'ok':'undef'; } catch(e){ return 'throws: '+e.message.slice(0,80); } })(),
      hasEvents: (()=>{ try { return M.ccall('SDL_HasEvents','number',[],[])!==undefined?'ok':'undef'; } catch(e){ return 'throws: '+e.message.slice(0,80); } })(),
      pollEvent: (()=>{ try { return M.ccall('SDL_PollEvent','number',['number'],[0])!==undefined?'ok':'undef'; } catch(e){ return 'throws: '+e.message.slice(0,80); } })(),
      malloc: (()=>{ try { return M.ccall('malloc','number',['number'],[128])!==undefined?'ok':'undef'; } catch(e){ return 'throws: '+e.message.slice(0,80); } })(),
    };
  });
  console.log('module probe:',JSON.stringify(r,null,2));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
