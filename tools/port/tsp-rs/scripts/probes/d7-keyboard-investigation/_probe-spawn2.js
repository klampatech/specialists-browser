
// Full spawn sequence on the now-teamplay server.
const { chromium } = require('playwright');
const HOST='100.95.111.112';
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  const logs=[]; p.on('console',m=>logs.push(m.text()));
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8`,{waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(34000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(400);
  const run = async (cmd,ms=1700)=>{
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),cmd);
    await p.waitForTimeout(ms);
    return logs.slice(s).filter(x=>x.startsWith('[xash-stdout]')).map(x=>x.replace('[xash-stdout] ',''));
  };
  const show=(l,o)=>{console.log(`\n### ${l}`);console.log(o.length?o.map(x=>'  '+x.slice(0,150)).join('\n'):'  (no output)');};

  await run('ts_dev_scriptinput 1',900);
  // Direct join (bypasses the menu entirely)
  show('ts_join_team 1', await run('ts_join_team 1',3000));
  show('state probe', await run('echo A',1500));
  await p.waitForTimeout(1000);
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/spawn1.png'});

  // If still spectating, tap +attack (TS's respawn path)
  show('+attack', await run('+attack',2500));
  await p.waitForTimeout(1500);
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/spawn2.png'});
  console.log('\nshots saved');
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
