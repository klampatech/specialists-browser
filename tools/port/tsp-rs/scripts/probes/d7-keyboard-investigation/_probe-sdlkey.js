
// DEFINITIVE test for SDL keyboard delivery:
//   1. bind a key to a command that echoes
//   2. dispatch real keydown events at window/canvas/document
//   3. see whether the ENGINE executes the binding
// If the echo never appears, SDL keyboard is dead in this WASM build
// and the engine's own Key_Event()/HUD_Key_Event() never runs.
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
  await p.waitForTimeout(30000);

  const echo = async (label)=>{
    const s=logs.length;
    await p.evaluate(()=>window.__xash.Cmd_ExecuteString('bind F9 "echo SDLKEY_WORKS"'));
    await p.waitForTimeout(400);
    return s;
  };

  // bind F9
  let s = await echo();
  console.log('bind F9 stdout:', logs.slice(s).filter(l=>l.x.startsWith('[xash-stdout]')).map(l=>l.x).join('|')||'(silent)');

  // Try dispatching F9 (keyCode 120) at various targets
  const targets = ['window','document','canvas'];
  for (const t of targets) {
    const s2 = logs.length;
    await p.evaluate((tgt)=>{
      const el = tgt==='window'?window:(tgt==='document'?document:document.getElementById('canvas'));
      const mk=(type)=>new KeyboardEvent(type,{key:'F9',code:'F9',keyCode:120,which:120,bubbles:true,cancelable:true});
      el.dispatchEvent(mk('keydown'));
      setTimeout(()=>el.dispatchEvent(mk('keyup')),60);
    }, t);
    await p.waitForTimeout(900);
    const got = logs.slice(s2).filter(l=>/SDLKEY_WORKS/.test(l.x));
    console.log(`dispatch at ${t.padEnd(9)} -> ${got.length? 'ENGINE SAW IT ✅' : 'no reaction ❌'}`);
  }

  // Now via Playwright's real input (trusted events, unlike synthetic)
  const s3=logs.length;
  await p.keyboard.press('F9');
  await p.waitForTimeout(900);
  const got3 = logs.slice(s3).filter(l=>/SDLKEY_WORKS/.test(l.x));
  console.log(`Playwright real F9  -> ${got3.length? 'ENGINE SAW IT ✅':'no reaction ❌'}`);

  // And via the in-page console toggle, which the engine handles itself
  const s4=logs.length;
  await p.keyboard.press('`');
  await p.waitForTimeout(800);
  const got4 = logs.slice(s4);
  console.log('\nafter ` (console toggle):', got4.length? got4.map(l=>l.x.slice(0,100)).join('\n') : '(no console output)');

  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
