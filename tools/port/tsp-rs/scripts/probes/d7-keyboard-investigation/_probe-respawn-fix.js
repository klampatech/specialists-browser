
// The fix: jointeam sets the team, respawn is what actually spawns.
// Both are client->server commands; only the first was reachable.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const HOST='100.95.111.112';
const FIFO='/tmp/tsds/engine.console';
const srv = (c) => { try { execSync(`echo ${JSON.stringify(c)} > ${FIFO}`, {timeout:4000}); } catch(e){} };
const st = () => execSync("grep -E '\\[ts\\]  #5|forcejoin' /tmp/tsds/engine.log | tail -6").toString();
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
  await p.waitForTimeout(1200);
  const run = async (cmd,ms=3000)=>{
    const s=logs.length;
    await p.evaluate(x=>window.__xash.Cmd_ExecuteString(x),cmd);
    await p.waitForTimeout(ms);
    return logs.slice(s).filter(l=>l.startsWith('[xash-stdout]')).map(l=>l.replace('[xash-stdout] ',''));
  };
  console.log('=== is ts_respawn registered? ===');
  (await run('cmdlist',3000)).filter(l=>l.includes('ts_respawn')||l.includes('ts_join_team')).forEach(l=>console.log('  '+l.slice(0,120)));
  console.log('\n=== enable script input + join team ===');
  (await run('ts_dev_scriptinput 1',1200)).forEach(l=>console.log('  '+l.slice(0,120)));
  (await run('ts_join_team 1',4000)).forEach(l=>console.log('  '+l.slice(0,120)));
  console.log('\n--- server state after jointeam ---');
  srv('ts_status'); await new Promise(r=>setTimeout(r,1500));
  console.log(st());
  console.log('\n=== NOW: ts_respawn ===');
  (await run('ts_respawn',4000)).forEach(l=>console.log('  '+l.slice(0,120)));
  console.log('\n--- server state after respawn ---');
  srv('ts_status'); await new Promise(r=>setTimeout(r,2000));
  console.log(st());
  await p.waitForTimeout(1500);
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/respawned.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
