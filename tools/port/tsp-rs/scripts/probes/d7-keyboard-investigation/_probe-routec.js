
// ROUTE C verification: do the new commands reach the TS menus and spawn us?
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push({t:m.type(),x:m.text()}));
  p.on('pageerror',e=>logs.push({t:'pageerror',x:e.message.slice(0,200)}));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(32000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(500);

  async function run(cmd,label,waitMs=1500){
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x), cmd);
    await p.waitForTimeout(waitMs);
    const out=logs.slice(s).filter(l=>l.x.startsWith('[xash-stdout]')||l.t==='pageerror')
                   .map(l=>l.x.replace('[xash-stdout] ',''));
    console.log(`\n### ${label}\n  $ ${cmd}`);
    console.log(out.length? out.map(x=>'  '+x.slice(0,150)).join('\n') : '  (no output)');
    return out;
  }

  await run('ts_dev_scriptinput 1','enable scripted input',900);

  // The new commands
  await run('ts_menu_open','open team menu (menu 2)',1800);
  await run('ts_menu_slot 1','team slot 1 (SEALS)',2200);
  await run('ts_menu_close','close menu',1500);

  // Direct join (no menu needed)
  await run('ts_join_team 2','join team 2 (MERC)',2500);

  // State
  await run('echo ---STATE---','marker',1200);

  // Take a screenshot of the game state
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/routec-after.png'});
  console.log('\nscreenshot saved');
  const errs=logs.filter(l=>l.t==='pageerror');
  if(errs.length) console.log('pageerrors:\n'+errs.slice(0,4).map(e=>'  '+e.x).join('\n'));
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
