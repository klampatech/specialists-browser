
// Are OTHER client-registered commands in cmdlist? (ts_test_fire, specmode,
// centerview were registered long before ours). If they are missing too,
// cmdlist just doesn't show DLL commands and our registration may be fine.
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

  const s=logs.length;
  await p.evaluate(()=>window.__xash.Cmd_ExecuteString('cmdlist'));
  await p.waitForTimeout(2500);
  const cl=logs.slice(s).filter(x=>x.startsWith('[xash-stdout]')).map(x=>x.replace('[xash-stdout] ',''));
  const all=cl.join('\n');
  console.log('cmdlist lines:', cl.length);
  for (const n of ['ts_test_fire','specmode','centerview','thirdperson','ts_dev_key',
                   'ts_menu_open','ts_menu_slot','ts_join_team','ts_menu_close','ts_key']) {
    console.log(`  ${n.padEnd(16)} ${all.includes(n)?'PRESENT':'-- absent --'}`);
  }
  // show a sample of ts_ commands cmdlist did report
  const tsCmds = cl.filter(x=>/\bts_/.test(x)).slice(0,12);
  console.log('\nsample ts_ lines from cmdlist:'); 
  tsCmds.forEach(x=>console.log('  '+x.slice(0,80)));
  await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(2)});
