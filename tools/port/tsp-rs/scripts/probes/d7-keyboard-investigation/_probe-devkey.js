
// Does ts_dev_key reach HUD_Key_Event -> TS menus? If yes, Route C is
// nearly free. Also test the direct join_team path.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  p.on('pageerror',e=>logs.push({t:'pageerror',x:e.message.slice(0,160)}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(32000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(500);

  async function run(cmd, label, waitMs=1400){
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x), cmd);
    await p.waitForTimeout(waitMs);
    const out=logs.slice(s).filter(l=>l.x.startsWith('[xash-stdout]')||l.t==='pageerror')
                   .map(l=>l.x.replace('[xash-stdout] ',''));
    console.log(`\n### ${label}\n  $ ${cmd}`);
    console.log(out.length? out.map(x=>'  '+x.slice(0,140)).join('\n') : '  (no output)');
    return out;
  }

  // 1. Do the cvars exist / can we enable script input?
  await run('ts_dev_scriptinput','query ts_dev_scriptinput',800);
  await run('ts_dev_scriptinput 1','enable script input',800);
  await run('sv_cheats','query sv_cheats',800);
  await run('sv_cheats 1','enable cheats',800);
  await run('ts_dev_scriptinput','verify ts_dev_scriptinput',800);

  // 2. Try ts_dev_key with a digit (team slot) - key numbers are ASCII
  await run('ts_dev_key 49 1','ts_dev_key digit 1 (team slot)',1600);
  await run('ts_dev_key 49 0','ts_dev_key digit 1 release',1000);

  // 3. Enter (13) opens team menu when in spec mode
  await run('ts_dev_key 13 1','ts_dev_key Enter (open team menu)',1600);
  await run('ts_dev_key 13 0','release Enter',1000);

  // 4. State check
  await run('echo ---STATE---; team_number','probe',1000);

  const errs=logs.filter(l=>l.t==='pageerror');
  if(errs.length) console.log('\n=== pageerrors ===\n'+errs.slice(0,5).map(e=>e.x).join('\n'));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
