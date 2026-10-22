
// New server cfg: respawntime 1, mp_teamoverride 1, mp_defaultteam 1.
// Try joining and see whether the player gets a team immediately.
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
  await p.waitForTimeout(900);
  // nothing here, just observe auto-assign
  await p.waitForTimeout(3500);
  const after=logs.filter(l=>l.startsWith('[xash-stdout]')||l.includes('[xash-stderr]')||l.includes('assigned to team')||l.includes('joined'));
  console.log('=== game / team lines ===');
  after.forEach(l=>console.log('  '+l.slice(0,150)));
  await p.screenshot({path:'/home/kyle/.hermes/cache/scratch/spawn3.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e.stack||e.message);process.exit(2)});
