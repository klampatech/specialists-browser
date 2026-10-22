
// Silent is ambiguous: "unknown command" would be loud, so these commands
// likely DO run. The console may just not render in the WASM canvas.
// Measure state instead of reading pixels: does +showscores change
// anything the engine exposes? And does toggleconsole change a cvar?
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8&debug=1`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(34000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(1500);
  const q = (cmd) => p.evaluate(c=>window.__xash.Cmd_ExecuteString(c), cmd);
  const out = (since)=>logs.slice(since).filter(l=>l.startsWith('[xash-stdout]')).map(l=>l.replace('[xash-stdout] ',''));

  // POSITIVE CONTROL: a command that MUST produce output. Without this we
  // cannot tell "ran silently" from "handler not installed".
  let s=logs.length; await q('echo CONSOLE_ALIVE'); await p.waitForTimeout(1500);
  console.log('control (echo):', out(s).join('|').slice(0,100));

  s=logs.length; await q('devcon'); await p.waitForTimeout(2000);
  console.log('devcon:', out(s).join('|').slice(0,200) || '(silent)');

  // Is the console ACTUALLY open? Read the cvar.
  s=logs.length; await q('developer 1'); await p.waitForTimeout(1500);
  console.log('after developer 1:', out(s).join('|').slice(0,150) || '(silent)');

  // Scoreboard: the port exposes hud state? try the hud cvar route.
  s=logs.length; await q('hud_color'); await p.waitForTimeout(1200);
  console.log('hud_color readback:', out(s).join('|').slice(0,100) || '(silent)');

  // Now the real question: changeteam is a CLIENT->SERVER cmd. Did it
  // reach the server? Query server-side via the console file.
  s=logs.length; await q('changeteam'); await p.waitForTimeout(2500);
  console.log('changeteam ->', out(s).join('|').slice(0,120) || '(silent)');
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/cmdtest.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
