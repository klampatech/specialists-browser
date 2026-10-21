
// TS's real join sequence: "menuselect N" then "jointeam N".
// Also try the atomic path: open team menu, slot 2, in ONE frame.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(32000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(400);
  const run = async (cmd,ms=1600)=>{
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),cmd);
    await p.waitForTimeout(ms);
    return logs.slice(s).filter(x=>x.startsWith('[xash-stdout]')).map(x=>x.replace('[xash-stdout] ',''));
  };
  const show=(l,o)=>{console.log(`\n### ${l}`);console.log(o.length?o.map(x=>'  '+x.slice(0,130)).join('\n'):'  (no output)');};

  show('enable scripted input', await run('ts_dev_scriptinput 1',900));

  // Native TS sequence
  show('menuselect 2', await run('menuselect 2',1500));
  show('jointeam 2',    await run('jointeam 2',2500));
  show('+attack (spawn tap)', await run('+attack',2500));

  // Atomic: open + slot in quick succession (slot needs menu shown)
  await run('ts_menu_open 2',1200);
  show('ts_menu_slot 2', await run('ts_menu_slot 2',2500));
  await run('+attack',2500);

  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/routec2.png'});
  console.log('\nshot saved');
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
