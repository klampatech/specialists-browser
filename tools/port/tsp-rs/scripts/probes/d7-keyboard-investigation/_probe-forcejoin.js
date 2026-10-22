
// Connect, then from the SERVER console dump ts_status + ts_dev_forcejoin.
// The browser cannot reach server commands (its console doesn't forward),
// so the probe drives the FIFO from node instead.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const HOST='100.95.111.112';
const FIFO='/tmp/tsds/engine.console';
const srv = (cmd) => { try { execSync(`echo ${JSON.stringify(cmd)} > ${FIFO}`, {timeout:4000}); } catch(e){ console.log('  fifo write failed: '+e.message); } };
const log = () => execSync("grep -E '\\[ts\\] status|\\[ts\\]  #|forcejoin|ruleset|game rules' /tmp/tsds/engine.log | tail -14").toString();
(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const c=await b.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:800}});
  const p=await c.newPage();
  p.on('console',m=>{});
  await p.goto(`https://${HOST}:5174/webXash/?launchOptions=-game+ts+%2Bconnect+${HOST}%3A27015+%2Bmaxplayers+8&debug=1`,
    {waitUntil:'domcontentloaded',timeout:60000});
  try { await p.click('button:has-text("Play")',{timeout:5000}); } catch(e){}
  await p.waitForTimeout(36000);
  await p.click('#canvas',{position:{x:10,y:10}});
  await p.waitForTimeout(3000);
  srv('ts_status');
  await new Promise(r=>setTimeout(r,2000));
  console.log('=== ts_status with player connected ===');
  console.log(log());
  console.log('\n=== ts_dev_forcejoin ===');
  srv('ts_dev_forcejoin');
  await new Promise(r=>setTimeout(r,3000));
  console.log(log());
  await p.waitForTimeout(1500);
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/forcejoin.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
