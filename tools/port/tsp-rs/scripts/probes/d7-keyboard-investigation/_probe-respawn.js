
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
  await p.waitForTimeout(36000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(700);
  const run = async (cmd,ms=2000)=>{
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),cmd);
    await p.waitForTimeout(ms);
    return logs.slice(s).filter(l=>l.startsWith('[xash-stdout]')).map(l=>l.replace('[xash-stdout] ',''));
  };
  // Issue: spawn print
  show = (label,o)=>{ console.log(`\n### ${label}`); o.forEach(x=>console.log('  '+x.slice(0,150))); };
  show('join team 1', await run('ts_join_team 1',4000));
  // nudge: maybe respawn command
  show('respawn (cmd)', await run('respawn',2500));
  // nudge: force a +attack tap
  show('+attack', await run('+attack',2500));
  show('-attack', await run('-attack',1500));
  show('respawn (after)', await run('respawn',3500));
  await p.waitForTimeout(1500);
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/spawn-after-respawn.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
