
// FFA + ruleset 30 (matching the ts30-only client WASM). No team join
// needed: in plain DeathMatch the server should spawn you directly.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const HOST='100.95.111.112';
const CONSOLE='/tmp/tsds/engine.console';
const srv = (c) => { try { execSync(`echo ${JSON.stringify(c)} >> ${CONSOLE}`, {timeout:4000}); } catch(e){} };
const st = () => { try { return execSync("grep -E '\\[ts\\]  #|game rules' /tmp/tsds/xash.stdout | tail -7").toString(); } catch(e){ return ''; } };
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
  await p.waitForTimeout(4000);
  const run = async (cmd,ms=3000)=>{
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),cmd);
    await p.waitForTimeout(ms);
    return logs.slice(s).filter(l=>l.startsWith('[xash-stdout]')).map(l=>l.replace('[xash-stdout] ',''));
  };
  console.log('=== FFA: does the server spawn us with no join at all? ===');
  srv('ts_status'); await new Promise(r=>setTimeout(r,1500));
  console.log(st());
  console.log('\n=== enable script input, try respawn anyway ===');
  (await run('ts_dev_scriptinput 1',1200)).forEach(l=>console.log('  '+l.slice(0,100)));
  (await run('ts_respawn',3000)).forEach(l=>console.log('  '+l.slice(0,100)));
  srv('ts_status'); await new Promise(r=>setTimeout(r,1800));
  console.log('\n--- after respawn ---');
  console.log(st());
  await p.waitForTimeout(1200);
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/ffa.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
